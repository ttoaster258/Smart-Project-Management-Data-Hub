
import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell,
    LineChart, Line
} from 'recharts';
import { DrillDownData, Project, ProjectStatus, Region, ProjectType, MAJOR_REGIONS, REGION_MAPPING } from '../types';

interface DrillDownModalProps {
    data: DrillDownData;
    onClose: () => void;
    onNavigateToProject: (projectId: string) => void;
}

const COLORS = {
    blue: '#3b82f6',
    indigo: '#6366f1',
    emerald: '#10b981',
    rose: '#f43f5e',
    amber: '#f59e0b',
    purple: '#8b5cf6',
    slate: '#64748b'
};

const DrillDownModal: React.FC<DrillDownModalProps> = ({ data, onClose, onNavigateToProject }) => {
    // Detect view type
    const isChangeView = data.title.includes('变更');
    const viewType = isChangeView ? 'change' : (data.type || 'general');

    // --- 1. Data Processing for Charts ---
    const chartData = useMemo(() => {
        const projects = data.projects;
        const regions = MAJOR_REGIONS;

        if (viewType === 'schedule') {
            return regions.map((r: string) => {
                const regionProjects = projects.filter(p => {
                    const mappedRegion = REGION_MAPPING[p.region] || p.region;
                    return mappedRegion === r;
                });
                const total = regionProjects.length;
                const accepted = regionProjects.filter(p => p.status === ProjectStatus.Accepted).length;
                const delayed = regionProjects.filter(p => p.status === ProjectStatus.Delayed).length;
                return {
                    name: r,
                    acceptanceRate: total > 0 ? (accepted / total) * 100 : 0,
                    delayRate: total > 0 ? (delayed / total) * 100 : 0
                };
            });
        }

        if (viewType === 'manhours') { // COST
            return regions.map((r: string) => {
                const regionProjects = projects.filter(p => {
                    const mappedRegion = REGION_MAPPING[p.region] || p.region;
                    return mappedRegion === r;
                });
                const plan = regionProjects.reduce((s, p) => s + p.manHours.plannedTotal, 0);
                const pmo = regionProjects.reduce((s, p) => s + p.manHours.pmoAnnualTotal, 0);
                return {
                    name: r,
                    // Corrected Formula: (Actual - Planned) / Planned
                    variance: plan > 0 ? ((pmo - plan) / plan) * 100 : 0
                };
            });
        }

        if (viewType === 'risk') {
            const riskByRegion = regions.map((r: string) => ({
                name: r,
                count: projects.filter(p => {
                    const mappedRegion = REGION_MAPPING[p.region] || p.region;
                    return mappedRegion === r && (p.status === ProjectStatus.Delayed || p.status === ProjectStatus.Paused);
                }).length
            }));

            // Mock Risk Reasons (since we don't have structured reason data)
            const reasons = [
                { name: '大课题影响', value: 35, color: COLORS.rose },
                { name: '外部外协影响', value: 25, color: COLORS.amber },
                { name: '甲方推进慢', value: 20, color: COLORS.blue },
                { name: '人力不足', value: 15, color: COLORS.purple },
                { name: '综合原因', value: 5, color: COLORS.slate },
            ];
            return { bar: riskByRegion, pie: reasons };
        }

        if (viewType === 'change') {
            return regions.map((r: string) => {
                const regionProjects = projects.filter(p => {
                    const mappedRegion = REGION_MAPPING[p.region] || p.region;
                    return mappedRegion === r;
                });
                const total = regionProjects.length;
                const totalChanges = regionProjects.reduce((s, p) => s + p.changes.length, 0);
                const highFreq = regionProjects.filter(p => p.changes.length > 5).length;
                return {
                    name: r,
                    avg: total > 0 ? (totalChanges / total) : 0,
                    highFreqRate: total > 0 ? (highFreq / total) * 100 : 0
                };
            });
        }

        if (viewType === 'composition') {
            const typeDistribution = [
                { name: '开发', type: ProjectType.Dev, color: COLORS.blue },
                { name: '销售', type: ProjectType.Sales, color: COLORS.amber },
                { name: '混合', type: ProjectType.Mixed, color: COLORS.emerald },
                { name: '内部', type: ProjectType.Internal, color: COLORS.slate },
            ].map(item => {
                const group = projects.filter(p => p.type === item.type);
                return { ...item, value: group.length };
            }).filter(i => i.value > 0);

            const salesProjects = projects.filter(p => p.type === ProjectType.Sales);
            const totalSalesContract = salesProjects.reduce((sum, p) => sum + p.payment.contractAmount, 0);
            const productRatio = 43; // Mock

            const levelDistribution = [
                { name: '战略专项', levels: ['战略', '核心', 'A类'], color: COLORS.indigo },
                { name: '重大项目', levels: ['重大', 'B类'], color: COLORS.blue },
                { name: '重点项目', levels: ['重点', 'C类'], color: COLORS.amber },
                { name: '常规项目', levels: ['常规', 'D类'], color: COLORS.slate },
            ].map(item => {
                const count = projects.filter(p => item.levels.some(l => p.level?.includes(l))).length;
                return { ...item, count };
            });

            const abcProjects = projects.filter(p =>
                ['战略', '核心', '重大', '重点', 'A类', 'B类', 'C类'].some(l => p.level?.includes(l))
            ).slice(0, 15); // Show top 15

            return { typeDistribution, sales: { count: salesProjects.length, contract: totalSalesContract, productRatio }, levelDistribution, abcProjects };
        }

        if (viewType === 'contract_kpi') {
            const regionKPIs = MAJOR_REGIONS.map(r => {
                const regionProjects = projects.filter(p => {
                    const mappedRegion = REGION_MAPPING[p.region] || p.region;
                    return mappedRegion === r || p.region.startsWith(r);
                });
                const actual = regionProjects.reduce((sum, p) => sum + p.payment.contractAmount, 0);
                return { name: r, actual, target: 100000000 };
            });

            const FIXED_INDUSTRIES = ['核能', '车辆', '电子信息', '电力能源', '高端制造', '教育'];
            const industryKPIs = FIXED_INDUSTRIES.map(i => {
                const industryProjects = projects.filter(p => p.industry === i);
                const actual = industryProjects.reduce((sum, p) => sum + p.payment.contractAmount, 0);
                return { name: i, actual, target: 100000000 };
            });

            const topProjects = [...projects].sort((a, b) => b.payment.contractAmount - a.payment.contractAmount).slice(0, 10);

            return { regionKPIs, industryKPIs, topProjects };
        }

        if (viewType === 'revenue_kpi') {
            const regionKPIs = MAJOR_REGIONS.map(r => {
                const regionProjects = projects.filter(p => {
                    const mappedRegion = REGION_MAPPING[p.region] || p.region;
                    return mappedRegion === r || p.region.startsWith(r);
                });
                const target = regionProjects.reduce((sum, p) => sum + p.payment.contractAmount, 0);
                const actual = regionProjects.reduce((sum, p) => sum + p.payment.totalPaid, 0);
                return { name: r, actual, target };
            });

            const FIXED_INDUSTRIES = ['核能', '车辆', '电子信息', '电力能源', '高端制造', '教育'];
            const industryKPIs = FIXED_INDUSTRIES.map(i => {
                const industryProjects = projects.filter(p => p.industry === i);
                const target = industryProjects.reduce((sum, p) => sum + p.payment.contractAmount, 0);
                const actual = industryProjects.reduce((sum, p) => sum + p.payment.totalPaid, 0);
                return { name: i, actual, target };
            });

            const topProjects = [...projects].sort((a, b) => b.payment.totalPaid - a.payment.totalPaid).slice(0, 10);

            return { regionKPIs, industryKPIs, topProjects };
        }

        if (viewType === 'acceptance_kpi') {
            const regionKPIs = MAJOR_REGIONS.map(r => {
                const regionProjects = projects.filter(p => {
                    const mappedRegion = REGION_MAPPING[p.region] || p.region;
                    return mappedRegion === r || p.region.startsWith(r);
                });
                const target = regionProjects.length;
                const actual = regionProjects.filter(p => p.status === ProjectStatus.Accepted).length;
                const abnormal = regionProjects.filter(p => p.status === ProjectStatus.Delayed || p.status === ProjectStatus.Paused).length;
                return { name: r, actual, target, abnormal };
            });

            const FIXED_INDUSTRIES = ['核能', '车辆', '电子信息', '电力能源', '高端制造', '教育'];
            const industryKPIs = FIXED_INDUSTRIES.map(i => {
                const industryProjects = projects.filter(p => p.industry === i);
                const target = industryProjects.length;
                const actual = industryProjects.filter(p => p.status === ProjectStatus.Accepted).length;
                const abnormal = industryProjects.filter(p => p.status === ProjectStatus.Delayed || p.status === ProjectStatus.Paused).length;
                return { name: i, actual, target, abnormal };
            });

            return { regionKPIs, industryKPIs };
        }

        return [];
    }, [data.projects, viewType]);

    // --- 2. Render Functions for Complex Views ---

    // A. Schedule View
    const renderScheduleView = () => (
        <div className="flex flex-col h-full space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm shrink-0">
                <h4 className="text-sm font-black text-slate-700 mb-4 flex items-center">
                    <span className="w-1.5 h-4 bg-emerald-500 rounded-full mr-2"></span>
                    各区域验收率与延期率 (Acceptance vs Delay)
                </h4>
                <div className="h-64">
                    <ResponsiveContainer>
                        <BarChart data={chartData as any[]} barGap={8}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis unit="%" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                            <Bar dataKey="acceptanceRate" name="验收率" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                            <Bar dataKey="delayRate" name="延期率" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white flex-1 rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h4 className="text-sm font-black text-slate-700 flex items-center">
                        <span className="w-1.5 h-4 bg-rose-500 rounded-full mr-2"></span>
                        投入进度剪刀差预警 (Gap Analysis)
                    </h4>
                    <div className="text-[10px] bg-slate-200 text-slate-600 px-2 py-1 rounded font-bold">差值 = 投入% - 进度%</div>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-white text-slate-400 font-bold sticky top-0 z-10">
                            <tr>
                                <th className="p-4 pl-6">项目</th>
                                <th className="p-4 text-center">区域</th>
                                <th className="p-4 text-center">项目经理</th>
                                <th className="p-4 text-center">工时投入</th>
                                <th className="p-4 text-center">里程碑进度</th>
                                <th className="p-4 text-center text-rose-500">差值 (GAP)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-bold text-slate-600">
                            {data.projects.map(p => {
                                const gap = p.execution.inputPercent - p.execution.progress;
                                return (
                                    <tr key={p.id} onClick={() => onNavigateToProject(p.id)} className="hover:bg-slate-50 cursor-pointer group transition-colors">
                                        <td className="p-4 pl-6 font-black text-slate-800 group-hover:text-indigo-600">{p.projectName}</td>
                                        <td className="p-4 text-center text-indigo-500 bg-indigo-50/10">{p.region}</td>
                                        <td className="p-4 text-center">{p.members.projectManager}</td>
                                        <td className="p-4 text-center font-mono">{p.execution.inputPercent.toFixed(2)}%</td>
                                        <td className="p-4 text-center font-mono">{p.execution.progress.toFixed(2)}%</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded ${gap > 20 ? 'bg-rose-100 text-rose-600' : 'bg-rose-50 text-rose-400'}`}>
                                                +{gap.toFixed(2)}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    // B. Cost View
    const renderCostView = () => (
        <div className="flex flex-col h-full space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm shrink-0">
                <h4 className="text-sm font-black text-slate-700 mb-4 flex items-center">
                    <span className="w-1.5 h-4 bg-blue-500 rounded-full mr-2"></span>
                    区域工时审计偏差率 (PMO vs Plan)
                </h4>
                <div className="h-64">
                    <ResponsiveContainer>
                        <BarChart data={chartData as any[]} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis unit="%" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="variance" name="偏差率" fill="#3b82f6" radius={[4, 4, 4, 4]} barSize={40}>
                                {(chartData as any[]).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.variance > 0 ? '#ef4444' : '#3b82f6'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white flex-1 rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h4 className="text-sm font-black text-slate-700 flex items-center">
                        <span className="w-1.5 h-4 bg-indigo-500 rounded-full mr-2"></span>
                        项目人力成本审计明细 (Plan vs PMO)
                    </h4>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-white text-slate-400 font-bold sticky top-0 z-10">
                            <tr>
                                <th className="p-4 pl-6">项目</th>
                                <th className="p-4 text-center">计划(人周)</th>
                                <th className="p-4 text-center">PMO(人周)</th>
                                <th className="p-4 text-center">偏差状态</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-bold text-slate-600">
                            {data.projects.map(p => {
                                const planned = p.manHours.plannedTotal;
                                const pmo = p.manHours.pmoAnnualTotal;
                                const isOver = pmo > planned;
                                return (
                                    <tr key={p.id} onClick={() => onNavigateToProject(p.id)} className="hover:bg-slate-50 cursor-pointer group transition-colors">
                                        <td className="p-4 pl-6 font-black text-slate-800 group-hover:text-indigo-600">{p.projectName}</td>
                                        <td className="p-4 text-center font-mono text-indigo-300">{Number(planned.toFixed(1))}</td>
                                        <td className="p-4 text-center font-mono text-slate-800 font-black">{Number(pmo.toFixed(2))}</td>
                                        <td className="p-4 text-center">
                                            {isOver ? (
                                                <span className="px-2 py-1 rounded bg-rose-50 text-rose-600 border border-rose-100 font-black">工时超支</span>
                                            ) : (
                                                <span className="px-2 py-1 rounded bg-slate-100 text-slate-400 font-bold">正常范围</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    // C. Risk View
    const renderRiskView = () => {
        const { pie, bar } = chartData as any;
        return (
            <div className="flex flex-col h-full space-y-6">
                <div className="grid grid-cols-2 gap-6 h-72 shrink-0">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                        <h4 className="text-sm font-black text-slate-700 mb-2">未验收项目风险归因 TOP 3</h4>
                        <div className="flex-1 w-full relative">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={pie}
                                        innerRadius={40}
                                        outerRadius={65}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pie.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pr-24">
                                <div className="w-16 h-16 rounded-full bg-slate-50 border-4 border-white shadow-inner"></div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                        <h4 className="text-sm font-black text-slate-700 mb-2">各区域高风险项目分布</h4>
                        <div className="flex-1 w-full">
                            <ResponsiveContainer>
                                <BarChart data={bar} barGap={4}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                    <Bar dataKey="count" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="bg-white flex-1 rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h4 className="text-sm font-black text-slate-700 flex items-center">
                            <span className="w-1.5 h-4 bg-rose-500 rounded-full mr-2"></span>
                            待重点关注项目清单 (Problematic Projects)
                        </h4>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-white text-slate-400 font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="p-4 pl-6">项目</th>
                                    <th className="p-4">区域</th>
                                    <th className="p-4">状态</th>
                                    <th className="p-4">当前主要风险/原因</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-bold text-slate-600">
                                {data.projects.filter(p => p.status === ProjectStatus.Delayed || p.status === ProjectStatus.Paused).map(p => (
                                    <tr key={p.id} onClick={() => onNavigateToProject(p.id)} className="hover:bg-slate-50 cursor-pointer group transition-colors">
                                        <td className="p-4 pl-6 font-black text-slate-800 group-hover:text-indigo-600">{p.projectName}</td>
                                        <td className="p-4 text-indigo-500">{p.region}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded ${p.status === ProjectStatus.Paused ? 'bg-slate-100 text-slate-500' : 'bg-rose-50 text-rose-600'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-700">{p.statusComment || '综合原因'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // D. Change View
    const renderChangeView = () => (
        <div className="flex flex-col h-full space-y-6">
            <div className="grid grid-cols-2 gap-6 h-64 shrink-0">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                    <h4 className="text-sm font-black text-slate-700 mb-4">区域平均变更次数</h4>
                    <div className="flex-1">
                        <ResponsiveContainer>
                            <BarChart data={chartData as any[]} barGap={4}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                <Bar dataKey="avg" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                    <h4 className="text-sm font-black text-slate-700 mb-4">高频变更项目占比 (&gt;5次)</h4>
                    <div className="flex-1">
                        <ResponsiveContainer>
                            <LineChart data={chartData as any[]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis unit="%" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                <Line type="monotone" dataKey="highFreqRate" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white flex-1 rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h4 className="text-sm font-black text-slate-700 flex items-center">
                        <span className="w-1.5 h-4 bg-amber-500 rounded-full mr-2"></span>
                        变更频繁项目清单
                    </h4>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-white text-slate-400 font-bold sticky top-0 z-10">
                            <tr>
                                <th className="p-4 pl-6">项目</th>
                                <th className="p-4">区域</th>
                                <th className="p-4">经理</th>
                                <th className="p-4 text-center">变更次数</th>
                                <th className="p-4">最近一次变更</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-bold text-slate-600">
                            {data.projects.filter(p => p.changes.length > 0).sort((a, b) => b.changes.length - a.changes.length).map(p => (
                                <tr key={p.id} onClick={() => onNavigateToProject(p.id)} className="hover:bg-slate-50 cursor-pointer group transition-colors">
                                    <td className="p-4 pl-6 font-black text-slate-800 group-hover:text-indigo-600">{p.projectName}</td>
                                    <td className="p-4 text-indigo-500">{p.region}</td>
                                    <td className="p-4">{p.members.projectManager}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded font-black ${p.changes.length > 5 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {p.changes.length}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-400 text-[10px]">{p.changes[0]?.changeDate} - {p.changes[0]?.type}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    // F. Composition View (Balanced 2x2 Layout)
    const renderCompositionView = () => {
        const { typeDistribution, sales, levelDistribution, abcProjects } = chartData as any;

        const Card = ({ title, color, children, className = "" }: any) => (
            <div className={`bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden h-full ${className}`}>
                <div className="flex items-center space-x-2 mb-6 shrink-0">
                    <div className={`w-1.5 h-4 rounded-full ${color}`}></div>
                    <h4 className="text-sm font-black text-slate-800">{title}</h4>
                </div>
                <div className="flex-1 min-h-0">
                    {children}
                </div>
            </div>
        );

        return (
            <div className="grid grid-cols-2 grid-rows-2 gap-6 h-full min-h-0">
                {/* 1. Project Type Statistics */}
                <Card title="项目类型统计" color="bg-blue-500">
                    <div className="h-full w-full">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={typeDistribution}
                                    innerRadius={0}
                                    outerRadius="80%"
                                    paddingAngle={2}
                                    dataKey="value"
                                    cx="50%"
                                    cy="50%"
                                >
                                    {typeDistribution.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* 2. Project Level Statistics */}
                <Card title="项目级别统计" color="bg-indigo-500">
                    <div className="h-full w-full">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={levelDistribution}
                                    innerRadius={0}
                                    outerRadius="80%"
                                    paddingAngle={2}
                                    dataKey="count"
                                    cx="50%"
                                    cy="50%"
                                >
                                    {levelDistribution.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                                <Tooltip formatter={(value: number) => [`${value}个`, '数量']} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* 3. Sales Deep Dive */}
                <Card title="销售类项目专项分析" color="bg-amber-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    <div className="h-full flex flex-col justify-center space-y-6">
                        <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">销售项目总数</div>
                                <div className="text-4xl font-black text-slate-800">{sales.count} <span className="text-sm text-slate-400 font-bold">个</span></div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">合同涉及总金额</div>
                                <div className="text-3xl font-black text-amber-600">¥{sales.contract.toLocaleString()} <span className="text-sm uppercase">元</span></div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* 4. ABC Category List */}
                <Card title="ABC类项目列表" color="bg-rose-500">
                    <div className="h-full overflow-auto custom-scrollbar -mx-6">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/50 text-slate-400 font-bold sticky top-0 z-10 text-[10px]">
                                <tr>
                                    <th className="px-6 py-3">项目名称</th>
                                    <th className="px-4 py-3 text-center">级别</th>
                                    <th className="px-6 py-3 text-right">区域</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-bold text-slate-600">
                                {abcProjects.map((p: any) => (
                                    <tr key={p.id} onClick={() => onNavigateToProject(p.id)} className="hover:bg-slate-50 cursor-pointer group transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-black text-slate-800 group-hover:text-indigo-600 truncate max-w-[180px]">{p.projectName}</div>
                                            <div className="text-[9px] text-slate-400 mt-0.5">{p.projectCode}</div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[9px] ${p.level?.includes('战略') || p.level?.includes('核心') ? 'bg-indigo-50 text-indigo-600' :
                                                p.level?.includes('重大') ? 'bg-blue-50 text-blue-600' :
                                                    'bg-amber-50 text-amber-600'
                                                }`}>
                                                {p.level?.split('（')[0] || p.level}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-400">{p.region}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {abcProjects.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-32 text-slate-300">
                                <div className="text-sm">暂无匹配项目</div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        );
    };

    // G. Contract/Revenue/Acceptance KPI View
    const renderKPIView = () => {
        const { regionKPIs, industryKPIs, topProjects } = chartData as any;
        const isRevenue = viewType === 'revenue_kpi';
        const isAcceptance = viewType === 'acceptance_kpi';

        const progressLabel = isRevenue ? "合同回款率" : isAcceptance ? "项目验收率" : "KPI 完成率";
        const targetLabel = isRevenue ? "合同额" : isAcceptance ? "项目总数" : "目标";
        const unit = isAcceptance ? "个" : "元";

        const KPIBox = ({ title, items, color }: any) => (
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="flex items-center space-x-3 mb-6 shrink-0">
                    <div className={`w-1.5 h-5 rounded-full ${color}`}></div>
                    <h4 className="text-base font-black text-slate-800 tracking-tight">{title}</h4>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <div className="space-y-6">
                        {items.map((item: any) => {
                            const progress = item.target > 0 ? (item.actual / item.target) * 100 : 0;
                            return (
                                <div key={item.name} className="group">
                                    <div className="flex justify-between items-end mb-2">
                                        <div>
                                            <div className="text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-colors uppercase tracking-wider">{item.name}</div>
                                            <div className="text-[9px] text-slate-400 font-bold mt-0.5">{targetLabel}: {item.target.toFixed(0)}{unit}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-black text-slate-800">{item.actual.toFixed(0)} <span className="text-[9px] text-slate-400">{unit}</span></div>
                                            <div className={`text-[9px] font-black ${progress >= 100 ? 'text-emerald-500' : 'text-indigo-500'}`}>
                                                {progressLabel}: {progress.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );

        return (
            <div className="flex flex-col h-full space-y-6 overflow-hidden">
                <div className="grid grid-cols-2 gap-6 h-[400px] shrink-0">
                    <KPIBox title={`各区域 ${isRevenue ? '回款' : isAcceptance ? '验收' : 'KPI'} 情况`} items={regionKPIs} color="bg-indigo-500" />
                    <KPIBox title={`行业 ${isRevenue ? '回款' : isAcceptance ? '验收' : 'KPI'} 情况`} items={industryKPIs} color="bg-blue-500" />
                </div>

                {isAcceptance ? (
                    <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                            <div className="flex items-center space-x-3 mb-6 shrink-0">
                                <div className="w-1.5 h-5 rounded-full bg-rose-500"></div>
                                <h4 className="text-base font-black text-slate-800 tracking-tight">各区域异常项目率</h4>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                <div className="space-y-6">
                                    {regionKPIs.map((item: any) => {
                                        const abnormalRate = item.target > 0 ? (item.abnormal / item.target) * 100 : 0;
                                        return (
                                            <div key={item.name} className="group">
                                                <div className="flex justify-between items-end mb-2">
                                                    <div className="text-xs font-black text-slate-800">{item.name}</div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-black text-rose-500">{item.abnormal} <span className="text-[9px] text-slate-400">个</span></div>
                                                        <div className="text-[9px] font-black text-rose-400">异常率: {abnormalRate.toFixed(1)}%</div>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                                    <div className="h-full bg-rose-500" style={{ width: `${Math.min(abnormalRate, 100)}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                            <div className="flex items-center space-x-3 mb-6 shrink-0">
                                <div className="w-1.5 h-5 rounded-full bg-rose-400"></div>
                                <h4 className="text-base font-black text-slate-800 tracking-tight">各行业异常项目率</h4>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                <div className="space-y-6">
                                    {industryKPIs.map((item: any) => {
                                        const abnormalRate = item.target > 0 ? (item.abnormal / item.target) * 100 : 0;
                                        return (
                                            <div key={item.name} className="group">
                                                <div className="flex justify-between items-end mb-2">
                                                    <div className="text-xs font-black text-slate-800">{item.name}</div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-black text-rose-500">{item.abnormal} <span className="text-[9px] text-slate-400">个</span></div>
                                                        <div className="text-[9px] font-black text-rose-400">异常率: {abnormalRate.toFixed(1)}%</div>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                                    <div className="h-full bg-rose-400" style={{ width: `${Math.min(abnormalRate, 100)}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white flex-1 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                            <h4 className="text-sm font-black text-slate-700 flex items-center">
                                <span className="w-1.5 h-4 bg-slate-400 rounded-full mr-2"></span>
                                TOP 项目清单
                            </h4>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{isRevenue ? '按回款额排序' : '按合同额排序'}</span>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-white text-slate-400 font-bold sticky top-0 z-10 text-[10px] uppercase">
                                    <tr>
                                        <th className="p-4 px-8">项目名称</th>
                                        <th className="p-4 text-center">所属区域</th>
                                        <th className="p-4 text-center">行业</th>
                                        <th className="p-4 text-center">项目状态</th>
                                        <th className="p-4 text-right pr-8">{isRevenue ? '回款额' : '合同额'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-bold text-slate-600">
                                    {topProjects?.map((p: any) => (
                                        <tr key={p.id} onClick={() => onNavigateToProject(p.id)} className="hover:bg-slate-50 cursor-pointer group transition-colors">
                                            <td className="p-4 px-8 font-black text-slate-800 group-hover:text-indigo-600">{p.projectName}</td>
                                            <td className="p-4 text-center">{p.region}</td>
                                            <td className="p-4 text-center">{p.industry}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] ${p.status === ProjectStatus.Accepted ? 'bg-emerald-50 text-emerald-600' :
                                                    p.status === ProjectStatus.Delayed ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                                                    }`}>{p.status}</span>
                                            </td>
                                            <td className="p-4 text-right pr-8 font-mono font-black text-slate-800">
                                                ¥{(isRevenue ? p.payment.totalPaid : p.payment.contractAmount).toLocaleString()}元
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // E. Default/Table View (Preserved for Financial/Outsourcing/General)
    const renderDefaultTableView = () => (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                            <th className="p-5 pl-8">项目名称</th>
                            <th className="p-5 text-center">区域</th>
                            <th className="p-5 text-center">项目经理</th>
                            <th className="p-5 text-center">状态</th>
                            <th className="p-5 text-right">{viewType === 'revenue' ? '回款总额' : '合同金额'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.projects.map(p => (
                            <tr key={p.id} onClick={() => onNavigateToProject(p.id)} className="hover:bg-indigo-50/30 cursor-pointer transition-colors group">
                                <td className="p-5 pl-8">
                                    <div className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{p.projectName}</div>
                                    <div className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{p.projectCode}</div>
                                </td>
                                <td className="p-5 text-center font-bold text-slate-600">{p.region}</td>
                                <td className="p-5 text-center font-bold text-slate-600">{p.members.projectManager}</td>
                                <td className="p-5 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === ProjectStatus.Accepted ? 'bg-emerald-100 text-emerald-600' :
                                        p.status === ProjectStatus.Delayed ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                                        }`}>{p.status}</span>
                                </td>
                                <td className="p-5 text-right font-mono font-bold text-slate-800">
                                    ¥{((viewType === 'revenue' ? p.payment.totalPaid : p.payment.contractAmount) / 10000).toFixed(0)}w
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-8">
            <div className="bg-slate-50 w-full max-w-7xl rounded-[3rem] shadow-2xl flex flex-col h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-white px-10 py-6 border-b border-slate-200 flex justify-between items-center shrink-0">
                    <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-2xl ${viewType === 'risk' ? 'bg-rose-100 text-rose-600' :
                            viewType === 'manhours' ? 'bg-blue-100 text-blue-600' :
                                viewType === 'schedule' ? 'bg-emerald-100 text-emerald-600' :
                                    viewType === 'change' ? 'bg-amber-100 text-amber-600' :
                                        viewType === 'composition' ? 'bg-slate-100 text-slate-600' :
                                            'bg-indigo-100 text-indigo-600'
                            }`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">{data.title}</h3>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">透视分析 / {viewType === 'composition' ? '组成分析' : viewType.toUpperCase()}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden p-8">
                    {viewType === 'schedule' && renderScheduleView()}
                    {viewType === 'manhours' && renderCostView()}
                    {viewType === 'risk' && renderRiskView()}
                    {viewType === 'change' && renderChangeView()}
                    {viewType === 'composition' && renderCompositionView()}
                    {(viewType === 'contract_kpi' || viewType === 'revenue_kpi' || viewType === 'acceptance_kpi') && renderKPIView()}
                    {(viewType === 'general' || viewType === 'budget' || viewType === 'outsourcing' || viewType === 'quality' || viewType === 'revenue') && renderDefaultTableView()}
                </div>

            </div>
        </div>
    );
};

export default DrillDownModal;
