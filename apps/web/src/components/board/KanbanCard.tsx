import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '../../types/board';
import { CardDetailModal } from './CardDetailModal';

interface Props {
  card: Card;
  isDragging?: boolean;
}

const PRIORITY_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  low: {
    label: 'Baixa',
    className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    dot: 'bg-slate-400',
  },
  medium: {
    label: 'Média',
    className: 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  high: {
    label: 'Alta',
    className: 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300',
    dot: 'bg-orange-500',
  },
  urgent: {
    label: 'Urgente',
    className: 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-400',
    dot: 'bg-red-500',
  },
};

export function KanbanCard({ card, isDragging }: Props) {
  const [showModal, setShowModal] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
  };

  const isOverdue = card.due_date && new Date(card.due_date) < new Date() && !card.is_archived;

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          ...style,
          borderLeftColor: card.color ?? 'transparent',
          borderLeftWidth: card.color ? 3 : 0,
        }}
        className={`rounded-md border border-border bg-card p-3 cursor-grab active:cursor-grabbing transition-all select-none ${isDragging ? 'shadow-xl ring-2 ring-primary/20 scale-[1.02]' : 'shadow-sm hover:shadow-md'}`}
        {...attributes}
        {...listeners}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
      >
        <p className="text-sm font-medium text-card-foreground leading-snug">{card.title}</p>

        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
          {/* Priority badge */}
          {card.priority && PRIORITY_CONFIG[card.priority] && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_CONFIG[card.priority].className}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_CONFIG[card.priority].dot}`} />
              {PRIORITY_CONFIG[card.priority].label}
            </span>
          )}

          {/* Due date */}
          {card.due_date && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                isOverdue ? 'text-red-500' : 'text-muted-foreground'
              }`}
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {new Date(card.due_date).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
              })}
            </span>
          )}
        </div>

        {/* Tags + assignee avatars */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {card.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
          {/* Assignee avatar stacks */}
          {card.assignee_ids && card.assignee_ids.length > 0 && (
            <div className="flex -space-x-1.5">
              {card.assignee_ids.slice(0, 3).map((id, i) => (
                <div
                  key={id}
                  title={id}
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-card bg-[hsl(var(--primary))] text-[9px] font-bold text-white"
                  style={{ zIndex: 10 - i }}
                >
                  {id.charAt(0).toUpperCase()}
                </div>
              ))}
              {card.assignee_ids.length > 3 && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border border-card bg-muted text-[9px] text-muted-foreground">
                  +{card.assignee_ids.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {showModal && <CardDetailModal cardId={card.id} onClose={() => setShowModal(false)} />}
    </>
  );
}
