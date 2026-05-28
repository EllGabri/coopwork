import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../lib/utils';

// ─── Types & mock data ────────────────────────────────────────────────────────

interface Board {
  id: string;
  name: string;
  overdueCount: number;
}

interface Workspace {
  id: string;
  name: string;
  department: string;
  departmentIcon: string;
  boards: Board[];
}

const MOCK_WORKSPACES: Workspace[] = [
  {
    id: 'ws-1',
    name: 'TI & Projetos',
    department: 'Tecnologia',
    departmentIcon: '💻',
    boards: [
      { id: 'b-1', name: 'Sistema Core', overdueCount: 2 },
      { id: 'b-2', name: 'Infraestrutura', overdueCount: 0 },
      { id: 'b-3', name: 'Segurança', overdueCount: 1 },
    ],
  },
  {
    id: 'ws-2',
    name: 'Compliance',
    department: 'Compliance',
    departmentIcon: '📋',
    boards: [
      { id: 'b-4', name: 'Auditorias 2026', overdueCount: 0 },
      { id: 'b-5', name: 'Regulatório', overdueCount: 3 },
    ],
  },
  {
    id: 'ws-3',
    name: 'Financeiro',
    department: 'Financeiro',
    departmentIcon: '💰',
    boards: [
      { id: 'b-6', name: 'Orçamento 2026', overdueCount: 0 },
      { id: 'b-7', name: 'Controle', overdueCount: 0 },
    ],
  },
];

// ─── Global nav items ─────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 7h18M3 12h18M3 17h18"
        />
      </svg>
    ),
  },
  {
    label: 'GED',
    href: '/documents',
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    label: 'Relatórios',
    href: '/reports',
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    label: 'Admin',
    href: '/admin',
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

// ─── Sortable board item ──────────────────────────────────────────────────────

function SortableBoardItem({ board, workspaceId }: { board: Board; workspaceId: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: board.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Link
        to={`/projects/${workspaceId}/${board.id}`}
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs',
          'text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
          'group cursor-pointer',
        )}
      >
        {/* Drag handle */}
        <span
          {...listeners}
          className="cursor-grab text-muted-foreground/40 opacity-0 group-hover:opacity-100"
          aria-label="Arrastar board"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 3a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM9 10a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM9 17a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z" />
          </svg>
        </span>

        {/* Board icon */}
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>

        <span className="flex-1 truncate">{board.name}</span>

        {board.overdueCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {board.overdueCount}
          </span>
        )}
      </Link>
    </div>
  );
}

// ─── Workspace section ────────────────────────────────────────────────────────

function WorkspaceSection({
  workspace,
  onDragEnd,
}: {
  workspace: Workspace;
  onDragEnd: (event: DragEndEvent, workspaceId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  return (
    <div className="mb-2">
      {/* Workspace header */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <span className="text-sm leading-none">{workspace.departmentIcon}</span>
        <span className="flex-1 truncate">{workspace.name}</span>
        <svg
          className={cn('h-3 w-3 shrink-0 transition-transform', open && 'rotate-90')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Board list */}
      {open && (
        <div className="ml-4 mt-0.5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => onDragEnd(event, workspace.id)}
          >
            <SortableContext
              items={workspace.boards.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {workspace.boards.map((board) => (
                <SortableBoardItem key={board.id} board={board} workspaceId={workspace.id} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const [workspaces, setWorkspaces] = useState(MOCK_WORKSPACES);
  const location = useLocation();

  function handleDragEnd(event: DragEndEvent, workspaceId: string) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setWorkspaces((prev) =>
      prev.map((ws) => {
        if (ws.id !== workspaceId) return ws;
        const oldIndex = ws.boards.findIndex((b) => b.id === active.id);
        const newIndex = ws.boards.findIndex((b) => b.id === over.id);
        return { ...ws, boards: arrayMove(ws.boards, oldIndex, newIndex) };
      }),
    );
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300 ease-in-out',
        expanded ? 'w-60' : 'w-14',
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center border-b px-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label={expanded ? 'Colapsar sidebar' : 'Expandir sidebar'}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        {expanded && <span className="ml-2 text-lg font-semibold text-foreground">CoopWork</span>}
      </div>

      {/* Scrollable body */}
      <nav className="flex-1 overflow-y-auto p-2">
        {/* Global navigation */}
        <div className="mb-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'mb-1 flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  !expanded && 'justify-center',
                )}
                title={!expanded ? item.label : undefined}
              >
                {item.icon}
                {expanded && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Workspace section — only when expanded */}
        {expanded && (
          <>
            {/* Divider + section title */}
            <div className="mb-2 mt-1 border-t" />
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Workspaces
            </p>

            {workspaces.map((ws) => (
              <WorkspaceSection key={ws.id} workspace={ws} onDragEnd={handleDragEnd} />
            ))}
          </>
        )}
      </nav>

      {/* Footer — profile */}
      <div className="border-t p-2">
        <Link
          to="/profile"
          className={cn(
            'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground',
            'hover:bg-accent hover:text-accent-foreground transition-colors',
            !expanded && 'justify-center',
          )}
          title={!expanded ? 'Perfil' : undefined}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            U
          </div>
          {expanded && <span>Perfil</span>}
        </Link>
      </div>
    </aside>
  );
}
