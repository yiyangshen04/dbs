'use client';

import { useState, useRef, useEffect } from 'react';
import { useTaskContext, Task } from '@/context/TaskContext';

const categories = ['Uncategorized', 'Work', 'Study', 'Life', 'Ideas'];
const priorities: { value: Task['priority']; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Med' },
  { value: 'high', label: 'High' },
];

export default function TaskInput() {
  const { addTask } = useTaskContext();
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [category, setCategory] = useState('Uncategorized');
  const [showOptions, setShowOptions] = useState(false);
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
    setShowOptions(false);
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="What needs to be done?"
          className="w-full px-0 py-4 text-xl font-light border-b-2 border-border bg-transparent
                     focus:outline-none focus:border-accent
                     placeholder:text-muted/50 transition-colors"
        />
        {content && (
          <button
            type="submit"
            className="absolute right-0 top-1/2 -translate-y-1/2 text-accent text-sm font-medium
                       hover:text-accent-dim transition-colors"
          >
            Add ↵
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowOptions(!showOptions)}
        className="mt-2 text-[11px] text-muted hover:text-foreground transition-colors"
      >
        {showOptions ? '— Hide options' : '+ Options'}
      </button>

      {showOptions && (
        <div className="mt-3 flex flex-wrap gap-4 animate-fade-in">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted">Priority:</span>
            {priorities.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`text-[11px] px-2 py-0.5 rounded transition-all ${
                  priority === p.value
                    ? 'text-accent font-medium underline underline-offset-2'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted">In:</span>
            {categories.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`text-[11px] px-2 py-0.5 rounded transition-all ${
                  category === c
                    ? 'text-accent font-medium underline underline-offset-2'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
