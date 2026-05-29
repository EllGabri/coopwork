import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatusEntry {
  status: string;
  count: number;
}
interface AssigneeEntry {
  assigneeId: string;
  count: number;
  name?: string;
}
interface TasksByStatusResponse {
  total: number;
  byStatus: StatusEntry[];
}
interface TasksByAssigneeResponse {
  total: number;
  byAssignee: AssigneeEntry[];
}
interface Workspace {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS = ['#1E88E5', '#43A047', '#FB8C00', '#E53935', '#8E24AA', '#00ACC1'];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

function KpiCard({ label, value, icon, color, loading }: KpiCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <Skeleton className="h-8 w-8 rounded-lg mb-3" />
        <Skeleton className="h-7 w-16 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
      <div
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const [statusData, setStatusData] = useState<TasksByStatusResponse | null>(null);
  const [assigneeData, setAssigneeData] = useState<TasksByAssigneeResponse | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [ws] = await Promise.allSettled([api.get<Workspace[]>('/workspaces')]);

        if (ws.status === 'fulfilled') setWorkspaces(ws.value ?? []);

        // Reports endpoints require manager+ role
        const [status, assignee] = await Promise.allSettled([
          api.get<TasksByStatusResponse>('/reports/tasks-by-status'),
          api.get<TasksByAssigneeResponse>('/reports/tasks-by-assignee'),
        ]);

        if (status.status === 'fulfilled') setStatusData(status.value);
        if (assignee.status === 'fulfilled') setAssigneeData(assignee.value);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // Derive KPI values from status data
  const total = statusData?.total ?? 0;

  const inProgress =
    statusData?.byStatus
      .filter((s) => /andamento|progress|wip/i.test(s.status))
      .reduce((sum, s) => sum + s.count, 0) ?? 0;

  const done =
    statusData?.byStatus
      .filter((s) => /conclu|done|finish|feito/i.test(s.status))
      .reduce((sum, s) => sum + s.count, 0) ?? 0;

  // Top assignees for bar chart (top 6)
  const assigneeChartData = (assigneeData?.byAssignee ?? [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((a) => ({
      name: a.name ?? a.assigneeId.slice(0, 8),
      tarefas: a.count,
    }));

  const pieData = (statusData?.byStatus ?? []).map((s) => ({
    name: s.status,
    value: s.count,
  }));

  const hasReportAccess = statusData !== null || !loading;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {user?.fullName?.split(' ')[0] ?? 'bem-vindo'} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aqui está o resumo de atividades da plataforma.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erro ao carregar dados: {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total de tarefas"
          value={total}
          loading={loading}
          color="#1E88E5"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
        />
        <KpiCard
          label="Em andamento"
          value={inProgress}
          loading={loading}
          color="#FB8C00"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <KpiCard
          label="Concluídas"
          value={done}
          loading={loading}
          color="#43A047"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <KpiCard
          label="Workspaces ativos"
          value={workspaces.length}
          loading={loading}
          color="#F5B400"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          }
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pie: Tasks by status */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Distribuição por status</h2>
          {loading ? (
            <Skeleton className="h-52 w-full" />
          ) : !hasReportAccess || pieData.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
              {!hasReportAccess
                ? 'Acesso restrito a gerentes e acima.'
                : 'Nenhuma tarefa encontrada.'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} tarefas`]} />
                <Legend iconSize={10} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar: Tasks by assignee */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Tarefas por responsável</h2>
          {loading ? (
            <Skeleton className="h-52 w-full" />
          ) : assigneeChartData.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
              {statusData === null
                ? 'Acesso restrito a gerentes e acima.'
                : 'Nenhum responsável atribuído.'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={assigneeChartData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="tarefas" fill="#1E88E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent workspaces */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Workspaces</h2>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum workspace encontrado.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {workspaces.map((ws, i) => (
              <div
                key={ws.id}
                className="rounded-lg border bg-muted/30 p-4 hover:bg-muted/50 transition-colors cursor-default"
              >
                <div
                  className="mb-2 flex h-8 w-8 items-center justify-center rounded-md text-white text-sm font-bold"
                  style={{ backgroundColor: STATUS_COLORS[i % STATUS_COLORS.length] }}
                >
                  {ws.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm font-medium text-foreground truncate">{ws.name}</p>
                {ws.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">{ws.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
