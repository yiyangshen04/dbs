'use client';

import { useTaskContext } from '@/context/TaskContext';
import Link from 'next/link';

const priorityDots: Record<string, string> = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-red-400',
};

export default function TaskList({ filter }: { filter?: 'all' | 'pending' | 'completed' }) {
  const { tasks, toggleTask } = useTaskContext();

  const filtered = tasks.filter(t => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <p className="text-center text-muted/40 text-sm py-12">
        {filter === 'completed'
          ? 'Nothing completed yet.'
          : filter === 'pending'
          ? 'All clear.'
          : ''}
      </p>
    );
  }

  return (
    <div>
      {filtered.map((task, i) => (
        <div
          key={task.id}
          className={`flex items-center gap-3 py-2.5 ${
            i < filtered.length - 1 ? 'border-b border-border/50' : ''
          }`}
        >
          <button
            onClick={() => toggleTask(task.id)}
            className={`flex-shrink-0 w-4 h-4 rounded border transition-all ${
              task.completed
                ? 'bg-accent border-accent'
                : 'border-border hover:border-accent'
            }`}
          >
            {task.completed && (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <span className={`text-xs ${priorityDots[task.priority]}`}>●</span>

          <Link
            href={`/task/${task.id}`}
            className={`flex-1 text-[15px] leading-snug transition-all ${
              task.completed
                ? 'line-through text-muted/50'
                : 'text-foreground'
            }`}
          >
            {task.content}
          </Link>

          {task.category !== 'Uncategorized' && (
            <span className="text-[10px] text-muted/60">{task.category}</span>
          )}
        </div>
      ))}
    </div>
  );
}
