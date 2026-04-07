'use client';

import { useState } from 'react';
import { useTaskContext } from '@/context/TaskContext';

type FilterType = 'all' | 'pending' | 'completed';

export default function ExportPage() {
  const { tasks } = useTaskContext();
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = tasks.filter(t => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  async function handleExport() {
    const XLSX = await import('xlsx');
    const data = filtered.map(t => ({
      Content: t.content,
      Status: t.completed ? 'Completed' : 'Pending',
      Priority: t.priority.charAt(0).toUpperCase() + t.priority.slice(1),
      Category: t.category,
      'Created At': new Date(t.createdAt).toLocaleString(),
      'Completed At': t.completedAt ? new Date(t.completedAt).toLocaleString() : '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, ...data.map(row => String((row as Record<string, string>)[key] || '').length)) + 2,
    }));
    ws['!cols'] = colWidths;
    XLSX.writeFile(wb, `quicknote-export-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  if (tasks.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-6 pt-24 text-center">
        <p className="text-muted text-sm">Nothing to export yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-1">
          {(['all', 'pending', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[11px] px-2 py-1 rounded capitalize transition-all ${
                filter === f ? 'text-accent font-medium' : 'text-muted hover:text-foreground'
              }`}
            >
              {f} ({f === 'all' ? tasks.length : f === 'pending' ? tasks.filter(t => !t.completed).length : tasks.filter(t => t.completed).length})
            </button>
          ))}
        </div>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="text-sm text-accent hover:underline disabled:opacity-30 disabled:no-underline"
        >
          Download .xlsx ({filtered.length})
        </button>
      </div>

      {/* Compact table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-[11px] text-muted uppercase tracking-widest">
            <th className="text-left py-2 font-normal">Task</th>
            <th className="text-left py-2 font-normal w-20">Status</th>
            <th className="text-left py-2 font-normal w-20">Priority</th>
            <th className="text-left py-2 font-normal w-24">Category</th>
            <th className="text-right py-2 font-normal w-24">Date</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(task => (
            <tr key={task.id} className="border-b border-border/30">
              <td className={`py-2 ${task.completed ? 'line-through text-muted' : 'text-foreground'}`}>
                {task.content}
              </td>
              <td className="py-2">
                <span className={task.completed ? 'text-emerald-500' : 'text-amber-500'}>
                  {task.completed ? '✓' : '○'}
                </span>
              </td>
              <td className="py-2 text-muted capitalize text-[12px]">{task.priority}</td>
              <td className="py-2 text-muted text-[12px]">{task.category}</td>
              <td className="py-2 text-muted text-[12px] text-right">{new Date(task.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
