'use client';

import { useState, useRef, useEffect } from 'react';
import { useTaskContext, Task } from '@/context/TaskContext';

const categories = ['Uncategorized', 'Work', 'Study', 'Life', 'Ideas'];
const priorities: { value: Task['priority']; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'medium', label: 'Med', color: 'bg-amber-100 text-amber-700' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-700' },
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
    <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-4 shadow-sm">
      <div className="flex gap-2 mb-3">
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Quick add a task..."
          className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm
                     focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent
                     placeholder:text-muted transition-all"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium
                     hover:bg-accent-dim transition-all active:scale-95"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {priorities.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                priority === p.value ? p.color : 'text-muted hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1">
          {categories.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                category === c ? 'text-accent bg-accent/5' : 'text-muted hover:text-foreground'
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
