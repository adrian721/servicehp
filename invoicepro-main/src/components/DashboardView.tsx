import React, { useState, useMemo } from 'react';
import { Invoice, NotificationItem } from '../types/invoice';
import { formatCurrency, generateInvoicePdf, openWhatsAppShare } from '../lib/pdfExport';
import { 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  ArrowUpRight, 
  Plus, 
  Download, 
  MessageSquare, 
  Eye, 
  BellRing,
  Sparkles,
  PieChart,
  DollarSign
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DashboardViewProps {
  invoices: Invoice[];
  notifications: NotificationItem[];
  onNewInvoice: () => void;
  onEditInvoice: (invoice: Invoice) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onMarkAsPaid: (invoiceId: string) => void;
  onOpenNotifications: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  invoices,
  notifications,
  onNewInvoice,
  onEditInvoice,
  onViewInvoice,
  onMarkAsPaid,
  onOpenNotifications,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'this_month' | 'last_3_months' | 'this_year' | 'all'>('this_year');
  const [exportingId, setExportingId] = useState<string | null>(null);

  // Current date constants
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Month names in Indonesian
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Financial calculations
  const stats = useMemo(() => {
    let totalRevenuePaid = 0;
    let totalPendingReceivables = 0;
    let totalOverdue = 0;
    let thisMonthPaid = 0;
    let thisMonthIssued = 0;
    let lastMonthPaid = 0;
    let totalDrafts = 0;

    // Monthly aggregation for the chart
    const monthlyData: { [key: number]: { paid: number; pending: number; count: number } } = {};
    for (let m = 0; m < 12; m++) {
      monthlyData[m] = { paid: 0, pending: 0, count: 0 };
    }

    // Client contributions
    const clientRevenueMap: { [clientName: string]: { total: number; paid: number; count: number } } = {};

    invoices.forEach((inv) => {
      const invDate = new Date(inv.issueDate || inv.createdAt);
      const invYear = invDate.getFullYear();
      const invMonth = invDate.getMonth();

      // Aggregate payments
      const paid = inv.paidAmount || (inv.status === 'paid' ? inv.totalAmount : 0);
      const remaining = inv.status === 'paid' ? 0 : inv.remainingAmount;

      if (inv.status === 'draft') {
        totalDrafts += 1;
        return;
      }

      totalRevenuePaid += paid;
      totalPendingReceivables += remaining;

      if (inv.status === 'overdue' || (inv.status === 'pending' && new Date(inv.dueDate) < now)) {
        totalOverdue += remaining;
      }

      // Current month stats
      if (invYear === currentYear && invMonth === currentMonth) {
        thisMonthPaid += paid;
        thisMonthIssued += inv.totalAmount;
      }

      // Last month stats
      const lastMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      if (invYear === lastMonthYear && invMonth === lastMonthIndex) {
        lastMonthPaid += paid;
      }

      // Fill monthly chart for current year
      if (invYear === currentYear) {
        monthlyData[invMonth].paid += paid;
        monthlyData[invMonth].pending += remaining;
        monthlyData[invMonth].count += 1;
      }

      // Top clients
      const clientName = inv.client.name || 'Klien Umum';
      if (!clientRevenueMap[clientName]) {
        clientRevenueMap[clientName] = { total: 0, paid: 0, count: 0 };
      }
      clientRevenueMap[clientName].total += inv.totalAmount;
      clientRevenueMap[clientName].paid += paid;
      clientRevenueMap[clientName].count += 1;
    });

    const collectionRate = (totalRevenuePaid + totalPendingReceivables) > 0
      ? Math.round((totalRevenuePaid / (totalRevenuePaid + totalPendingReceivables)) * 100)
      : 100;

    // Growth percentage compared to last month
    const monthlyGrowth = lastMonthPaid > 0
      ? Math.round(((thisMonthPaid - lastMonthPaid) / lastMonthPaid) * 100)
      : thisMonthPaid > 0 ? 100 : 0;

    // Sorted top clients
    const topClients = Object.entries(clientRevenueMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      totalRevenuePaid,
      totalPendingReceivables,
      totalOverdue,
      thisMonthPaid,
      thisMonthIssued,
      monthlyGrowth,
      collectionRate,
      monthlyData,
      topClients,
      totalDrafts
    };
  }, [invoices, currentYear, currentMonth]);

  // Max monthly value for chart scale
  const maxMonthlyRevenue = useMemo(() => {
    let max = 1000000;
    Object.values(stats.monthlyData).forEach((m) => {
      const sum = m.paid + m.pending;
      if (sum > max) max = sum;
    });
    return max;
  }, [stats.monthlyData]);

  const handleQuickMarkPaid = (inv: Invoice) => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 }
    });
    onMarkAsPaid(inv.id);
  };

  const handleDownloadPdf = async (inv: Invoice) => {
    setExportingId(inv.id);
    onViewInvoice(inv);
    setTimeout(async () => {
      await generateInvoicePdf('invoice-document-capture', `Invoice-${inv.invoiceNumber}`);
      setExportingId(null);
    }, 600);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 md:p-8 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Ringkasan Finansial Real-Time
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Dashboard Keuangan & Tagihan
          </h1>
          <p className="text-indigo-200 text-sm mt-1 max-w-xl">
            Pantau arus kas, status invoice berjalan, serta tindak lanjuti tagihan jatuh tempo secara otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {notifications.length > 0 && (
            <button
              onClick={onOpenNotifications}
              className="relative inline-flex items-center gap-2 px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 rounded-xl text-sm font-semibold transition-all backdrop-blur-xs"
            >
              <BellRing className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>{notifications.length} Perlu Diingatkan</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            </button>
          )}

          <button
            onClick={onNewInvoice}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 text-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Buat Invoice Baru</span>
          </button>
        </div>
      </div>

      {/* 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Pendapatan Bulan Ini (Lunas) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pendapatan {monthNames[currentMonth]}
            </span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {formatCurrency(stats.thisMonthPaid, 'IDR')}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className={`inline-flex items-center font-bold ${stats.monthlyGrowth >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                <ArrowUpRight className={`w-3.5 h-3.5 ${stats.monthlyGrowth < 0 ? 'rotate-90' : ''}`} />
                {stats.monthlyGrowth > 0 ? `+${stats.monthlyGrowth}%` : `${stats.monthlyGrowth}%`}
              </span>
              <span className="text-slate-400">vs bulan lalu</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
        </div>

        {/* Metric 2: Total Piutang Aktif / Belum Bayar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Piutang Belum Dibayar
            </span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {formatCurrency(stats.totalPendingReceivables, 'IDR')}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
              <span>Menunggu pembayaran klien</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500"></div>
        </div>

        {/* Metric 3: Tagihan Jatuh Tempo (Overdue) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tagihan Jatuh Tempo
            </span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600 font-mono tracking-tight">
              {formatCurrency(stats.totalOverdue, 'IDR')}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                {notifications.filter(n => n.type === 'overdue').length} Invoice Overdue
              </span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500"></div>
        </div>

        {/* Metric 4: Collection Rate (%) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Rasio Pelunasan Kas
            </span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {stats.collectionRate}%
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-700" 
                style={{ width: `${stats.collectionRate}%` }}
              ></div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600"></div>
        </div>
      </div>

      {/* Monthly Revenue Chart & Top Clients Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Revenue Breakdown Chart */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Tren Pendapatan Bulanan ({currentYear})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring otomatis perbandingan pendapatan lunas vs piutang tertunda
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-indigo-600"></span>
                <span className="text-slate-600">Lunas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-amber-400"></span>
                <span className="text-slate-600">Tertunda</span>
              </div>
            </div>
          </div>

          {/* Interactive Chart Visualizer */}
          <div className="pt-6">
            <div className="h-64 flex items-end gap-2 sm:gap-4 px-2">
              {monthNames.map((mName, idx) => {
                const data = stats.monthlyData[idx] || { paid: 0, pending: 0, count: 0 };
                const totalMonth = data.paid + data.pending;
                const paidHeightPercent = maxMonthlyRevenue > 0 ? (data.paid / maxMonthlyRevenue) * 100 : 0;
                const pendingHeightPercent = maxMonthlyRevenue > 0 ? (data.pending / maxMonthlyRevenue) * 100 : 0;
                const isCurrent = idx === currentMonth;

                return (
                  <div key={mName} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-16 z-20 pointer-events-none bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-xl whitespace-nowrap min-w-[140px] text-center">
                      <div className="font-bold text-indigo-300">{mName} {currentYear}</div>
                      <div className="text-emerald-400">Lunas: {formatCurrency(data.paid, 'IDR')}</div>
                      {data.pending > 0 && (
                        <div className="text-amber-300">Pending: {formatCurrency(data.pending, 'IDR')}</div>
                      )}
                      <div className="text-slate-400 text-[10px] mt-0.5">{data.count} tagihan</div>
                    </div>

                    {/* Bar stack */}
                    <div className="w-full max-w-[36px] flex flex-col justify-end h-full">
                      {totalMonth === 0 ? (
                        <div className="w-full h-1.5 bg-slate-100 rounded-full"></div>
                      ) : (
                        <div className="w-full flex flex-col justify-end h-full rounded-t-lg overflow-hidden">
                          {data.pending > 0 && (
                            <div 
                              style={{ height: `${pendingHeightPercent}%` }} 
                              className="w-full bg-amber-400/90 hover:bg-amber-500 transition-colors"
                            />
                          )}
                          {data.paid > 0 && (
                            <div 
                              style={{ height: `${paidHeightPercent}%` }} 
                              className={`w-full ${isCurrent ? 'bg-indigo-600' : 'bg-indigo-500/80'} group-hover:bg-indigo-700 transition-colors`}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Month Label */}
                    <span className={`text-[10px] sm:text-xs mt-2 font-medium ${isCurrent ? 'font-bold text-indigo-700 underline underline-offset-4' : 'text-slate-500'}`}>
                      {mName.substring(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap justify-between text-xs text-slate-500 px-2">
              <div>Total Omset Terverifikasi: <span className="font-bold text-slate-800 font-mono">{formatCurrency(stats.totalRevenuePaid, 'IDR')}</span></div>
              <div>Bulan Berjalan: <span className="font-semibold text-indigo-600">{monthNames[currentMonth]} {currentYear}</span></div>
            </div>
          </div>
        </div>

        {/* Right Widget: Top Clients & Status Overview */}
        <div className="lg:col-span-4 space-y-6">
          {/* Top Clients Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
              <PieChart className="w-4 h-4 text-indigo-600" />
              Kontribusi Klien Terbesar
            </h3>

            <div className="space-y-3.5">
              {stats.topClients.length > 0 ? (
                stats.topClients.map((client, idx) => {
                  const percentOfTotal = stats.totalRevenuePaid > 0 
                    ? Math.round((client.paid / stats.totalRevenuePaid) * 100) 
                    : 0;

                  return (
                    <div key={client.name} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 truncate max-w-[150px]">
                          {idx + 1}. {client.name}
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatCurrency(client.paid, 'IDR')}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-1.5 rounded-full" 
                          style={{ width: `${Math.min(percentOfTotal, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-slate-400 py-4 text-center">
                  Belum ada data klien yang bertransaksi.
                </div>
              )}
            </div>
          </div>

          {/* Quick Overdue Alert Widget */}
          {notifications.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Perhatian Jatuh Tempo ({notifications.length})
                </div>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed mb-4">
                Ada tagihan yang membutuhkan tindakan pengingat segera agar arus kas tetap lancar.
              </p>
              
              <div className="space-y-2.5">
                {notifications.slice(0, 3).map((notif) => {
                  const targetInv = invoices.find(i => i.id === notif.invoiceId);
                  return (
                    <div key={notif.id} className="bg-white p-3 rounded-xl border border-rose-200/80 shadow-xs flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {notif.clientName}
                        </div>
                        <div className="text-[11px] text-rose-600 font-medium">
                          {notif.invoiceNumber} • {formatCurrency(notif.remainingAmount, notif.currencySymbol)}
                        </div>
                      </div>

                      {targetInv && (
                        <button
                          onClick={() => openWhatsAppShare(targetInv, 'urgent')}
                          title="Kirim Pengingat WhatsApp"
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors shrink-0"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={onOpenNotifications}
                className="w-full mt-3 text-center py-2 text-xs font-bold text-rose-700 hover:text-rose-800 transition-colors"
              >
                Lihat Semua Pengingat ({notifications.length}) &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Invoices Table & Direct Action Center */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Daftar Tagihan & Invoice Terbaru
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola, cetak, ekspor PDF, atau kirim pengingat pembayaran ke klien secara instan
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNewInvoice}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Invoice</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">No. Invoice</th>
                <th className="py-3 px-4">Klien</th>
                <th className="py-3 px-4">Tanggal Terbit</th>
                <th className="py-3 px-4">Jatuh Tempo</th>
                <th className="py-3 px-4 text-right">Total Tagihan</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{inv.client.name}</div>
                      {inv.client.company && (
                        <div className="text-[11px] text-slate-500">{inv.client.company}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {inv.issueDate}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={inv.status === 'overdue' ? 'font-bold text-rose-600' : 'text-slate-600'}>
                        {inv.dueDate}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(inv.totalAmount, inv.currency, inv.currencySymbol)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
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
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewInvoice(inv)}
                          title="Lihat Detail & Pratinjau"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDownloadPdf(inv)}
                          disabled={exportingId === inv.id}
                          title="Unduh Format PDF"
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
                          onClick={() => onEditInvoice(inv)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors ml-1"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Belum ada invoice yang dibuat. Klik tombol "Buat Invoice Baru" untuk memulai.
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
