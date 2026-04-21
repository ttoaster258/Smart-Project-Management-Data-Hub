-- 创建项目进展更新表（支持多条历史记录）
CREATE TABLE IF NOT EXISTS project_progress_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    update_text TEXT NOT NULL,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_pm TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_progress_updates_project ON project_progress_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_progress_updates_time ON project_progress_updates(update_time);