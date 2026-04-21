# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 项目核心概览
- **定位**：智慧项目管理数据中心 (Smart Project Management Data Hub) —— 面向决策层的 React 看板。
- **技术栈**：React 18.2 (ESM) + Vite 6 + Tailwind v4 (CDN) + Recharts + Express (后端 SQLite)。
- **关键特性**：SQLite 数据持久化、KPI 钻取分析、里程碑追踪、用户认证。
- **运行命令**：
  - `npm run dev` - 前端开发服务器 (Port: 8080)
  - `npm run build` - 构建生产版本
  - `npm run preview` - 预览生产构建
  - `npm run server` - 运行 Express 后端服务器 (Port: 4000)
  - `npm run dev:all` - 同时运行后端和前端

---

## 🏗️ 架构与数据流规范

### 1. 数据管道 (Pipeline)
`前端操作` ➔ `ProjectDataService (API 调用)` ➔ `Express 后端路由` ➔ `ProjectService.js (业务逻辑)` ➔ `SQLite 数据库` ➔ `前端展示`

### 2. 状态管理
- **全局状态**：`App.tsx` 持有原始项目数组与基础过滤。
- **计算逻辑**：`components/DecisionDashboard.tsx` 内部的 useMemo 负责所有 KPI 指标计算。
- **交互状态**：`App.tsx` 中的 `pmoFilters` state 管理筛选条件。

### 3. Dashboard 架构
看板主要组件为 `components/DecisionDashboard.tsx`，相关组件直接位于 `components/` 目录下。

---

