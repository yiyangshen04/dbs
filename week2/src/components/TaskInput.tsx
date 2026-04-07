'use client';

import { useState, useRef, useEffect } from 'react';
import { useTaskContext, Task } from '@/context/TaskContext';

const categories = ['Uncategorized', 'Work', 'Study', 'Life', 'Ideas'];
const priorities: { value: Task['priority']; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-emerald-50 text-emerald-700' },
  { value: 'medium', label: 'Med', color: 'bg-amber-50 text-amber-700' },
  { value: 'high', label: 'High', color: 'bg-red-50 text-red-700' },
];

export default function TaskInput() {
  const { addTask } = useTaskContext();
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [category, setCategory] = useState('Uncategorized');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    addTask(trimmed, priority, category);
    setContent('');
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="What's on your mind? Press Enter to add..."
          className="flex-1 px-4 py-3 rounded-xl border border-border bg-surface text-sm text-foreground
                     focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50
                     placeholder:text-muted transition-all shadow-sm"
        />
        <button
          type="submit"
          className="px-5 py-3 bg-accent text-white rounded-xl
                     text-sm font-semibold hover:bg-accent-dim
                     transition-all shadow-sm hover:shadow-md active:scale-95"
        >
          Add
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted font-medium">Priority:</span>
          {priorities.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                priority === p.value
                  ? `${p.color} ring-1 ring-current/20`
                  : 'bg-surface-hover text-muted hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted font-medium">Category:</span>
          {categories.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                category === c
                  ? 'bg-accent/10 text-accent ring-1 ring-accent/20'
                  : 'bg-surface-hover text-muted hover:text-foreground'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
