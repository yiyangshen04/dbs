'use client';

import { useState } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import TaskInput from '@/components/TaskInput';
import TaskList from '@/components/TaskList';

export default function HomePage() {
  const { tasks } = useTaskContext();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const total = tasks.length;

  return (
    <div className="p-6">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-foreground">Capture</h1>
        {total > 0 && (
          <div className="flex gap-1 bg-surface rounded-lg border border-border p-0.5">
            {(['all', 'pending', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${
                  filter === f
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input card */}
      <div className="mb-6">
        <TaskInput />
      </div>

      {/* Table list */}
      <TaskList filter={filter} />
    </div>
  );
}
