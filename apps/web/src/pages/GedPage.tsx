import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { FlowchartEditor } from '../components/ged/FlowchartEditor';
import { DocumentAclModal } from '../components/ged/DocumentAclModal';

interface DocCategory {
  id: string;
  name: string;
  icon?: string;
}

interface Document {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  current_version: number;
  status: string;
  tags: string[];
  review_date: string | null;
  expiration_date: string | null;
  is_flowchart: boolean;
  flowchart_json?: { nodes: unknown[]; edges: unknown[] } | null;
  created_at: string;
  updated_at: string;
}

const FALLBACK_CATEGORIES = [
  'Instruções',
  'Auditorias',
  'Processos',
  'Manuais',
  'Políticas',
  'Normas',
  'Relatórios',
  'Atas',
  'Contratos',
  'Formulários',
  'Treinamentos',
];

function formatBytes(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeIcon(mime: string | null) {
  if (!mime) return '📄';
  if (mime === 'application/pdf') return '📕';
  if (mime.includes('word')) return '📝';
  if (mime.includes('sheet') || mime.includes('excel')) return '📊';
  if (mime.includes('image')) return '🖼';
  return '📄';
}

export default function GedPage() {
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [flowchartDoc, setFlowchartDoc] = useState<Document | null>(null);
  const [aclDoc, setAclDoc] = useState<Document | null>(null);

  // Load categories
  useEffect(() => {
    api
      .get<DocCategory[]>('/documents/categories')
      .then(setCategories)
      .catch(() => {
        // Fallback to hardcoded list if no categories in DB yet
        setCategories(FALLBACK_CATEGORIES.map((name, i) => ({ id: String(i), name })));
      });
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch documents
  const fetchDocuments = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCategory) params.set('categoryId', selectedCategory);
    if (debouncedSearch) params.set('search', debouncedSearch);
    const qs = params.toString();
    api
      .get<Document[]>(`/documents${qs ? `?${qs}` : ''}`)
      .then((docs) => {
        let filtered = docs;
        if (dateFrom) filtered = filtered.filter((d) => d.created_at >= dateFrom);
        if (dateTo) filtered = filtered.filter((d) => d.created_at <= dateTo + 'T23:59:59');
        setDocuments(filtered);
      })
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [selectedCategory, debouncedSearch, dateFrom, dateTo]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDownload = async (doc: Document) => {
    setDownloading(doc.id);
    try {
      const result = await api.get<{ signedUrl?: string }>(`/documents/${doc.id}/download`);
      if (result.signedUrl) {
        window.open(result.signedUrl, '_blank');
      } else {
        // PDF is streamed — navigate to endpoint directly
        window.open(
          `${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/documents/${doc.id}/download`,
          '_blank',
        );
      }
    } catch {
      // fallback
    } finally {
      setDownloading(null);
    }
  };

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? '—';

  const isExpired = (doc: Document) =>
    doc.status === 'expired' ||
    (!!doc.expiration_date && new Date(doc.expiration_date) < new Date());

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-border bg-card overflow-y-auto">
        <div className="px-3 py-4">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Categorias
          </p>
          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${selectedCategory === null ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'}`}
          >
            Todos os documentos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`mt-0.5 w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${selectedCategory === cat.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <svg
              className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              placeholder="Buscar documentos…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">De</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
            />
            <span className="text-xs text-muted-foreground">até</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
            />
          </div>
          <span className="ml-auto text-xs text-muted-foreground">
            {documents.length} documento{documents.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => {
              const emptyDoc: Document = {
                id: 'new',
                title: 'Novo Fluxograma',
                description: null,
                category_id: null,
                mime_type: null,
                size_bytes: null,
                current_version: 1,
                status: 'active',
                tags: [],
                review_date: null,
                expiration_date: null,
                is_flowchart: true,
                flowchart_json: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              setFlowchartDoc(emptyDoc);
            }}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
          >
            + Fluxograma
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {search ? 'Nenhum resultado para a busca.' : 'Nenhum documento encontrado.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-border bg-card z-10">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Documento
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Categoria
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Versão
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Tamanho
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Atualizado
                  </th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{mimeIcon(doc.mime_type)}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate max-w-[240px]">
                            {doc.title}
                          </p>
                          <div className="flex gap-1 flex-wrap mt-0.5">
                            {isExpired(doc) && (
                              <span className="rounded bg-destructive/10 px-1 py-0.5 text-[10px] font-medium text-destructive">
                                Expirado
                              </span>
                            )}
                            {doc.tags.slice(0, 2).map((t) => (
                              <span
                                key={t}
                                className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {categoryName(doc.category_id)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      v{doc.current_version}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {formatBytes(doc.size_bytes)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {new Date(doc.updated_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {doc.is_flowchart ? (
                          <button
                            onClick={() => setFlowchartDoc(doc)}
                            className="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors"
                          >
                            Editar
                          </button>
                        ) : (
                          <button
                            onClick={() => void handleDownload(doc)}
                            disabled={downloading === doc.id}
                            className="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10 disabled:opacity-40 transition-colors"
                          >
                            {downloading === doc.id ? '…' : 'Baixar'}
                          </button>
                        )}
                        <button
                          onClick={() => setAclDoc(doc)}
                          className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
                        >
                          Permissões
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ACL modal */}
      {aclDoc && (
        <DocumentAclModal
          documentId={aclDoc.id}
          documentTitle={aclDoc.title}
          onClose={() => setAclDoc(null)}
        />
      )}

      {/* Flowchart editor modal */}
      {flowchartDoc && (
        <FlowchartEditor
          documentId={flowchartDoc.id}
          documentTitle={flowchartDoc.title}
          initialJson={
            flowchartDoc.flowchart_json as Parameters<typeof FlowchartEditor>[0]['initialJson']
          }
          onClose={() => setFlowchartDoc(null)}
          onSaved={() => {
            setFlowchartDoc(null);
            fetchDocuments();
          }}
        />
      )}
    </div>
  );
}
