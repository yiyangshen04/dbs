'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTaskContext } from '@/context/TaskContext';
import type { Task } from '@/context/TaskContext';

const categories = ['Work', 'Study', 'Life', 'Ideas'];
const priorities: { value: Task['priority']; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700 ring-amber-200' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-700 ring-red-200' },
];

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { getTask, updateTask, toggleTask, deleteTask } = useTaskContext();
  const task = getTask(id);

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (task) setEditContent(task.content);
  }, [task]);

  if (!task) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Task not found</h2>
        <p className="text-sm text-gray-400 mb-6">This task may have been deleted or the page was refreshed.</p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600 transition-colors"
        >
          Back to Capture
        </button>
      </div>
    );
  }

  function handleSave() {
    if (editContent.trim()) {
      updateTask(id, { content: editContent.trim() });
      setEditing(false);
    }
  }

  function handleDelete() {
    deleteTask(id);
    router.push('/');
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Task card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        {/* Status badge */}
        <div className="flex items-center justify-between mb-4">
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              task.completed
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-amber-50 text-amber-600'
            }`}
          >
            {task.completed ? '✓ Completed' : '○ Pending'}
          </span>
          <span className="text-xs text-gray-300">
            {new Date(task.createdAt).toLocaleString()}
          </span>
        </div>

        {/* Content */}
        {editing ? (
          <div className="mb-6">
            <input
              type="text"
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full text-lg font-semibold px-3 py-2 border border-indigo-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSave}
                className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-xs hover:bg-indigo-600"
              >
                Save
              </button>
              <button
                onClick={() => { setEditing(false); setEditContent(task.content); }}
                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <h1
            onClick={() => setEditing(true)}
            className={`text-lg font-semibold mb-6 cursor-pointer hover:text-indigo-600 transition-colors
              ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}
          >
            {task.content}
          </h1>
        )}

        {/* Priority */}
        <div className="mb-4">
          <label className="text-xs font-medium text-gray-400 mb-2 block">Priority</label>
          <div className="flex gap-2">
            {priorities.map(p => (
              <button
                key={p.value}
                onClick={() => updateTask(id, { priority: p.value })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  task.priority === p.value
                    ? `${p.color} ring-1`
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="mb-6">
          <label className="text-xs font-medium text-gray-400 mb-2 block">Category</label>
          <div className="flex gap-2">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => updateTask(id, { category: c })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  task.category === c
                    ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200'
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Timestamps */}
        <div className="border-t border-gray-100 pt-4 mb-6 space-y-1">
          <p className="text-xs text-gray-400">
            Created: {new Date(task.createdAt).toLocaleString()}
          </p>
          {task.completedAt && (
            <p className="text-xs text-emerald-500">
              Completed: {new Date(task.completedAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => toggleTask(id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              task.completed
                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600'
            }`}
          >
            {task.completed ? 'Mark as Pending' : 'Mark as Done'}
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2.5 bg-red-50 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 transition-all"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
