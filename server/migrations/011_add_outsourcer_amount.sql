-- 添加项目表的外协金额字段
-- 用于记录项目的外协采购金额，用于预算变更管理

ALTER TABLE projects ADD COLUMN outsourcer_amount REAL DEFAULT 0;