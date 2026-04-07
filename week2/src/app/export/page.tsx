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
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">📤</div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Nothing to export</h2>
        <p className="text-sm text-muted">Add some tasks first, then export your data.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Export</h1>
        <p className="text-sm text-muted mt-1">Preview and download your tasks as an Excel file.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-1">
          {(['all', 'pending', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                filter === f
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              {f} ({
                f === 'all' ? tasks.length :
                f === 'pending' ? tasks.filter(t => !t.completed).length :
                tasks.filter(t => t.completed).length
              })
            </button>
          ))}
        </div>

        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="px-5 py-2.5 bg-accent text-black rounded-xl
                     text-sm font-semibold hover:bg-accent/80
                     transition-all active:scale-95
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Download Excel ({filtered.length} tasks)
        </button>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-hover border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Task</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task, i) => (
                <tr
                  key={task.id}
                  className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-surface' : 'bg-surface-hover/50'}`}
                >
                  <td className={`px-4 py-3 ${task.completed ? 'line-through text-muted' : 'text-foreground'}`}>
                    {task.content}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                      task.completed
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {task.completed ? 'Done' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted capitalize">{task.priority}</td>
                  <td className="px-4 py-3 text-xs text-muted">{task.category}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
