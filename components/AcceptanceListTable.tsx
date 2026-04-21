
import React, { useMemo } from 'react';
import { Project, ProjectStatus } from '../types';

interface AcceptanceListProps {
  projects: Project[];
  onNavigateToProject: (projectId: string) => void;
}

const AcceptanceListTable: React.FC<AcceptanceListProps> = ({ projects, onNavigateToProject }) => {
  const dueProjects = useMemo(() => {
     return projects.filter(p => p.timeline.acceptanceYear === '2025' && p.status !== ProjectStatus.Accepted)
                    .sort((a, b) => a.timeline.acceptanceDate.localeCompare(b.timeline.acceptanceDate));
  }, [projects]);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
       <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-black text-slate-800">应验收项目清单 (Due 2025)</h3>
          <span className="text-xs font-bold text-slate-400">{dueProjects.length} Projects Pending</span>
       </div>
       <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left">
             <thead className="bg-indigo-50 text-indigo-800 text-[11px] font-black uppercase tracking-widest sticky top-0 z-10">
                <tr>
                   <th className="p-6">项目名称</th>
                   <th className="p-6 text-center">计划验收日期</th>
                   <th className="p-6 text-center">所属区域</th>
                   <th className="p-6 text-center">项目经理</th>
                   <th className="p-6 text-center">当前状态</th>
                   <th className="p-6 text-center">延期月数</th>
                   <th className="p-6 text-right">剩余合同款</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 text-sm">
                {dueProjects.map(p => (
                   <tr key={p.id} onClick={() => onNavigateToProject(p.id)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                      <td className="p-6 font-black text-slate-800 group-hover:text-indigo-600">{p.projectName}</td>
                      <td className="p-6 text-center font-mono font-bold text-slate-600">{p.timeline.acceptanceDate}</td>
                      <td className="p-6 text-center font-bold text-slate-500">{p.region}</td>
                      <td className="p-6 text-center font-bold text-slate-500">{p.members.projectManager}</td>
                      <td className="p-6 text-center">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-black ${p.status === ProjectStatus.Delayed ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                            {p.status}
                         </span>
                      </td>
                      <td className="p-6 text-center font-mono text-rose-500 font-black text-lg">
                         {p.timeline.delayMonths > 0 ? `+${p.timeline.delayMonths}` : '-'}
                      </td>
                      <td className="p-6 text-right font-mono text-slate-400">¥{(p.payment.pending/10000).toFixed(0)}w</td>
                   </tr>
                ))}
                {dueProjects.length === 0 && (
                   <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 font-bold">
                         暂无符合条件的应验收项目 (Excellent!)
                      </td>
                   </tr>
                )}
             </tbody>
          </table>
       </div>
    </div>
  );
};

export default AcceptanceListTable;
