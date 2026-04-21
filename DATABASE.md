# 数据库系统使用说明

## 📋 概述

本项目已从 Excel 文件存储升级为 SQLite 数据库存储，支持完整的 CRUD 操作和权限控制。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

这将安装以下新依赖：
- `express` - Web 服务器框架
- `better-sqlite3` - SQLite 数据库驱动
- `cors` - 跨域支持
- `concurrently` - 同时运行前后端服务

### 2. 初始化数据库

首次运行时需要初始化数据库：

```bash
# 启动服务器时会自动创建数据库
npm run server
```

数据库文件将创建在 `data/projects.db`

### 3. 迁移 Excel 数据（可选）

如果需要将现有 Excel 数据导入数据库：

```bash
# 使用 tsx 运行迁移脚本
npx tsx scripts/migrate-excel-to-db.ts
```

### 4. 启动服务

#### 方式一：分别启动前后端

```bash
# 终端 1: 启动后端服务器
npm run server

# 终端 2: 启动前端开发服务器
npm run dev
```

#### 方式二：同时启动前后端

```bash
npm run dev:all
```

## 🔑 权限控制

### 配置管理员 IP

只有配置为管理员 IP 的用户才能进行写操作（创建、更新、删除项目）。

#### 添加管理员 IP

```bash
curl -X POST http://localhost:4000/api/admin/ips \
  -H "Content-Type: application/json" \
  -d '{"ipAddress": "127.0.0.1", "description": "本地开发环境"}'
```

#### 查看管理员 IP 列表

```bash
curl http://localhost:4000/api/admin/ips
```

#### 检查当前权限状态

```bash
curl http://localhost:4000/api/admin/check
```

## 📡 API 端点

### 项目管理

| 端点 | 方法 | 描述 | 权限 |
|------|------|------|------|
| `/api/projects` | GET | 获取所有项目 | 全部 |
| `/api/projects/:id` | GET | 获取单个项目 | 全部 |
| `/api/projects` | POST | 创建新项目 | 管理员 |
| `/api/projects/:id` | PUT | 更新项目 | 管理员 |
| `/api/projects/:id` | DELETE | 删除项目 | 管理员 |
| `/api/projects/batch` | POST | 批量导入项目 | 管理员 |
| `/api/projects/export/json` | GET | 导出项目数据 | 管理员 |

### 权限管理

| 端点 | 方法 | 描述 | 权限 |
|------|------|------|------|
| `/api/admin/ips` | GET | 获取管理员 IP 列表 | 管理员 |
| `/api/admin/ips` | POST | 添加管理员 IP | 管理员 |
| `/api/admin/ips/:id` | DELETE | 删除管理员 IP | 管理员 |
| `/api/admin/check` | GET | 检查当前权限 | 全部 |

## 📁 项目结构

```
智能化平台Claudecode/
├── server/                    # 后端服务器
│   ├── index.js              # 服务器入口
│   ├── db.js                 # 数据库连接
│   ├── migrations/           # 数据库迁移
│   │   └── init.sql         # 初始化脚本
│   ├── services/             # 业务逻辑
│   │   └── ProjectService.js # 项目服务
│   ├── routes/               # API 路由
│   │   ├── projects.js       # 项目路由
│   │   └── admin.js          # 管理路由
│   └── middleware/           # 中间件
│       └── auth.js           # 权限控制
├── data/                     # 数据库文件
│   └── projects.db           # SQLite 数据库
├── scripts/                  # 工具脚本
│   └── migrate-excel-to-db.ts # Excel 迁移脚本
├── services/                 # 前端服务
│   ├── ProjectDataService.ts # 新的 API 服务
│   └── ExcelDataService.ts   # 旧的服务（保留备份）
└── types.ts                  # TypeScript 类型定义
```

## 🔧 数据库维护

### 备份数据库

```bash
# 备份数据库文件
cp data/projects.db data/projects.backup.db
```

### 恢复数据库

```bash
# 恢复数据库文件
cp data/projects.backup.db data/projects.db
```

### 重置数据库

```bash
# 删除数据库文件
rm data/projects.db

# 重新启动服务器会自动创建新数据库
npm run server
```

## 📊 数据库表结构

### projects - 项目主表
包含项目的所有基本信息、财务数据、时间线等

### person_hours - 人员工时表
记录每个项目的人员工时分配情况

### project_changes - 项目变更表
记录项目的所有变更历史

### outsourcing_items - 外协采购表
记录项目的外协采购明细

### admin_ips - 管理员 IP 表
存储具有管理员权限的 IP 地址

## 🐛 故障排查

### 数据库锁定错误

如果遇到数据库锁定错误，可以尝试：

```bash
# 删除 WAL 文件
rm data/projects.db-wal data/projects.db-shm
```

### 端口冲突

如果 4000 端口被占用，可以修改端口：

```bash
PORT=4001 npm run server
```

### 权限被拒绝

确保你的 IP 地址已添加到管理员列表：

```bash
# 检查当前 IP
curl http://localhost:4000/api/admin/check

# 如果是管理员但仍然被拒绝，检查 IP 格式
# 注意：局域网 IP 和本地 IP 不同
```

## 📝 开发建议

1. **使用事务**：批量操作时使用数据库事务确保数据一致性
2. **定期备份**：定期备份数据库文件
3. **监控日志**：关注服务器日志及时发现错误
4. **API 版本控制**：未来可以考虑添加 API 版本号
5. **数据验证**：在前端和后端都添加数据验证