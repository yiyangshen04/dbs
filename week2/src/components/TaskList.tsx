'use client';

import { useTaskContext } from '@/context/TaskContext';
import Link from 'next/link';

const priorityBadge: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

export default function TaskList({ filter }: { filter?: 'all' | 'pending' | 'completed' }) {
  const { tasks, toggleTask, deleteTask } = useTaskContext();

  const filtered = tasks.filter(t => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-muted text-sm">
        {filter === 'completed' ? 'Nothing completed yet.' : filter === 'pending' ? 'All clear!' : 'No tasks yet.'}
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-hover text-[11px] text-muted uppercase tracking-wider">
            <th className="w-10 px-3 py-2"></th>
            <th className="text-left py-2 font-medium">Task</th>
            <th className="text-left py-2 font-medium w-16">Pri</th>
            <th className="text-left py-2 font-medium w-24 max-sm:hidden">Category</th>
            <th className="text-right py-2 pr-3 font-medium w-20 max-sm:hidden">Time</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(task => (
            <tr key={task.id} className="border-b border-border/50 hover:bg-surface-hover/50 group transition-colors">
              <td className="px-3 py-2">
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    task.completed ? 'bg-accent border-accent' : 'border-border hover:border-accent'
                  }`}
                >
                  {task.completed && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </td>
              <td className="py-2">
                <Link
                  href={`/task/${task.id}`}
                  className={`hover:text-accent transition-colors ${task.completed ? 'line-through text-muted' : 'text-foreground'}`}
                >
                  {task.content}
                </Link>
              </td>
              <td className="py-2">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${priorityBadge[task.priority]}`}>
                  {task.priority}
                </span>
              </td>
              <td className="py-2 text-muted text-xs max-sm:hidden">{task.category}</td>
              <td className="py-2 pr-3 text-muted text-[11px] text-right max-sm:hidden">
                {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </td>
              <td className="pr-2">
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
