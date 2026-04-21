import React, { useState } from 'react';
import { X, TrendingUp, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { ProductSalesStats, Project } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
  Cell
} from 'recharts';

interface ProductValueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToProject?: (projectId: string) => void;
  lowSatisfactionProjects: { name: string; count: number; percentage: number }[];
  productSalesData: { name: string; amount: number }[];
  // 新增：毛利率分布数据
  marginDist: { label: string; count: number; color: string }[];
  regionalMarginDist: { name: string; '30%以上': number; '10%-30%': number; '0%-10%': number; '0%以下': number }[];
  // 新增：亮点工程与标杆项目数据
  highlightProjects: Project[];
  benchmarkProjects: Project[];
  combinedRegionData: { name: string; 亮点工程: number; 标杆项目: number }[];
}

const formatCurrency = (value: number): string => {
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
  if (value >= 10000) return `${(value / 10000).toFixed(2)}万`;
  return value.toLocaleString();
};

const ProductValueModal: React.FC<ProductValueModalProps> = ({
  isOpen,
  onClose,
  onNavigateToProject,
  lowSatisfactionProjects,
  productSalesData,
  marginDist,
  regionalMarginDist,
  highlightProjects,
  benchmarkProjects,
  combinedRegionData
}) => {
  const [activeTab, setActiveTab] = useState<'product' | 'margin' | 'highlight'>('product');
  const [projectType, setProjectType] = useState<'highlight' | 'benchmark'>('highlight');

  if (!isOpen) return null;

  // 计算总产品销售金额
  const totalProductSales = productSalesData.reduce((sum, item) => sum + item.amount, 0);
  // 计算低满意度项目总数
  const totalLowSatisfaction = lowSatisfactionProjects.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-8">
      <div className="bg-slate-50 w-full max-w-7xl rounded-[2rem] shadow-2xl flex flex-col h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-white px-8 py-6 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800">产品价值详情</h3>
              <div className="text-sm text-slate-500 font-bold mt-1">产品销售排名 · 毛利率分布 · 亮点工程与标杆项目</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white px-8 py-4 border-b border-slate-100 flex gap-2">
          <button
            onClick={() => setActiveTab('product')}
            className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'product'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            产品销售排名
          </button>
          <button
            onClick={() => setActiveTab('margin')}
            className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'margin'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            毛利率分布
          </button>
          <button
            onClick={() => setActiveTab('highlight')}
            className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'highlight'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            亮点工程与标杆项目
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          {/* Tab 1: 产品销售排名 */}
          {activeTab === 'product' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
              {/* 左侧：产品销售排名 */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xl font-black text-slate-800">产品销售排名</h4>
                  <div className="text-sm font-bold text-slate-400">
                    销售总额: <span className="text-blue-600">{formatCurrency(totalProductSales)}</span>
                  </div>
                </div>

                {productSalesData.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <TrendingUp size={48} className="mx-auto mb-4 opacity-30" />
                      <div className="font-bold">暂无产品销售数据</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto space-y-3">
                    {productSalesData.map((item, idx) => {
                      const percent = totalProductSales > 0 ? (item.amount / totalProductSales * 100) : 0;
                      return (
                        <div key={item.name} className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:shadow-md transition-all">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                              idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' :
                              idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                              idx === 2 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white' :
                              'bg-blue-100 text-blue-600'
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-slate-700 truncate">{item.name}</span>
                                <span className="text-lg font-black text-blue-600 ml-4">{formatCurrency(item.amount)}</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(percent, 100)}%` }}
                                />
                              </div>
                              <div className="text-xs text-slate-400 font-bold mt-1 text-right">{percent.toFixed(1)}%</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 右侧：低满意度项目原因分布 */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h4 className="text-xl font-black text-slate-800">低满意度项目原因分布</h4>
                    <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-black rounded-lg">需改进</span>
                  </div>
                  <div className="text-sm font-bold text-slate-400">
                    影响项目: <span className="text-orange-600">{totalLowSatisfaction}</span> 个
                  </div>
                </div>

                {lowSatisfactionProjects.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <AlertTriangle size={48} className="mx-auto mb-4 opacity-30" />
                      <div className="font-bold">暂无低满意度项目数据</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-wider">原因</th>
                          <th className="text-center py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-wider">影响项目数</th>
                          <th className="text-right py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-wider">占比</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowSatisfactionProjects.map((item, idx) => (
                          <tr key={idx} className="border-b border-slate-50 hover:bg-orange-50/50 transition-colors">
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  idx === 0 ? 'bg-red-500' :
                                  idx === 1 ? 'bg-orange-500' :
                                  idx === 2 ? 'bg-amber-500' :
                                  'bg-slate-400'
                                }`} />
                                <span className="font-bold text-slate-700">{item.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="text-lg font-black text-orange-600">{item.count}</span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-orange-500 h-full rounded-full"
                                    style={{ width: `${item.percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm font-bold text-slate-500 w-12">{item.percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: 毛利率分布 */}
          {activeTab === 'margin' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 项目毛利率分布 */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h4 className="text-xl font-black text-slate-800 mb-6">项目毛利率分布</h4>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={marginDist}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 13, fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 13, fontWeight: 700 }} />
                      <Tooltip cursor={{ fill: '#F8FAFC' }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={60}>
                        {marginDist.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 区域毛利率分布 */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h4 className="text-xl font-black text-slate-800 mb-6">区域毛利率分布</h4>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regionalMarginDist}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 13, fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 13, fontWeight: 700 }} />
                      <Tooltip cursor={{ fill: '#F8FAFC' }} />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 'bold' }} />
                      <Bar dataKey="30%以上" fill="#10B981" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="10%-30%" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="0%-10%" fill="#F59E0B" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="0%以下" fill="#EF4444" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: 亮点工程与标杆项目 */}
          {activeTab === 'highlight' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-black text-slate-800">亮点工程与标杆项目</h4>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setProjectType('highlight')}
                    className={`px-6 py-2 text-sm rounded-lg transition-all font-bold ${projectType === 'highlight' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    亮点工程
                  </button>
                  <button
                    onClick={() => setProjectType('benchmark')}
                    className={`px-6 py-2 text-sm rounded-lg transition-all font-bold ${projectType === 'benchmark' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    标杆项目
                  </button>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-8">
                {/* 左侧：区域分布图 */}
                <div className="w-full lg:w-1/3 h-[300px] flex flex-col items-center">
                  <div className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest">区域分布</div>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={combinedRegionData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 700 }} dy={10} />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 700 }}
                        allowDecimals={false}
                        domain={[0, 'dataMax + 1']}
                      />
                      <Tooltip cursor={{ fill: '#F8FAFC' }} />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                      <Bar name="亮点工程" dataKey="亮点工程" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="亮点工程" position="top" fill="#3B82F6" fontSize={10} fontWeight="bold" />
                      </Bar>
                      <Bar name="标杆项目" dataKey="标杆项目" fill="#6366F1" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="标杆项目" position="top" fill="#6366F1" fontSize={10} fontWeight="bold" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* 右侧：项目列表 */}
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-base text-left">
                    <thead className="text-xs text-gray-400 bg-gray-50/50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 font-black uppercase tracking-widest text-blue-600">项目名称</th>
                        <th className="px-4 py-3 font-black uppercase tracking-widest">区域</th>
                        <th className="px-4 py-3 font-black uppercase tracking-widest">行业</th>
                        <th className="px-4 py-3 font-black uppercase tracking-widest text-right">进度</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectType === 'highlight' ? (
                        highlightProjects.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-400 font-bold">暂无亮点工程项目</td>
                          </tr>
                        ) : (
                          highlightProjects.map((p, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-gray-50 last:border-0 hover:bg-gray-50/30 transition-colors cursor-pointer group"
                              onClick={() => onNavigateToProject?.(p.id)}
                            >
                              <td className="px-4 py-4 font-black text-gray-800 group-hover:text-blue-600 transition-colors">{p.projectName}</td>
                              <td className="px-4 py-4 text-gray-500 font-bold">{p.region}</td>
                              <td className="px-4 py-4 text-gray-500 font-bold">{p.industry}</td>
                              <td className="px-4 py-4 text-right">
                                <span className="text-blue-600 font-black">{p.execution.progress}%</span>
                              </td>
                            </tr>
                          ))
                        )
                      ) : (
                        benchmarkProjects.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-400 font-bold">暂无标杆项目</td>
                          </tr>
                        ) : (
                          benchmarkProjects.map((p, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-gray-50 last:border-0 hover:bg-gray-50/30 transition-colors cursor-pointer group"
                              onClick={() => onNavigateToProject?.(p.id)}
                            >
                              <td className="px-4 py-4 font-black text-gray-800 group-hover:text-blue-600 transition-colors">{p.projectName}</td>
                              <td className="px-4 py-4 text-gray-500 font-bold">{p.region}</td>
                              <td className="px-4 py-4 text-gray-500 font-bold">{p.industry}</td>
                              <td className="px-4 py-4 text-right">
                                <span className="text-blue-600 font-black">{p.execution.progress}%</span>
                              </td>
                            </tr>
                          ))
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductValueModal;