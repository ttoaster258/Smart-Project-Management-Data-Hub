import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import database from './db.js';
import projectService from './services/ProjectService.js';
import initMilestoneNodes from './scripts/initMilestoneNodes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// ===== 请求频率限制（简易实现） =====
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15分钟窗口
const RATE_LIMIT_MAX = 500; // 每个IP最多500次请求（开发测试阶段设置较宽松）

function checkRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  const record = rateLimitMap.get(ip);

  if (!record || now - record.startTime > RATE_LIMIT_WINDOW) {
    // 新窗口或窗口过期，重置计数
    rateLimitMap.set(ip, { startTime: now, count: 1 });
    next();
  } else if (record.count < RATE_LIMIT_MAX) {
    // 窗口内，未超限
    record.count++;
    next();
  } else {
    // 超限
    res.status(429).json({
      success: false,
      error: '请求过于频繁，请稍后再试'
    });
  }
}

// 定期清理过期记录（每5分钟）
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.startTime > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// 路由（必须在使用之前导入）
import projectsRouter from './routes/projects.js';
import adminRouter from './routes/admin.js';
import authRouter from './routes/auth.js';
import columnConfigsRouter from './routes/columnConfigs.js';
import changesRouter from './routes/changes.js';
import projectManagersRouter from './routes/projectManagers.js';
import milestonesRouter from './routes/milestones.js';
import customColumnsRouter from './routes/customColumns.js';
import productsRouter from './routes/products.js';
import projectResultsRouter from './routes/projectResults.js';
import progressUpdatesRouter from './routes/progressUpdates.js';
import acceptanceTrackingRouter from './routes/acceptanceTracking.js';
import revenueTargetsRouter from './routes/revenueTargets.js';
import acceptanceTrackingConfigRouter from './routes/acceptanceTrackingConfig.js';
import reportsRouter from './routes/reports.js';
import rolesRouter from './routes/roles.js';
import usersRouter from './routes/users.js';

// 中件间
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// 请求频率限制（应用于所有 API 路由）
app.use('/api', checkRateLimit);

// 信任代理（用于获取真实 IP）
app.set('trust proxy', true);

// 注册路由
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/column-configs', columnConfigsRouter);
app.use('/api/changes', changesRouter);
app.use('/api/project-managers', projectManagersRouter);
app.use('/api/milestones', milestonesRouter);
app.use('/api/custom-columns', customColumnsRouter);
app.use('/api/products', productsRouter);
app.use('/api/project-results', projectResultsRouter);
app.use('/api/progress-updates', progressUpdatesRouter);
app.use('/api/acceptance-tracking', acceptanceTrackingRouter);
app.use('/api/revenue-targets', revenueTargetsRouter);
app.use('/api/acceptance-tracking-config', acceptanceTrackingConfigRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/users', usersRouter);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ip: req.ip
  });
});

// 打印路由列表进行调试
function printRoutes(stack, prefix = '') {
  stack.forEach(layer => {
    if (layer.route) {
      console.log(`${Object.keys(layer.route.methods).join(',').toUpperCase()} ${prefix}${layer.route.path}`);
    } else if (layer.name === 'router' && layer.handle.stack) {
      printRoutes(layer.handle.stack, prefix + (layer.regexp.source.replace('^\\', '').replace('\\/?(?=\\/|$)', '') || ''));
    }
  });
}

// 在启动时打印
setTimeout(() => {
  console.log('Registered Routes:');
  printRoutes(app._router.stack);
}, 1000);

// 静态文件服务（用于提供公共资源）
app.use(express.static(path.join(__dirname, '../public')));

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误'
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在'
  });
});

