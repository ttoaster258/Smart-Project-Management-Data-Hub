
import React, { useMemo } from 'react';
import { Project, ProjectStatus } from '../types';

interface PMTableProps {
  projects: Project[];
  onNavigateToProject: (projectId: string) => void;
}

const ProjectManagerTable: React.FC<PMTableProps> = ({ projects, onNavigateToProject }) => {
  const pmList = useMemo(() => {
    const pmGroup = projects.reduce((acc, p) => {
        const pm = p.members.projectManager;
        if (!acc[pm]) acc[pm] = [];
        acc[pm].push(p);
        return acc;
    }, {} as Record<string, Project[]>);
    
    return Object.entries(pmGroup)
        .map(([name, list]) => {
            const projectsList = list as Project[];
            return { name, count: projectsList.length, projects: projectsList };
        })
        .sort((a, b) => b.count - a.count);
  }, [projects]);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
             <h3 className="text-lg font-black text-slate-800">项目经理负载清单 (PM Load)</h3>
             <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{pmList.length} Managers</span>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0 z-10">
                    <tr>
                        <th className="p-6">项目经理</th>
                        <th className="p-6 text-center">负责项目总数</th>
                        <th className="p-6">具体负责项目清单</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {pmList.map(pm => (
                        <tr key={pm.name} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-6">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm">{pm.name[0]}</div>
                                    <span className="font-bold text-slate-700 text-sm">{pm.name}</span>
                                </div>
                            </td>
                            <td className="p-6 text-center">
                                <span className="text-xl font-black text-slate-800">{pm.count}</span>
                            </td>
                            <td className="p-6">
                                <div className="flex flex-wrap gap-3">
                                    {pm.projects.map(p => (
                                        <div key={p.id} onClick={() => onNavigateToProject(p.id)} className="group cursor-pointer border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md rounded-xl p-3 transition-all min-w-[200px]">
                                            <div className="text-xs font-black text-slate-700 group-hover:text-indigo-600 truncate mb-1">{p.projectName}</div>
                                            <div className="flex justify-between items-center">
                                                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${p.status === ProjectStatus.Accepted ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{p.status}</span>
                                                <span className="text-[8px] font-mono text-slate-400">{p.projectCode}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default ProjectManagerTable;
