import { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { api } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { downloadReportPdf } from '../components/reports/ReportPdf';
import { downloadReportExcel } from '../components/reports/ExcelExport';

type ReportType = 'tasks-by-status' | 'tasks-by-assignee' | 'documents-accessed' | 'open-risks';

interface ChartEntry {
  name: string;
  value: number;
}

interface ReportResult {
  total: number;
  byStatus?: { status: string; count: number }[];
  byAssignee?: { assigneeId: string; count: number }[];
  byAction?: { action: string; count: number }[];
  byPriority?: { priority: string; count: number }[];
  overdueCards?: { id: string; title: string; priority: string; due_date: string }[];
  recentLogs?: { id: string; action: string; user_id: string; created_at: string }[];
}

const REPORT_TYPES: { value: ReportType; label: string; icon: string }[] = [
  { value: 'tasks-by-status', label: 'Tarefas por status', icon: '📊' },
  { value: 'tasks-by-assignee', label: 'Tarefas por responsável', icon: '👤' },
  { value: 'documents-accessed', label: 'Documentos acessados', icon: '📄' },
  { value: 'open-risks', label: 'Riscos abertos (atrasados)', icon: '⚠️' },
];

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899'];

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

function getChartData(type: ReportType, result: ReportResult): ChartEntry[] {
  switch (type) {
    case 'tasks-by-status':
      return (result.byStatus ?? []).map((d) => ({ name: d.status, value: d.count }));
    case 'tasks-by-assignee':
      return (result.byAssignee ?? [])
        .slice(0, 10)
        .map((d) => ({ name: d.assigneeId.slice(0, 8) + '…', value: d.count }));
    case 'documents-accessed':
      return (result.byAction ?? []).map((d) => ({ name: d.action, value: d.count }));
    case 'open-risks':
      return (result.byPriority ?? []).map((d) => ({
        name: PRIORITY_LABELS[d.priority] ?? d.priority,
        value: d.count,
      }));
    default:
      return [];
  }
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<ReportType>('tasks-by-status');
  const [departmentId, setDepartmentId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [generating, setGenerating] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setNarrative('');
    try {
      const params = new URLSearchParams();
      if (departmentId) params.set('departmentId', departmentId);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const qs = params.toString();
      const data = await api.get<ReportResult>(`/reports/${reportType}${qs ? `?${qs}` : ''}`);
      setResult(data);
      setPage(0);
    } catch {
      toast('Erro ao carregar relatório', 'error');
    } finally {
      setLoading(false);
    }
  }, [reportType, departmentId, dateFrom, dateTo, toast]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const handleExportPdf = async () => {
    if (!result) return;
    setExportingPdf(true);
    try {
      const reportLabel = REPORT_TYPES.find((r) => r.value === reportType)?.label ?? reportType;
      await downloadReportPdf({
        reportType,
        reportLabel,
        total: result.total,
        chartData: getChartData(reportType, result),
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        tableRows: [
          ...((result.overdueCards as unknown as Record<string, string>[]) ?? []),
          ...((result.recentLogs as unknown as Record<string, string>[]) ?? []),
        ],
        narrative: narrative || undefined,
        generatedAt: new Date().toISOString(),
      });
    } catch {
      toast('Erro ao gerar PDF', 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    if (!result) return;
    setExportingXlsx(true);
    try {
      const reportLabel = REPORT_TYPES.find((r) => r.value === reportType)?.label ?? reportType;
      const rawRows = [
        ...((result.overdueCards as unknown as Record<string, string | number>[]) ?? []),
        ...((result.recentLogs as unknown as Record<string, string | number>[]) ?? []),
      ];
      await downloadReportExcel({
        reportType,
        reportLabel,
        total: result.total,
        chartData: getChartData(reportType, result),
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        rawRows: rawRows.length ? rawRows : undefined,
        generatedAt: new Date().toISOString(),
      });
    } catch {
      toast('Erro ao gerar Excel', 'error');
    } finally {
      setExportingXlsx(false);
    }
  };

  const handleGenerateNarrative = async () => {
    if (!result) return;
    setGenerating(true);
    setNarrative('');
    try {
      const data = {
        reportType,
        total: result.total,
        chartData: getChartData(reportType, result),
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };
      const text = await api.post<string>('/ai/reports/generate-narrative', { data });
      setNarrative(typeof text === 'string' ? text : JSON.stringify(text));
    } catch {
      toast('Erro ao gerar narrativa', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const chartData = result ? getChartData(reportType, result) : [];

  // Paginated table rows
  const tableRows = (() => {
    if (!result) return [];
    if (reportType === 'open-risks') return result.overdueCards ?? [];
    if (reportType === 'documents-accessed') return result.recentLogs ?? [];
    return [];
  })();
  const pagedRows = tableRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(tableRows.length / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-foreground">Relatórios</h1>
        <div className="flex gap-2">
          <button
            onClick={() => void handleExportExcel()}
            disabled={exportingXlsx || !result}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            <span>📗</span>
            {exportingXlsx ? 'Gerando Excel…' : 'Exportar Excel'}
          </button>
          <button
            onClick={() => void handleExportPdf()}
            disabled={exportingPdf || !result}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            <span>📥</span>
            {exportingPdf ? 'Gerando PDF…' : 'Exportar PDF'}
          </button>
          <button
            onClick={() => void handleGenerateNarrative()}
            disabled={generating || !result}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <span>✨</span>
            {generating ? 'Gerando narrativa…' : 'Gerar narrativa'}
          </button>
        </div>
      </div>

      {/* Type selector */}
      <div className="flex gap-2 flex-wrap">
        {REPORT_TYPES.map((rt) => (
          <button
            key={rt.value}
            onClick={() => setReportType(rt.value)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${reportType === rt.value ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'}`}
          >
            <span>{rt.icon}</span>
            {rt.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Departamento</span>
          <input
            type="text"
            placeholder="UUID do dept."
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground w-36 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">De</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground"
          />
        </div>
        <button
          onClick={() => void fetchReport()}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          Aplicar filtros
        </button>
        {result && (
          <span className="ml-auto text-xs text-muted-foreground">
            Total: <strong className="text-foreground">{result.total}</strong>
          </span>
        )}
      </div>

      {/* Charts */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-64 rounded-lg bg-muted animate-pulse" />
          <div className="h-32 rounded-lg bg-muted animate-pulse" />
        </div>
      ) : (
        result && (
          <div className="space-y-5">
            {/* Bar chart */}
            {chartData.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <h2 className="text-sm font-semibold text-foreground mb-4">
                  {REPORT_TYPES.find((r) => r.value === reportType)?.label ?? ''}
                </h2>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      stroke="currentColor"
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="currentColor"
                      className="text-muted-foreground"
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" name="Quantidade" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Pie chart */}
            {chartData.length > 0 && chartData.length <= 8 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <h2 className="text-sm font-semibold text-foreground mb-4">Distribuição</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name ?? ''}: ${(((percent as number | undefined) ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {chartData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Detail table */}
            {tableRows.length > 0 && (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">
                    Detalhamento ({tableRows.length})
                  </h2>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                        className="rounded border border-border px-2 py-0.5 disabled:opacity-40 hover:bg-muted"
                      >
                        ‹
                      </button>
                      <span className="text-muted-foreground">
                        {page + 1}/{totalPages}
                      </span>
                      <button
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded border border-border px-2 py-0.5 disabled:opacity-40 hover:bg-muted"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      {reportType === 'open-risks' && (
                        <>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                            Título
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                            Prioridade
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                            Prazo
                          </th>
                        </>
                      )}
                      {reportType === 'documents-accessed' && (
                        <>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                            Ação
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                            Data
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagedRows.map((row: Record<string, string>) => (
                      <tr key={row.id} className="hover:bg-muted/20">
                        {reportType === 'open-risks' && (
                          <>
                            <td className="px-4 py-2.5 text-foreground">{row.title}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {PRIORITY_LABELS[row.priority] ?? row.priority}
                            </td>
                            <td className="px-4 py-2.5 text-destructive">
                              {new Date(row.due_date).toLocaleDateString('pt-BR')}
                            </td>
                          </>
                        )}
                        {reportType === 'documents-accessed' && (
                          <>
                            <td className="px-4 py-2.5 text-foreground">{row.action}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {new Date(row.created_at).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      )}

      {/* AI Narrative */}
      {(generating || narrative) && (
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>✨</span> Narrativa executiva
            </h2>
          </div>
          <div className="p-4">
            {generating && (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className={`h-4 rounded bg-muted animate-pulse ${i === 2 ? 'w-2/3' : 'w-full'}`}
                  />
                ))}
              </div>
            )}
            {narrative && (
              <div>
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
