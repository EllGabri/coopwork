import ExcelJS from 'exceljs';

interface ChartEntry {
  name: string;
  value: number;
}

interface ExcelReportData {
  reportType: string;
  reportLabel: string;
  total: number;
  chartData: ChartEntry[];
  dateFrom?: string;
  dateTo?: string;
  rawRows?: Record<string, string | number>[];
  generatedAt: string;
}

const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF6366F1' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
};

const ALT_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF8FAFC' },
};

function applyHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF4F46E5' } },
    };
  });
  row.height = 20;
}

export async function downloadReportExcel(data: ExcelReportData): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CoopWork';
  wb.created = new Date(data.generatedAt);

  // ── Sheet 1: Dados Brutos ──────────────────────────────────────────────────
  const wsData = wb.addWorksheet('Dados', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const rawRows = data.rawRows ?? [];

  if (rawRows.length > 0) {
    const columns = Object.keys(rawRows[0]);
    wsData.columns = columns.map((key) => ({
      header: key,
      key,
      width: Math.min(Math.max(key.length + 4, 12), 40),
    }));

    applyHeaderRow(wsData.getRow(1));

    rawRows.forEach((row, idx) => {
      const wsRow = wsData.addRow(row);
      if (idx % 2 === 1) {
        wsRow.eachCell((cell) => {
          cell.fill = ALT_FILL;
        });
      }
    });
  } else {
    // No raw data — show chart data as table
    wsData.columns = [
      { header: 'Categoria', key: 'name', width: 30 },
      { header: 'Quantidade', key: 'value', width: 15 },
    ];
    applyHeaderRow(wsData.getRow(1));
    data.chartData.forEach((entry, idx) => {
      const wsRow = wsData.addRow(entry);
      if (idx % 2 === 1)
        wsRow.eachCell((c) => {
          c.fill = ALT_FILL;
        });
    });
  }

  // ── Sheet 2: Sumário ───────────────────────────────────────────────────────
  const wsSummary = wb.addWorksheet('Sumário');

  // Title block
  wsSummary.getCell('A1').value = 'CoopWork — Relatório Gerencial';
  wsSummary.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF6366F1' } };
  wsSummary.getCell('A2').value = data.reportLabel;
  wsSummary.getCell('A2').font = { size: 12 };
  wsSummary.getCell('A3').value =
    `Gerado em: ${new Date(data.generatedAt).toLocaleString('pt-BR')}`;
  wsSummary.getCell('A3').font = { size: 10, color: { argb: 'FF64748B' } };

  if (data.dateFrom || data.dateTo) {
    wsSummary.getCell('A4').value = `Período: ${data.dateFrom ?? '—'} até ${data.dateTo ?? '—'}`;
    wsSummary.getCell('A4').font = { size: 10, color: { argb: 'FF64748B' } };
  }

  // KPI block
  const kpiRow = 6;
  wsSummary.getCell(`A${kpiRow}`).value = 'Total de registros';
  wsSummary.getCell(`B${kpiRow}`).value = data.total;
  wsSummary.getCell(`B${kpiRow}`).font = { bold: true };
  wsSummary.getCell(`A${kpiRow + 1}`).value = 'Categorias distintas';
  wsSummary.getCell(`B${kpiRow + 1}`).value = data.chartData.length;
  wsSummary.getCell(`B${kpiRow + 1}`).font = { bold: true };

  // Distribution table
  const tableStart = kpiRow + 3;
  wsSummary.getCell(`A${tableStart}`).value = 'Categoria';
  wsSummary.getCell(`B${tableStart}`).value = 'Quantidade';
  wsSummary.getCell(`C${tableStart}`).value = '% do Total';

  const headerRow = wsSummary.getRow(tableStart);
  applyHeaderRow(headerRow);

  data.chartData.forEach((entry, idx) => {
    const rowNum = tableStart + 1 + idx;
    const wsRow = wsSummary.getRow(rowNum);
    wsRow.getCell(1).value = entry.name;
    wsRow.getCell(2).value = entry.value;
    wsRow.getCell(3).value = data.total > 0 ? +((entry.value / data.total) * 100).toFixed(1) : 0;
    wsRow.getCell(3).numFmt = '0.0"%"';
    if (idx % 2 === 1)
      wsRow.eachCell((c) => {
        c.fill = ALT_FILL;
      });
  });

  // Total row
  const totalRowNum = tableStart + 1 + data.chartData.length;
  wsSummary.getCell(`A${totalRowNum}`).value = 'TOTAL';
  wsSummary.getCell(`A${totalRowNum}`).font = { bold: true };
  wsSummary.getCell(`B${totalRowNum}`).value = data.total;
  wsSummary.getCell(`B${totalRowNum}`).font = { bold: true };
  wsSummary.getCell(`C${totalRowNum}`).value = 100;
  wsSummary.getCell(`C${totalRowNum}`).numFmt = '0.0"%"';
  wsSummary.getCell(`C${totalRowNum}`).font = { bold: true };

  wsSummary.columns = [{ width: 30 }, { width: 15 }, { width: 12 }];

  // ── Download ───────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-${data.reportType}-${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