// 初始化数据库并启动服务器
async function startServer() {
  try {
    await database.init();
    console.log('数据库初始化完成');

    // 执行变更表迁移
    console.log('检查变更表迁移...');
    try {
      database.run("ALTER TABLE project_changes ADD COLUMN reason_category TEXT DEFAULT ''");
      console.log('字段 reason_category 添加成功');
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('字段 reason_category 已存在，跳过');
      }
    }
    try {
      database.run('ALTER TABLE project_changes ADD COLUMN change_count INTEGER DEFAULT 1');
      console.log('字段 change_count 添加成功');
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('字段 change_count 已存在，跳过');
      }
    }
    try {
      database.run('CREATE INDEX IF NOT EXISTS idx_project_changes_type ON project_changes(type)');
      database.run('CREATE INDEX IF NOT EXISTS idx_project_changes_date ON project_changes(change_date)');
      console.log('变更记录索引创建成功');
    } catch (err) {
      console.log('变更记录索引已存在或创建失败');
    }

    // 新增性能优化索引（生产环境就绪）
    try {
      database.run('CREATE INDEX IF NOT EXISTS idx_projects_acceptance_date ON projects(acceptance_date)');
      database.run('CREATE INDEX IF NOT EXISTS idx_projects_project_manager ON projects(project_manager)');
      database.run('CREATE INDEX IF NOT EXISTS idx_projects_milestone_node ON projects(milestone_node)');
      database.run('CREATE INDEX IF NOT EXISTS idx_projects_acceptance_tracking ON projects(is_acceptance_tracking)');
      database.run('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)');
      database.run('CREATE INDEX IF NOT EXISTS idx_payment_nodes_project_date ON payment_nodes(project_id, payment_date)');
      database.run('CREATE INDEX IF NOT EXISTS idx_projects_kickoff_date ON projects(kickoff_date)');
      console.log('性能优化索引创建成功');
    } catch (err) {
      console.log('性能优化索引已存在或创建失败:', err.message);
    }

    // 检查是否需要初始化数据
    const countResult = database.get('SELECT COUNT(*) as count FROM projects');
    if (countResult && countResult.count === 0) {
      console.log('检测到数据库为空，正在通过 seed.json 导入初始数据...');
      const seedFilePath = path.join(__dirname, '../data/seed.json');
      if (!fs.existsSync(seedFilePath)) {
        // 尝试从项目根目录查找
        const altPath = path.join(path.dirname(__dirname), 'data/seed.json');
        if (fs.existsSync(altPath)) {
          console.log('从项目根目录找到 seed.json');
          try {
            const seedData = JSON.parse(fs.readFileSync(altPath, 'utf8'));
            console.log(`读取到 ${seedData.length} 个项目数据`);
            const importResult = projectService.batchImportProjects(seedData);
            console.log(`成功从 seed.json 导入 ${importResult.success} 个项目`);
            if (importResult.errors.length > 0) {
              console.error('导入错误:', importResult.errors);
            }
          } catch (err) {
            console.error('导入 seed.json 失败:', err.message);
          }
        }
      } else {
        try {
          const seedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));
          console.log(`读取到 ${seedData.length} 个项目数据`);
          const importResult = projectService.batchImportProjects(seedData);
          console.log(`成功从 seed.json 导入 ${importResult.success} 个项目`);
          if (importResult.errors.length > 0) {
            console.error('导入错误:', importResult.errors);
          }
        } catch (err) {
          console.error('导入 seed.json 失败:', err.message);
          console.error(err.stack);
        }
      }
    }

    // 初始化里程碑节点数据（在 seed.json 导入之后执行）
    console.log('检查里程碑节点数据...');
    await initMilestoneNodes();

    // 初始化现有项目的变更统计数据
    try {
      // 先初始化 project_changes 表的 change_count 字段
      // 为每个项目的变更记录按时间顺序编号
      const projectsWithChanges = database.prepare(`
        SELECT DISTINCT project_id
        FROM project_changes
        ORDER BY project_id
      `).all();

      projectsWithChanges.forEach(project => {
        const changes = database.prepare(`
          SELECT id FROM project_changes
          WHERE project_id = ?
          ORDER BY change_date ASC, id ASC
        `).all(project.project_id);

        changes.forEach((change, index) => {
          database.prepare(`
            UPDATE project_changes
            SET change_count = ?
            WHERE id = ?
          `).run(index + 1, change.id);
        });
      });
      console.log(`现有变更记录 change_count 初始化完成，共更新 ${projectsWithChanges.length} 个项目`);
    } catch (err) {
      console.log('初始化变更记录 change_count 失败:', err.message);
    }

    // 执行项目里程碑表迁移
    console.log('检查项目里程碑表...');
    try {
      const migrationFile = path.join(__dirname, 'migrations', '008_add_project_milestones.sql');
      if (fs.existsSync(migrationFile)) {
        const schema = fs.readFileSync(migrationFile, 'utf8');
        let cleanSchema = schema.replace(/--.*$/gm, '');
        cleanSchema = cleanSchema.replace(/\/\*[\s\S]*?\*\//g, '');

        const statements = cleanSchema
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

        statements.forEach(statement => {
          try {
            if (statement.trim()) {
              database.run(statement);
            }
          } catch (error) {
            if (!error.message.includes('already exists') && !error.message.includes('duplicate column name')) {
              console.error('SQL Error:', error.message);
            }
          }
        });
        console.log('项目里程碑表创建成功');
      }
    } catch (err) {
      console.log('项目里程碑表创建失败:', err.message);
    }

    try {
      database.run('CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id)');
      database.run('CREATE INDEX IF NOT EXISTS idx_project_milestones_node ON project_milestones(milestone_node)');
      console.log('项目里程碑索引创建成功');
    } catch (err) {
      console.log('项目里程碑索引已存在或创建失败');
    }

    // 初始化现有项目的里程碑数据
    try {
      const MILESTONE_NODES = [
        '早期报价', '级别确定', '需求评估', '报价审批', '项目投标',
        '任务书审批', '合同审批', '项目启动', '计划预算', '概要方案',
        '详细方案', '内部验收', '已验收'
      ];
      const REQUIRED_MILESTONES = ['项目启动', '计划预算', '概要方案', '已验收'];

      const projects = database.prepare('SELECT id, kickoff_date, acceptance_date FROM projects').all();
      let createdCount = 0;
      let skippedCount = 0;

      projects.forEach(project => {
        // 检查是否已有里程碑记录
        const existingCount = database.prepare(`
          SELECT COUNT(*) as count FROM project_milestones WHERE project_id = ?
        `).get([project.id]).count;

        if (existingCount > 0) {
          skippedCount++;
          return;
        }

        // 为每个里程碑节点创建记录
        MILESTONE_NODES.forEach(node => {
          let plannedDate = null;
          const isRequired = REQUIRED_MILESTONES.includes(node) ? 1 : 0;

          // 项目启动：使用立项日期
          if (node === '项目启动') {
            plannedDate = project.kickoff_date || null;
          }

          // 计划预算：立项日期 + 30天
          else if (node === '计划预算' && project.kickoff_date) {
            const kickoffDate = new Date(project.kickoff_date);
            kickoffDate.setDate(kickoffDate.getDate() + 30);
            plannedDate = kickoffDate.toISOString().split('T')[0];
          }

          // 已验收：使用验收日期
          else if (node === '已验收') {
            plannedDate = project.acceptance_date || null;
          }

          database.prepare(`
            INSERT INTO project_milestones (project_id, milestone_node, planned_date, is_required)
            VALUES (?, ?, ?, ?)
          `).run([project.id, node, plannedDate, isRequired]);
        });

        createdCount++;
      });

      console.log(`现有项目里程碑初始化完成，新增 ${createdCount} 个，跳过 ${skippedCount} 个`);
    } catch (err) {
      console.log('初始化现有项目里程碑失败:', err.message);
    }

    // 执行 projects 表变更统计字段迁移
    console.log('检查 projects 表变更统计字段...');
    try {
      database.run('ALTER TABLE projects ADD COLUMN change_count INTEGER DEFAULT 0');
      console.log('字段 change_count 添加成功');
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('字段 change_count 已存在，跳过');
      }
    }
    try {
      database.run('ALTER TABLE projects ADD COLUMN last_change_date TEXT');
      console.log('字段 last_change_date 添加成功');
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('字段 last_change_date 已存在，跳过');
      }
    }

    // 初始化现有项目的变更统计数据
    try {
      // 先初始化 project_changes 表的 change_count 字段
      // 为每个项目的变更记录按时间顺序编号
      const projectsWithChanges = database.prepare(`
        SELECT DISTINCT project_id
        FROM project_changes
        ORDER BY project_id
      `).all();

      projectsWithChanges.forEach(project => {
        const changes = database.prepare(`
          SELECT id FROM project_changes
          WHERE project_id = ?
          ORDER BY change_date ASC, id ASC
        `).all(project.project_id);

        changes.forEach((change, index) => {
          database.prepare(`
            UPDATE project_changes
            SET change_count = ?
            WHERE id = ?
          `).run(index + 1, change.id);
        });
      });
      console.log(`现有变更记录 change_count 初始化完成，共更新 ${projectsWithChanges.length} 个项目`);
    } catch (err) {
      console.log('初始化变更记录 change_count 失败:', err.message);
    }

    try {
      database.run(`
        UPDATE projects SET
          change_count = (
            SELECT COUNT(*) FROM project_changes
            WHERE project_changes.project_id = projects.id
          ),
          last_change_date = (
            SELECT change_date FROM project_changes
            WHERE project_changes.project_id = projects.id
            ORDER BY change_date DESC
            LIMIT 1
          )
      `);
      console.log('现有项目变更统计数据初始化完成');
    } catch (err) {
      console.log('初始化变更统计数据失败:', err.message);
    }

    // 执行产品表迁移
    console.log('检查产品表...');
    try {
      const productsMigrationFile = path.join(__dirname, 'migrations', '009_add_products.sql');
      if (fs.existsSync(productsMigrationFile)) {
        const schema = fs.readFileSync(productsMigrationFile, 'utf8');
        let cleanSchema = schema.replace(/--.*$/gm, '');
        cleanSchema = cleanSchema.replace(/\/\*[\s\S]*?\*\//g, '');

        const statements = cleanSchema
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

        statements.forEach(statement => {
          try {
            if (statement.trim()) {
              database.run(statement);
            }
          } catch (error) {
            if (!error.message.includes('already exists') && !error.message.includes('duplicate column name')) {
              console.error('SQL Error:', error.message);
            }
          }
        });
        console.log('产品表创建成功');
      }
    } catch (err) {
      console.log('产品表创建失败:', err.message);
    }

    // 初始化项目销售产品数据
    try {
      const { default: initProjectProducts } = await import('./scripts/initProjectProducts.js');
    } catch (err) {
      console.log('初始化项目产品数据失败:', err.message);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log('=================================');
      console.log(`服务器运行在 http://localhost:${PORT}`);
      console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
      console.log('=================================');
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

startServer();

export default app;