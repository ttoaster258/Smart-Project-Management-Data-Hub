
import React, { useState, useRef, useEffect } from 'react';
import { FilterState, Region } from '../types';

interface TopFilterDropdownsProps {
  filters: FilterState;
  allRegions: string[];
  onFilterUpdate: (newFilters: FilterState) => void;
}

const TopFilterDropdowns: React.FC<TopFilterDropdownsProps> = ({ filters, allRegions, onFilterUpdate }) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFilter = (type: keyof FilterState, value: any) => {
    const current = filters[type] as any[];
    const next = current.includes(value)
      ? current.filter(x => x !== value)
      : [...current, value];
    onFilterUpdate({ ...filters, [type]: next });
  };

  const regionButtons = [
    { label: '东区', value: Region.East },
    { label: '南区', value: Region.South },
    { label: '西区', value: Region.West },
    { label: '北区（华中）', value: Region.NorthCentral },
    { label: '北区（华北，东北）', value: Region.NorthNortheast },
    { label: '创景', value: Region.InnovationTrans },
  ];

  return (
    <div className="flex items-center space-x-3" ref={containerRef}>
      <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm space-x-1">
        {regionButtons.map((btn) => {
          const isActive = filters.regions.includes(btn.value);
          return (
            <button
              key={btn.label}
              onClick={() => toggleFilter('regions', btn.value)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {btn.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TopFilterDropdowns;
