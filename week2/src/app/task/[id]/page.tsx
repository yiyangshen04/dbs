'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTaskContext } from '@/context/TaskContext';
import type { Task } from '@/context/TaskContext';

const categories = ['Uncategorized', 'Work', 'Study', 'Life', 'Ideas'];
const priorities: { value: Task['priority']; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-emerald-500/15 text-emerald-400' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500/15 text-amber-400' },
  { value: 'high', label: 'High', color: 'bg-red-500/15 text-red-400' },
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
        <h2 className="text-lg font-semibold text-foreground mb-2">Task not found</h2>
        <p className="text-sm text-muted mb-6">This task may have been deleted or the page was refreshed.</p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-accent text-black rounded-lg text-sm hover:bg-accent/80 transition-colors"
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
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="bg-surface rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              task.completed
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-amber-500/15 text-amber-400'
            }`}
          >
            {task.completed ? '✓ Completed' : '○ Pending'}
          </span>
          <span className="text-xs text-muted">
            {new Date(task.createdAt).toLocaleString()}
          </span>
        </div>

        {editing ? (
          <div className="mb-6">
            <input
              type="text"
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full text-lg font-semibold px-3 py-2 border border-accent/30 rounded-lg bg-surface-hover text-foreground
                         focus:outline-none focus:ring-2 focus:ring-accent/30"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button onClick={handleSave} className="px-3 py-1.5 bg-accent text-black rounded-lg text-xs font-semibold hover:bg-accent/80">Save</button>
              <button onClick={() => { setEditing(false); setEditContent(task.content); }} className="px-3 py-1.5 bg-surface-hover text-muted rounded-lg text-xs hover:text-foreground">Cancel</button>
            </div>
          </div>
        ) : (
          <h1
            onClick={() => setEditing(true)}
            className={`text-lg font-semibold mb-6 cursor-pointer hover:text-accent transition-colors
              ${task.completed ? 'line-through text-muted' : 'text-foreground'}`}
          >
            {task.content}
          </h1>
        )}

        <div className="mb-4">
          <label className="text-xs font-medium text-muted mb-2 block">Priority</label>
          <div className="flex gap-2">
            {priorities.map(p => (
              <button
                key={p.value}
                onClick={() => updateTask(id, { priority: p.value })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  task.priority === p.value ? p.color : 'bg-surface-hover text-muted hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="text-xs font-medium text-muted mb-2 block">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => updateTask(id, { category: c })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  task.category === c
                    ? 'bg-accent/15 text-accent'
                    : 'bg-surface-hover text-muted hover:text-foreground'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4 mb-6 space-y-1">
          <p className="text-xs text-muted">Created: {new Date(task.createdAt).toLocaleString()}</p>
          {task.completedAt && (
            <p className="text-xs text-emerald-400">Completed: {new Date(task.completedAt).toLocaleString()}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => toggleTask(id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              task.completed
                ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                : 'bg-accent text-black hover:bg-accent/80'
            }`}
          >
            {task.completed ? 'Mark as Pending' : 'Mark as Done'}
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2.5 bg-red-500/10 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-all"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
