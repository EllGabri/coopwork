import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../hooks/useTheme';

interface UserProfile {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  fullName: string | null;
  avatarUrl: string | null;
  departmentId: string | null;
  lastLoginAt: string | null;
}

interface RecentNotification {
  id: string;
  title: string;
  body: string;
  created_at: string;
  type: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  compliance: 'Compliance',
  manager: 'Gerente',
  director: 'Diretor',
  assistant: 'Assistente',
};

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
] as const;

function Avatar({ name, url }: { name: string | null; url: string | null }) {
  const [imgError, setImgError] = useState(false);
  const initials = name
    ? name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : 'U';

  if (url && !imgError) {
    return (
      <img
        src={url}
        alt={name ?? 'Avatar'}
        className="h-20 w-20 rounded-full object-cover ring-4 ring-background shadow-lg"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary ring-4 ring-background shadow-lg">
      <span className="text-2xl font-bold text-primary-foreground">{initials}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activity, setActivity] = useState<RecentNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<UserProfile>('/auth/me'),
      api.get<RecentNotification[]>('/notifications').catch(() => []),
    ])
      .then(([p, notifs]) => {
        setProfile(p);
        setActivity((notifs as RecentNotification[]).slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-muted animate-pulse" />
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">Não foi possível carregar o perfil.</p>
      </div>
    );
  }

  const displayName = profile.fullName ?? profile.email.split('@')[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-5">
        <Avatar name={profile.fullName} url={profile.avatarUrl} />
        <div>
          <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          <span className="mt-1 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {ROLE_LABELS[profile.role] ?? profile.role}
          </span>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Informações da conta</h2>
        </div>
        <div className="divide-y divide-border">
          <InfoRow label="ID do usuário" value={profile.userId} mono />
          <InfoRow label="E-mail" value={profile.email} />
          <InfoRow label="Perfil de acesso" value={ROLE_LABELS[profile.role] ?? profile.role} />
          <InfoRow
            label="Último login"
            value={
              profile.lastLoginAt
                ? new Date(profile.lastLoginAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'
            }
          />
        </div>
      </div>

      {/* Theme preference */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Preferência de tema</h2>
        </div>
        <div className="flex gap-3 p-4">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex-1 rounded-lg border-2 py-3 text-sm font-medium transition-colors ${
                theme === opt.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Atividade recente</h2>
        </div>
        {activity.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhuma atividade recente.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {activity.map((n) => (
              <div key={n.id} className="px-4 py-3">
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {new Date(n.created_at).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`text-sm text-foreground text-right truncate max-w-[60%] ${mono ? 'font-mono text-xs' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
