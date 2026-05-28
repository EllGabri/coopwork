import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import type { Column } from '../../types/board';
import { KanbanCard } from './KanbanCard';

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

  return (
    <div
      ref={setSortRef}
      style={colStyle}
      className="flex h-full w-64 flex-shrink-0 flex-col gap-2"
    >
      <div
        className="flex items-center justify-between rounded-t-md px-3 py-2 font-semibold text-sm cursor-grab active:cursor-grabbing select-none"
        style={{ backgroundColor: column.color ?? '#94a3b8', color: 'white' }}
        {...attributes}
        {...listeners}
      >
        <span>{column.name}</span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
          {cards.length}
          {column.wip_limit != null && `/${column.wip_limit}`}
        </span>
      </div>
      <div
        ref={setDropRef}
        className={`flex-1 rounded-b-md p-2 flex flex-col gap-2 min-h-[120px] transition-colors ${isOver ? 'bg-primary/5 ring-2 ring-primary/30' : 'bg-muted/30'} ${isAtWipLimit ? 'opacity-60' : ''}`}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard key={card.id} card={card} />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-4">Sem cards</p>
        )}
      </div>
    </div>
  );
}
