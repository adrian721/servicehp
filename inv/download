import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { Invoice } from '../types/invoice';

/**
 * Generates and downloads a high-resolution PDF file from an HTML element
 * Uses html-to-image which natively supports all modern CSS color formats (oklch, lab, etc.)
 */
export async function generateInvoicePdf(elementId: string, filename: string): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id #${elementId} not found`);
    return false;
  }

  try {
    // Generate crisp PNG image data url directly using native browser rendering
    // This completely bypasses any CSS color parser issues with oklch in Tailwind v4
    const elementWidth = element.scrollWidth || element.offsetWidth || 800;
    const elementHeight = element.scrollHeight || element.offsetHeight || 1120;

    const imgData = await toPng(element, {
      quality: 0.98,
      pixelRatio: 2, // 2x crisp retina resolution for sharp PDF printing
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true, // Prevents cross-origin CSSStyleSheet.cssRules security errors from remote font stylesheets
      width: elementWidth,
      height: elementHeight,
      filter: (node) => {
        if (node instanceof HTMLElement && node.classList.contains('no-pdf')) {
          return false;
        }
        return true;
      }
    });

    // Create A4 PDF in portrait (210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Create image to calculate aspect ratio accurately
    const img = new Image();
    img.src = imgData;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    const imgWidth = pdfWidth;
    const imgHeight = img.width > 0 ? (img.height * pdfWidth) / img.width : pdfHeight;

    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    // If multi-page invoice content exceeds one A4 page
    while (heightLeft > 5) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }

    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating PDF with toPng, using native print fallback:', error);
    // Fallback: browser print dialog
    window.print();
    return false;
  }
}

/**
 * Triggers native browser print
 */
export function triggerPrintInvoice(): void {
  window.print();
}

/**
 * Formats a currency amount into standard localized string
 */
export function formatCurrency(amount: number, currency: string = 'IDR', symbol: string = 'Rp'): string {
  if (isNaN(amount)) amount = 0;
  
  if (currency === 'IDR') {
    return `${symbol} ${Math.round(amount).toLocaleString('id-ID')}`;
  }
  
  return `${symbol} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Generate formatted WhatsApp message text
 */
export function generateWhatsAppMessage(invoice: Invoice, reminderType: 'polite' | 'urgent' | 'standard' = 'standard'): string {
  const formattedTotal = formatCurrency(invoice.totalAmount, invoice.currency, invoice.currencySymbol);
  const formattedRemaining = formatCurrency(invoice.remainingAmount, invoice.currency, invoice.currencySymbol);
  const clientName = invoice.client.name || 'Bapak/Ibu';
  const companyName = invoice.company.name;
  
  let header = '';
  if (reminderType === 'urgent') {
    header = `⚠️ *PENGINGAT PEMBAYARAN JATUH TEMPO*\n`;
  } else if (reminderType === 'polite') {
    header = `Salam hangat Bapak/Ibu ${clientName},\n`;
  } else {
    header = `Halo Bapak/Ibu ${clientName},\n`;
  }

  // Build payment methods summary text
  const enabledMethods = invoice.paymentDetails?.enabledMethods || ['cash', 'bank_transfer'];
  let paymentMethodsSection = '💳 *Opsi Pembayaran Yang Tersedia:*\n';

  if (enabledMethods.includes('cash')) {
    paymentMethodsSection += `💵 *Tunai / Cash:* Dapat dibayarkan langsung di kasir kantor atau COD (${invoice.paymentDetails.cash?.location || 'Kasir Kantor'}). Minta kuitansi resmi.\n`;
  }

  if (enabledMethods.includes('bank_transfer') && invoice.paymentDetails.bankName) {
    paymentMethodsSection += `🏦 *Transfer Bank:* ${invoice.paymentDetails.bankName} No. Rek: *${invoice.paymentDetails.accountNumber}* a.n ${invoice.paymentDetails.accountHolder}\n`;
    if (invoice.paymentDetails.secondaryBanks && invoice.paymentDetails.secondaryBanks.length > 0) {
      invoice.paymentDetails.secondaryBanks.forEach((b) => {
        paymentMethodsSection += `   - Rek. Alternatif: ${b.bankName} ${b.accountNumber}${b.accountHolder ? ` a.n ${b.accountHolder}` : ''}\n`;
      });
    }
  }

  if (enabledMethods.includes('qris')) {
    paymentMethodsSection += `📱 *QRIS / E-Wallet:* Tersedia scan barcode QRIS semua bank & e-wallet\n`;
  }

  if (enabledMethods.includes('online_link') && invoice.paymentDetails.onlinePayment?.url) {
    paymentMethodsSection += `🌐 *Bayar Online / Kartu:* ${invoice.paymentDetails.onlinePayment.url}\n`;
  }

  paymentMethodsSection += '\n';

  return `${header}
Berikut rincian tagihan dari *${companyName}*:

📄 *No. Invoice:* ${invoice.invoiceNumber}
📅 *Tanggal Terbit:* ${invoice.issueDate}
⏰ *Jatuh Tempo:* ${invoice.dueDate}
💰 *Total Tagihan:* ${formattedTotal}
${invoice.paidAmount > 0 ? `✅ *Sudah Dibayar:* ${formatCurrency(invoice.paidAmount, invoice.currency, invoice.currencySymbol)}\n` : ''}
💳 *Sisa Pembayaran:* *${formattedRemaining}*
📌 *Status:* ${invoice.status.toUpperCase()}

${paymentMethodsSection}Mohon konfirmasi atau kirimkan bukti transfer / tanda terima setelah melakukan pembayaran. Terima kasih banyak atas kerja sama yang baik! 🙏

Salam,
*${companyName}*`;
}

/**
 * Open WhatsApp directly with prefilled message
 */
export function openWhatsAppShare(invoice: Invoice, reminderType: 'polite' | 'urgent' | 'standard' = 'standard'): void {
  const message = generateWhatsAppMessage(invoice, reminderType);
  let phone = invoice.client.phone.replace(/[^0-9+]/g, '');
  if (phone.startsWith('0')) {
    phone = '62' + phone.substring(1);
  } else if (phone.startsWith('+')) {
    phone = phone.substring(1);
  }

  const encoded = encodeURIComponent(message);
  const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank');
}

/**
 * Open Email Client with prefilled subject and body
 */
export function openEmailShare(invoice: Invoice): void {
  const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber} - ${invoice.company.name}`);
  const body = encodeURIComponent(generateWhatsAppMessage(invoice, 'standard'));
  const mailtoUrl = `mailto:${invoice.client.email || ''}?subject=${subject}&body=${body}`;
  window.location.href = mailtoUrl;
}
