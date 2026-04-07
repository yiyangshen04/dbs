'use client';

import { useTaskContext } from '@/context/TaskContext';
import Link from 'next/link';

const priorityColors = {
  low: 'bg-emerald-400',
  medium: 'bg-amber-400',
  high: 'bg-red-400',
};

const categoryColors: Record<string, string> = {
  Uncategorized: 'bg-gray-50 text-gray-500',
  Work: 'bg-blue-50 text-blue-600',
  Study: 'bg-purple-50 text-purple-600',
  Life: 'bg-green-50 text-green-600',
  Ideas: 'bg-amber-50 text-amber-600',
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
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">
          {filter === 'completed' ? '🎯' : '✨'}
        </div>
        <p className="text-sm">
          {filter === 'completed'
            ? 'No completed tasks yet. Keep going!'
            : filter === 'pending'
            ? 'All done! Nothing pending.'
            : 'No tasks yet. Type above to capture your first thought!'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map(task => (
        <div
          key={task.id}
          className={`group flex items-center gap-3 p-3 rounded-xl border transition-all
            ${task.completed
              ? 'bg-gray-50/50 border-gray-100'
              : 'bg-white border-gray-200 hover:border-indigo-200 hover:shadow-sm'
            }`}
        >
          {/* Checkbox */}
          <button
            onClick={() => toggleTask(task.id)}
            className={`flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center
              ${task.completed
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 border-transparent'
                : 'border-gray-300 hover:border-indigo-400'
              }`}
          >
            {task.completed && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          {/* Priority dot */}
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColors[task.priority]}`} />

          {/* Content */}
          <Link
            href={`/task/${task.id}`}
            className={`flex-1 text-sm transition-all ${
              task.completed ? 'line-through text-gray-400' : 'text-gray-700'
            }`}
          >
            {task.content}
          </Link>

          {/* Category tag */}
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${categoryColors[task.category] || 'bg-gray-50 text-gray-500'}`}>
            {task.category}
          </span>

          {/* Delete button */}
          <button
            onClick={() => deleteTask(task.id)}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
