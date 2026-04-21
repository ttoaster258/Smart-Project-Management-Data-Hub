
import React, { useMemo } from 'react';
import { Project, ProjectStatus } from '../types';

interface SMTableProps {
  projects: Project[];
  onNavigateToProject: (projectId: string) => void;
}

const SensitiveProjectTable: React.FC<SMTableProps> = ({ projects, onNavigateToProject }) => {
  const smProjects = useMemo(() => {
    const sensitiveKeywords = ['机密', '内部', 'SM', 'NB', 'TM'];
    return projects.filter(p => {
        return p.securityLevel && sensitiveKeywords.some(k => p.securityLevel.includes(k));
    }).sort((a, b) => {
        const levels: Record<string, number> = { 
            '机密': 3, 'SM': 3, 
            '内部': 2, 'NB': 2, 'TM': 2, 
            '公开': 1 
        };
        return (levels[b.securityLevel] || 0) - (levels[a.securityLevel] || 0);
    });
  }, [projects]);

  return (
     <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
             <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <h3 className="text-lg font-black text-slate-800">SM/涉密项目列表</h3>
             </div>
             <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full">{smProjects.length} Items</span>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left">
                <thead className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest sticky top-0 z-10">
                    <tr>
                        <th className="p-5">项目名称 / 编号</th>
                        <th className="p-5 text-center">密级等级</th>
                        <th className="p-5 text-center">所属区域</th>
                        <th className="p-5 text-center">项目经理</th>
                        <th className="p-5 text-center">当前状态</th>
                        <th className="p-5 text-right">合同金额</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {smProjects.map(p => {
                        const isHighSec = ['机密', 'SM'].some(k => p.securityLevel.includes(k));
                        return (
                        <tr key={p.id} onClick={() => onNavigateToProject(p.id)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                            <td className="p-5">
                                <div className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors mb-1">{p.projectName}</div>
                                <div className="text-[10px] font-mono font-bold text-slate-400">{p.projectCode}</div>
                            </td>
                            <td className="p-5 text-center">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black ${isHighSec ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {p.securityLevel}
                                </span>
                            </td>
                            <td className="p-5 text-center font-bold text-slate-600">{p.region}</td>
                            <td className="p-5 text-center font-bold text-slate-600">{p.members.projectManager}</td>
                            <td className="p-5 text-center">
                                <span className={`text-xs font-bold ${p.status === ProjectStatus.Delayed ? 'text-rose-500' : 'text-slate-500'}`}>{p.status}</span>
                            </td>
                            <td className="p-5 text-right font-mono font-bold text-slate-700">¥{(p.payment.contractAmount/10000).toFixed(0)}w</td>
                        </tr>
                        );
                    })}
                    {smProjects.length === 0 && (
                        <tr><td colSpan={6} className="p-10 text-center text-slate-400">暂无涉密项目</td></tr>
                    )}
                </tbody>
            </table>
        </div>
     </div>
  );
};

export default SensitiveProjectTable;