## 📂 核心文件索引
| 路径 | 核心职责 |
| :--- | :--- |
| `types.ts` | **数据真理源**：定义 Project、Region、Status 等核心接口 |
| `constants.tsx` | 系统常量、Mock 数据及日期处理工具函数 (`parseDate`, `formatDate`) |
| `index.html` | 入口文件：包含 Tailwind v4 CDN、ESM importmap 配置 |
| `vite.config.ts` | 配置 Vite 和代理设置，将 `/api` 请求代理到 Express 后端 (4000) |
| `services/` | 数据服务层 |
|  ├─ `ProjectDataService.ts` | 后端 API 服务 (SQLite 项目数据 CRUD) |
|  ├─ `AuthService.ts` | 用户认证服务 (登录/登出/权限检查) |
|  ├─ `ProjectManagerDataService.ts` | 项目经理数据服务 |
|  ├─ `ProductService.ts` | 产品销售数据服务 |
|  └─ `ProjectResultDataService.ts` | 项目成果数据服务 |
| `server/` | **Express 后端服务** (Port: 4000) |
|  ├─ `index.js` | 后端入口：Express + SQLite 数据库初始化 |
|  ├─ `db.js` | SQLite 数据库配置与初始化（使用 sql.js） |
|  ├─ `routes/` | API 路由定义 |
|  │  ├─ `auth.js` | 认证路由 (登录/登出/密码修改) |
|  │  ├─ `projects.js` | 项目 CRUD 路由 |
|  │  ├─ `admin.js` | 管理员路由 (权限检查/初始化) |
|  │  ├─ `columnConfigs.js` | 列配置路由 |
|  │  ├─ `changes.js` | 变更记录路由 |
|  │  ├─ `projectManagers.js` | 项目经理数据路由 |
|  │  ├─ `milestones.js` | 里程碑节点路由 |
|  │  ├─ `customColumns.js` | 自定义列路由 |
|  │  ├─ `products.js` | 产品销售数据路由 |
|  │  ├─ `projectResults.js` | 项目成果路由 |
|  │  ├─ `progressUpdates.js` | 项目进展更新路由 |
|  │  ├─ `acceptanceTracking.js` | 验收追踪路由 |
|  │  ├─ `acceptanceTrackingConfig.js` | 验收追踪配置路由 |
|  │  └─ `revenueTargets.js` | 收入目标路由 |
|  ├─ `services/` | 后端业务逻辑 |
|  │  ├─ `ProjectService.js` | 项目数据服务层 |
|  │  └─ `ProjectResultService.js` | 项目成果服务层 |
|  ├─ `middleware/` | 中间件 |
|  │  └─ `auth.js` | JWT 认证中间件 |
|  ├─ `utils/` | 工具函数 |
|  │  └─ `auth.js` | 认证工具函数 |
|  ├─ `migrations/` | 数据库迁移脚本（按文件名顺序执行） |
|  │  ├─ `000_init.sql` | 初始化表结构 |
|  │  ├─ `001a_add_project_highlight.sql` | 亮点工程字段 |
|  │  ├─ `002_add_milestone_node.sql` | 里程碑节点字段 |
|  │  ├─ `003_add_column_configs.sql` | 列配置表 |
|  │  ├─ `004-006_*.sql` | 变更记录相关字段 |
|  │  ├─ `007_add_project_managers.sql` | 项目经理表 |
|  │  ├─ `008_add_project_milestones.sql` | 项目里程碑表 |
|  │  ├─ `009_add_products.sql` | 产品表 |
|  │  ├─ `010_add_payment_nodes.sql` | 回款节点表 |
|  │  ├─ `010_add_project_results.sql` | 项目成果表 |
|  │  ├─ `011_add_outsourcer_amount.sql` | 外协采购字段 |
|  │  ├─ `012_add_custom_columns.sql` | 自定义列表 |
|  │  ├─ `013_add_acceptance_risk_and_nature.sql` | 验收风险与性质字段 |
|  │  ├─ `014_add_progress_updates.sql` | 进展更新表 |
|  │  ├─ `015_add_acceptance_tracking.sql` | 验收追踪表 |
|  │  ├─ `016_add_revenue_targets.sql` | 收入目标表 |
|  │  └─ `017_add_acceptance_tracking_config.sql` | 验收追踪配置表 |
|  └─ `scripts/` | 后端初始化脚本 |
|     ├─ `initMilestoneNodes.js` | 初始化里程碑节点数据 |
|     ├─ `initProjectProducts.js` | 初始化项目产品数据 |
|     ├─ `updateIndustries.js` | 更新项目行业字段 |
|     └─ `updateMarginRates.js` | 随机生成毛利率数据 |
| `components/DecisionDashboard.tsx` | 经营决策看板主入口：KPI 卡片与图表展示 |
| `components/RegionalDashboardPage.tsx` | 区域经营看板：区域维度数据分析 |
| `components/ProgressMonitorPage.tsx` | 里程碑节点泳道视图：项目进度追踪 |
| `components/CostMonitorPage.tsx` | 成本监控页面（开发中） |
| `components/ChangeManagementPage.tsx` | 变更管理页面 |
| `components/RiskWarningPage.tsx` | 风险预警页面：三种风险类型识别 |
| `components/AcceptanceListTable.tsx` | 验收追踪列表 |
| `components/acceptance-tracking/` | 验收追踪组件目录 |
| `components/HighlightPage.tsx` | 亮点工程看板 |
| `components/CollectionTrackingPage.tsx` | 回款追踪页面 |
| `components/ProjectResultPage.tsx` | 项目成果看板 |
| `components/ProjectResultDetailModal.tsx` | 项目成果详情弹窗 |
| `components/ProjectManagerProfilePage.tsx` | 项目经理档案页面 |
| `components/PMPersonalDashboardPage.tsx` | 项目经理个人看板 |
| `components/ProductValueModal.tsx` | 产品价值弹窗 |
| `components/RiskPenetrationModal.tsx` | 风险穿透分析弹窗 |
| `components/FilterConsole.tsx` | 筛选控制台组件 |
| `components/DrillDownModal.tsx` | 钻取详情模态框 |
| `components/DashboardDrillDownModal.tsx` | 经营看板专用钻取模态框 |
| `components/ProjectDetailPanel.tsx` | 项目详情侧边栏 |
| `components/ProjectFormModal.tsx` | 项目新增/编辑表单 |
| `components/AdvancedSearchDropdown.tsx` | 高级搜索下拉面板 |
| `components/ColumnSelector.tsx` | 列选择器组件 |
| `components/Sidebar.tsx` | 侧边栏导航组件 |
| `components/TopFilterDropdowns.tsx` | 顶部筛选下拉组件 |
| `components/OverviewTable` (App.tsx 内) | 全量项目表格组件 |
| `App.tsx` | **应用主入口**：路由配置、全局状态管理、侧边栏导航 |
| `utils/columnConfig.ts` | 列配置工具：全量项目看板的列显示配置 |
| `scripts/` | 工具脚本 |
|  ├─ `migrate-excel-to-db.ts` | Excel 数据导入数据库脚本 |
|  ├─ `init-admin.js` | 初始化管理员账户脚本 |
|  ├─ `addMockProjects.js` | 添加测试项目数据脚本 |
|  ├─ `checkMockProjects.js` | 检查测试项目数据脚本 |
|  ├─ `queryIndustries.js` | 查询项目行业分布脚本 |
|  ├─ `updateAllIndustries.js` | 批量更新项目行业脚本 |
|  ├─ `updateRemainingIndustries.js` | 更新剩余项目行业脚本 |
|  └─ `updateProjectDates.ts` | 更新项目日期脚本 |
| `src/pages/LoginPage.jsx` | 登录页面 |
| `src/components/ProtectedRoute.jsx` | 路由守卫组件 |

