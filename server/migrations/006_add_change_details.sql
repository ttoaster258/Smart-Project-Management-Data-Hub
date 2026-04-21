-- 添加变更详情字段
-- 用于记录不同类型变更的具体信息（新值和旧值）

-- 人员变更相关字段
ALTER TABLE project_changes ADD COLUMN new_project_manager TEXT;
ALTER TABLE project_changes ADD COLUMN old_project_manager TEXT;

-- 预算变更相关字段
ALTER TABLE project_changes ADD COLUMN new_budget_total REAL;
ALTER TABLE project_changes ADD COLUMN old_budget_total REAL;
ALTER TABLE project_changes ADD COLUMN new_outsourcer_amount REAL;
ALTER TABLE project_changes ADD COLUMN old_outsourcer_amount REAL;

-- 进度变更相关字段
ALTER TABLE project_changes ADD COLUMN new_planned_end_date TEXT;
ALTER TABLE project_changes ADD COLUMN old_planned_end_date TEXT;