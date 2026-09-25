import React, { useState, useMemo } from 'react';
import { Invoice, InvoiceStatus } from '../types/invoice';
import { formatCurrency, generateInvoicePdf, openWhatsAppShare } from '../lib/pdfExport';
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  MessageSquare, 
  Eye, 
  Edit3, 
  CheckCircle, 
  Trash2, 
  Copy, 
  ArrowUpDown,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface InvoiceListViewProps {
  invoices: Invoice[];
  onNewInvoice: () => void;
  onEditInvoice: (invoice: Invoice) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onDuplicateInvoice: (invoice: Invoice) => void;
  onMarkAsPaid: (invoiceId: string) => void;
}

export const InvoiceListView: React.FC<InvoiceListViewProps> = ({
  invoices,
  onNewInvoice,
  onEditInvoice,
  onViewInvoice,
  onDeleteInvoice,
  onDuplicateInvoice,
  onMarkAsPaid,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'due_asc'>('date_desc');
  const [exportingId, setExportingId] = useState<string | null>(null);

  // Status counts for badge tabs
  const statusCounts = useMemo(() => {
    const counts = {
      all: invoices.length,
      pending: 0,
      paid: 0,
      overdue: 0,
      draft: 0
    };
    invoices.forEach((inv) => {
      if (inv.status === 'pending') counts.pending++;
      if (inv.status === 'paid') counts.paid++;
      if (inv.status === 'overdue') counts.overdue++;
      if (inv.status === 'draft') counts.draft++;
    });
    return counts;
  }, [invoices]);

  // Filter & Search & Sort
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        // Status filter
        if (selectedStatus !== 'all' && inv.status !== selectedStatus) {
          return false;
        }

        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchNumber = inv.invoiceNumber.toLowerCase().includes(q);
          const matchClient = inv.client.name.toLowerCase().includes(q) || (inv.client.company && inv.client.company.toLowerCase().includes(q));
          const matchItems = inv.items.some((it) => it.description.toLowerCase().includes(q));
          return matchNumber || matchClient || matchItems;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
        }
        if (sortBy === 'amount_desc') {
          return b.totalAmount - a.totalAmount;
        }
        if (sortBy === 'due_asc') {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return 0;
      });
  }, [invoices, selectedStatus, searchTerm, sortBy]);

  const handleDownloadPdf = async (inv: Invoice) => {
    setExportingId(inv.id);
    onViewInvoice(inv);
    setTimeout(async () => {
      await generateInvoicePdf('invoice-document-capture', `Invoice-${inv.invoiceNumber}`);
      setExportingId(null);
    }, 600);
  };

  const handleQuickMarkPaid = (inv: Invoice) => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
    onMarkAsPaid(inv.id);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Semua Dokumen Invoice
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola arsip penagihan, ekspor PDF resolusi tinggi, atau bagikan langsung ke klien
          </p>
        </div>

        <button
          onClick={onNewInvoice}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Buat Invoice Baru</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'Semua Status', count: statusCounts.all },
            { id: 'pending', label: 'Menunggu', count: statusCounts.pending, color: 'text-amber-700 bg-amber-50' },
            { id: 'paid', label: 'Lunas', count: statusCounts.paid, color: 'text-emerald-700 bg-emerald-50' },
            { id: 'overdue', label: 'Jatuh Tempo', count: statusCounts.overdue, color: 'text-rose-700 bg-rose-50' },
            { id: 'draft', label: 'Draft', count: statusCounts.draft, color: 'text-slate-700 bg-slate-100' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedStatus === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${selectedStatus === tab.id ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-200 text-slate-700'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nomor invoice, nama klien, atau deskripsi item..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs whitespace-nowrap flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Urutkan:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="date_desc">Tanggal Terbaru</option>
              <option value="date_asc">Tanggal Terlama</option>
              <option value="amount_desc">Nominal Tertinggi</option>
              <option value="due_asc">Jatuh Tempo Terdekat</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoice Table / Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">No. Invoice</th>
                <th className="py-3.5 px-4">Klien / Perusahaan</th>
                <th className="py-3.5 px-4">Terbit</th>
                <th className="py-3.5 px-4">Jatuh Tempo</th>
                <th className="py-3.5 px-4 text-right">Total Tagihan</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-slate-900">
                      #{inv.invoiceNumber}
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-800">{inv.client.name}</div>
                      {inv.client.company && (
                        <div className="text-[11px] text-slate-500">{inv.client.company}</div>
                      )}
                    </td>

                    <td className="py-4 px-4 text-slate-600">
                      {inv.issueDate}
                    </td>

                    <td className="py-4 px-4">
                      <span className={inv.status === 'overdue' ? 'font-bold text-rose-600' : 'text-slate-600'}>
                        {inv.dueDate}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(inv.totalAmount, inv.currency, inv.currencySymbol)}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        inv.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'overdue'
                          ? 'bg-rose-100 text-rose-800'
                          : inv.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewInvoice(inv)}
                          title="Pratinjau Lengkap"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDownloadPdf(inv)}
                          disabled={exportingId === inv.id}
                          title="Download PDF"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Download className={`w-4 h-4 ${exportingId === inv.id ? 'animate-bounce text-indigo-600' : ''}`} />
                        </button>

                        <button
                          onClick={() => openWhatsAppShare(inv, inv.status === 'overdue' ? 'urgent' : 'standard')}
                          title="Kirim ke WhatsApp Klien"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => handleQuickMarkPaid(inv)}
                            title="Tandai Sudah Lunas"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => onDuplicateInvoice(inv)}
                          title="Duplikasi Invoice"
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onEditInvoice(inv)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Hapus invoice #${inv.invoiceNumber}?`)) {
                              onDeleteInvoice(inv.id);
                            }
                          }}
                          title="Hapus"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <div>Tidak ada invoice yang sesuai dengan filter pencarian.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
