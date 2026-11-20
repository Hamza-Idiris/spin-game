import type ExcelJS from 'exceljs';
import type { jsPDF } from 'jspdf';
import type { TFunction } from 'i18next';
import type { HistoryRecord } from '../types';

type Row = (string | number)[];
const BRAND = '6C5CE7';

export interface ReportData {
  title: string;
  meta: [string, string][];
  summary: [string, string | number][];
  sections: { name: string; head: string[]; rows: Row[] }[];
}

export function reportData(rec: HistoryRecord, t: TFunction, locale = 'en'): ReportData {
  const when = new Date(rec.createdAt).toLocaleString(locale);
  const o = rec.output;
  const meta: [string, string][] = [
    [t('report.type'), t(`tools.${rec.tool}.name`)],
    [t('report.generated'), when],
    [t('report.resultId'), rec.serverId ?? rec.id],
  ];
  const summary: [string, string | number][] = [[t('report.participants'), rec.participants.length]];
  const sections: ReportData['sections'] = [];
  if (o.groups) {
    summary.push([t('report.groups'), o.groups.length]);
    sections.push({ name: t('report.groups'), head: [t('report.group'), t('report.size'), t('report.members')], rows: o.groups.map((g, i) => [`${t('report.group')} ${i + 1}`, g.length, g.join(', ')]) });
    sections.push({ name: t('report.members'), head: [t('report.group'), '#', t('report.name')], rows: o.groups.flatMap((g, i) => g.map((n, j) => [`${t('report.group')} ${i + 1}`, j + 1, n] as Row)) });
  }
  if (o.matches) {
    summary.push([t('report.matchups'), o.matches.length]);
    sections.push({ name: t('report.matchups'), head: ['#', t('report.matchup')], rows: o.matches.map((m, i) => [i + 1, m.bye ? `${m.teams[0]} — ${t('report.bye')}` : m.teams.join('  vs  ')]) });
  }
  if (o.winners) {
    summary.push([t('report.winners'), o.winners.length]);
    sections.push({ name: t('report.winners'), head: ['#', t('report.name')], rows: o.winners.map((w, i) => [i + 1, w]) });
  }
  sections.push({ name: t('report.participants'), head: ['#', t('report.name')], rows: rec.participants.map((p, i) => [i + 1, p]) });
  return { title: t(`tools.${rec.tool}.name`), meta, summary, sections };
}

export async function buildWorkbook(d: ReportData, brand = 'SPIN'): Promise<ExcelJS.Workbook> {
  const { default: ExcelJSLib } = await import('exceljs');
  const wb = new ExcelJSLib.Workbook();
  wb.creator = brand; wb.created = new Date();
  const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } as const;
  const sum = wb.addWorksheet('Summary', { views: [{ showGridLines: false }] });
  sum.columns = [{ width: 28 }, { width: 44 }];
  sum.mergeCells('A1:B1'); sum.getCell('A1').value = brand;
  sum.getCell('A1').font = { size: 22, bold: true, color: { argb: 'FFFFFFFF' } };
  sum.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND}` } };
  sum.getRow(1).height = 36; sum.getCell('A1').alignment = { vertical: 'middle', indent: 1 };
  sum.mergeCells('A2:B2'); sum.getCell('A2').value = d.title; sum.getCell('A2').font = { size: 15, bold: true };
  let r = 4;
  for (const [k, v] of [...d.meta, ...d.summary]) {
    const row = sum.getRow(r++); row.getCell(1).value = k; row.getCell(2).value = v;
    row.getCell(1).font = { bold: true }; row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F0FE' } };
    row.getCell(1).border = border; row.getCell(2).border = border; row.getCell(2).alignment = { horizontal: 'left' };
  }
  for (const s of d.sections) {
    const ws = wb.addWorksheet(s.name.slice(0, 31).replace(/[\\/?*[\]:]/g, ' '));
    ws.addRow(s.head);
    const h = ws.getRow(1); h.height = 24;
    h.eachCell((c) => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND}` } }; c.alignment = { vertical: 'middle' }; c.border = border; });
    s.rows.forEach((row) => { const x = ws.addRow(row); x.eachCell((c) => { c.border = border; c.alignment = { vertical: 'top', wrapText: true }; }); });
    ws.columns.forEach((col, i) => { const max = Math.max(s.head[i]?.length ?? 6, ...s.rows.map((rw) => String(rw[i] ?? '').length)); col.width = Math.min(70, Math.max(8, max + 3)); });
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  }
  return wb;
}

