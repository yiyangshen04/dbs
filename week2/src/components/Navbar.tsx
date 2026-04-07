'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTaskContext } from '@/context/TaskContext';

const links = [
  { href: '/', label: 'Capture', icon: '⚡' },
  { href: '/review', label: 'Review', icon: '📊' },
  { href: '/export', label: 'Export', icon: '📤' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { tasks } = useTaskContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pending = tasks.filter(t => !t.completed).length;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm">
            Q
          </span>
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            QuickNote
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                pathname === l.href
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="mr-1">{l.icon}</span>
              {l.label}
            </Link>
          ))}
          {pending > 0 && (
            <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {pending} pending
            </span>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-3">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                pathname === l.href
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-500'
              }`}
            >
              <span className="mr-2">{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
