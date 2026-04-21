import React, { useState, useRef, useEffect } from 'react';
import { ColumnConfig, COLUMN_CONFIGS, COLUMN_GROUPS } from '../utils/columnConfig';
import { CustomColumn } from '../types';
import ProjectDataService from '../services/ProjectDataService';

interface ColumnConfigData {
    id?: number;
    name: string;
    columns: string[];
    is_default?: boolean;
}

interface ColumnSelectorProps {
    visibleColumns: string[];
    onVisibleColumnsChange: (columns: string[]) => void;
    isTopBarLayout?: boolean;
    token?: string | null;
    isAdmin?: boolean;
    customColumns?: CustomColumn[];
    onCustomColumnsChange?: (columns: CustomColumn[]) => void;
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({
    visibleColumns,
    onVisibleColumnsChange,
    isTopBarLayout = false,
    token,
    isAdmin = false,
    customColumns = [],
    onCustomColumnsChange
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFullConfig, setShowFullConfig] = useState(false);
    const [savedConfigs, setSavedConfigs] = useState<ColumnConfigData[]>([]);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingConfig, setEditingConfig] = useState<ColumnConfigData | null>(null);
    const [configName, setConfigName] = useState('');

    // 自定义列相关状态
    const [showAddCustomColumn, setShowAddCustomColumn] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');
    const [newColumnDataType, setNewColumnDataType] = useState<'text' | 'number'>('text');
    const [editingCustomColumn, setEditingCustomColumn] = useState<CustomColumn | null>(null);
    const [editColumnName, setEditColumnName] = useState('');
    const [editColumnDataType, setEditColumnDataType] = useState<'text' | 'number'>('text');

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // 获取 token
    const getToken = () => {
        if (token) return token;
        return localStorage.getItem('authToken');
    };

    // 加载用户保存的配置
    useEffect(() => {
        if (isExpanded && getToken()) {
            fetchSavedConfigs();
        }
    }, [isExpanded]);

    const fetchSavedConfigs = async () => {
        try {
            const authToken = getToken();
            if (!authToken) return;

            const response = await fetch('/api/column-configs', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const data = await response.json();
            if (data.success) {
                setSavedConfigs(data.configs.map((c: any) => ({
                    ...c,
                    columns: JSON.parse(c.columns)
                })));
            }
        } catch (error) {
            console.error('加载配置失败:', error);
        }
    };

    const saveConfig = async () => {
        if (!configName.trim()) return;

        try {
            const authToken = getToken();
            if (!authToken) {
                alert('请先登录');
                return;
            }

            const response = await fetch('/api/column-configs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    name: configName.trim(),
                    columns: visibleColumns
                })
            });

