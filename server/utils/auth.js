import crypto from 'crypto';

// 加密算法配置
const SALT = 'smart-project-hub-2026';
const ITERATIONS = 1000; // 保持与现有密码兼容
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

/**
 * 加密密码
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    DIGEST
  ).toString('hex');

  // 使用十六进制格式存储：salt(32字符) + hash(128字符)
  return salt + hash;
}

/**
 * 验证密码
 */
export function verifyPassword(password, hashedPassword) {
  try {
    // salt 是前 32 个字符，hash 是剩下的
    const salt = hashedPassword.substring(0, 32);
    const hash = hashedPassword.substring(32);

    const verifyHash = crypto.pbkdf2Sync(
      password,
      salt,
      ITERATIONS,
      KEY_LENGTH,
      DIGEST
    ).toString('hex');

    return hash === verifyHash;
  } catch (error) {
    return false;
  }
}

/**
 * 生成会话 token
 */
export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 生成会话过期时间（24小时后）
 */
export function getSessionExpiry() {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry.toISOString();
}