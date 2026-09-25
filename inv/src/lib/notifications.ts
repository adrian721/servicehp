import { Invoice, NotificationItem } from '../types/invoice';

/**
 * Play a gentle alert chime using Web Audio API (zero external assets needed)
 */
export function playNotificationTone(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio context may require user interaction first
  }
}

/**
 * Scan all invoices and calculate active notifications
 */
export function calculateInvoiceNotifications(invoices: Invoice[]): NotificationItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const notifications: NotificationItem[] = [];

  for (const inv of invoices) {
    if (inv.status === 'paid' || inv.status === 'cancelled' || inv.status === 'draft') {
      continue;
    }

    if (inv.remainingAmount <= 0) {
      continue;
    }

    const dueDateObj = new Date(inv.dueDate);
    dueDateObj.setHours(0, 0, 0, 0);

    const diffTime = dueDateObj.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      // Overdue
      notifications.push({
        id: `notif_overdue_${inv.id}`,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.client.name,
        clientPhone: inv.client.phone,
        clientEmail: inv.client.email,
        dueDate: inv.dueDate,
        totalAmount: inv.totalAmount,
        remainingAmount: inv.remainingAmount,
        currencySymbol: inv.currencySymbol,
        type: 'overdue',
        daysDiff: Math.abs(diffDays)
      });
    } else if (diffDays === 0) {
      // Due Today
      notifications.push({
        id: `notif_today_${inv.id}`,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.client.name,
        clientPhone: inv.client.phone,
        clientEmail: inv.client.email,
        dueDate: inv.dueDate,
        totalAmount: inv.totalAmount,
        remainingAmount: inv.remainingAmount,
        currencySymbol: inv.currencySymbol,
        type: 'due_today',
        daysDiff: 0
      });
    } else if (diffDays <= 4) {
      // Due Soon (within 4 days)
      notifications.push({
        id: `notif_soon_${inv.id}`,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.client.name,
        clientPhone: inv.client.phone,
        clientEmail: inv.client.email,
        dueDate: inv.dueDate,
        totalAmount: inv.totalAmount,
        remainingAmount: inv.remainingAmount,
        currencySymbol: inv.currencySymbol,
        type: 'due_soon',
        daysDiff: diffDays
      });
    }
  }

  // Sort: Overdue first (descending days past due), then due today, then due soon
  return notifications.sort((a, b) => {
    if (a.type === 'overdue' && b.type !== 'overdue') return -1;
    if (b.type === 'overdue' && a.type !== 'overdue') return 1;
    return a.daysDiff - b.daysDiff;
  });
}

/**
 * Request browser push notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return await Notification.requestPermission();
}

/**
 * Send browser system notification for due invoices
 */
export function sendSystemReminderNotification(notif: NotificationItem): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  let title = '';
  let body = '';

  if (notif.type === 'overdue') {
    title = `⚠️ Invoice ${notif.invoiceNumber} Telah Jatuh Tempo!`;
    body = `Tagihan ${notif.clientName} sebesar ${notif.currencySymbol} ${notif.remainingAmount.toLocaleString('id-ID')} terlambat ${notif.daysDiff} hari.`;
  } else if (notif.type === 'due_today') {
    title = `⏰ Invoice ${notif.invoiceNumber} Jatuh Tempo Hari Ini`;
    body = `Tagihan ${notif.clientName} sebesar ${notif.currencySymbol} ${notif.remainingAmount.toLocaleString('id-ID')} jatuh tempo hari ini.`;
  } else {
    title = `📅 Pengingat: Invoice ${notif.invoiceNumber}`;
    body = `Tagihan ${notif.clientName} akan jatuh tempo dalam ${notif.daysDiff} hari.`;
  }

  try {
    new Notification(title, {
      body,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: notif.id
    });
    playNotificationTone();
  } catch (e) {
    console.error('Failed to trigger native notification:', e);
  }
}