---

## 🧭 应用导航结构

### 主要导航项 (`App.tsx` 中的 `NAV_ITEMS`)
1. **项目经营看板** (`Business_Data`) - 核心业务指标展示
2. **区域经营看板** (`Regional_Dashboard`) - 区域维度数据分析
3. **PMO项目管理看板** (`PMO_Project_Management`)
   - 进度监控 (`Progress_Monitor`) - 里程碑节点泳道视图
   - 成本监控 (`Cost_Monitor`) - 开发中
   - 变更管理 (`Change_Management`) - 开发中
   - 风险预警 (`Risk_Warning`) - 风险项目预警
4. **验收追踪看板** (`Acceptance_Tracking`) - 验收项目追踪（含独立组件目录）
5. **亮点工程看板** (`Highlight_Display`) - 亮点工程展示
6. **项目经理个人看板** (`PM_Personal_Dashboard`) - 开发中
7. **全量项目看板** (`Full_Information`) - 项目信息大图（PMO）
8. **项目经理档案** (`PM_Profile`) - 开发中
9. **项目成果看板** (`Project_Result`) - 开发中

---

## 🛠️ 开发准则 (必须严格遵守)

> [!CAUTION]
> **1. 变量声明顺序**：在 `useMemo` 中，被依赖的变量必须物理位置在前（禁止先使用后定义）。
> **2. 区域层级逻辑**：使用 `.includes()` 进行包含匹配（例如 `p.region.includes('东区')` 可匹配子区域）。
> **3. UI 规范**：所有按钮、标签、提示文字必须使用 **中文**。
> **4. JSX 完整性**：修改 Grid 布局时，务必核对 `div` 闭合情况。
> **5. 日期处理**：使用 `constants.tsx` 中导出的 `parseDate` 和 `formatDate` 工具函数，保持日期格式统一（YYYY-MM-DD）。
> **6. ESM 语法**：所有模块必须使用 ES Module 语法，禁止使用 CommonJS。
> **7. 类型安全**：核心类型定义在 `types.ts`，不要在不同文件重复定义。
> **8. 不确定需求处理**：当用户提出的修改需求存在不确定的部分（如具体实现方式、位置、样式等），必须在修改代码之前用 **中文** 向用户确认。
> **9. 英文字段说明**：当向用户说明英文字段（如代码中的变量名、数据库字段名等）时，**必须在英文字段后面用括号显示它对应在项目信息大图（PMO）中的中文字段**。例如：`projectCode`（项目编号）、`contractAmount`（合同金额）。
> **10. 数据库数据保护**：**严禁删除数据库**。修改项目数据时，必须通过后端 API（`/api/projects/:id` PUT 请求）或直接执行 SQL UPDATE 语句更新，绝不允许通过"修改种子文件 → 删除数据库 → 重新导入"的方式实现数据变更。数据库中的数据是生产数据，必须予以保护。
> **11. 进程保护**：**严禁重启自身进程**。Claude Code 作为进程运行在项目中，任何尝试重启自身进程的行为都会造成死循环。如需重启服务（如后端服务器、前端开发服务器等），必须提示用户手动执行，绝不允许自己调用相关命令。

### 常用扩展模式
- **新增图表指标**：
  1. `types.ts` 修改或添加相关类型定义。
  2. `components/DecisionDashboard.tsx` 添加图表组件和数据计算逻辑。
  3. 确保 `constants.tsx` 中有相应的 Mock 数据或工具函数。

### Express 后端说明
项目使用 Express 后端服务 (`server/`, Port: 4000)：
- SQLite 数据库存储（使用 sql.js）
- JWT 用户认证
- 项目 CRUD API (`/api/projects/*`)
- 认证 API (`/api/auth/*`)
- 列配置 API (`/api/column-configs/*`)
- 管理员 API (`/api/admin/*`)
- 变更记录 API (`/api/changes/*`)
- 项目经理 API (`/api/project-managers/*`)
- 里程碑 API (`/api/milestones/*`)
- 自定义列 API (`/api/custom-columns/*`)
- 产品销售 API (`/api/products/*`)
- 项目成果 API (`/api/project-results/*`)
- 进展更新 API (`/api/progress-updates/*`)
- 验收追踪 API (`/api/acceptance-tracking/*`)
- 验收追踪配置 API (`/api/acceptance-tracking-config/*`)
- 收入目标 API (`/api/revenue-targets/*`)
- 运行命令：`npm run server` 或 `npm run dev:all`

