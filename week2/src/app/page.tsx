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
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Capture
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Quick in, quick out. What needs to be done?
        </p>
      </div>

      {/* Quick Input */}
      <div className="mb-8">
        <TaskInput />
      </div>

      {/* Stats bar */}
      {total > 0 && (
        <div className="flex items-center gap-4 mb-4 text-xs font-medium">
          <span className="text-gray-400">{total} total</span>
          <span className="text-emerald-500">{completed} done</span>
          {pending > 0 && (
            <span className="text-amber-500">{pending} pending</span>
          )}
          {total > 0 && (
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      {total > 0 && (
        <div className="flex gap-1 mb-4">
          {(['all', 'pending', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                filter === f
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Task list */}
      <TaskList filter={filter} />
    </div>
  );
}
