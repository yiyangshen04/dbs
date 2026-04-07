'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Task {
  id: string;
  content: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
}

interface TaskContextType {
  tasks: Task[];
  addTask: (content: string, priority: Task['priority'], category: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => void;
  getTask: (id: string) => Task | undefined;
}

const TaskContext = createContext<TaskContextType | null>(null);

let counter = 0;
function generateId() {
  return `task_${Date.now()}_${++counter}`;
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);

  const addTask = useCallback((content: string, priority: Task['priority'], category: string) => {
    const newTask: Task = {
      id: generateId(),
      content,
      completed: false,
      createdAt: new Date().toISOString(),
      priority,
      category,
    };
    setTasks(prev => [newTask, ...prev]);
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === id
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : undefined,
            }
          : t
      )
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const getTask = useCallback((id: string) => {
    return tasks.find(t => t.id === id);
  }, [tasks]);

  return (
    <TaskContext.Provider value={{ tasks, addTask, toggleTask, deleteTask, updateTask, getTask }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTaskContext must be used within TaskProvider');
  return ctx;
}
