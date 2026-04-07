@AGENTS.md

# QuickNote

A lightweight task and idea capture tool built with Next.js + Tailwind CSS.

## Project Overview
QuickNote is a fast, minimal note-taking and task management app designed for quick capture of thoughts and tasks. Users can add tasks, mark them complete (strikethrough), review statistics, and export data to Excel.

## Tech Stack
- Next.js 16 (App Router)
- Tailwind CSS
- React Context API (client-side state management)
- `xlsx` library (Excel export)

## Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Capture | Main page — quick input form + task list with toggle/strikethrough |
| `/review` | Review | Statistics dashboard — completion rate, category/priority breakdown, pending list |
| `/task/[id]` | Task Detail | Dynamic route — view/edit individual task, change priority/category |
| `/export` | Export | Data preview table + one-click Excel download with filters |

## Data Model
```typescript
interface Task {
  id: string;          // Unique identifier
  content: string;     // Task content
  completed: boolean;  // Completion status
  createdAt: string;   // ISO timestamp
  completedAt?: string;// Completion timestamp
  priority: 'low' | 'medium' | 'high';
  category: string;    // Work | Study | Life | Ideas
}
```

## Key Files
- `src/context/TaskContext.tsx` — Global state provider with CRUD operations
- `src/components/Navbar.tsx` — Shared navigation with pending count badge
- `src/components/TaskInput.tsx` — Quick capture form (Enter to add)
- `src/components/TaskList.tsx` — Task list with checkbox toggle and strikethrough
- `src/app/page.tsx` — Home/Capture page
- `src/app/review/page.tsx` — Review/Stats page
- `src/app/task/[id]/page.tsx` — Task detail (dynamic route)
- `src/app/export/page.tsx` — Export to Excel page

## Notes
- Data lives in client-side memory (React Context) — refreshing the page clears all data
- Navigation between pages preserves state via client-side routing
- All pages share the same layout with a sticky navbar