---

## 🔧 ESM 模块系统配置

### Importmap 配置 (`index.html`)
项目使用 ESM (ES Modules) 配置，通过 `importmap` 映射外部依赖：
- React、React-DOM: `https://esm.sh/react@18.2.0/`
- Recharts: `https://esm.sh/recharts@2.13.0?external=react,react-dom`
- XLSX: `https://esm.sh/xlsx@0.18.5`
- date-fns: `https://esm.sh/date-fns@4.1.0`
- @dnd-kit: `https://esm.sh/@dnd-kit/*` (拖拽功能)
- clsx、tailwind-merge: 样式工具类库

### TypeScript 配置 (`tsconfig.json`)
- **Target**: ES2022
- **Module**: ESNext (与 Vite ESM 一致)
- **ModuleResolution**: bundler (支持 importmap)
- **Paths**: `@/*` 映射到项目根目录
- **AllowImportingTsExtensions**: true (支持 `.ts`/`.tsx` 导入)

### 重要提示
- 本项目运行在 ESM 环境下，所有文件应使用 ES Module 语法（`import`/`export`）
- 禁止使用 CommonJS 语法（`require`/`module.exports`）
- 当添加新的 npm 包时，需同步更新 `index.html` 的 `importmap`

---

## 📊 数据模型速查 (Project Interface)
- **基本信息**：`projectCode`, `projectName`, `region`, `status`, `isBenchmark` (标杆), `isHighlight` (亮点工程)
- **财务维度**：`totalContract`, `totalRevenue`, `paid2025`, `budgetUsedAmount`, `forecast2026Revenue`, `marginRate`
- **进度维度**：`kickoffDate`, `plannedEndDate`, `acceptanceDate`, `delayMonths`, `progress` (%)
- **工时维度**：`evaluated` (评估), `actualTB` (填报), `pmoAnnualTotal` (PMO统计), `personnelDetails[]`
- **密级维度**：`securityLevel` (公开, 涉密, 机密)

### 密级处理规范
- 项目密级展示：支持 `公开`、`涉密`、`机密` 三种级别
- 在 `ProjectDataService.transformFromDb()` 中进行密级字段转换（前端显示与数据库字段的映射）

---

## 🔐 认证与权限

### 用户认证流程
1. **登录**：`/login` 页面调用 `AuthService.login()` 获取 JWT token
2. **Token 存储**：token 存储在 `localStorage.authToken`，用户信息存储在 `localStorage.user`
3. **路由保护**：`ProtectedRoute` 组件检查认证状态，未认证重定向到登录页
4. **权限检查**：
   - 管理员权限：通过 `/api/admin/check` 端点检查客户端 IP
   - 管理员功能：只有管理员可以编辑/删除项目、初始化数据

### 后端 API 认证
- 使用 JWT Bearer token 认证
- 受保护路由需通过 `server/middleware/auth.js` 中间件验证
- API Base URL：`http://localhost:4000/api`

### 数据库初始化
- SQLite 数据库文件位于 `data/projects.db`
- 数据库配置与初始化逻辑在 `server/db.js`（使用 sql.js）
- 数据库迁移脚本位于 `server/migrations/`，按文件名顺序执行
- 首次启动后端服务时会自动初始化数据库和表结构
- 如需导入测试数据，可使用 `scripts/addMockProjects.js` 脚本或通过后端 API 导入
- 默认管理员账户：用户名 `admin`，密码 `admin123`

---

## 📈 经营决策看板映射逻辑

经营决策看板的数据全部来源于全量项目大图和后台数据库。各项指标的筛选规则如下：