export async function buildPdf(d: ReportData, t: TFunction, brand = 'SPIN'): Promise<jsPDF> {
  const [{ jsPDF: PDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new PDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(108, 92, 231); doc.rect(0, 0, W, 96, 'F');
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(28); doc.text(brand, 40, 52);
  doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.text(d.title, 40, 76);
  doc.setTextColor(23, 24, 39);
  autoTable(doc, { startY: 116, body: d.meta, theme: 'plain', styles: { fontSize: 10, cellPadding: 3 }, columnStyles: { 0: { fontStyle: 'bold', textColor: [115, 117, 138], cellWidth: 120 } } });
  const sumY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  autoTable(doc, { startY: sumY, head: [[t('report.summary'), '']], body: d.summary.map(([k, v]) => [k, String(v)]), theme: 'grid', headStyles: { fillColor: [139, 92, 246] }, styles: { fontSize: 10 }, columnStyles: { 0: { cellWidth: 160, fontStyle: 'bold' } } });
  for (const s of d.sections) {
    const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    const needNew = y > doc.internal.pageSize.getHeight() - 120;
    if (needNew) doc.addPage();
    const startY = needNew ? 50 : y;
    doc.text(s.name, 40, startY);
    autoTable(doc, { startY: startY + 8, head: [s.head], body: s.rows.map((r) => r.map(String)), theme: 'striped', headStyles: { fillColor: [108, 92, 231] }, alternateRowStyles: { fillColor: [244, 243, 254] }, styles: { fontSize: 9.5, cellPadding: 5 } });
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(115, 117, 138);
    const H = doc.internal.pageSize.getHeight();
    doc.text(`${brand} · ${t('report.footer')}`, 40, H - 24);
    doc.text(`${t('report.page')} ${i} / ${pages}`, W - 40, H - 24, { align: 'right' });
  }
  return doc;
}

export function download(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

export async function exportExcel(rec: HistoryRecord, t: TFunction, brand = 'SPIN', locale = 'en') {
  const wb = await buildWorkbook(reportData(rec, t, locale), brand);
  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `spin-${rec.tool}-${stamp()}.xlsx`);
}
export async function exportPdf(rec: HistoryRecord, t: TFunction, brand = 'SPIN', locale = 'en') {
  (await buildPdf(reportData(rec, t, locale), t, brand)).save(`spin-${rec.tool}-${stamp()}.pdf`);
}

/** Generic table export used by the Admin dashboard (activity reports, etc.). */
export async function exportTableExcel(title: string, head: string[], rows: Row[], brand = 'SPIN') {
  const wb = await buildWorkbook({ title, meta: [['Generated', new Date().toLocaleString()]], summary: [['Rows', rows.length]], sections: [{ name: title, head, rows }] }, brand);
  download(new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `spin-${title.toLowerCase().replace(/\W+/g, '-')}-${stamp()}.xlsx`);
}

export function resultToText(rec: HistoryRecord, t: TFunction): string {
  const o = rec.output; const lines: string[] = [`${t(`tools.${rec.tool}.name`)} — ${new Date(rec.createdAt).toLocaleString()}`, ''];
  if (o.winners) o.winners.forEach((w, i) => lines.push(`${i + 1}. ${w}`));
  if (o.groups) o.groups.forEach((g, i) => lines.push(`${t('report.group')} ${i + 1}: ${g.join(', ')}`));
  if (o.matches) o.matches.forEach((m) => lines.push(m.bye ? `${m.teams[0]} — ${t('report.bye')}` : m.teams.join(' vs ')));
  return lines.join('\n');
}

export function printReport(rec: HistoryRecord, t: TFunction, brand = 'SPIN') {
  const d = reportData(rec, t);
  const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  const html = `<html><head><title>${esc(brand)}</title><style>body{font-family:system-ui,sans-serif;padding:32px;color:#171827}h1{color:#6C5CE7;margin:0}table{border-collapse:collapse;width:100%;margin:8px 0 24px}td,th{border:1px solid #E9EAF1;padding:6px 10px;text-align:start;font-size:13px}th{background:#6C5CE7;color:#fff}h2{margin:20px 0 4px;font-size:16px}</style></head><body><h1>${esc(brand)}</h1><p>${esc(d.title)}</p>${[...d.meta, ...d.summary].map(([k, v]) => `<div><b>${esc(k)}:</b> ${esc(v)}</div>`).join('')}${d.sections.map((s) => `<h2>${esc(s.name)}</h2><table><tr>${s.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>${s.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`).join('')}</body></html>`;
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0'; document.body.appendChild(f);
  f.contentDocument!.open(); f.contentDocument!.write(html); f.contentDocument!.close();
  f.onload = () => { f.contentWindow!.focus(); f.contentWindow!.print(); setTimeout(() => f.remove(), 1500); };
  setTimeout(() => { try { f.contentWindow!.focus(); f.contentWindow!.print(); } catch { /* already printed */ } }, 400);
}
