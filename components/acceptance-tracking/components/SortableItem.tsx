// 拖拽排序项组件 - 用于列设置

import React from 'react';
import { GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

interface SortableItemProps {
  id: string;
  label: string;
  isVisible: boolean;
  onToggle: (id: string, isVisible: boolean) => void;
}

export default function SortableItem({ id, label, isVisible, onToggle }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors group"
    >
      {/* 拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* 复选框 */}
      <label className="flex flex-1 items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          checked={isVisible}
          onChange={(e) => onToggle(id, e.target.checked)}
        />
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </label>
    </div>
  );
}