            const data = await response.json();
            if (data.success) {
                setConfigName('');
                setShowSaveModal(false);
                fetchSavedConfigs();
            } else {
                alert(data.error || '保存配置失败');
            }
        } catch (error) {
            console.error('保存配置失败:', error);
            alert('保存配置失败: ' + (error as Error).message);
        }
    };

    const updateConfigName = async () => {
        if (!editingConfig || !configName.trim()) return;

        try {
            const authToken = getToken();
            if (!authToken) return;

            const response = await fetch(`/api/column-configs/${editingConfig.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    name: configName.trim()
                })
            });

            const data = await response.json();
            if (data.success) {
                setConfigName('');
                setShowEditModal(false);
                setEditingConfig(null);
                fetchSavedConfigs();
            } else {
                alert(data.error || '更新配置失败');
            }
        } catch (error) {
            console.error('更新配置失败:', error);
            alert('更新配置失败');
        }
    };

    const deleteConfig = async (configId: number) => {
        if (!confirm('确定要删除这个配置吗？')) return;

        try {
            const authToken = getToken();
            if (!authToken) return;

            const response = await fetch(`/api/column-configs/${configId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const data = await response.json();
            if (data.success) {
                fetchSavedConfigs();
            } else {
                alert(data.error || '删除配置失败');
            }
        } catch (error) {
            console.error('删除配置失败:', error);
            alert('删除配置失败');
        }
    };

    const setAsDefault = async (configId: number) => {
        try {
            const authToken = getToken();
            if (!authToken) return;

            const response = await fetch(`/api/column-configs/${configId}/set-default`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const data = await response.json();
            if (data.success) {
                fetchSavedConfigs();
            } else {
                alert(data.error || '设置默认配置失败');
            }
        } catch (error) {
            console.error('设置默认配置失败:', error);
            alert('设置默认配置失败');
        }
    };

    const applyConfig = (columns: string[]) => {
        onVisibleColumnsChange(columns);
    };

    // 添加自定义列
    const handleAddCustomColumn = async () => {
        if (!newColumnName.trim()) return;

        const result = await ProjectDataService.createCustomColumn(newColumnName.trim(), newColumnDataType);
        if (result.success && result.data && onCustomColumnsChange) {
            onCustomColumnsChange([...customColumns, result.data]);
            setNewColumnName('');
            setNewColumnDataType('text');
            setShowAddCustomColumn(false);
        } else {
            alert(result.error || '创建自定义列失败');
        }
    };

    // 更新自定义列
    const handleUpdateCustomColumn = async () => {
        if (!editingCustomColumn || !editColumnName.trim()) return;

        const result = await ProjectDataService.updateCustomColumn(editingCustomColumn.id, {
            columnName: editColumnName.trim(),
            dataType: editColumnDataType
        });
        if (result.success && onCustomColumnsChange) {
            const updatedColumns = customColumns.map(col =>
                col.id === editingCustomColumn.id ? { ...col, column_name: editColumnName.trim(), data_type: editColumnDataType } : col
            );
            onCustomColumnsChange(updatedColumns);
            setEditingCustomColumn(null);
            setEditColumnName('');
            setEditColumnDataType('text');
        } else {
            alert(result.error || '更新自定义列失败');
        }
    };

    // 删除自定义列
    const handleDeleteCustomColumn = async (column: CustomColumn) => {
        if (!confirm(`确定要删除自定义列"${column.column_name}"吗？该列的数据将被保留但不再显示。`)) return;

        const result = await ProjectDataService.deleteCustomColumn(column.id);
        if (result.success && onCustomColumnsChange) {
            onCustomColumnsChange(customColumns.filter(col => col.id !== column.id));
            // 同时从 visibleColumns 中移除
            if (visibleColumns.includes(column.column_key)) {
                onVisibleColumnsChange(visibleColumns.filter(c => c !== column.column_key));
            }
        } else {
            alert(result.error || '删除自定义列失败');
        }
    };

    // 将自定义列转换为 ColumnConfig 格式
    const customColumnConfigs: ColumnConfig[] = customColumns.map(col => ({
        id: col.column_key,
        label: col.column_name,
        group: '自定义列',
        fixed: false
    }));

    // 合并固定列和自定义列
    const allColumns = [...COLUMN_CONFIGS, ...customColumnConfigs];

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsExpanded(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 处理从左侧移到右侧（移除字段）
    const handleRemove = (id: string) => {
        const config = allColumns.find(c => c.id === id);
        if (config?.fixed) return;
        onVisibleColumnsChange(visibleColumns.filter(c => c !== id));
    };

    // 处理从右侧移到左侧（添加字段）
    const handleAdd = (id: string) => {
        if (!visibleColumns.includes(id)) {
            onVisibleColumnsChange([...visibleColumns, id]);
        }
    };

    // 获取未选中的字段
    const getUnselectedColumns = () => {
        return allColumns.filter(c => !visibleColumns.includes(c.id));
    };

    // 获取选中的字段
    const getSelectedColumns = () => {
        return allColumns.filter(c => visibleColumns.includes(c.id));
    };

    // 过滤函数
    const filterColumns = (columns: ColumnConfig[]) => {
        if (!searchQuery) return columns;
        return columns.filter(c =>
            c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.id.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    // 保存配置模态框
    const SaveConfigModal = () => {
        if (!showSaveModal) return null;

        const handleSave = () => {
            const inputValue = inputRef.current?.value || '';
            if (!inputValue.trim()) return;
            saveConfig();
        };

        return (
            <div className="fixed inset-0 z-[400] bg-slate-900/50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                    <h3 className="text-lg font-black text-slate-900 mb-4">保存配置</h3>
                    <p className="text-sm text-slate-600 mb-4">为当前显示的字段配置命名</p>
                    <input
                        ref={inputRef}
                        type="text"
                        value={configName}
                        onChange={(e) => setConfigName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const inputValue = inputRef.current?.value || '';
                                if (inputValue.trim()) {
                                    e.preventDefault();
                                    saveConfig();
                                }
                            }
                        }}
                        placeholder="请输入配置名称"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-6">
                        <button
                            onClick={() => { setShowSaveModal(false); setConfigName(''); inputRef.current = null; }}
                            className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-indigo-500 text-white text-sm font-bold rounded-lg hover:bg-indigo-600"
                        >
                            保存
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // 编辑配置模态框
    const EditConfigModal = () => {
        if (!showEditModal || !editingConfig) return null;

        const handleUpdate = () => {
            const inputValue = inputRef.current?.value || '';
            if (!inputValue.trim()) return;
            updateConfigName();
        };

        return (
            <div className="fixed inset-0 z-[400] bg-slate-900/50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                    <h3 className="text-lg font-black text-slate-900 mb-4">编辑配置</h3>
                    <p className="text-sm text-slate-600 mb-4">修改配置名称</p>
                    <input
                        ref={inputRef}
                        type="text"
                        value={configName}
                        onChange={(e) => setConfigName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const inputValue = inputRef.current?.value || '';
                                if (inputValue.trim()) {
                                    e.preventDefault();
                                    updateConfigName();
                                }
                            }
                        }}
                        placeholder="请输入配置名称"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-6">
                        <button
                            onClick={() => { setShowEditModal(false); setEditingConfig(null); setConfigName(''); inputRef.current = null; }}
                            className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleUpdate}
                            className="px-4 py-2 bg-indigo-500 text-white text-sm font-bold rounded-lg hover:bg-indigo-600"
                        >
                            更新
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // 顶部栏布局
    if (isTopBarLayout) {
        return (
            <div className="relative" ref={containerRef}>
                <button
                    onClick={toggleExpand}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all text-slate-600 hover:text-slate-900 text-xs font-black shadow-sm"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <span>视图配置</span>
                </button>

                {isExpanded && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300" onClick={toggleExpand}></div>
                        <div className="relative w-[900px] h-[700px] bg-white rounded-xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                            {/* 顶部工具栏 */}
                            <div className="p-5 border-b border-slate-100 shrink-0">
                                <div className="flex items-center justify-between mb-4">
                                    <h5 className="text-base font-black text-slate-800 uppercase tracking-widest">动态列管理器</h5>
                                    <button onClick={toggleExpand} className="text-slate-400 hover:text-slate-600">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                {/* 搜索框 */}
                                <div className="relative mb-4">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="搜索字段"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                                {/* 我的配置 */}
                                <div className="max-h-[80px] overflow-y-auto custom-scrollbar">
                                    <div className="flex items-center justify-between mb-2 sticky top-0 bg-white py-1 border-b border-slate-100">
                                        <h6 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">我的配置</h6>
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        <button
                                            onClick={() => applyConfig([
                                                'projectName', 'projectCode', 'region', 'securityLevel', 'level',
                                                'industry', 'status', 'projectManager', 'kickoffDate', 'plannedEndDate', 'acceptanceDate'
                                            ])}
                                            className="shrink-0 px-4 py-1.5 bg-white border border-slate-200 rounded text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-all whitespace-nowrap"
                                        >
                                            默认配置
                                        </button>
                                        {savedConfigs.map(config => (
                                            <div key={config.id} className="relative group shrink-0">
                                                <button
                                                    onClick={() => applyConfig(config.columns)}
                                                    className={`px-4 py-1.5 rounded text-sm font-bold transition-all border whitespace-nowrap ${
                                                        config.is_default
                                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-indigo-600'
                                                    }`}
                                                >
                                                    {config.name}
                                                    {config.is_default && (
                                                        <span className="ml-1 text-xs">✓</span>
                                                    )}
                                                </button>
                                                <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingConfig(config); setConfigName(config.name); setShowEditModal(true); }}
                                                        className="p-1 rounded hover:bg-white text-slate-400 hover:text-indigo-600"
                                                        title="编辑"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteConfig(config.id!); }}
                                                        className="p-1 rounded hover:bg-white text-slate-400 hover:text-rose-600"
                                                        title="删除"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 内容区域 */}
                            <div className="flex-1 min-h-0 overflow-hidden relative p-5">
                                <div className="flex gap-4 h-full">
                                    {/* 已选字段 */}
                                    <div className={`flex flex-col h-full transition-all duration-300 border-r border-slate-200 pr-4 ${showFullConfig ? 'w-1/2' : 'w-full'}`}>
                                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
                                            <h6 className="text-sm font-black text-slate-700">已选字段 ({getSelectedColumns().length})</h6>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar min-h-0">
                                            {filterColumns(getSelectedColumns()).length === 0 ? (
                                                <div className="text-center py-8 text-slate-400 text-sm">暂无已选字段</div>
                                            ) : (
                                                <div className="space-y-1">
                                                    {filterColumns(getSelectedColumns()).map(col => (
                                                        <div
                                                            key={col.id}
                                                            onClick={() => handleRemove(col.id)}
                                                            className={`flex items-center justify-between p-3 rounded cursor-pointer transition-all ${
                                                                col.fixed
                                                                    ? 'opacity-50 cursor-not-allowed bg-white'
                                                                    : 'hover:bg-white hover:shadow-sm hover:border-slate-200 border border-transparent'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="text-sm font-bold text-slate-700 truncate">{col.label}</span>
                                                                {col.fixed && <span className="text-xs text-slate-400 uppercase font-black whitespace-nowrap">锁定</span>}
                                                            </div>
                                                            {!col.fixed && (
                                                                <svg className="w-5 h-5 text-slate-400 hover:text-rose-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 未选字段 */}
                                    {showFullConfig && (
                                        <div className="flex-1 flex flex-col h-full pl-4">
                                            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
                                                <h6 className="text-sm font-black text-slate-700">未选字段 ({getUnselectedColumns().length})</h6>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar min-h-0">
                                                {filterColumns(getUnselectedColumns()).length === 0 ? (
                                                    <div className="text-center py-8 text-slate-400 text-sm">暂无未选字段</div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {filterColumns(getUnselectedColumns()).map(col => (
                                                            <div
                                                                key={col.id}
                                                                onClick={() => handleAdd(col.id)}
                                                                className="flex items-center justify-between p-3 rounded cursor-pointer transition-all hover:bg-white hover:shadow-sm hover:border-slate-200 border border-transparent"
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span className="text-sm font-bold text-slate-700 truncate">{col.label}</span>
                                                                </div>
                                                                <svg className="w-5 h-5 text-slate-400 hover:text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                </svg>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 底部按钮 */}
                            <div className="p-5 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between">
                                {/* 自定义列管理区域（仅管理员可见） */}
                                {isAdmin && (
                                    <div className="flex-1 mr-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h6 className="text-xs font-black text-slate-500 uppercase tracking-widest">自定义列管理</h6>
                                            <button
                                                onClick={() => setShowAddCustomColumn(true)}
                                                className="px-2 py-1 bg-indigo-500 text-white text-xs font-bold rounded hover:bg-indigo-600"
                                            >
                                                + 添加
                                            </button>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {customColumns.map(col => (
                                                <div key={col.id} className="group relative flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs font-bold text-amber-700">
                                                    <span>{col.column_name}</span>
                                                    <span className="text-[10px] text-amber-400">({col.data_type === 'text' ? '文本' : '数字'})</span>
                                                    <button
                                                        onClick={() => { setEditingCustomColumn(col); setEditColumnName(col.column_name); setEditColumnDataType(col.data_type); }}
                                                        className="opacity-0 group-hover:opacity-100 ml-1 text-amber-400 hover:text-indigo-600"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCustomColumn(col)}
                                                        className="opacity-0 group-hover:opacity-100 text-amber-400 hover:text-rose-600"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                            {customColumns.length === 0 && (
                                                <span className="text-xs text-slate-400">暂无自定义列</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setShowSaveModal(true); setConfigName(''); }}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white rounded text-sm font-bold hover:bg-indigo-600"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                        </svg>
                                        保存配置
                                    </button>
                                    <button
                                        onClick={() => setShowFullConfig(!showFullConfig)}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded text-sm font-bold transition-all ${showFullConfig ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                        </svg>
                                        {showFullConfig ? '精简模式' : '全量配置'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <SaveConfigModal />
                <EditConfigModal />

                {/* 添加自定义列模态框 */}
                {showAddCustomColumn && (
                    <div className="fixed inset-0 z-[400] bg-slate-900/50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                            <h3 className="text-lg font-black text-slate-900 mb-4">添加自定义列</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">列名称</label>
                                    <input
                                        type="text"
                                        value={newColumnName}
                                        onChange={(e) => setNewColumnName(e.target.value)}
                                        placeholder="请输入列名称"
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">数据类型</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="dataType"
                                                checked={newColumnDataType === 'text'}
                                                onChange={() => setNewColumnDataType('text')}
                                                className="w-4 h-4 text-indigo-600"
                                            />
                                            <span className="text-sm font-medium text-slate-700">文本</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="dataType"
                                                checked={newColumnDataType === 'number'}
                                                onChange={() => setNewColumnDataType('number')}
                                                className="w-4 h-4 text-indigo-600"
                                            />
                                            <span className="text-sm font-medium text-slate-700">数字</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    onClick={() => { setShowAddCustomColumn(false); setNewColumnName(''); setNewColumnDataType('text'); }}
                                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleAddCustomColumn}
                                    className="px-4 py-2 bg-indigo-500 text-white text-sm font-bold rounded-lg hover:bg-indigo-600"
                                >
                                    添加
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 编辑自定义列模态框 */}
                {editingCustomColumn && (
                    <div className="fixed inset-0 z-[400] bg-slate-900/50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                            <h3 className="text-lg font-black text-slate-900 mb-4">编辑自定义列</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">列名称</label>
                                    <input
                                        type="text"
                                        value={editColumnName}
                                        onChange={(e) => setEditColumnName(e.target.value)}
                                        placeholder="请输入列名称"
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">数据类型</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="editDataType"
                                                checked={editColumnDataType === 'text'}
                                                onChange={() => setEditColumnDataType('text')}
                                                className="w-4 h-4 text-indigo-600"
                                            />
                                            <span className="text-sm font-medium text-slate-700">文本</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="editDataType"
                                                checked={editColumnDataType === 'number'}
                                                onChange={() => setEditColumnDataType('number')}
                                                className="w-4 h-4 text-indigo-600"
                                            />
                                            <span className="text-sm font-medium text-slate-700">数字</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    onClick={() => { setEditingCustomColumn(null); setEditColumnName(''); setEditColumnDataType('text'); }}
                                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleUpdateCustomColumn}
                                    className="px-4 py-2 bg-indigo-500 text-white text-sm font-bold rounded-lg hover:bg-indigo-600"
                                >
                                    保存
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 默认独立按钮布局（保持原有逻辑）
    return (
        <div className="relative inline-block text-left" ref={containerRef}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm text-slate-600 hover:text-slate-900"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span className="text-xs font-bold">视图配置</span>
            </button>

            {isExpanded && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0">
                        <div className="flex items-center justify-between mb-3">
                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest">动态列管理器</h5>
                            <button
                                onClick={() => { setShowSaveModal(true); setConfigName(''); }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-bold hover:bg-indigo-600"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                保存当前配置
                            </button>
                        </div>
                        <div className="relative mb-2">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="搜索字段"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <button
                            onClick={() => setShowFullConfig(!showFullConfig)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showFullConfig ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            全量配置
                        </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto p-4 custom-scrollbar">
                        <div className="space-y-3">
                            <div>
                                <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">我的配置</h6>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => applyConfig([
                                            'projectName', 'projectCode', 'region', 'securityLevel', 'level',
                                            'industry', 'status', 'projectManager',
                                            'kickoffDate', 'plannedEndDate', 'acceptanceDate'
                                        ])}
                                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-200"
                                    >
                                        默认配置
                                    </button>
                                    {savedConfigs.map(config => (
                                        <div key={config.id} className="group relative">
                                            <button
                                                onClick={() => applyConfig(config.columns)}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                                                    config.is_default
                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                        : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600 border-transparent hover:border-slate-200'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="truncate">{config.name}</span>
                                                    {config.is_default && (
                                                        <svg className="w-4 h-4 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </button>
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1">
                                                <button
                                                    onClick={() => { setEditingConfig(config); setConfigName(config.name); setShowEditModal(true); }}
                                                    className="p-1 rounded hover:bg-white text-slate-400 hover:text-indigo-600"
                                                    title="编辑"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => deleteConfig(config.id!)}
                                                    className="p-1 rounded hover:bg-white text-slate-400 hover:text-rose-600"
                                                    title="删除"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <hr className="border-slate-100" />
                            <div>
                                <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">全量字段</h6>
                                {filterColumns(allColumns).map(col => (
                                    <label
                                        key={col.id}
                                        className={`flex items-center p-2 rounded cursor-pointer transition-all ${col.fixed ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns.includes(col.id)}
                                            disabled={col.fixed}
                                            onChange={() => {
                                                if (!col.fixed) {
                                                    if (visibleColumns.includes(col.id)) {
                                                        onVisibleColumnsChange(visibleColumns.filter(c => c !== col.id));
                                                    } else {
                                                        onVisibleColumnsChange([...visibleColumns, col.id]);
                                                    }
                                                }
                                            }}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mr-3"
                                        />
                                        <span className="text-xs font-bold text-slate-600 flex-1 truncate">{col.label}</span>
                                        {col.group === '自定义列' && <span className="ml-2 text-[8px] text-amber-500 font-black">自定义</span>}
                                        {col.fixed && <span className="ml-auto text-[9px] text-slate-300 uppercase font-black">锁定</span>}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <SaveConfigModal />
            <EditConfigModal />
        </div>
    );
};

export default ColumnSelector;