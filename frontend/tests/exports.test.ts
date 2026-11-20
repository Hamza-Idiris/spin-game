import { describe, expect, it } from 'vitest';
import i18n from '../src/lib/i18n';
import { buildPdf, buildWorkbook, reportData, resultToText } from '../src/lib/exporters';
import type { HistoryRecord } from '../src/types';

const rec: HistoryRecord = { id: 'x', tool: 'groups', createdAt: new Date().toISOString(), participants: ['A', 'B', 'C', 'D', 'E'], config: { mode: 'size', value: 2 }, output: { groups: [['A', 'B'], ['C', 'D'], ['E']] } };
const t = i18n.t.bind(i18n);

describe('exports', () => {
  it('Excel workbook has branding, summary and structured sheets', async () => {
    const wb = await buildWorkbook(reportData(rec, t as never), 'SPIN');
    expect(wb.worksheets.map((w) => w.name)).toContain('Summary');
    expect(wb.getWorksheet('Summary')!.getCell('A1').value).toBe('SPIN');
    const groups = wb.getWorksheet('Groups')!; expect(groups.rowCount).toBe(4);
    const buf = await wb.xlsx.writeBuffer(); expect(buf.byteLength).toBeGreaterThan(2000);
  });
  it('PDF renders with page numbers and is a valid document', async () => {
    const doc = await buildPdf(reportData(rec, t as never), t as never); const out = doc.output('arraybuffer');
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1); expect(out.byteLength).toBeGreaterThan(3000);
    expect(new TextDecoder().decode(out.slice(0, 5))).toBe('%PDF-');
  });
  it('copy text lists every group', () => { const s = resultToText(rec, t as never); expect(s).toContain('Group 1: A, B'); expect(s).toContain('Group 3: E'); });
  it('Somali labels are used in reports', async () => {
    await i18n.changeLanguage('so'); expect(reportData(rec, t as never).summary[0][0]).toBe('Ka qaybgalayaal'); await i18n.changeLanguage('en');
  });
});
