import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import type { Column } from '../../types/board';
import { KanbanCard } from './KanbanCard';

function deriveColumnColor(name: string): string {
  const n = name.toLowerCase();
  if (/fazer|todo|backlog|pendente|aguard/.test(n)) return '#64748B';
  if (/andamento|progress|doing|wip|em curso/.test(n)) return '#1E88E5';
  if (/review|revisão|aprovação|aprova/.test(n)) return '#FB8C00';
  if (/conclu|done|finish|feito|completo/.test(n)) return '#43A047';
  if (/bloquea|blocked|impedido/.test(n)) return '#E53935';
  if (/cancel|arquiv/.test(n)) return '#9E9E9E';
  return '#8E24AA';
}

interface Props {
  column: Column;
}

export function KanbanColumn({ column }: Props) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: column.id });
  const {
    attributes,
    listeners,
    setNodeRef: setSortRef,
    transform,
    transition,
  } = useSortable({ id: `col-${column.id}` });

  const cards = column.cards ?? [];
  const cardIds = cards.map((c) => c.id);
  const isAtWipLimit = column.wip_limit != null && cards.length >= column.wip_limit;
  const colStyle = { transform: CSS.Transform.toString(transform), transition };

  // Derive a semantic color when column has no explicit color set
  const headerColor = column.color ?? deriveColumnColor(column.name);

  return (
    <div
      ref={setSortRef}
      style={colStyle}
      className="flex h-full w-64 flex-shrink-0 flex-col gap-2"
    >
      <div
        className="flex items-center justify-between rounded-t-lg px-3 py-2.5 font-semibold text-sm cursor-grab active:cursor-grabbing select-none"
        style={{ backgroundColor: headerColor, color: 'white' }}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-white/60" aria-hidden />
          <span>{column.name}</span>
        </div>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
          {cards.length}
          {column.wip_limit != null && (
            <span className={isAtWipLimit ? 'text-yellow-200' : ''}>/{column.wip_limit}</span>
          )}
        </span>
      </div>
      <div
        ref={setDropRef}
        className={`flex-1 rounded-b-lg p-2 flex flex-col gap-2 min-h-[120px] transition-colors ${
          isOver ? 'bg-primary/8 ring-2 ring-primary/25' : 'bg-muted/20'
        } ${isAtWipLimit ? 'opacity-70' : ''}`}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard key={card.id} card={card} />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-6">
            <p className="text-xs text-muted-foreground">Arrastar card aqui</p>
          </div>
        )}
        {isAtWipLimit && (
          <p className="text-center text-[10px] font-medium text-amber-500 py-1">
            Limite WIP atingido
          </p>
        )}
      </div>
    </div>
  );
}
