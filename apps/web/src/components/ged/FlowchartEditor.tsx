import { useCallback, useState } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  Background,
  MiniMap,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

interface FlowchartJson {
  nodes: Node[];
  edges: Edge[];
}

interface Props {
  documentId: string;
  documentTitle: string;
  initialJson?: FlowchartJson | null;
  onClose: () => void;
  onSaved?: () => void;
}

let nodeIdCounter = 1;

const INITIAL_NODES: Node[] = [
  { id: '1', type: 'input', position: { x: 250, y: 50 }, data: { label: 'Início' } },
  { id: '2', position: { x: 250, y: 180 }, data: { label: 'Processo' } },
  { id: '3', type: 'output', position: { x: 250, y: 310 }, data: { label: 'Fim' } },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];

export function FlowchartEditor({
  documentId,
  documentTitle,
  initialJson,
  onClose,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const startNodes = initialJson?.nodes ?? INITIAL_NODES;
  const startEdges = initialJson?.edges ?? INITIAL_EDGES;

  const [nodes, setNodes, onNodesChange] = useNodesState(startNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(startEdges);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const addNode = useCallback(() => {
    nodeIdCounter++;
    const id = `node-${Date.now()}-${nodeIdCounter}`;
    const newNode: Node = {
      id,
      position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
      data: { label: `Etapa ${nodeIdCounter}` },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/documents/${documentId}`, {
        is_flowchart: true,
        flowchart_json: { nodes, edges },
      });
      toast('Fluxograma salvo');
      onSaved?.();
    } catch {
      toast('Erro ao salvar fluxograma', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Fechar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">{documentTitle}</h2>
          <p className="text-xs text-muted-foreground">Editor de fluxograma</p>
        </div>
        <button
          onClick={addNode}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
        >
          + Adicionar nó
        </button>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          deleteKeyCode="Delete"
        >
          <Controls />
          <MiniMap />
          <Background gap={16} />
        </ReactFlow>
      </div>

      {/* Help bar */}
      <div className="border-t border-border bg-card px-4 py-2 text-xs text-muted-foreground flex gap-4">
        <span>Arrastar nó: mover</span>
        <span>Arrastar da alça: conectar</span>
        <span>Delete: remover selecionado</span>
        <span>Scroll: zoom</span>
      </div>
    </div>
  );
}
