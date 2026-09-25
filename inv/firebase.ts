import React, { useState } from 'react';
import { NotificationItem, Invoice } from '../types/invoice';
import { formatCurrency, openWhatsAppShare, openEmailShare } from '../lib/pdfExport';
import { requestNotificationPermission, sendSystemReminderNotification } from '../lib/notifications';
import { 
  X, 
  Bell, 
  BellRing, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  MessageSquare, 
  Mail, 
  CheckCircle, 
  Volume2, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  invoices: Invoice[];
  onMarkAsPaid: (invoiceId: string) => void;
  onViewInvoice: (invoice: Invoice) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  invoices,
  onMarkAsPaid,
  onViewInvoice,
}) => {
  const [selectedTone, setSelectedTone] = useState<'standard' | 'polite' | 'urgent'>('standard');
  const [browserPermission, setBrowserPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  if (!isOpen) return null;

  const handleEnableBrowserNotification = async () => {
    const res = await requestNotificationPermission();
    setBrowserPermission(res);
    if (res === 'granted' && notifications.length > 0) {
      sendSystemReminderNotification(notifications[0]);
    }
  };

  const handleMarkPaid = (invId: string) => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });
    onMarkAsPaid(invId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
              <BellRing className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Pusat Pengingat Jatuh Tempo
              </h3>
              <p className="text-xs text-slate-500">
                {notifications.length} tagihan memerlukan perhatian & penagihan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Web Push Notification Banner */}
          {browserPermission !== 'granted' && (
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/60 border border-indigo-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-indigo-600 shrink-0" />
                <div className="text-xs text-indigo-950">
                  <span className="font-bold block">Aktifkan Notifikasi Desktop / Browser</span>
                  Dapatkan pemberitahuan otomatis saat ada invoice yang mendekati atau melewati jatuh tempo.
                </div>
              </div>
              <button
                onClick={handleEnableBrowserNotification}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap shadow-xs"
              >
                Aktifkan Sekarang
              </button>
            </div>
          )}

          {browserPermission === 'granted' && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Notifikasi browser aktif: Anda akan diberi peringatan otomatis untuk setiap invoice jatuh tempo.
            </div>
          )}

          {/* Tone Selector for WhatsApp Message */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
            <span className="font-bold text-slate-700">Gaya Bahasa Pesan Pengingat:</span>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'polite', label: 'Sopan & Ramah' },
                { id: 'standard', label: 'Standar Bisnis' },
                { id: 'urgent', label: 'Tegas / Mendesak' }
              ].map((tone) => (
                <button
                  key={tone.id}
                  onClick={() => setSelectedTone(tone.id as typeof selectedTone)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    selectedTone === tone.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </div>

          {/* List of Reminders */}
          <div className="space-y-3">
            {notifications.length > 0 ? (
              notifications.map((notif) => {
                const targetInv = invoices.find((i) => i.id === notif.invoiceId);

                return (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      notif.type === 'overdue'
                        ? 'bg-rose-50/50 border-rose-200'
                        : notif.type === 'due_today'
                        ? 'bg-amber-50/50 border-amber-200'
                        : 'bg-blue-50/40 border-blue-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                      <div className="flex items-center gap-2">
                        {notif.type === 'overdue' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertTriangle className="w-3.5 h-3.5" /> Terlambat {notif.daysDiff} Hari
                          </span>
                        ) : notif.type === 'due_today' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3.5 h-3.5" /> Jatuh Tempo Hari Ini
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            <Calendar className="w-3.5 h-3.5" /> Dalam {notif.daysDiff} Hari
                          </span>
                        )}

                        <span className="font-mono font-bold text-xs text-slate-800">
                          {notif.invoiceNumber}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-500 mr-1.5">Sisa Tagihan:</span>
                        <span className="font-mono font-black text-sm text-slate-900">
                          {formatCurrency(notif.remainingAmount, notif.currencySymbol)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {notif.clientName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {notif.clientPhone || notif.clientEmail || 'Kontak belum tersedia'} • Jatuh Tempo: {notif.dueDate}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {targetInv && (
                          <>
                            <button
                              onClick={() => openWhatsAppShare(targetInv, selectedTone)}
                              title="Kirim Pesan WhatsApp Otomatis"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>

                            {notif.clientEmail && (
                              <button
                                onClick={() => openEmailShare(targetInv)}
                                title="Kirim Email"
                                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                onViewInvoice(targetInv);
                                onClose();
                              }}
                              title="Lihat Invoice"
                              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleMarkPaid(notif.invoiceId)}
                          title="Tandai Sudah Lunas"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Lunas</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800 text-sm">Semua Tagihan Aman!</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Tidak ada invoice yang melewati tanggal jatuh tempo saat ini. Semua pembayaran berjalan lancar.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
