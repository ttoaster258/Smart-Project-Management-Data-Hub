import database from '../server/db.js';
import { hashPassword } from '../server/utils/auth.js';

/**
 * 初始化默认管理员用户
 * 运行方式: node scripts/init-admin.js
 */

async function initAdminUser() {
  try {
    console.log('正在初始化数据库...');
    await database.init();

    // 检查是否已存在管理员用户
    const existingAdmin = database.prepare('SELECT * FROM users WHERE username = ?').get(['admin']);

    if (existingAdmin) {
      console.log('管理员用户已存在，跳过创建');
      console.log('用户名: admin');
      console.log('如需重置密码，请删除现有用户后重新运行此脚本');
      process.exit(0);
    }

    // 创建默认管理员用户
    const defaultPassword = 'admin123'; // 请在生产环境中修改此密码
    const hashedPassword = hashPassword(defaultPassword);

    console.log('hashedPassword length:', hashedPassword.length);
    console.log('hashedPassword:', hashedPassword);

    // 直接使用 database.run 而不是 prepare
    database.run(`
      INSERT INTO users (username, password, role, name)
      VALUES (?, ?, ?, ?)
    `, ['admin', hashedPassword, 'admin', '系统管理员']);

    database.save();

    console.log('=================================');
    console.log('管理员用户创建成功！');
    console.log('=================================');
    console.log('用户名: admin');
    console.log('密码: admin123');
    console.log('=================================');
    console.log('⚠️  请尽快修改默认密码！');
    console.log('=================================');

    process.exit(0);
  } catch (error) {
    console.error('初始化失败:', error);
    process.exit(1);
  }
}

initAdminUser();