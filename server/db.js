import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;
let SQL = null;

// 数据库文件路径（相对于项目根目录）
const DB_PATH = path.join(path.dirname(__dirname), 'data', 'projects.db');

// 确保 data 目录存在
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * 初始化数据库
 */
async function initializeDatabase() {
  SQL = await initSqlJs();

  // 检查数据库文件是否存在
  if (fs.existsSync(DB_PATH)) {
    // 加载现有数据库
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('数据库加载成功');

    // 检查是否有迁移历史表
    const hasMigrationTable = db.exec(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='migration_history'
    `).length > 0;

    // 创建迁移历史表（如果不存在）
    if (!hasMigrationTable) {
      db.run(`
        CREATE TABLE IF NOT EXISTS migration_history (
            filename TEXT PRIMARY KEY,
            executed_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      saveDatabase();
    }

    // 执行未执行的迁移
    executePendingMigrations();

    // 确保管理员表及默认 IP 存在
    try {
      db.run(`
        CREATE TABLE IF NOT EXISTS admin_ips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_address TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        INSERT OR IGNORE INTO admin_ips (ip_address, description) VALUES ('::1', 'Localhost IPv6');
        INSERT OR IGNORE INTO admin_ips (ip_address, description) VALUES ('127.0.0.1', 'Localhost IPv4');
        INSERT OR IGNORE INTO admin_ips (ip_address, description) VALUES ('::ffff:127.0.0.1', 'Localhost IPv4 Mapping');
      `);
      saveDatabase();
    } catch (e) {
      console.warn('Ensure admin_ips failed:', e.message);
    }
  } else {
    // 创建新数据库
    db = new SQL.Database();
    await createTables();
    saveDatabase();
    console.log('数据库初始化成功');
  }
}

/**
 * 执行未执行的迁移
 */
function executePendingMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  // 获取已执行的迁移
  const executedMigrations = new Set();
  const result = db.exec('SELECT filename FROM migration_history');
  if (result.length > 0) {
    result[0].values.forEach(row => executedMigrations.add(row[0]));
  }

  // 执行未执行的迁移
  let hasNewMigrations = false;
  migrationFiles.forEach(file => {
    if (!executedMigrations.has(file)) {
      console.log(`执行新迁移文件: ${file}`);
      const schema = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      // 移除注释并分割 SQL 语句
      let cleanSchema = schema.replace(/--.*$/gm, '');
      cleanSchema = cleanSchema.replace(/\/\*[\s\S]*?\*\//g, '');

      const statements = cleanSchema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

      statements.forEach(statement => {
        try {
          if (statement.trim()) {
            db.run(statement);
          }
        } catch (error) {
          // 忽略常见的安全错误
          const safeErrors = [
            'already exists',
            'duplicate column name',
            'no such table',
            'table users has no column named region'
          ];
          const isSafeError = safeErrors.some(msg => error.message.includes(msg));
          if (!isSafeError) {
            console.error('SQL Error:', error.message);
            console.error('Statement:', statement.substring(0, 100));
          }
        }
      });

      // 记录迁移执行
      db.run('INSERT INTO migration_history (filename) VALUES (?)', [file]);
      hasNewMigrations = true;
    }
  });

  if (hasNewMigrations) {
    saveDatabase();
    console.log('新迁移执行完成');
  }
}

/**
 * 创建数据库表
 */
function createTables() {
  // 首先创建迁移历史表
  db.run(`
    CREATE TABLE IF NOT EXISTS migration_history (
        filename TEXT PRIMARY KEY,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // 按文件名排序，确保按顺序执行

  migrationFiles.forEach(file => {
    const schema = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    // 移除注释并分割 SQL 语句
    let cleanSchema = schema.replace(/--.*$/gm, ''); // 移除单行注释
    cleanSchema = cleanSchema.replace(/\/\*[\s\S]*?\*\//g, ''); // 移除多行注释

    const statements = cleanSchema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`执行迁移文件: ${file}`);
    statements.forEach(statement => {
      try {
        if (statement.trim()) {
          db.run(statement);
        }
      } catch (error) {
        // 如果表已存在，忽略错误
        if (!error.message.includes('already exists')) {
          console.error('SQL Error:', error.message);
          console.error('Statement:', statement.substring(0, 100));
        }
      }
    });

    // 记录迁移执行
    try {
      db.run('INSERT OR IGNORE INTO migration_history (filename) VALUES (?)', [file]);
    } catch (e) {
      // 忽略插入错误
    }
  });
}

/**
 * 保存数据库到文件
 */
function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * 执行查询并返回所有结果
 */
function all(sql, params = []) {
  // 确保 params 是数组
  const paramArray = Array.isArray(params) ? params : [params];

  // sql.js 不支持参数化查询，需要手动替换参数
  let finalSql = sql;
  paramArray.forEach((param, index) => {
    // 处理字符串参数
    if (typeof param === 'string') {
      finalSql = finalSql.replace('?', `'${param.replace(/'/g, "''")}'`);
    } else if (param === null || param === undefined) {
      finalSql = finalSql.replace('?', 'NULL');
    } else {
      finalSql = finalSql.replace('?', param);
    }
  });

  const result = db.exec(finalSql);
  if (!result.length) return [];

  return result[0].values.map((row, index) => {
    const columns = result[0].columns;
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * 执行查询并返回第一个结果
 */
function get(sql, params = []) {
  const results = all(sql, params);
  return results[0] || null;
}

/**
 * 执行插入/更新/删除
 */
function run(sql, params = []) {
  // 确保 params 是数组
  const paramArray = Array.isArray(params) ? params : [params];

  // sql.js 不支持参数化查询，需要手动替换参数
  let finalSql = sql;
  paramArray.forEach((param, index) => {
    // 处理字符串参数
    if (typeof param === 'string') {
      // 转义单引号和双引号
      const escapedParam = param.replace(/'/g, "''");
      finalSql = finalSql.replace('?', `'${escapedParam}'`);
    } else if (param === null || param === undefined) {
      finalSql = finalSql.replace('?', 'NULL');
    } else {
      finalSql = finalSql.replace('?', param);
    }
  });

  return db.run(finalSql);
}

/**
 * 获取最后插入的 ID
 */
function getLastInsertId() {
  const result = db.exec('SELECT last_insert_rowid() as id')[0];
  return result?.values[0][0];
}

/**
 * 事务执行
 */
function transaction(callback) {
  try {
    db.run('BEGIN TRANSACTION');
    const result = callback();
    db.run('COMMIT');
    return result;
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}

// 导出数据库对象
const database = {
  async init() {
    if (!db) {
      await initializeDatabase();
    }
  },

  all,
  get,
  run,
  save: saveDatabase,
  transaction,

  // 准备语句接口（兼容 better-sqlite3）
  prepare(sql) {
    return {
      all(params = []) {
        return all(sql, params);
      },
      get(params = []) {
        return get(sql, params);
      },
      run(...args) {
        // 如果传入的是一个数组，不进行扁平化，直接使用
        // 否则，将所有参数扁平化为一维数组
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args.flat();

        // 调试日志
        const match = sql.match(/INSERT INTO projects/i);
        if (match) {
          console.log(`[db.prepare.run] SQL长度: ${sql.length}, 占位符数量: ${(sql.match(/\?/g) || []).length}, 参数数量: ${params.length}`);
        }

        const result = run(sql, params);
        return {
          changes: result,
          lastInsertRowid: getLastInsertId()
        };
      }
    };
  }
};

export default database;