| 指标 | 判断依据 | 年份限制 | 金额字段 | 说明 |
|-----|---------|---------|---------|------|
| 全年项目总数 | 无筛选 | 无 | - | 包含所有项目，不受月份筛选影响 |
| 全年项目合同额总数 | 无筛选 | 无 | `contract_amount` | 包含所有项目，不受月份筛选影响 |
| 新增项目 | `kickoff_date` | **仅2026年立项** | - | 立项时间在2026年哪个月就算哪个月的新增项目 |
| 新增项目合同额 | `kickoff_date` | **仅2026年立项** | `contract_amount` | 立项时间在2026年哪个月就算哪个月的合同额 |
| 全年已确认收入 | `kickoff_date` | - | `annual_confirmed_revenue` | 所有项目的 annual_confirmed_revenue 之和（包括已验收和进行中） |
| 全年回款额 | - | - | `paid_2026` | 所有项目的 paid_2026 之和（包括已验收和进行中） |
| 本月回款额 | `kickoff_date` | - | `paid_2026` | 立项日期在本月的项目的 paid_2026 之和 |
| 上月回款额 | `kickoff_date` | - | `paid_2026` | 立项日期在上月的项目的 paid_2026 之和 |
| 应验收项目 | `forecast_acceptance_date` | - | - | 预测验收时间在哪个月就算哪个月 |
| 应验收项目金额 | `forecast_acceptance_date` | - | `contract_amount` | 预测验收时间在本月的项目的合同额之和 |
| 已验收项目 | `acceptance_date` | - | - | 验收时间在哪个月就算哪个月 |
| 已验收项目金额 | `acceptance_date` | - | `contract_amount` | 验收时间在本月的项目的合同额之和 |

### 区域/行业 KPI 达成情况

区域和行业的 KPI 达成情况计算逻辑：
- **KPI 目标总额**：固定为 **5000万元**（每个区域和行业相同）
- **已确认金额**：今年已确认的收入金额
- **达成率**：已确认金额 / 5000万 × 100%

### 风险判断逻辑

经营决策看板与风险预警页面使用统一的三种风险类型判断：

| 风险类型 | 判断条件 |
|---------|---------|
| **进度风险** | 延期≥1个月且状态为"延期"，或状态为"暂停" |
| **成本风险** | 毛利率<0，或预算使用超支，或工时偏差率>20% |
| **质量风险** | 重要节点（级别确定、项目启动、计划预算、概要方案、内部验收）缺实际完成时间，或当前节点超期1个月以上 |

### 行业分类

项目行业统一为以下六种：
- 核能
- 车辆
- 电子信息
- 电力能源
- 高端制造
- 教育

### 字段映射关系

| 前端 Project 类型 | 数据库字段 | Excel 列名 |
|-----------------|-----------|-----------|
| `payment.contractAmount` | `contract_amount` | 合同金额 |
| `payment.annualConfirmedRevenue` | `annual_confirmed_revenue` | 全年已确认收入 |
| `payment.paid2026` | `paid_2026` | 2026已回款 |
| `payment.acceptedPendingRevenue` | `accepted_pending_revenue` | 待确认收入 |
| `payment.pendingThisYear` | `pending_this_year` | 本年待收 |
| `timeline.kickoffDate` | `kickoff_date` | 立项日期 |
| `timeline.plannedEndDate` | `planned_end_date` | 计划结束日期 |
| `timeline.acceptanceDate` | `acceptance_date` | 验收日期 |
| `forecastAcceptanceDate` | `forecast_acceptance_date` | 预测验收时间 |
| `forecast2026Revenue` | `forecast_2026_revenue` | 2026预计收入 |
| `forecast2026LossRevenue` | `forecast_2026_loss_revenue` | 2026预计损失收入 |
| `marginRate` | `margin_rate` | 毛利率 |

### 毛利率字段

- 毛利率数据存储在数据库的 `margin_rate` 字段中（字符串格式，如 `"25.5%"`）
- 前端计算时优先使用 `project.marginRate` 字段，若为空则回退到计算方式
- 毛利率分布图表按四个区间统计：30%以上、10%-30%、0%-10%、0%以下

---

## 📝 常用更新脚本

位于 `server/scripts/` 目录下：

| 脚本 | 用途 |
|-----|------|
| `updateIndustries.js` | 更新项目行业字段（统一为六种行业） |
| `updateMarginRates.js` | 随机生成毛利率数据（-10% 到 80%） |

运行方式：`cd server && node scripts/脚本名.js`

---

## 提交前检查清单
- [ ] 代码修改是否仅限目标页面？（除非要求跨页修改）。
- [ ] 是否使用了 `constants.tsx` 中的日期工具函数？
- [ ] Grid 容器 (`lg:col-span-*`) 是否都在同一个 `grid` 父级内？
- [ ] **必须在修改完成后，用中文简述改动点。**

**⚠️ ⚠️ ⚠️ 如果在修改时遇到了可能会使页面崩溃，或者影响其他功能实现的情况，请立刻停止修改，并且用中文询问我**