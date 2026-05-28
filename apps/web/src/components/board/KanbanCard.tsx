import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '../../types/board';

interface Props {
  card: Card;
  isDragging?: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export function KanbanCard({ card, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = card.due_date && new Date(card.due_date) < new Date() && !card.is_archived;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderLeftColor: card.color ?? 'transparent',
        borderLeftWidth: card.color ? 3 : 0,
      }}
      className="rounded-md border border-border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none"
      {...attributes}
      {...listeners}
    >
      <p className="text-sm font-medium text-card-foreground leading-snug">{card.title}</p>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-medium ${PRIORITY_COLORS[card.priority]}`}
        >
          {card.priority}
        </span>
        {card.due_date && (
          <span
            className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}
          >
            {new Date(card.due_date).toLocaleDateString('pt-BR')}
          </span>
        )}
        {card.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
