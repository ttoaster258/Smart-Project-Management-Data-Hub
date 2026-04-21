-- 新增变更原因概括和变更次数字段
-- 变更原因概括：外部原因、内部原因、综合原因
-- 变更次数：该项目的第几次变更

-- 检查字段是否存在，如果不存在则添加
ALTER TABLE project_changes ADD COLUMN reason_category TEXT DEFAULT '';

-- 检查字段是否存在，如果不存在则添加
ALTER TABLE project_changes ADD COLUMN change_count INTEGER DEFAULT 1;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_project_changes_type ON project_changes(type);
CREATE INDEX IF NOT EXISTS idx_project_changes_date ON project_changes(change_date);