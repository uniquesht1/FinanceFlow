import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Transaction } from '@/types';

interface ExportOptions {
  transactions: Transaction[];
  filename?: string;
}

export const generateCSV = (transactions: Transaction[]): string => {
  const headers = ['Date', 'Title', 'Type', 'Category', 'Account', 'Amount', 'Currency', 'Note'];
  
  const rows = transactions.map(t => [
    format(new Date(t.date), 'yyyy-MM-dd'),
    t.title || '',
    t.type,
    t.category?.name || '',
    t.account?.name || '',
    t.amount.toString(),
    t.account?.currency || '',
    t.note || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return csvContent;
};

export const downloadCSV = ({ transactions, filename = 'transactions' }: ExportOptions): void => {
  const csv = generateCSV(transactions);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadPDF = ({ transactions, filename = 'transactions' }: ExportOptions): void => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text('FinanceFlow - Transaction Report', 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${format(new Date(), 'PPP')}`, 14, 28);
  doc.text(`Total transactions: ${transactions.length}`, 14, 34);

  // Summary
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.text(`Income: ${totalIncome.toFixed(2)}  |  Expenses: ${totalExpense.toFixed(2)}  |  Net: ${(totalIncome - totalExpense).toFixed(2)}`, 14, 42);

  // Table
  const tableData = transactions.map(t => [
    format(new Date(t.date), 'yyyy-MM-dd'),
    t.title || '-',
    t.type,
    t.category?.name || '-',
    t.account?.name || '-',
    `${t.type === 'income' ? '+' : '-'}${Number(t.amount).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 48,
    head: [['Date', 'Title', 'Type', 'Category', 'Account', 'Amount']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  doc.save(`${filename}.pdf`);
};
