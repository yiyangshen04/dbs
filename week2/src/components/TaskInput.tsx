'use client';

import { useState, useRef, useEffect } from 'react';
import { useTaskContext, Task } from '@/context/TaskContext';

const categories = ['Work', 'Study', 'Life', 'Ideas'];
const priorities: { value: Task['priority']; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'medium', label: 'Med', color: 'bg-amber-100 text-amber-700' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-700' },
];

export default function TaskInput() {
  const { addTask } = useTaskContext();
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [category, setCategory] = useState('Work');
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
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400
                     placeholder:text-gray-400 transition-all shadow-sm"
        />
        <button
          type="submit"
          className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-xl
                     text-sm font-medium hover:from-indigo-600 hover:to-violet-600
                     transition-all shadow-sm hover:shadow-md active:scale-95"
        >
          Add
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 font-medium">Priority:</span>
          {priorities.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                priority === p.value
                  ? `${p.color} ring-1 ring-current/20`
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 font-medium">Category:</span>
          {categories.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                category === c
                  ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200'
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
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
