'use client';

import { useState } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import TaskInput from '@/components/TaskInput';
import TaskList from '@/components/TaskList';

export default function HomePage() {
  const { tasks } = useTaskContext();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;

  return (
    <div className="max-w-xl mx-auto px-6 pt-16 pb-8">
      {/* Zen input area */}
      <TaskInput />

      {/* Minimal stats + filter */}
      {total > 0 && (
        <div className="flex items-center justify-between mt-10 mb-4">
          <div className="flex gap-1">
            {(['all', 'pending', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[11px] px-2 py-1 rounded transition-all capitalize ${
                  filter === f
                    ? 'text-accent font-medium'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-muted">
            {completed}/{total} done
          </span>
        </div>
      )}

      {/* Clean task list */}
      <TaskList filter={filter} />
    </div>
  );
}
