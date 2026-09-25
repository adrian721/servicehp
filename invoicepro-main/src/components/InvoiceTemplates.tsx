import React from 'react';
import { Invoice } from '../types/invoice';
import { formatCurrency } from '../lib/pdfExport';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  Ban, 
  Banknote, 
  Building2, 
  QrCode, 
  CreditCard, 
  Receipt,
  FileCheck2
} from 'lucide-react';

interface InvoiceTemplateProps {
  invoice: Invoice;
  printableRef?: React.RefObject<HTMLDivElement | null>;
}

export const InvoiceTemplateRenderer: React.FC<InvoiceTemplateProps> = ({ invoice, printableRef }) => {
  const {
    invoiceNumber,
    status,
    template,
    currency,
    currencySymbol,
    issueDate,
    dueDate,
    company,
    client,
    items,
    subtotal,
    taxRate,
    taxAmount,
    discountAmount,
    shippingFee,
    totalAmount,
    paidAmount,
    remainingAmount,
    paymentDetails,
    signature
  } = invoice;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> LUNAS (PAID)
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertCircle className="w-3.5 h-3.5" /> JATUH TEMPO (OVERDUE)
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5" /> MENUNGGU (PENDING)
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">
            <Ban className="w-3.5 h-3.5" /> DIBATALKAN
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <FileText className="w-3.5 h-3.5" /> DRAFT
          </span>
        );
    }
  };

  // Theme accent colors based on template
  const getThemeColors = () => {
    switch (template) {
      case 'corporate':
        return {
          primary: 'bg-blue-900 text-white',
          border: 'border-blue-900',
          accent: 'text-blue-900',
          tableHeader: 'bg-blue-900 text-white',
          lightBg: 'bg-blue-50',
          highlight: 'border-l-4 border-blue-900'
        };
      case 'creative':
        return {
          primary: 'bg-emerald-600 text-white',
          border: 'border-emerald-600',
          accent: 'text-emerald-700',
          tableHeader: 'bg-emerald-600 text-white',
          lightBg: 'bg-emerald-50',
          highlight: 'border-l-4 border-emerald-600'
        };
      case 'dark':
        return {
          primary: 'bg-slate-900 text-white',
          border: 'border-slate-900',
          accent: 'text-slate-900',
          tableHeader: 'bg-slate-800 text-white',
          lightBg: 'bg-slate-100',
          highlight: 'border-l-4 border-slate-800'
        };
      case 'classic':
        return {
          primary: 'bg-rose-900 text-white',
          border: 'border-rose-900',
          accent: 'text-rose-900',
          tableHeader: 'bg-rose-900 text-white',
          lightBg: 'bg-rose-50',
          highlight: 'border-l-4 border-rose-900'
        };
      case 'minimal':
        return {
          primary: 'bg-zinc-900 text-white',
          border: 'border-zinc-300',
          accent: 'text-zinc-900',
          tableHeader: 'bg-zinc-100 text-zinc-800 border-b border-zinc-300',
          lightBg: 'bg-zinc-50',
          highlight: 'border-l-2 border-zinc-900'
        };
      case 'modern':
      default:
        return {
          primary: 'bg-indigo-600 text-white',
          border: 'border-indigo-600',
          accent: 'text-indigo-600',
          tableHeader: 'bg-indigo-600 text-white',
          lightBg: 'bg-indigo-50/60',
          highlight: 'border-l-4 border-indigo-600'
        };
    }
  };

  const theme = getThemeColors();

  // Active payment options
  const enabledMethods = paymentDetails?.enabledMethods || ['cash', 'bank_transfer'];
  const hasCash = enabledMethods.includes('cash') && (paymentDetails?.cash?.enabled ?? true);
  const hasBank = enabledMethods.includes('bank_transfer') && !!paymentDetails?.accountNumber;
  const hasQris = enabledMethods.includes('qris');
  const hasOnline = enabledMethods.includes('online_link') && (paymentDetails?.onlinePayment?.enabled ?? false);
  const hasCheque = enabledMethods.includes('cheque') && (paymentDetails?.cheque?.enabled ?? false);

  return (
    <div 
      id="invoice-document-capture" 
      ref={printableRef}
      className="invoice-printable w-full bg-white text-slate-800 shadow-xl rounded-xl mx-auto overflow-hidden text-sm print:shadow-none print:rounded-none max-w-[840px] border border-slate-200"
      style={{ minHeight: '1080px', boxSizing: 'border-box' }}
    >
      {/* Top Banner / Header */}
      <div className={`p-8 md:p-10 ${template === 'corporate' || template === 'dark' ? theme.primary : 'border-b border-slate-100'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
          {/* Company Brand */}
          <div className="flex items-start gap-4">
            {company.logoUrl ? (
              <img 
                src={company.logoUrl} 
                alt={company.name} 
                className="w-16 h-16 rounded-xl object-contain bg-white p-1 border shadow-xs" 
              />
            ) : (
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-xs ${template === 'corporate' || template === 'dark' ? 'bg-white text-slate-900' : 'bg-indigo-600 text-white'}`}>
                {company.name ? company.name.substring(0, 2).toUpperCase() : 'IN'}
              </div>
            )}
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${template === 'corporate' || template === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {company.name || 'Nama Perusahaan Anda'}
              </h1>
              <p className={`text-xs mt-1 max-w-sm ${template === 'corporate' || template === 'dark' ? 'text-slate-300' : 'text-slate-500'}`}>
                {company.address}
              </p>
              <div className={`flex flex-wrap gap-x-4 gap-y-1 text-xs mt-2 ${template === 'corporate' || template === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                {company.phone && <span>Telp: {company.phone}</span>}
                {company.email && <span>Email: {company.email}</span>}
                {company.taxId && <span>NPWP: {company.taxId}</span>}
              </div>
            </div>
          </div>

          {/* Invoice Meta */}
          <div className="sm:text-right flex flex-col sm:items-end">
            <span className={`text-xs uppercase tracking-widest font-semibold ${template === 'corporate' || template === 'dark' ? 'text-slate-300' : 'text-indigo-600'}`}>
              INVOICE RESMI
            </span>
            <div className={`text-2xl font-black mt-1 font-mono ${template === 'corporate' || template === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              #{invoiceNumber || 'INV-0001'}
            </div>
            <div className="mt-2.5">
              {getStatusBadge()}
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 md:p-10 space-y-8">
        {/* Bill To & Dates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/80 p-5 rounded-xl border border-slate-100">
          {/* Bill To */}
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              DITUJUKAN KEPADA:
            </span>
            <h3 className="text-base font-bold text-slate-900">
              {client.name || 'Nama Klien'}
            </h3>
            {client.company && (
              <p className="text-xs font-semibold text-slate-700">{client.company}</p>
            )}
            <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
              {client.address || 'Alamat Klien'}
            </p>
            <div className="text-xs text-slate-500 pt-1">
              {client.phone && <div>📞 {client.phone}</div>}
              {client.email && <div>✉️ {client.email}</div>}
            </div>
          </div>

          {/* Invoice Dates & Terms */}
          <div className="space-y-2 md:text-right flex flex-col md:items-end justify-center">
            <div className="text-xs">
              <span className="text-slate-500 mr-2">Tanggal Terbit:</span>
              <span className="font-semibold text-slate-800">{formatDate(issueDate)}</span>
            </div>
            <div className="text-xs">
              <span className="text-slate-500 mr-2">Jatuh Tempo:</span>
              <span className={`font-bold ${status === 'overdue' ? 'text-rose-600' : 'text-slate-900'}`}>
                {formatDate(dueDate)}
              </span>
            </div>
            {paymentDetails?.paymentTerms && (
              <div className="text-xs">
                <span className="text-slate-500 mr-2">Ketentuan:</span>
                <span className="font-medium text-slate-700">{paymentDetails.paymentTerms}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-xs uppercase tracking-wider font-semibold ${theme.tableHeader}`}>
                <th className="py-3 px-4 rounded-l-lg">Deskripsi / Layanan</th>
                <th className="py-3 px-3 text-center">Jumlah</th>
                <th className="py-3 px-3 text-right">Harga Satuan</th>
                <th className="py-3 px-3 text-right">Diskon</th>
                <th className="py-3 px-4 text-right rounded-r-lg">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {items && items.length > 0 ? (
                items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      <div>{item.description}</div>
                      {item.taxable && (
                        <span className="inline-block mt-0.5 text-[10px] text-slate-400 font-normal">
                          *Kena Pajak
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-600">
                      {item.quantity} {item.unit || 'item'}
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-700 font-mono">
                      {formatCurrency(item.unitPrice, currency, currencySymbol)}
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-500">
                      {item.discount > 0 ? `${item.discount}%` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                      {formatCurrency(item.amount, currency, currencySymbol)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    Belum ada baris item tagihan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary & Payment Instruction Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4 border-t border-slate-100">
          
          {/* Left Column: ALL Payment Methods Including Cash */}
          <div className="md:col-span-7 space-y-4">
            
            <div className="border border-slate-200/90 rounded-2xl p-4 bg-slate-50/60 space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  Opsi & Metode Pembayaran:
                </h4>
                <span className="text-[10px] text-slate-500 font-medium">Pilih metode yang diinginkan</span>
              </div>

              <div className="space-y-3">
                
                {/* 1. OPSI PEMBAYARAN TUNAI (CASH / COD) */}
                {hasCash && (
                  <div className="p-3 bg-white rounded-xl border border-emerald-200/80 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                        <Banknote className="w-4 h-4 text-emerald-600" />
                        <span>Pembayaran Tunai (Cash / Bayar di Tempat)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Tersedia Tunai
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-0.5 pl-5">
                      {paymentDetails.cash?.location && (
                        <div>
                          <span className="font-semibold text-slate-700">Tempat Pembayaran: </span>
                          <span>{paymentDetails.cash.location}</span>
                        </div>
                      )}
                      {paymentDetails.cash?.recipientName && (
                        <div>
                          <span className="font-semibold text-slate-700">Penerima Kas: </span>
                          <span>{paymentDetails.cash.recipientName}</span>
                        </div>
                      )}
                      <p className="text-slate-500 text-[10.5px] italic pt-0.5">
                        {paymentDetails.cash?.instructions || 'Dapat dibayar tunai langsung di kasir atau saat serah terima barang/layanan. Minta tanda terima / kuitansi resmi.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. OPSI TRANSFER BANK */}
                {hasBank && (
                  <div className="p-3 bg-white rounded-xl border border-blue-200/80 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-blue-950">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span>Transfer Antar Bank</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                        Transfer Bank
                      </span>
                    </div>

                    {/* Primary Bank */}
                    <div className="text-xs text-slate-700 pl-5 space-y-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="w-20 text-[11px] text-slate-500">Bank:</span>
                        <span className="font-bold text-slate-900">{paymentDetails.bankName}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="w-20 text-[11px] text-slate-500">No. Rekening:</span>
                        <span className="font-mono font-black text-slate-900 text-sm tracking-wider">
                          {paymentDetails.accountNumber}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="w-20 text-[11px] text-slate-500">Atas Nama:</span>
                        <span className="font-semibold text-slate-800">{paymentDetails.accountHolder}</span>
                      </div>
                    </div>

                    {/* Secondary Banks if configured */}
                    {paymentDetails.secondaryBanks && paymentDetails.secondaryBanks.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 pl-5 space-y-1.5 text-[11px]">
                        <span className="font-bold text-slate-600 block text-[10px] uppercase">Rekening Alternatif:</span>
                        {paymentDetails.secondaryBanks.map((sec) => (
                          <div key={sec.id} className="flex flex-wrap items-baseline gap-2 text-slate-700">
                            <span className="font-bold">{sec.bankName}:</span>
                            <span className="font-mono font-bold text-slate-900">{sec.accountNumber}</span>
                            {sec.accountHolder && (
                              <span className="text-slate-600 font-medium">a.n {sec.accountHolder}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. OPSI QRIS & E-WALLET */}
                {hasQris && (
                  <div className="p-3 bg-white rounded-xl border border-indigo-200/80 shadow-xs flex items-center gap-3">
                    {paymentDetails.qrisImageUrl ? (
                      <img 
                        src={paymentDetails.qrisImageUrl} 
                        alt="QRIS Pembayaran" 
                        className="w-20 h-20 object-contain rounded-lg border bg-white p-1 shrink-0" 
                      />
                    ) : (
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                        <QrCode className="w-7 h-7" />
                      </div>
                    )}
                    <div className="text-[11px] text-slate-700 space-y-0.5">
                      <div className="font-bold text-xs text-indigo-950">QRIS / E-Wallet</div>
                      <div className="text-slate-500 text-[10.5px]">
                        Mendukung BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana, LinkAja, & ShopeePay.
                      </div>
                      {paymentDetails.ewalletNumber && (
                        <div className="font-mono text-slate-800 font-bold pt-0.5">
                          E-Wallet: {paymentDetails.ewalletNumber} ({paymentDetails.ewalletName || paymentDetails.accountHolder})
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. OPSI PEMBAYARAN ONLINE (LINK / KARTU KREDIT) */}
                {hasOnline && paymentDetails.onlinePayment?.url && (
                  <div className="p-3 bg-white rounded-xl border border-violet-200/80 shadow-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-violet-950">
                      <CreditCard className="w-4 h-4 text-violet-600" />
                      <span>{paymentDetails.onlinePayment.providerName || 'Kartu Kredit / Pembayaran Online'}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 pl-5">
                      <span>Link Bayar: </span>
                      <a 
                        href={paymentDetails.onlinePayment.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="font-mono text-indigo-600 underline font-semibold break-all"
                      >
                        {paymentDetails.onlinePayment.url}
                      </a>
                    </div>
                  </div>
                )}

                {/* 5. CEK / BILYET GIRO */}
                {hasCheque && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs text-[11px] space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-slate-600" />
                      <span>Cek / Bilyet Giro</span>
                    </div>
                    <div className="pl-5 text-slate-600">
                      <div>Atas Nama: <span className="font-bold text-slate-800">{paymentDetails.cheque.payableTo}</span></div>
                      {paymentDetails.cheque.instructions && (
                        <p className="text-slate-500 text-[10.5px] italic mt-0.5">{paymentDetails.cheque.instructions}</p>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Notes & Terms */}
            {paymentDetails?.notes && (
              <div className="text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-700">Catatan & Syarat:</span>
                <p className="whitespace-pre-line text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {paymentDetails.notes}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Financial Calculations & Signature */}
          <div className="md:col-span-5 space-y-3">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono font-medium">{formatCurrency(subtotal, currency, currencySymbol)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between py-1 text-emerald-600">
                  <span>Diskon Potongan</span>
                  <span className="font-mono font-medium">-{formatCurrency(discountAmount, currency, currencySymbol)}</span>
                </div>
              )}

              {taxRate > 0 && (
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Pajak PPN ({taxRate}%)</span>
                  <span className="font-mono font-medium">+{formatCurrency(taxAmount, currency, currencySymbol)}</span>
                </div>
              )}

              {shippingFee > 0 && (
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Biaya Pengiriman / Lainnya</span>
                  <span className="font-mono font-medium">+{formatCurrency(shippingFee, currency, currencySymbol)}</span>
                </div>
              )}

              <div className="border-t-2 border-slate-800 pt-2 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900">Total Tagihan</span>
                <span className="text-lg font-black text-slate-900 font-mono">
                  {formatCurrency(totalAmount, currency, currencySymbol)}
                </span>
              </div>

              {paidAmount > 0 && (
                <>
                  <div className="flex justify-between py-1 text-emerald-700 font-medium">
                    <span>Sudah Dibayar</span>
                    <span className="font-mono">-{formatCurrency(paidAmount, currency, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 px-3 bg-amber-50 rounded-lg text-amber-900 font-bold border border-amber-200">
                    <span>Sisa Tagihan</span>
                    <span className="font-mono">{formatCurrency(remainingAmount, currency, currencySymbol)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Signature Area */}
            {signature && (signature.signerName || signature.signatureImage) && (
              <div className="pt-6 mt-4 text-center sm:text-right flex flex-col items-center sm:items-end">
                <span className="text-[11px] text-slate-400 mb-1">Hormat Kami,</span>
                {signature.signatureImage ? (
                  <img 
                    src={signature.signatureImage} 
                    alt="Tanda Tangan" 
                    className="h-14 object-contain my-1" 
                  />
                ) : (
                  <div className="h-12 flex items-center justify-center italic text-slate-400 font-serif text-lg">
                    {signature.signerName}
                  </div>
                )}
                <div className="font-bold text-slate-800 text-xs border-t border-slate-300 pt-1 w-44 text-center">
                  {signature.signerName || company.name}
                </div>
                {signature.signerTitle && (
                  <div className="text-[10px] text-slate-500">{signature.signerTitle}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 gap-2">
          <div className="flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-slate-400" />
            <span>Dokumen invoice ini sah. Pembayaran tunai wajib disertai kuitansi tanda terima resmi.</span>
          </div>
          <div>Halaman 1 dari 1</div>
        </div>
      </div>
    </div>
  );
};
