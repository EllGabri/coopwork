import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

interface ReportData {
  totalWorkspaces: number;
  totalBoards: number;
  totalCards: number;
  cardsByPriority: Record<string, number>;
  cardsByStatus: Record<string, number>;
  overdueCards: number;
  generatedAt: string;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [narrative, setNarrative] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [workspaces, ...rest] = await Promise.all([
        api.get<{ id: string }[]>('/workspaces').catch(() => []),
        api.get<{ id: string }[]>('/workspaces').catch(() => []),
      ]);
      void rest;

      const reportData: ReportData = {
        totalWorkspaces: (workspaces as { id: string }[]).length,
        totalBoards: 0,
        totalCards: 0,
        cardsByPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
        cardsByStatus: { todo: 0, in_progress: 0, done: 0 },
        overdueCards: 0,
        generatedAt: new Date().toISOString(),
      };

      for (const ws of workspaces as { id: string }[]) {
        try {
          const boards = await api.get<
            {
              id: string;
              board_columns?: {
                cards?: { id: string; priority: string; due_date?: string; column_id?: string }[];
              }[];
            }[]
          >(`/workspaces/${ws.id}/boards`);
          reportData.totalBoards += boards.length;

          for (const board of boards) {
            const fullBoard = await api.get<{
              board_columns?: {
                name: string;
                cards?: { id: string; priority: string; due_date?: string }[];
              }[];
            }>(`/boards/${board.id}`);
            const cols = fullBoard.board_columns ?? [];
            for (const col of cols) {
              const cards = col.cards ?? [];
              reportData.totalCards += cards.length;

              const colName = (col as { name: string }).name?.toLowerCase() ?? '';
              for (const card of cards) {
                const p = card.priority as string;
                if (p in reportData.cardsByPriority) reportData.cardsByPriority[p]++;

                if (colName.includes('fazer') || colName.includes('todo')) {
                  reportData.cardsByStatus.todo++;
                } else if (colName.includes('progresso') || colName.includes('wip')) {
                  reportData.cardsByStatus.in_progress++;
                } else if (colName.includes('conclu') || colName.includes('done')) {
                  reportData.cardsByStatus.done++;
                }

                if (card.due_date && new Date(card.due_date) < new Date()) {
                  reportData.overdueCards++;
                }
              }
            }
          }
        } catch {
          // skip board fetch errors
        }
      }

      setData(reportData);
    } catch {
      toast('Erro ao carregar dados do relatório', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNarrative = async () => {
    if (!data) return;
    setGenerating(true);
    setNarrative('');
    try {
      const result = await api.post<string>('/ai/reports/generate-narrative', { data });
      setNarrative(typeof result === 'string' ? result : JSON.stringify(result));
    } catch {
      toast('Erro ao gerar narrativa', 'error');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const tableRows = [
    { label: 'Workspaces ativos', value: data.totalWorkspaces },
    { label: 'Boards totais', value: data.totalBoards },
    { label: 'Cards totais', value: data.totalCards },
    { label: 'Cards — prioridade baixa', value: data.cardsByPriority.low },
    { label: 'Cards — prioridade média', value: data.cardsByPriority.medium },
    { label: 'Cards — prioridade alta', value: data.cardsByPriority.high },
    { label: 'Cards — prioridade urgente', value: data.cardsByPriority.urgent },
    { label: 'Cards a fazer', value: data.cardsByStatus.todo },
    { label: 'Cards em progresso', value: data.cardsByStatus.in_progress },
    { label: 'Cards concluídos', value: data.cardsByStatus.done },
    { label: 'Cards com prazo vencido', value: data.overdueCards },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Relatório Gerencial</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchReportData}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
          >
            Atualizar dados
          </button>
          <button
            onClick={() => void handleGenerateNarrative()}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <span>✨</span>
            {generating ? 'Gerando narrativa…' : 'Gerar narrativa'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Workspaces', value: data.totalWorkspaces, color: 'text-blue-600' },
          { label: 'Boards', value: data.totalBoards, color: 'text-indigo-600' },
          { label: 'Cards', value: data.totalCards, color: 'text-violet-600' },
          {
            label: 'Vencidos',
            value: data.overdueCards,
            color: data.overdueCards > 0 ? 'text-destructive' : 'text-green-600',
          },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className={`text-3xl font-bold mt-1 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Data table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Dados detalhados</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerado em {new Date(data.generatedAt).toLocaleString('pt-BR')}
          </p>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {tableRows.map((row) => (
              <tr key={row.label} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 text-muted-foreground">{row.label}</td>
                <td className="px-4 py-2.5 text-right font-medium text-foreground tabular-nums">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI Narrative */}
      {(generating || narrative) && (
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>✨</span>
              Narrativa executiva
            </h2>
          </div>
          <div className="p-4">
            {generating && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-4 rounded bg-muted animate-pulse ${i === 3 ? 'w-2/3' : 'w-full'}`}
                  />
                ))}
              </div>
            )}
            {narrative && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {narrative.split('\n\n').map((para, idx) => (
                  <p key={idx} className="text-sm text-foreground leading-relaxed mb-3 last:mb-0">
                    {para}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
