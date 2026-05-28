import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

interface ChartEntry {
  name: string;
  value: number;
}

interface ReportPdfData {
  reportType: string;
  reportLabel: string;
  total: number;
  chartData: ChartEntry[];
  dateFrom?: string;
  dateTo?: string;
  tableRows?: Record<string, string>[];
  narrative?: string;
  generatedAt: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1e293b',
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
    paddingBottom: 12,
  },
  logoText: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    color: '#0f172a',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    color: '#334155',
    backgroundColor: '#f1f5f9',
    padding: '4 8',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  filterItem: {
    fontSize: 9,
    color: '#64748b',
  },
  filterValue: {
    color: '#1e293b',
    fontFamily: 'Helvetica-Bold',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  kpiLabel: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#6366f1',
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    padding: '5 8',
    marginBottom: 1,
  },
  tableRow: {
    flexDirection: 'row',
    padding: '4 8',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  col1: { flex: 3, fontSize: 9 },
  col2: { flex: 1, fontSize: 9, textAlign: 'center' },
  colHeader: { fontFamily: 'Helvetica-Bold', fontSize: 9 },
  barContainer: {
    marginTop: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  barLabel: {
    width: 100,
    fontSize: 9,
    color: '#475569',
    paddingRight: 8,
  },
  barBg: {
    flex: 1,
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
  },
  barFill: {
    height: 12,
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  barValue: {
    width: 30,
    fontSize: 9,
    textAlign: 'right',
    color: '#334155',
    fontFamily: 'Helvetica-Bold',
    paddingLeft: 4,
  },
  narrative: {
    fontSize: 10,
    color: '#334155',
    lineHeight: 1.6,
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
  },
});

function BarChart({ data }: { data: ChartEntry[] }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={styles.barContainer}>
      {data.map((entry, idx) => (
        <View key={idx} style={styles.barRow}>
          <Text style={styles.barLabel}>{entry.name}</Text>
          <View style={styles.barBg}>
            <View
              style={[styles.barFill, { width: `${Math.round((entry.value / maxValue) * 100)}%` }]}
            />
          </View>
          <Text style={styles.barValue}>{entry.value}</Text>
        </View>
      ))}
    </View>
  );
}

function ReportDocument({ data }: { data: ReportPdfData }) {
  const dateStr = new Date(data.generatedAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Document title={`Relatório — ${data.reportLabel}`} author="CoopWork">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>CoopWork</Text>
          <Text style={styles.subtitle}>Plataforma de Gestão Corporativa</Text>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.title}>{data.reportLabel}</Text>
          <Text style={styles.subtitle}>Gerado em {dateStr}</Text>
        </View>

        {/* Filters */}
        {(data.dateFrom || data.dateTo) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Filtros aplicados</Text>
            <View style={styles.filterRow}>
              {data.dateFrom && (
                <Text style={styles.filterItem}>
                  De: <Text style={styles.filterValue}>{data.dateFrom}</Text>
                </Text>
              )}
              {data.dateTo && (
                <Text style={styles.filterItem}>
                  Até: <Text style={styles.filterValue}>{data.dateTo}</Text>
                </Text>
              )}
            </View>
          </View>
        )}

        {/* KPI */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total de registros</Text>
            <Text style={styles.kpiValue}>{data.total}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Categorias distintas</Text>
            <Text style={styles.kpiValue}>{data.chartData.length}</Text>
          </View>
        </View>

        {/* Bar chart */}
        {data.chartData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Distribuição por categoria</Text>
            <BarChart data={data.chartData} />
          </View>
        )}

        {/* Detail table */}
        {data.tableRows && data.tableRows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Detalhamento ({data.tableRows.length} registros)
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.col1, styles.colHeader]}>Título / Ação</Text>
                <Text style={[styles.col2, styles.colHeader]}>Data / Prazo</Text>
                <Text style={[styles.col2, styles.colHeader]}>Prioridade</Text>
              </View>
              {data.tableRows.slice(0, 50).map((row, idx) => (
                <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={styles.col1}>{row.title ?? row.action ?? '—'}</Text>
                  <Text style={[styles.col2, { color: '#ef4444' }]}>
                    {row.due_date
                      ? new Date(row.due_date).toLocaleDateString('pt-BR')
                      : row.created_at
                        ? new Date(row.created_at).toLocaleDateString('pt-BR')
                        : '—'}
                  </Text>
                  <Text style={styles.col2}>{row.priority ?? '—'}</Text>
                </View>
              ))}
              {data.tableRows.length > 50 && (
                <Text style={{ fontSize: 8, color: '#94a3b8', marginTop: 4 }}>
                  + {data.tableRows.length - 50} registros não exibidos
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Narrative */}
        {data.narrative && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Análise executiva (IA)</Text>
            <Text style={styles.narrative}>{data.narrative}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>CoopWork — Relatório gerado automaticamente</Text>
          <Text>{dateStr}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadReportPdf(data: ReportPdfData): Promise<void> {
  const blob = await pdf(<ReportDocument data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-${data.reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
