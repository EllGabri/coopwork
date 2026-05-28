import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

type AdminState = 'loading' | 'setup-required' | 'verify-required' | 'authenticated';
type AdminSection = 'home' | 'users';

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
  last_login_at: string | null;
}

const ROLES = ['super_admin', 'director', 'manager', 'compliance', 'assistant'];

export default function AdminPage() {
  const { toast } = useToast();
  const [state, setState] = useState<AdminState>('loading');
  const [section, setSection] = useState<AdminSection>('home');
  const [qrCode, setQrCode] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Users management state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // Try accessing a protected admin endpoint
      await api.get('/admin/me');
      setState('authenticated');
    } catch {
      // Not authenticated via TOTP yet — check if TOTP is configured
      try {
        const status = await api.get<{ enabled: boolean }>('/admin/totp/status');
        setState(status.enabled ? 'verify-required' : 'setup-required');
      } catch {
        setState('verify-required');
      }
    }
  };

  const handleSetup = async () => {
    setSubmitting(true);
    try {
      const result = await api.post<{ qrCodeDataUrl: string; secret: string }>(
        '/admin/totp/setup',
        {},
      );
      setQrCode(result.qrCodeDataUrl);
      setSetupSecret(result.secret);
    } catch {
      toast('Erro ao configurar TOTP', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchUsers = useCallback(
    async (search = '') => {
      setUserLoading(true);
      try {
        const qs = search ? `?search=${encodeURIComponent(search)}` : '';
        const data = await api.get<AdminUser[]>(`/admin/users${qs}`);
        setUsers(data);
      } catch {
        toast('Erro ao carregar usuários', 'error');
      } finally {
        setUserLoading(false);
      }
    },
    [toast],
  );

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      toast('Role atualizado');
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch {
      toast('Erro ao atualizar role', 'error');
    }
  };

  const handleStatusToggle = async (user: AdminUser) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/admin/users/${user.id}/status`, { status: newStatus });
      toast(`Usuário ${newStatus === 'active' ? 'ativado' : 'desativado'}`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)));
    } catch {
      toast('Erro ao alterar status', 'error');
    }
  };

  const handleForceLogout = async (userId: string) => {
    try {
      await api.post(`/admin/users/${userId}/force-logout`, {});
      toast('Sessão invalidada');
    } catch {
      toast('Erro ao forçar logout', 'error');
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setSubmitting(true);
    try {
      await api.post('/admin/totp/verify', { code });
      toast('Acesso admin liberado');
      setState('authenticated');
    } catch {
      toast('Código inválido. Tente novamente.', 'error');
      setCode('');
    } finally {
      setSubmitting(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (state === 'setup-required') {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
          <div className="mb-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <span className="text-2xl">🔐</span>
            </div>
            <h1 className="text-lg font-bold text-foreground">Configurar autenticação admin</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure o Google Authenticator para proteger o acesso ao admin.
            </p>
          </div>

          {!qrCode ? (
            <button
              onClick={() => void handleSetup()}
              disabled={submitting}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Gerando…' : 'Gerar QR Code'}
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-xs text-muted-foreground">
                Escaneie o QR Code com o Google Authenticator:
              </p>
              <div className="flex justify-center">
                <img src={qrCode} alt="QR Code TOTP" className="h-40 w-40 rounded-lg" />
              </div>
              {setupSecret && (
                <div className="rounded-md bg-muted px-3 py-2">
                  <p className="text-[10px] text-muted-foreground mb-1">Chave manual:</p>
                  <p className="text-xs font-mono text-foreground break-all">{setupSecret}</p>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Após escanear, insira o código de 6 dígitos para confirmar:
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && void handleVerify()}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-center text-2xl font-mono tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="000000"
                  autoFocus
                />
                <button
                  onClick={() => void handleVerify()}
                  disabled={submitting || code.length !== 6}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? 'Verificando…' : 'Confirmar e acessar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (state === 'verify-required') {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <span className="text-2xl">🔑</span>
            </div>
            <h1 className="text-lg font-bold text-foreground">Acesso Admin</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Insira o código do Google Authenticator
            </p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && void handleVerify()}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-center text-2xl font-mono tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="000000"
              autoFocus
            />
            <button
              onClick={() => void handleVerify()}
              disabled={submitting || code.length !== 6}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Verificando…' : 'Entrar no admin'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // authenticated
  return (
    <div className="mx-auto max-w-5xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {section !== 'home' && (
            <button
              onClick={() => setSection('home')}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              ← Voltar
            </button>
          )}
          <h1 className="text-xl font-bold text-foreground">
            {section === 'home' ? 'Painel Administrativo' : 'Usuários'}
          </h1>
        </div>
        <button
          onClick={async () => {
            await api.post('/admin/totp/logout', {});
            setState('verify-required');
            setCode('');
            setSection('home');
          }}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          Sair do admin
        </button>
      </div>

      {/* Home grid */}
      {section === 'home' && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: 'Usuários',
              desc: 'Gerenciar roles, status e sessões',
              icon: '👥',
              key: 'users' as const,
            },
            { title: 'Permissões', desc: 'Matrix role × módulo', icon: '🔒', key: null },
            { title: 'Parâmetros', desc: 'Configurações do sistema', icon: '⚙️', key: null },
            { title: 'Tarefas', desc: 'Buscar e moderar cards', icon: '📋', key: null },
            { title: 'Monitoramento', desc: 'Dashboard de uso e métricas', icon: '📊', key: null },
            { title: 'Auditoria IA', desc: 'Log de chamadas ao Claude', icon: '🤖', key: null },
          ].map((item) => (
            <div
              key={item.title}
              onClick={() => {
                if (item.key) {
                  setSection(item.key);
                  if (item.key === 'users') void fetchUsers();
                }
              }}
              className={`rounded-lg border border-border bg-card p-4 transition-colors ${item.key ? 'hover:border-primary/40 cursor-pointer' : 'opacity-60'}`}
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              {!item.key && (
                <p className="text-[10px] text-muted-foreground/60 mt-1">Em breve (7.3–7.6)</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Users section */}
      {section === 'users' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="search"
              placeholder="Buscar por nome ou e-mail…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void fetchUsers(userSearch)}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={() => void fetchUsers(userSearch)}
              className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              Buscar
            </button>
          </div>

          {userLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Usuário
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="text-sm font-medium text-foreground">
                          {u.full_name ?? u.email}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={u.role}
                          onChange={(e) => void handleRoleChange(u.id, e.target.value)}
                          className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => void handleStatusToggle(u)}
                          className={`rounded px-2 py-0.5 text-xs font-medium ${u.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}
                        >
                          {u.status === 'active' ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => void handleForceLogout(u.id)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Forçar logout
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-sm text-muted-foreground"
                      >
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
