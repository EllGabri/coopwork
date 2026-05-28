import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import type { Board, Column, Card } from '../../types/board';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { api } from '../../lib/api';

interface Props {
  board: Board;
}

export function KanbanBoard({ board }: Props) {
  const [columns, setColumns] = useState<Column[]>(() =>
    [...(board.board_columns ?? [])].sort((a, b) => a.position - b.position),
  );
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const columnIds = columns.map((c) => `col-${c.id}`);

  const findCard = useCallback(
    (cardId: string) => {
      for (const col of columns) {
        const card = col.cards?.find((c) => c.id === cardId);
        if (card) return { card, column: col };
      }
      return null;
    },
    [columns],
  );

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      if (String(active.id).startsWith('col-')) return;
      const found = findCard(String(active.id));
      if (found) setActiveCard(found.card);
    },
    [findCard],
  );

  const handleDragOver = useCallback(
    ({ active, over }: DragOverEvent) => {
      if (!over) return;
      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId.startsWith('col-') || activeId === overId) return;
      const activeInfo = findCard(activeId);
      if (!activeInfo) return;
      const targetColumnId = overId.startsWith('col-')
        ? overId.replace('col-', '')
        : columns.find((c) => c.cards?.some((card) => card.id === overId))?.id;
      if (!targetColumnId || activeInfo.column.id === targetColumnId) return;
      setColumns((prev) =>
        prev.map((col) => {
          if (col.id === activeInfo.column.id)
            return { ...col, cards: col.cards?.filter((c) => c.id !== activeId) };
          if (col.id === targetColumnId)
            return {
              ...col,
              cards: [...(col.cards ?? []), { ...activeInfo.card, column_id: targetColumnId }],
            };
          return col;
        }),
      );
    },
    [columns, findCard],
  );

  const handleDragEnd = useCallback(
    async ({ active, over }: DragEndEvent) => {
      setActiveCard(null);
      if (!over) return;
      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId.startsWith('col-') && overId.startsWith('col-')) {
        const oldIndex = columns.findIndex((c) => `col-${c.id}` === activeId);
        const newIndex = columns.findIndex((c) => `col-${c.id}` === overId);
        if (oldIndex !== newIndex) {
          const reordered = arrayMove(columns, oldIndex, newIndex);
          setColumns(reordered);
          await api.patch(`/boards/${board.id}/columns/reorder`, {
            order: reordered.map((c) => c.id),
          });
        }
        return;
      }
      const activeInfo = findCard(activeId);
      if (!activeInfo) return;
      const targetColumn =
        columns.find((c) => c.id === overId) ??
        columns.find((c) => c.cards?.some((card) => card.id === overId));
      if (!targetColumn) return;
      const targetCards = targetColumn.cards ?? [];
      const targetPosition =
        overId === targetColumn.id
          ? targetCards.length
          : Math.max(
              0,
              targetCards.findIndex((c) => c.id === overId),
            );
      await api.patch<Card>(`/cards/${activeId}/position`, {
        column_id: targetColumn.id,
        position: targetPosition,
      });
    },
    [columns, board.id, findCard],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          {columns.map((col) => (
            <KanbanColumn key={col.id} column={col} />
          ))}
        </SortableContext>
      </div>
      <DragOverlay>{activeCard && <KanbanCard card={activeCard} isDragging />}</DragOverlay>
    </DndContext>
  );
}
