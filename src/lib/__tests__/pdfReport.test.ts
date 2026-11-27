import { describe, it, expect } from 'vitest';
import { buildAttendanceReportPdf } from '../pdfReport';

describe('pdfReport', () => {
  it('builds a valid PDF 1.4 header, xref table, and EOF trailer', () => {
    const bytes = buildAttendanceReportPdf({
      title: 'BunkCalc Report (Semester)',
      subtitle: 'Generated on 2026-11-27',
      summaryLine: 'Overall Attendance: 82.5% (33 / 40)',
      rows: [
        {
          subjectName: 'Algorithms \\ Data (CS-201)',
          attended: 18,
          total: 20,
          percentage: '90.0%',
          budgetLabel: '+4 safe',
        },
      ],
      footer: 'BunkCalc Official Export',
    });

    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith('%PDF-1.4\n')).toBe(true);
    expect(text.includes('xref\n')).toBe(true);
    expect(text.endsWith('%%EOF\n')).toBe(true);
    expect(text.includes('Algorithms \\\\ Data \\(CS-201\\)')).toBe(true);
  });

  it('handles empty rows and paginates large reports across multiple pages', () => {
    const emptyText = new TextDecoder().decode(
      buildAttendanceReportPdf({
        title: 'Empty',
        subtitle: 'None',
        summaryLine: '',
        rows: [],
        footer: 'Footer',
      })
    );
    expect(emptyText.includes('No subjects recorded.')).toBe(true);

    const rows = Array.from({ length: 30 }, (_, idx) => ({
      subjectName: `Subject ${idx + 1}`,
      attended: 10,
      total: 12,
      percentage: '83.3%',
      budgetLabel: '+2 safe',
    }));
    const multiText = new TextDecoder().decode(
      buildAttendanceReportPdf({
        title: 'Multi Page',
        subtitle: '30 Subjects',
        summaryLine: 'Summary',
        rows,
        footer: 'Footer',
      })
    );
    expect(multiText.includes('/Count 2')).toBe(true);
    expect(multiText.includes('Page 1/2')).toBe(true);
    expect(multiText.includes('Page 2/2')).toBe(true);
  });
});
