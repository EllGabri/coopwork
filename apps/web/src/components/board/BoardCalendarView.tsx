import { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Column, Card } from '../../types/board';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'pt-BR': ptBR };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

interface CalEvent {
  title: string;
  start: Date;
  end: Date;
  allDay: true;
  card: Card;
  columnName: string;
}

interface Props {
  columns: Column[];
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#94a3b8',
  medium: '#3b82f6',
  high: '#f97316',
  urgent: '#ef4444',
};

export function BoardCalendarView({ columns }: Props) {
  const [selectedCard, setSelectedCard] = useState<CalEvent | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const events = useMemo<CalEvent[]>(() => {
    return columns.flatMap((col) =>
      (col.cards ?? [])
        .filter((c) => c.due_date && !c.is_archived)
        .map((c) => ({
          title: c.title,
          start: new Date(c.due_date!),
          end: new Date(c.due_date!),
          allDay: true as const,
          card: c,
          columnName: col.name,
        })),
    );
  }, [columns]);

  const eventStyleGetter = (event: CalEvent) => ({
    style: {
      backgroundColor: event.card.color ?? PRIORITY_COLORS[event.card.priority] ?? '#6366f1',
      borderRadius: '3px',
      opacity: 0.9,
      color: 'white',
      border: 'none',
      fontSize: '11px',
      padding: '1px 4px',
    },
  });

  return (
    <div className="flex h-full flex-col p-4">
      <div style={{ height: '100%', minHeight: 0 }}>
        <Calendar<CalEvent>
          localizer={localizer}
          events={events}
          defaultView="month"
          views={['month']}
          date={currentDate}
          onNavigate={setCurrentDate}
          style={{ height: '100%' }}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={(e) => setSelectedCard(e)}
          culture="pt-BR"
          messages={{
            today: 'Hoje',
            previous: '‹',
            next: '›',
            month: 'Mês',
            week: 'Semana',
            day: 'Dia',
            noEventsInRange: 'Nenhum card com prazo neste período',
          }}
          popup
        />
      </div>

      {selectedCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-card p-5 shadow-xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {selectedCard.card.color && (
                  <div
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedCard.card.color }}
                  />
                )}
                <h2 className="text-base font-semibold text-card-foreground">
                  {selectedCard.card.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedCard(null)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ×
              </button>
            </div>
            {selectedCard.card.description && (
              <p className="mt-2 text-sm text-muted-foreground">{selectedCard.card.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-muted px-2 py-1 text-muted-foreground">
                Coluna: {selectedCard.columnName}
              </span>
              <span className="rounded px-2 py-1 capitalize bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {selectedCard.card.priority}
              </span>
              {selectedCard.card.due_date && (
                <span className="rounded bg-muted px-2 py-1 text-muted-foreground">
                  Prazo: {new Date(selectedCard.card.due_date).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
            {selectedCard.card.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedCard.card.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
