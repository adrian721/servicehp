export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';

export type InvoiceTemplate = 'modern' | 'corporate' | 'creative' | 'minimal' | 'dark' | 'classic';

export type PaymentMethodType = 'cash' | 'bank_transfer' | 'qris' | 'online_link' | 'cheque';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number; // percentage
  taxable: boolean;
  amount: number;
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: 'Tunai' | 'Transfer Bank' | 'QRIS' | 'Kartu Kredit' | 'Cek / Giro' | 'E-Wallet' | 'Lainnya';
  reference?: string;
  receivedBy?: string; // Penerima Kas / Kasir
  receiptNumber?: string; // No. Kuitansi
  note?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  branch?: string;
}

export interface CashPaymentOption {
  enabled: boolean;
  location: string; // e.g. "Kasir Kantor Pusat / Toko" atau "Bayar di Tempat (COD)"
  recipientName: string; // e.g. "Kasir Finance / Kurir Resmi"
  instructions: string; // e.g. "Dapat dibayarkan secara tunai langsung di kasir atau saat serah terima barang (COD). Harap meminta tanda terima / kuitansi resmi bertanda tangan."
}

export interface OnlinePaymentOption {
  enabled: boolean;
  url: string; // e.g. "https://pay.example.com/inv/123"
  providerName: string; // e.g. "Kartu Kredit / Debit / QRIS Online"
}

export interface ChequePaymentOption {
  enabled: boolean;
  payableTo: string;
  instructions: string;
}

export interface CompanyProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId?: string; // NPWP
  website?: string;
  logoUrl?: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  qrisImageUrl?: string;
  defaultCashOptions?: CashPaymentOption;
  defaultOnlineOptions?: OnlinePaymentOption;
  defaultNotes?: string;
  defaultTerms?: string;
  defaultCurrency?: string;
  defaultTaxRate?: number;
}

export interface Client {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
}

export interface PaymentDetailsConfig {
  // Enabled methods
  enabledMethods: PaymentMethodType[];

  // 1. Tunai / Cash
  cash: CashPaymentOption;

  // 2. Transfer Bank (multi-bank support)
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  secondaryBanks?: BankAccount[];

  // 3. QRIS & E-Wallet
  qrisImageUrl?: string;
  ewalletNumber?: string;
  ewalletName?: string;

  // 4. Online Payment Link
  onlinePayment: OnlinePaymentOption;

  // 5. Cek / Giro
  cheque: ChequePaymentOption;

  // General notes & terms
  paymentTerms: string;
  notes: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  template: InvoiceTemplate;
  currency: string;
  currencySymbol: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  
  // Sender info
  company: {
    name: string;
    email: string;
    phone: string;
    address: string;
    taxId?: string;
    website?: string;
    logoUrl?: string;
  };

  // Recipient info
  client: {
    id?: string;
    name: string;
    company?: string;
    email: string;
    phone: string;
    address: string;
  };

  // Items
  items: InvoiceItem[];

  // Taxes and discounts
  taxRate: number; // percentage, e.g., 11 for PPN
  taxAmount: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  shippingFee: number;

  // Totals
  subtotal: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;

  // Payment instruction (with full support for cash & multi-methods)
  paymentDetails: PaymentDetailsConfig;

  // Payments history
  payments: PaymentRecord[];

  // Digital Signature
  signature?: {
    signerName: string;
    signerTitle: string;
    signatureDate: string;
    signatureImage?: string;
  };

  // Sync and Audit
  createdAt: string;
  updatedAt: string;
  syncedToCloud?: boolean;
}

export interface NotificationItem {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  dueDate: string;
  totalAmount: number;
  remainingAmount: number;
  currencySymbol: string;
  type: 'overdue' | 'due_today' | 'due_soon';
  daysDiff: number;
}
