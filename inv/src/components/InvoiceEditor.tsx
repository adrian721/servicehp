import React, { useState, useEffect, useRef } from 'react';
import { 
  Invoice, 
  InvoiceItem, 
  InvoiceTemplate, 
  Client, 
  CompanyProfile, 
  PaymentMethodType, 
  BankAccount 
} from '../types/invoice';
import { InvoiceTemplateRenderer } from './InvoiceTemplates';
import { generateInvoicePdf, triggerPrintInvoice, openWhatsAppShare, formatCurrency } from '../lib/pdfExport';
import { 
  Plus, 
  Trash2, 
  Download, 
  Printer, 
  MessageSquare, 
  Save, 
  Sparkles, 
  ArrowLeft, 
  Eye, 
  Edit3, 
  Columns, 
  Check, 
  Upload, 
  Building2, 
  User, 
  FileText, 
  CreditCard,
  Copy,
  Banknote,
  QrCode,
  Globe,
  FileCheck2,
  Receipt
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface InvoiceEditorProps {
  initialInvoice: Invoice;
  savedClients: Client[];
  companyProfile: CompanyProfile;
  onSaveInvoice: (invoice: Invoice) => Promise<void>;
  onCancel: () => void;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({
  initialInvoice,
  savedClients,
  companyProfile,
  onSaveInvoice,
  onCancel,
}) => {
  const [invoice, setInvoice] = useState<Invoice>(initialInvoice);
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  // Auto-calculate financial numbers whenever items, discount, tax, or shipping changes
  useEffect(() => {
    let subtotal = 0;
    invoice.items.forEach((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const discountVal = (lineTotal * (item.discount || 0)) / 100;
      const amount = Math.max(0, lineTotal - discountVal);
      subtotal += amount;
    });

    // Global discount calculation
    let globalDiscount = 0;
    if (invoice.discountType === 'percentage') {
      globalDiscount = (subtotal * (invoice.discountValue || 0)) / 100;
    } else {
      globalDiscount = invoice.discountValue || 0;
    }

    const discountedSubtotal = Math.max(0, subtotal - globalDiscount);
    const taxAmount = (discountedSubtotal * (invoice.taxRate || 0)) / 100;
    const totalAmount = discountedSubtotal + taxAmount + (invoice.shippingFee || 0);
    const paidAmount = invoice.paidAmount || 0;
    const remainingAmount = Math.max(0, totalAmount - paidAmount);

    setInvoice((prev) => ({
      ...prev,
      subtotal,
      discountAmount: globalDiscount,
      taxAmount,
      totalAmount,
      remainingAmount,
      status: remainingAmount <= 0 && paidAmount > 0 && prev.status !== 'cancelled' ? 'paid' : prev.status
    }));
  }, [
    invoice.items,
    invoice.taxRate,
    invoice.discountType,
    invoice.discountValue,
    invoice.shippingFee,
    invoice.paidAmount
  ]);

  // Handle Logo Upload (base64)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoice((prev) => ({
          ...prev,
          company: {
            ...prev.company,
            logoUrl: reader.result as string
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle QRIS Upload (base64)
  const handleQrisUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoice((prev) => ({
          ...prev,
          paymentDetails: {
            ...prev.paymentDetails,
            qrisImageUrl: reader.result as string
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Add new item row
  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: `item_${Date.now()}`,
      description: '',
      quantity: 1,
      unit: 'item',
      unitPrice: 0,
      discount: 0,
      taxable: true,
      amount: 0
    };
    setInvoice((prev) => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  // Duplicate item row
  const handleDuplicateItem = (itemToCopy: InvoiceItem) => {
    const duplicated: InvoiceItem = {
      ...itemToCopy,
      id: `item_${Date.now()}`
    };
    setInvoice((prev) => ({
      ...prev,
      items: [...prev.items, duplicated]
    }));
  };

  // Remove item row
  const handleRemoveItem = (id: string) => {
    if (invoice.items.length <= 1) {
      alert('Invoice harus memiliki minimal 1 item.');
      return;
    }
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id)
    }));
  };

  // Update item field
  const handleItemChange = (id: string, field: keyof InvoiceItem, value: unknown) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          const lineTotal = updated.quantity * updated.unitPrice;
          const discountVal = (lineTotal * (updated.discount || 0)) / 100;
          updated.amount = Math.max(0, lineTotal - discountVal);
          return updated;
        }
        return item;
      })
    }));
  };

  // Toggle active payment method
  const togglePaymentMethod = (method: PaymentMethodType) => {
    const currentMethods = invoice.paymentDetails.enabledMethods || ['cash', 'bank_transfer'];
    let updated: PaymentMethodType[];
    if (currentMethods.includes(method)) {
      if (currentMethods.length <= 1) {
        alert('Minimal satu opsi pembayaran harus tetap aktif.');
        return;
      }
      updated = currentMethods.filter((m) => m !== method);
    } else {
      updated = [...currentMethods, method];
    }

    setInvoice((prev) => ({
      ...prev,
      paymentDetails: {
        ...prev.paymentDetails,
        enabledMethods: updated
      }
    }));
  };

  // Add Secondary Bank Account
  const handleAddSecondaryBank = () => {
    const newBank: BankAccount = {
      id: `bank_${Date.now()}`,
      bankName: 'Bank Mandiri',
      accountNumber: '',
      accountHolder: invoice.paymentDetails.accountHolder || invoice.company.name || ''
    };
    setInvoice((prev) => ({
      ...prev,
      paymentDetails: {
        ...prev.paymentDetails,
        secondaryBanks: [...(prev.paymentDetails.secondaryBanks || []), newBank]
      }
    }));
  };

  const handleRemoveSecondaryBank = (id: string) => {
    setInvoice((prev) => ({
      ...prev,
      paymentDetails: {
        ...prev.paymentDetails,
        secondaryBanks: (prev.paymentDetails.secondaryBanks || []).filter((b) => b.id !== id)
      }
    }));
  };

  // Autofill client from dropdown
  const handleSelectClient = (clientId: string) => {
    const found = savedClients.find((c) => c.id === clientId);
    if (found) {
      setInvoice((prev) => ({
        ...prev,
        client: {
          id: found.id,
          name: found.name,
          company: found.company || '',
          email: found.email,
          phone: found.phone,
          address: found.address
        }
      }));
    }
  };

  // Load defaults from company profile
  const handleApplyCompanyProfile = () => {
    setInvoice((prev) => ({
      ...prev,
      company: {
        name: companyProfile.name,
        email: companyProfile.email,
        phone: companyProfile.phone,
        address: companyProfile.address,
        taxId: companyProfile.taxId,
        website: companyProfile.website,
        logoUrl: companyProfile.logoUrl || prev.company.logoUrl
      },
      paymentDetails: {
        ...prev.paymentDetails,
        bankName: companyProfile.bankName,
        accountNumber: companyProfile.accountNumber,
        accountHolder: companyProfile.accountHolder,
        qrisImageUrl: companyProfile.qrisImageUrl || prev.paymentDetails.qrisImageUrl,
        cash: companyProfile.defaultCashOptions || prev.paymentDetails.cash,
        notes: companyProfile.defaultNotes || prev.paymentDetails.notes,
        paymentTerms: companyProfile.defaultTerms || prev.paymentDetails.paymentTerms
      },
      taxRate: companyProfile.defaultTaxRate ?? prev.taxRate
    }));
  };

  // Save invoice to cloud
  const handleSave = async () => {
    if (!invoice.invoiceNumber.trim()) {
      alert('Mohon isi nomor invoice terlebih dahulu.');
      return;
    }
    if (!invoice.client.name.trim()) {
      alert('Mohon isi nama klien penerima invoice.');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveInvoice(invoice);
      setSaveSuccessMessage(true);
      setTimeout(() => setSaveSuccessMessage(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menyimpan ke cloud.');
    } finally {
      setIsSaving(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await generateInvoicePdf('invoice-document-capture', `Invoice-${invoice.invoiceNumber}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Mark full payment with celebration (supports Cash or Bank)
  const handleFullPayment = (method: 'Tunai' | 'Transfer Bank') => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    setInvoice((prev) => ({
      ...prev,
      paidAmount: prev.totalAmount,
      remainingAmount: 0,
      status: 'paid',
      payments: [
        ...prev.payments,
        {
          id: `pay_${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          amount: prev.remainingAmount > 0 ? prev.remainingAmount : prev.totalAmount,
          method,
          receivedBy: method === 'Tunai' ? 'Kasir Kantor / Petugas' : undefined,
          receiptNumber: method === 'Tunai' ? `KWT-${Date.now().toString().slice(-5)}` : undefined,
          note: `Pelunasan penuh via ${method}`
        }
      ]
    }));
  };

  const enabledMethods = invoice.paymentDetails.enabledMethods || ['cash', 'bank_transfer'];

  return (
    <div className="space-y-6 pb-20">
      {/* Editor Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {invoice.id ? `Edit Invoice #${invoice.invoiceNumber}` : 'Buat Invoice Baru'}
              </h2>
              {saveSuccessMessage && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Check className="w-3.5 h-3.5" /> Tersimpan ke Cloud
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Ubah rincian, metode pembayaran (tunai/transfer/QRIS), dan tata letak sesuka hati
            </p>
          </div>
        </div>

        {/* View Mode Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Layout buttons */}
          <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${viewMode === 'edit' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-600'}`}
            >
              <Edit3 className="w-3.5 h-3.5" /> Form Saja
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${viewMode === 'split' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-600'}`}
            >
              <Columns className="w-3.5 h-3.5" /> Berdampingan
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${viewMode === 'preview' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-600'}`}
            >
              <Eye className="w-3.5 h-3.5" /> Pratinjau PDF
            </button>
          </div>

          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            <Download className={`w-3.5 h-3.5 ${isExportingPdf ? 'animate-spin' : ''}`} />
            <span>{isExportingPdf ? 'Membuat PDF...' : 'Ekspor PDF'}</span>
          </button>

          <button
            onClick={() => openWhatsAppShare(invoice, invoice.status === 'overdue' ? 'urgent' : 'standard')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kirim WhatsApp</span>
          </button>

          <button
            onClick={triggerPrintInvoice}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan ke Cloud'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form Editor vs Live Preview */}
      <div className={`grid gap-6 ${
        viewMode === 'split' 
          ? 'grid-cols-1 lg:grid-cols-12' 
          : viewMode === 'preview' 
          ? 'grid-cols-1 max-w-4xl mx-auto' 
          : 'grid-cols-1 max-w-4xl mx-auto'
      }`}>
        
        {/* LEFT COLUMN: EDIT FORM */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'lg:col-span-6 xl:col-span-6' : 'col-span-1'} space-y-6`}>
            
            {/* Template & Status & Currency Selector */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Gaya Desain & Mata Uang
                </span>
                <span className="text-[11px] text-slate-400">Sesuaikan tema visual</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Template picker */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Pilihan Template</label>
                  <select
                    value={invoice.template}
                    onChange={(e) => setInvoice({ ...invoice, template: e.target.value as InvoiceTemplate })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="modern">Modern Minimalis (Indigo)</option>
                    <option value="corporate">Korporat Elegan (Navy)</option>
                    <option value="creative">Kreatif Dinamis (Emerald)</option>
                    <option value="dark">Eksekutif Modern (Slate)</option>
                    <option value="classic">Klasik Prestisius (Crimson)</option>
                    <option value="minimal">Swiss Monokrom</option>
                  </select>
                </div>

                {/* Status picker */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Tagihan</label>
                  <select
                    value={invoice.status}
                    onChange={(e) => setInvoice({ ...invoice, status: e.target.value as Invoice['status'] })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="draft">Draft (Konsep)</option>
                    <option value="pending">Menunggu Pembayaran</option>
                    <option value="paid">Lunas (Paid)</option>
                    <option value="overdue">Jatuh Tempo (Overdue)</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </div>

                {/* Currency picker */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Mata Uang</label>
                  <select
                    value={invoice.currency}
                    onChange={(e) => {
                      const cur = e.target.value;
                      let sym = 'Rp';
                      if (cur === 'USD') sym = '$';
                      if (cur === 'EUR') sym = '€';
                      if (cur === 'SGD') sym = 'S$';
                      if (cur === 'GBP') sym = '£';
                      if (cur === 'JPY') sym = '¥';
                      if (cur === 'MYR') sym = 'RM';
                      setInvoice({ ...invoice, currency: cur, currencySymbol: sym });
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="IDR">IDR (Rupiah - Rp)</option>
                    <option value="USD">USD (Dollar - $)</option>
                    <option value="EUR">EUR (Euro - €)</option>
                    <option value="SGD">SGD (Singapore - S$)</option>
                    <option value="GBP">GBP (Pound - £)</option>
                    <option value="JPY">JPY (Yen - ¥)</option>
                    <option value="MYR">MYR (Ringgit - RM)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Basic Info: Number, Issue Date, Due Date */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                Informasi & Tanggal Invoice
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nomor Invoice</label>
                  <input
                    type="text"
                    value={invoice.invoiceNumber}
                    onChange={(e) => setInvoice({ ...invoice, invoiceNumber: e.target.value })}
                    placeholder="INV-2026-0001"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Tanggal Terbit</label>
                  <input
                    type="date"
                    value={invoice.issueDate}
                    onChange={(e) => setInvoice({ ...invoice, issueDate: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Jatuh Tempo</label>
                  <input
                    type="date"
                    value={invoice.dueDate}
                    onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>
              </div>

              {/* Quick Due Date Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-slate-400">Atur Cepat:</span>
                {[
                  { label: 'Hari Ini', days: 0 },
                  { label: '+7 Hari', days: 7 },
                  { label: '+14 Hari (Net 14)', days: 14 },
                  { label: '+30 Hari (Net 30)', days: 30 }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      const baseDate = new Date(invoice.issueDate || new Date());
                      baseDate.setDate(baseDate.getDate() + preset.days);
                      const formatted = baseDate.toISOString().split('T')[0];
                      setInvoice({ ...invoice, dueDate: formatted });
                    }}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sender / Perusahaan Anda */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Identitas Pengirim (Bisnis Anda)
                </span>
                <button
                  type="button"
                  onClick={handleApplyCompanyProfile}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Muat dari Pengaturan Default
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Perusahaan / Bisnis</label>
                  <input
                    type="text"
                    value={invoice.company.name}
                    onChange={(e) => setInvoice({ ...invoice, company: { ...invoice.company, name: e.target.value } })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Bisnis</label>
                  <input
                    type="email"
                    value={invoice.company.email}
                    onChange={(e) => setInvoice({ ...invoice, company: { ...invoice.company, email: e.target.value } })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">No. Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={invoice.company.phone}
                    onChange={(e) => setInvoice({ ...invoice, company: { ...invoice.company, phone: e.target.value } })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Alamat Lengkap</label>
                  <textarea
                    rows={2}
                    value={invoice.company.address}
                    onChange={(e) => setInvoice({ ...invoice, company: { ...invoice.company, address: e.target.value } })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">NPWP / Tax ID (Opsional)</label>
                  <input
                    type="text"
                    value={invoice.company.taxId || ''}
                    onChange={(e) => setInvoice({ ...invoice, company: { ...invoice.company, taxId: e.target.value } })}
                    placeholder="01.234.567.8-012.000"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Logo Perusahaan</label>
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{invoice.company.logoUrl ? 'Ganti Logo' : 'Upload Logo'}</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            {/* Recipient / Klien Anda */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-600" />
                  Klien Penerima (Ditujukan Kepada)
                </span>
                
                {savedClients.length > 0 && (
                  <select
                    onChange={(e) => handleSelectClient(e.target.value)}
                    defaultValue=""
                    className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold rounded-lg px-2.5 py-1 focus:outline-hidden"
                  >
                    <option value="" disabled>Pilih dari Buku Klien...</option>
                    {savedClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Klien / Kontak Person</label>
                  <input
                    type="text"
                    value={invoice.client.name}
                    onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, name: e.target.value } })}
                    placeholder="Budi Santoso"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Perusahaan Klien</label>
                  <input
                    type="text"
                    value={invoice.client.company || ''}
                    onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, company: e.target.value } })}
                    placeholder="PT Maju Bersama Sejahtera"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Klien</label>
                  <input
                    type="email"
                    value={invoice.client.email}
                    onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, email: e.target.value } })}
                    placeholder="klien@perusahaan.com"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">No. WhatsApp / Telepon</label>
                  <input
                    type="text"
                    value={invoice.client.phone}
                    onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, phone: e.target.value } })}
                    placeholder="+62 812-xxxx-xxxx"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Alamat Penagihan Klien</label>
                  <textarea
                    rows={2}
                    value={invoice.client.address}
                    onChange={(e) => setInvoice({ ...invoice, client: { ...invoice.client, address: e.target.value } })}
                    placeholder="Jl. Jenderal Sudirman Kav. 1..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Line Items Builder */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Rincian Item Tagihan / Layanan ({invoice.items.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" /> Tambah Baris
                </button>
              </div>

              <div className="space-y-3">
                {invoice.items.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-400">
                        Item #{index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateItem(item)}
                          title="Duplikasi Baris"
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          title="Hapus Baris"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        placeholder="Deskripsi layanan atau nama produk..."
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500">Jumlah (Qty)</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-mono text-center focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500">Satuan</label>
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:outline-hidden"
                        >
                          <option value="item">item</option>
                          <option value="pcs">pcs</option>
                          <option value="jam">jam</option>
                          <option value="hari">hari</option>
                          <option value="bulan">bulan</option>
                          <option value="paket">paket</option>
                          <option value="proyek">proyek</option>
                          <option value="set">set</option>
                          <option value="kg">kg</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500">Harga Satuan</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-mono text-right focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500">Diskon (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount}
                          onChange={(e) => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-mono text-center focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 text-xs">
                      <span className="text-[11px] text-slate-400">Total Baris:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {formatCurrency(item.amount, invoice.currency, invoice.currencySymbol)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations & Discounts */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                Diskon Global & Pajak (PPN)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Pajak PPN (%)</label>
                  <select
                    value={invoice.taxRate}
                    onChange={(e) => setInvoice({ ...invoice, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={0}>0% (Bebas Pajak)</option>
                    <option value={11}>11% (Standar PPN Indonesia)</option>
                    <option value={12}>12% (PPN 2025/2026)</option>
                    <option value={10}>10% (Pajak Resto/PB1)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipe Diskon</label>
                  <select
                    value={invoice.discountType}
                    onChange={(e) => setInvoice({ ...invoice, discountType: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="fixed">Nominal Tetap ({invoice.currencySymbol})</option>
                    <option value="percentage">Persentase (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nilai Diskon</label>
                  <input
                    type="number"
                    value={invoice.discountValue}
                    onChange={(e) => setInvoice({ ...invoice, discountValue: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Payment Settlement / DP tracker with CASH and TRANSFER quick buttons */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700">Penerimaan Pembayaran / Uang Muka (DP):</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleFullPayment('Tunai')}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Lunas Tunai</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFullPayment('Transfer Bank')}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Lunas Transfer</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Nominal Telah Diterima</label>
                    <input
                      type="number"
                      value={invoice.paidAmount}
                      onChange={(e) => setInvoice({ ...invoice, paidAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Sisa Tagihan Belum Dibayar</label>
                    <div className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-amber-800">
                      {formatCurrency(invoice.remainingAmount, invoice.currency, invoice.currencySymbol)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SEVERAL PAYMENT OPTIONS (TERMASUK TUNAI) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    Pilihan & Opsi Pembayaran untuk Klien
                  </span>
                  <span className="text-[11px] text-slate-400">Aktifkan opsi yang diinginkan</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Centang opsi pembayaran yang Anda sediakan pada invoice ini (termasuk Tunai, Transfer Bank, QRIS, dll):
                </p>
              </div>

              {/* Payment Method Selector Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Tunai / Cash', icon: Banknote, color: 'emerald' },
                  { id: 'bank_transfer', label: 'Transfer Bank', icon: Building2, color: 'blue' },
                  { id: 'qris', label: 'QRIS & E-Wallet', icon: QrCode, color: 'indigo' },
                  { id: 'online_link', label: 'Link Online / Kartu', icon: Globe, color: 'violet' },
                  { id: 'cheque', label: 'Cek / Bilyet Giro', icon: FileCheck2, color: 'amber' }
                ].map((m) => {
                  const isChecked = enabledMethods.includes(m.id as PaymentMethodType);
                  const Icon = m.icon;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => togglePaymentMethod(m.id as PaymentMethodType)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                        isChecked 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isChecked ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="truncate">{m.label}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 ml-auto text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* 1. DETAIL PEMBAYARAN TUNAI (CASH) */}
              {enabledMethods.includes('cash') && (
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      Detail Opsi Pembayaran Tunai (Cash)
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      Tunai Aktif
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Tempat / Kasir Pembayaran Tunai
                      </label>
                      <input
                        type="text"
                        value={invoice.paymentDetails.cash?.location || ''}
                        onChange={(e) => setInvoice({
                          ...invoice,
                          paymentDetails: {
                            ...invoice.paymentDetails,
                            cash: {
                              ...invoice.paymentDetails.cash,
                              enabled: true,
                              location: e.target.value
                            }
                          }
                        })}
                        placeholder="Kasir Kantor SCBD / Bayar di Tempat (COD)"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Penerima Kas / Kasir
                      </label>
                      <input
                        type="text"
                        value={invoice.paymentDetails.cash?.recipientName || ''}
                        onChange={(e) => setInvoice({
                          ...invoice,
                          paymentDetails: {
                            ...invoice.paymentDetails,
                            cash: {
                              ...invoice.paymentDetails.cash,
                              enabled: true,
                              recipientName: e.target.value
                            }
                          }
                        })}
                        placeholder="Bagian Kasir / Finance / Kurir Resmi"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Petunjuk / Catatan Pembayaran Tunai
                      </label>
                      <textarea
                        rows={2}
                        value={invoice.paymentDetails.cash?.instructions || ''}
                        onChange={(e) => setInvoice({
                          ...invoice,
                          paymentDetails: {
                            ...invoice.paymentDetails,
                            cash: {
                              ...invoice.paymentDetails.cash,
                              enabled: true,
                              instructions: e.target.value
                            }
                          }
                        })}
                        placeholder="Dapat dibayarkan secara tunai langsung di kasir atau saat serah terima barang/pekerjaan. Harap meminta tanda terima / kuitansi resmi."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. DETAIL TRANSFER BANK */}
              {enabledMethods.includes('bank_transfer') && (
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      Detail Rekening Transfer Bank
                    </span>
                    <button
                      type="button"
                      onClick={handleAddSecondaryBank}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" /> Tambah Bank Alternatif
                    </button>
                  </div>

                  {/* Primary Bank */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Bank Utama</label>
                      <input
                        type="text"
                        value={invoice.paymentDetails.bankName}
                        onChange={(e) => setInvoice({
                          ...invoice,
                          paymentDetails: { ...invoice.paymentDetails, bankName: e.target.value }
                        })}
                        placeholder="BCA / Mandiri / BRI"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nomor Rekening</label>
                      <input
                        type="text"
                        value={invoice.paymentDetails.accountNumber}
                        onChange={(e) => setInvoice({
                          ...invoice,
                          paymentDetails: { ...invoice.paymentDetails, accountNumber: e.target.value }
                        })}
                        placeholder="8830-1928-33"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Atas Nama Pemilik</label>
                      <input
                        type="text"
                        value={invoice.paymentDetails.accountHolder}
                        onChange={(e) => setInvoice({
                          ...invoice,
                          paymentDetails: { ...invoice.paymentDetails, accountHolder: e.target.value }
                        })}
                        placeholder="PT DIGITAL SOLUSI"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Secondary Bank Accounts */}
                  {invoice.paymentDetails.secondaryBanks && invoice.paymentDetails.secondaryBanks.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-blue-200/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-900 block">
                          Rekening Bank Alternatif ({invoice.paymentDetails.secondaryBanks.length}):
                        </span>
                      </div>
                      {invoice.paymentDetails.secondaryBanks.map((sec, idx) => (
                        <div key={sec.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pb-1.5 border-b border-slate-100">
                            <span className="text-blue-900 font-bold">Bank Alternatif #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSecondaryBank(sec.id)}
                              className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded-lg transition-colors font-medium"
                              title="Hapus Bank Alternatif Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                                Nama Bank Alternatif
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Bank Mandiri"
                                value={sec.bankName}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setInvoice((prev) => ({
                                    ...prev,
                                    paymentDetails: {
                                      ...prev.paymentDetails,
                                      secondaryBanks: (prev.paymentDetails.secondaryBanks || []).map((b) =>
                                        b.id === sec.id ? { ...b, bankName: val } : b
                                      )
                                    }
                                  }));
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                                Nomor Rekening
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 122-00-983102-1"
                                value={sec.accountNumber}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setInvoice((prev) => ({
                                    ...prev,
                                    paymentDetails: {
                                      ...prev.paymentDetails,
                                      secondaryBanks: (prev.paymentDetails.secondaryBanks || []).map((b) =>
                                        b.id === sec.id ? { ...b, accountNumber: val } : b
                                      )
                                    }
                                  }));
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                                Atas Nama Pemilik
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. PT DIGITAL SOLUSI"
                                value={sec.accountHolder}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setInvoice((prev) => ({
                                    ...prev,
                                    paymentDetails: {
                                      ...prev.paymentDetails,
                                      secondaryBanks: (prev.paymentDetails.secondaryBanks || []).map((b) =>
                                        b.id === sec.id ? { ...b, accountHolder: val } : b
                                      )
                                    }
                                  }));
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. DETAIL QRIS & E-WALLET */}
              {enabledMethods.includes('qris') && (
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-indigo-600" />
                      Detail QRIS & E-Wallet
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Upload Gambar Barcode QRIS
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 transition-colors">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{invoice.paymentDetails.qrisImageUrl ? 'Ganti Barcode QRIS' : 'Pilih Gambar QRIS'}</span>
                        <input type="file" accept="image/*" onChange={handleQrisUpload} className="hidden" />
                      </label>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        No. E-Wallet (GoPay / OVO / Dana)
                      </label>
                      <input
                        type="text"
                        value={invoice.paymentDetails.ewalletNumber || ''}
                        onChange={(e) => setInvoice({
                          ...invoice,
                          paymentDetails: { ...invoice.paymentDetails, ewalletNumber: e.target.value }
                        })}
                        placeholder="0812-xxxx-xxxx"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. DETAIL LINK PEMBAYARAN ONLINE */}
              {enabledMethods.includes('online_link') && (
                <div className="p-4 rounded-xl bg-violet-50/50 border border-violet-200/90 space-y-3">
                  <span className="text-xs font-bold text-violet-950 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-violet-600" />
                    Link Pembayaran Online / Kartu Kredit
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Label Opsi</label>
                      <input
                        type="text"
                        value={invoice.paymentDetails.onlinePayment?.providerName || 'Kartu Kredit / Debit'}
                        onChange={(e) => setInvoice({
                          ...invoice,
                          paymentDetails: {
                            ...invoice.paymentDetails,
                            onlinePayment: {
                              ...invoice.paymentDetails.onlinePayment,
                              enabled: true,
                              providerName: e.target.value
                            }
                          }
                        })}
                        placeholder="Kartu Kredit / Midtrans Link"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">URL / Link Pembayaran</label>
                      <input
                        type="url"
                        value={invoice.paymentDetails.onlinePayment?.url || ''}
                        onChange={(e) => setInvoice({
                          ...invoice,
                          paymentDetails: {
                            ...invoice.paymentDetails,
                            onlinePayment: {
                              ...invoice.paymentDetails.onlinePayment,
                              enabled: true,
                              url: e.target.value
                            }
                          }
                        })}
                        placeholder="https://app.midtrans.com/payment/..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes & Payment Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Ketentuan Pembayaran</label>
                  <input
                    type="text"
                    value={invoice.paymentDetails.paymentTerms}
                    onChange={(e) => setInvoice({
                      ...invoice,
                      paymentDetails: { ...invoice.paymentDetails, paymentTerms: e.target.value }
                    })}
                    placeholder="Net 14 Hari / Lunas / Bayar di Tempat"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Catatan Tambahan</label>
                  <input
                    type="text"
                    value={invoice.paymentDetails.notes}
                    onChange={(e) => setInvoice({
                      ...invoice,
                      paymentDetails: { ...invoice.paymentDetails, notes: e.target.value }
                    })}
                    placeholder="Terima kasih atas kerja samanya..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Signature Block */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                Tanda Tangan & Penanggung Jawab
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Penanda Tangan</label>
                  <input
                    type="text"
                    value={invoice.signature?.signerName || ''}
                    onChange={(e) => setInvoice({
                      ...invoice,
                      signature: {
                        signerName: e.target.value,
                        signerTitle: invoice.signature?.signerTitle || '',
                        signatureDate: invoice.signature?.signatureDate || invoice.issueDate
                      }
                    })}
                    placeholder="Hendrawan Pratama"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Jabatan / Gelar</label>
                  <input
                    type="text"
                    value={invoice.signature?.signerTitle || ''}
                    onChange={(e) => setInvoice({
                      ...invoice,
                      signature: {
                        signerName: invoice.signature?.signerName || '',
                        signerTitle: e.target.value,
                        signatureDate: invoice.signature?.signatureDate || invoice.issueDate
                      }
                    })}
                    placeholder="Direktur Keuangan"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* RIGHT COLUMN: LIVE PREVIEW & RENDERER */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'lg:col-span-6 xl:col-span-6' : 'col-span-1'} space-y-4`}>
            {/* Live Preview Header badge */}
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-600" /> Pratinjau Dokumen Siap Cetak (A4)
              </span>
              <span className="text-[11px] text-slate-400">Pembaruan real-time</span>
            </div>

            {/* Container for the paper invoice */}
            <div className="overflow-x-auto bg-slate-100/70 p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-inner">
              <InvoiceTemplateRenderer invoice={invoice} printableRef={printableRef} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
