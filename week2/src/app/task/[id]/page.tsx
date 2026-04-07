'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTaskContext } from '@/context/TaskContext';
import type { Task } from '@/context/TaskContext';

const categories = ['Uncategorized', 'Work', 'Study', 'Life', 'Ideas'];
const priorities: Task['priority'][] = ['low', 'medium', 'high'];

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { getTask, updateTask, toggleTask, deleteTask } = useTaskContext();
  const task = getTask(id);

  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (task) setEditContent(task.content);
  }, [task]);

  if (!task) {
    return (
      <div className="max-w-xl mx-auto px-6 pt-24 text-center">
        <p className="text-muted text-sm mb-4">Task not found.</p>
        <button onClick={() => router.push('/')} className="text-accent text-sm hover:underline">
          Back to Capture
        </button>
      </div>
    );
  }

  function handleSave() {
    if (editContent.trim() && editContent.trim() !== task!.content) {
      updateTask(id, { content: editContent.trim() });
    }
  }

  function handleDelete() {
    deleteTask(id);
    router.push('/');
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-12 animate-fade-in">
      {/* Breadcrumb */}
      <button
        onClick={() => router.back()}
        className="text-[11px] text-muted hover:text-foreground mb-8 block transition-colors"
      >
        ← back
      </button>

      {/* Editable title — Notion-style */}
      <input
        type="text"
        value={editContent}
        onChange={e => setEditContent(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        className={`w-full text-2xl font-light bg-transparent border-none outline-none mb-8
          ${task.completed ? 'line-through text-muted' : 'text-foreground'}
          placeholder:text-muted/30`}
        placeholder="Untitled"
      />

      {/* Properties — like Notion properties */}
      <div className="space-y-4 mb-10">
        <div className="flex items-center">
          <span className="text-[11px] text-muted uppercase tracking-widest w-20">Status</span>
          <button
            onClick={() => toggleTask(id)}
            className={`text-sm px-3 py-1 rounded-md transition-all ${
              task.completed
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-amber-50 text-amber-600'
            }`}
          >
            {task.completed ? 'Done' : 'To do'}
          </button>
        </div>

        <div className="flex items-center">
          <span className="text-[11px] text-muted uppercase tracking-widest w-20">Priority</span>
          <div className="flex gap-1">
            {priorities.map(p => (
              <button
                key={p}
                onClick={() => updateTask(id, { priority: p })}
                className={`text-[12px] capitalize px-2.5 py-1 rounded-md transition-all ${
                  task.priority === p
                    ? 'bg-surface-hover text-foreground font-medium'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center">
          <span className="text-[11px] text-muted uppercase tracking-widest w-20">Category</span>
          <div className="flex flex-wrap gap-1">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => updateTask(id, { category: c })}
                className={`text-[12px] px-2.5 py-1 rounded-md transition-all ${
                  task.category === c
                    ? 'bg-surface-hover text-foreground font-medium'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center">
          <span className="text-[11px] text-muted uppercase tracking-widest w-20">Created</span>
          <span className="text-[12px] text-muted">{new Date(task.createdAt).toLocaleString()}</span>
        </div>

        {task.completedAt && (
          <div className="flex items-center">
            <span className="text-[11px] text-muted uppercase tracking-widest w-20">Finished</span>
            <span className="text-[12px] text-emerald-500">{new Date(task.completedAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border mb-6" />

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => toggleTask(id)}
          className="text-sm text-accent hover:underline"
        >
          {task.completed ? 'Reopen' : 'Complete'}
        </button>
        <button
          onClick={handleDelete}
          className="text-sm text-red-400 hover:underline"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
