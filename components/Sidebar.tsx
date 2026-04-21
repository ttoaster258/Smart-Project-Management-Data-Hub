import React, { useState } from 'react';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  isSecondary?: boolean;
  children?: NavItem[];
}

interface SidebarProps {
  navItems: NavItem[];
  activeNav: string;
  onNavChange: (id: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  currentUser?: { username: string; name?: string } | null;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ navItems, activeNav, onNavChange, isCollapsed, onToggle, currentUser, onLogout }) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'PMO_Project_Management': true
  });

  const toggleGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <aside
      className={`${isCollapsed ? 'w-20' : 'w-64'} h-full bg-slate-900 flex flex-col transition-all duration-300 shadow-xl z-50`}
    >
      {/* Brand / Logo Area */}
      <div className="h-16 flex items-center justify-center border-b border-slate-800 shrink-0">
        {isCollapsed ? (
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl">D</div>
        ) : (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black">D</div>
            <span className="text-white font-bold text-lg tracking-tight">DataHub</span>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-6 px-3 overflow-y-auto custom-scrollbar flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = activeNav === item.id;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedGroups[item.id];
          const isChildActive = hasChildren && item.children?.some(child => child.id === activeNav);

          return (
            <div key={item.id} className="flex flex-col gap-1">
              {/* Primary Item */}
              <button
                onClick={() => onNavChange(item.id)}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} px-4 py-4 rounded-2xl transition-all duration-200 group relative ${isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                    : (isChildActive && !isActive)
                      ? 'bg-slate-800/50 text-indigo-400'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <div className={`${isActive ? 'text-white' : (isChildActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white')}`}>
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive || isChildActive ? 2.5 : 2} d={item.icon} />
                  </svg>
                </div>

                {!isCollapsed && (
                  <>
                    <span className={`ml-4 text-base font-black tracking-tight flex-1 text-left ${isActive ? 'text-white' : (isChildActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white')}`}>
                      {item.label}
                    </span>
                    {hasChildren && (
                      <div
                        onClick={(e) => toggleGroup(item.id, e)}
                        className={`p-1 rounded-lg hover:bg-white/10 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    )}
                  </>
                )}

                {/* Tooltip for collapsed mode */}
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl border border-slate-700">
                    {item.label}
                  </div>
                )}
              </button>

              {/* Children Items */}
              {!isCollapsed && hasChildren && isExpanded && (
                <div className="flex flex-col gap-1 mt-1 animate-in slide-in-from-top-2 duration-200">
                  {item.children?.map(child => {
                    const isChildActive = activeNav === child.id;
                    return (
                      <button
                        key={child.id}
                        onClick={() => onNavChange(child.id)}
                        className={`w-full flex items-center justify-start pl-12 pr-4 py-2.5 rounded-xl transition-all duration-200 group relative ${isChildActive
                            ? 'bg-slate-800 text-indigo-400'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                          }`}
                      >
                        <span className={`text-sm font-bold tracking-wide ${isChildActive ? 'text-indigo-400 font-black' : ''}`}>
                          {child.label}
                        </span>

                        {isChildActive && (
                          <span className="absolute left-8 w-2 h-2 rounded-full bg-indigo-500"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User Info & Logout Area */}
      {currentUser && (
        <div className="px-3 py-3 border-t border-slate-800 shrink-0">
          {isCollapsed ? (
            <div className="flex justify-center">
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {currentUser.name?.charAt(0) || currentUser.username?.charAt(0) || 'U'}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  {currentUser.name?.charAt(0) || currentUser.username?.charAt(0) || 'U'}
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-medium truncate max-w-[120px]">
                    {currentUser.name || currentUser.username}
                  </span>
                  <span className="text-slate-400 text-xs">已登录</span>
                </div>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors group"
                  title="退出登录"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer Toggle */}
      <div className="p-4 border-t border-slate-800 shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-3 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <svg className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;