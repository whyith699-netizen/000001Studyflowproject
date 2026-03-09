Frontend Technical Specification: StudyFlow Web Platform

Type: Technical PRD (Frontend Focused)
Version: 2.0 (Frontend Detail)
Date: February 19, 2026
Author: Vie Coder
Tech Stack Target: React (Vite) / Next.js, Tailwind CSS, Firebase Client SDK

1. Technical Architecture & Stack

1.1 Core Framework

Framework: React 18+ (Built using Vite for development speed or Next.js App Router).

Language: TypeScript (Highly recommended for Type Safety across Task/Class data structures).

Styling: Tailwind CSS v3.4+.

Icons: lucide-react (For consistent UI iconography).

1.2 Support Libraries (Critical)

State Management: Zustand (Lightweight, high performance for drag-and-drop operations) or React Context + useReducer.

Drag & Drop: @hello-pangea/dnd (Fork of React Beautiful DnD) or dnd-kit. Mandatory for Kanban & Class Reordering features.

Charts: recharts or chart.js (For Focus Mode Visualization).

Date Handling: date-fns (Lightweight) or dayjs.

Forms: react-hook-form (For form input performance without excessive re-renders).

2. Design System & Global UI

2.1 Color Palette (Tailwind Variables)

The application must support dynamic themes (Dark/Light) using CSS Variables.

Primary: blue-600 (Light) / blue-500 (Dark) - Main buttons, active links.

Surface: white (Light) / slate-900 (Dark) - Card/panel backgrounds.

Background: slate-50 (Light) / slate-950 (Dark) - Main page background.

Text: slate-900 (Main), slate-500 (Muted/Secondary).

Status Indicators:

High Priority/Overdue: red-500

Medium/Warning: amber-500

Low/Safe: emerald-500

2.2 Typography

Font Family: Inter or Plus Jakarta Sans (Modern, Clean).

Scale: text-xs (Tags), text-sm (Body), text-base (Inputs), text-xl (Headers).

3. Component Architecture (Atomic Design)

3.1 Atoms (Basic Components)

Button: Variants (Solid, Outline, Ghost). States (Loading, Disabled).

Badge: Pill-shaped indicator for task status/priority.

Input / Textarea: Includes error handling support & labels.

IconButton: Icon-only button (e.g., delete, edit).

Avatar: Displays user initials or Google profile photo.

Skeleton: Animated shimmer placeholder during data loading.

3.2 Molecules (Combined Components)

TaskCard:

Props: title, deadline, priority, subjectColor.

Interactive: Draggable handle, Checkbox (complete), 3-dot menu.

ClassCard (Dashboard):

Props: className, room, time, nextTaskCount.

Content: Bold title, location icon, task count badge.

QuickLinkItem:

Row containing icon (Zoom/Drive), link name, and copy/open buttons.

3.3 Organisms (Complex Sections)

SidebarNavigation: Responsive left menu (Collapsible on mobile).

KanbanColumn: Droppable area rendering a list of TaskCards.

WeeklyGrid: 7-day x time slot grid table for schedules.

TaskModal: Popup modal for Create/Edit tasks with a complete form.

4. Detailed Feature Specifications (Frontend View)

4.1 Layout & Navigation (AppLayout)

Sidebar (Desktop): Fixed width (e.g., w-64). Contains logo, navigation menu, and user profile at the bottom.

Bottom Bar (Mobile): Replaces Sidebar when viewport is < 768px.

Header: Contains page title breadcrumb, Dark Mode toggle button, and Real-time Clock.

Main Content Area: flex-1, scrollable, consistent padding (p-4 or p-6).

4.2 Dashboard (Home)

Greeting Section: "Hello, [Name]!" + Time Widget.

Stats Overview: 3 Summary Cards (Pending Tasks, Classes Today, Focus Time This Week).

Next Class Widget: Displays 1 nearest class card based on current time.

Logic: Filter class array, find first where startTime > currentTime.

Recent Tasks: List of top 3-5 tasks with the nearest deadlines.

4.3 Class Management (Page: /classes)

View Modes: Toggle between Grid View (Cards) and Table View.

Drag & Drop Reordering:

User long-presses class card -> Card lifts (shadow increases).

Move position -> Local array updates -> Send new order to Firebase.

Quick Links Logic:

Input URL -> Regex check.

If URL contains "zoom.us" -> Automatically render Zoom icon.

If URL contains "drive.google" -> Automatically render Drive icon.

4.4 Task Management / Kanban (Page: /tasks)

Kanban Board:

3 Columns: To Do, In Progress, Done.

Drag Logic:

onDragStart: Store dragged task ID.

onDragOver: Calculate placeholder position.

onDrop:

Optimistic Update: Move UI instantly.

Async Call: Update status field in Firestore.

Error Handling: If failed, revert card to original position (Rollback).

Filter & Sort:

Dropdown "Filter by Subject".

Dropdown "Sort by Deadline".

Completed Animation: Confetti or checklist effect when a card is dropped into the "Done" column.

4.5 Focus Analytics (Page: /focus)

Chart Component:

Uses Recharts.

X-Axis: Days (Mon-Sun).

Y-Axis: Minutes.

Tooltip: Hover to see hour details.

Timer Widget:

SVG Circular Progress.

Countdown logic using setInterval in React hook.

Sound effect when timer ends (using HTML5 Audio).

5. State Management & Data Flow

5.1 Global Stores (Zustand/Context)

useAuthStore:

User object (uid, email, photoURL).

Loading status (isAuthLoading).

useDataStore:

tasks: Array of Objects.

classes: Array of Objects.

settings: Object (Theme, Language).

Actions: fetchData(), addTask(), moveTask(), deleteClass().

5.2 Local Storage Strategy

Theme Preference: Save in localStorage ('theme' = 'dark'/'light') to prevent flashing on reload.

Sidebar State: Collapsed/Expanded status saved so users don't need to reset it every time.

6. Interaction Design & UX Polish

6.1 Loading States

Initial Load: Show Full Page Spinner or Logo Pulse.

Data Fetching: Use Skeleton Loader (gray shimmering boxes) mimicking Task/Class Card shapes, avoiding spinning loaders (reduces perceived wait time).

6.2 Feedback Mechanism

Toast Notifications: Appear in bottom-right corner for success/failure actions.

"Task successfully added" (Green).

"Sync failed" (Red).

Empty States: Never leave a page blank. If no tasks exist, show an SVG illustration with text "Hooray! No tasks today" and an "Add Task" button.

6.3 Mobile Responsiveness

Hamburger Menu: Appears in mobile header for navigation access.

Horizontal Scroll: Schedule tables and Kanban Boards must be horizontally scrollable on small screens with shadow indicators at the edges.

Touch Targets: All buttons minimum 44px x 44px for easy finger tapping.

7. Security & Performance (Frontend Side)

Route Protection: Use ProtectedRoute wrapper component. If user === null, force redirect to /login.

Image Optimization: Use loading="lazy" attribute on profile images or illustrations.

Debounce Search: Search input must have a 300ms debounce (delay) before filtering the list to prevent UI lag.
