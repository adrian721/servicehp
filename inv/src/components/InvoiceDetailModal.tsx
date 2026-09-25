import React, { useState, useRef } from 'react';
import { Invoice } from '../types/invoice';
import { InvoiceTemplateRenderer } from './InvoiceTemplates';
import { generateInvoicePdf, triggerPrintInvoice, openWhatsAppShare, openEmailShare, formatCurrency } from '../lib/pdfExport';
import { 
  X, 
  Download, 
  Printer, 
  MessageSquare, 
  Mail, 
  Edit3, 
  CheckCircle, 
  Trash2, 
  Copy,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoiceId: string) => void;
  onDuplicate: (invoice: Invoice) => void;
  onMarkAsPaid: (invoiceId: string) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  onMarkAsPaid,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoice) return null;

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      await generateInvoicePdf('invoice-document-capture', `Invoice-${invoice.invoiceNumber}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleMarkPaid = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    onMarkAsPaid(invoice.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-100 rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base sm:text-lg font-mono">
                #{invoice.invoiceNumber}
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                invoice.status === 'overdue' ? 'bg-rose-100 text-rose-800' :
                'bg-amber-100 text-amber-800'
              }`}>
                {invoice.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Klien: {invoice.client.name} {invoice.client.company ? `(${invoice.client.company})` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-spin' : ''}`} />
              <span>{isExporting ? 'Mengunduh...' : 'Unduh PDF'}</span>
            </button>

            <button
              onClick={triggerPrintInvoice}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak</span>
            </button>

            <button
              onClick={() => openWhatsAppShare(invoice, invoice.status === 'overdue' ? 'urgent' : 'standard')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {invoice.status !== 'paid' && (
              <button
                onClick={handleMarkPaid}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Tandai Lunas</span>
              </button>
            )}

            <button
              onClick={() => {
                onEdit(invoice);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            <button
              onClick={() => {
                onDuplicate(invoice);
                onClose();
              }}
              title="Duplikasi Invoice"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (confirm(`Yakin ingin menghapus invoice #${invoice.invoiceNumber}?`)) {
                  onDelete(invoice.id);
                  onClose();
                }
              }}
              title="Hapus Invoice"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Paper Document Display */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 flex justify-center bg-slate-200/50">
          <InvoiceTemplateRenderer invoice={invoice} printableRef={printableRef} />
        </div>
      </div>
    </div>
  );
};
