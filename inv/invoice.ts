import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy,
  getFirestore,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Invoice, CompanyProfile, Client, PaymentDetailsConfig } from '../types/invoice';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with offline persistence
let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, firebaseConfig.firestoreDatabaseId);
} catch {
  // If already initialized
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export { db };

// Collection References
const INVOICES_COLLECTION = 'invoices';
const WORKSPACES_COLLECTION = 'workspaces';
const CLIENTS_COLLECTION = 'clients';
const DEFAULT_WORKSPACE_ID = 'default_workspace';

// Helper for local storage backup
const LOCAL_STORAGE_KEY = 'invoicepro_local_invoices';
const PROFILE_STORAGE_KEY = 'invoicepro_local_profile';
const CLIENTS_STORAGE_KEY = 'invoicepro_local_clients';

// Default initial company profile
export const initialCompanyProfile: CompanyProfile = {
  name: 'PT Digital Solusi Nusantara',
  email: 'billing@digitalsolusi.co.id',
  phone: '+62 812-3456-7890',
  address: 'Sudirman Central Business District (SCBD) Lot 28, Jakarta Selatan 12190',
  taxId: '01.234.567.8-012.000',
  website: 'www.digitalsolusi.co.id',
  logoUrl: '',
  bankName: 'Bank Central Asia (BCA)',
  accountNumber: '8830-1928-33',
  accountHolder: 'PT DIGITAL SOLUSI NUSANTARA',
  qrisImageUrl: '',
  defaultCashOptions: {
    enabled: true,
    location: 'Kasir Kantor Pusat (SCBD Lot 28) atau Bayar di Tempat (COD)',
    recipientName: 'Bagian Kasir / Finance',
    instructions: 'Dapat dibayarkan secara tunai langsung di kasir kantor kami atau tunai saat serah terima dokumen/pekerjaan (COD). Harap meminta tanda terima / kuitansi resmi bertanda tangan.'
  },
  defaultOnlineOptions: {
    enabled: false,
    url: '',
    providerName: 'Kartu Kredit / Debit / QRIS Online'
  },
  defaultNotes: 'Terima kasih atas kepercayaan dan kerja samanya. Pembayaran dapat dilakukan via Tunai di kasir/COD, Transfer Bank, atau QRIS.',
  defaultTerms: '1. Pembayaran jatuh tempo dalam 14 hari kerja sejak invoice diterbitkan.\n2. Untuk transfer bank, cantumkan nomor invoice pada berita transfer.\n3. Untuk pembayaran tunai, mintalah kuitansi atau tanda terima resmi.',
  defaultCurrency: 'IDR',
  defaultTaxRate: 11
};

export const defaultPaymentDetails: PaymentDetailsConfig = {
  enabledMethods: ['cash', 'bank_transfer', 'qris'],
  cash: {
    enabled: true,
    location: 'Kasir Kantor Pusat (SCBD Lot 28) atau Bayar di Tempat (COD)',
    recipientName: 'Bagian Kasir / Finance',
    instructions: 'Dapat dibayarkan secara tunai langsung di kasir atau saat penyerahan dokumen/pekerjaan (COD). Harap meminta tanda terima / kuitansi resmi.'
  },
  bankName: 'Bank Central Asia (BCA)',
  accountNumber: '8830-1928-33',
  accountHolder: 'PT DIGITAL SOLUSI NUSANTARA',
  secondaryBanks: [
    {
      id: 'sec_bank_1',
      bankName: 'Bank Mandiri',
      accountNumber: '122-00-983102-1',
      accountHolder: 'PT DIGITAL SOLUSI NUSANTARA',
      branch: 'KCP Jakarta SCBD'
    }
  ],
  qrisImageUrl: '',
  onlinePayment: {
    enabled: false,
    url: '',
    providerName: 'Kartu Kredit / Debit Online'
  },
  cheque: {
    enabled: false,
    payableTo: 'PT DIGITAL SOLUSI NUSANTARA',
    instructions: 'Cek / Bilyet Giro jatuh tempo maksimal sesuai tanggal jatuh tempo invoice.'
  },
  paymentTerms: 'Net 14 Hari Kerja',
  notes: 'Terima kasih atas kerja samanya. Tersedia pilihan pembayaran Tunai (Cash/COD), Transfer Bank, dan QRIS.'
};

// Normalize invoice payment details for seamless backward-compatibility
export function normalizeInvoice(inv: Partial<Invoice>): Invoice {
  const existingDetails = inv.paymentDetails || ({} as Partial<PaymentDetailsConfig>);
  
  const paymentDetails: PaymentDetailsConfig = {
    enabledMethods: existingDetails.enabledMethods || ['cash', 'bank_transfer'],
    cash: {
      enabled: existingDetails.cash ? existingDetails.cash.enabled : true,
      location: existingDetails.cash?.location || 'Kasir Kantor / Bayar di Tempat (COD)',
      recipientName: existingDetails.cash?.recipientName || 'Bagian Kasir / Finance',
      instructions: existingDetails.cash?.instructions || 'Dapat dibayarkan secara tunai langsung di kasir atau saat penyerahan dokumen/barang (COD). Dapatkan kuitansi resmi.'
    },
    bankName: existingDetails.bankName || 'Bank Central Asia (BCA)',
    accountNumber: existingDetails.accountNumber || '8830-1928-33',
    accountHolder: existingDetails.accountHolder || 'PT DIGITAL SOLUSI NUSANTARA',
    secondaryBanks: existingDetails.secondaryBanks || [],
    qrisImageUrl: existingDetails.qrisImageUrl || '',
    onlinePayment: existingDetails.onlinePayment || {
      enabled: false,
      url: '',
      providerName: 'Kartu Kredit / Link Online'
    },
    cheque: existingDetails.cheque || {
      enabled: false,
      payableTo: 'PT DIGITAL SOLUSI NUSANTARA',
      instructions: 'Cek / Bilyet Giro'
    },
    paymentTerms: existingDetails.paymentTerms || 'Net 14 Hari',
    notes: existingDetails.notes || 'Terima kasih atas kerja samanya.'
  };

  return {
    ...inv,
    paymentDetails
  } as Invoice;
}

// Default initial dummy invoices for instant rich experience
export const sampleInvoices: Invoice[] = [
  normalizeInvoice({
    id: 'inv_sample_1',
    invoiceNumber: 'INV-2026-0042',
    status: 'paid',
    template: 'modern',
    currency: 'IDR',
    currencySymbol: 'Rp',
    issueDate: '2026-09-10',
    dueDate: '2026-09-24',
    company: {
      name: initialCompanyProfile.name,
      email: initialCompanyProfile.email,
      phone: initialCompanyProfile.phone,
      address: initialCompanyProfile.address,
      taxId: initialCompanyProfile.taxId,
      website: initialCompanyProfile.website
    },
    client: {
      id: 'client_1',
      name: 'Budi Santoso',
      company: 'PT Maju Bersama Sejahtera',
      email: 'budi.santoso@majubersama.com',
      phone: '+62 813-8822-9900',
      address: 'Jl. Gatot Subroto Kav. 52, Jakarta Selatan'
    },
    items: [
      {
        id: 'item_1_1',
        description: 'Pengembangan Aplikasi Web E-Commerce Responsif (Fase 1)',
        quantity: 1,
        unit: 'proyek',
        unitPrice: 18500000,
        discount: 0,
        taxable: true,
        amount: 18500000
      },
      {
        id: 'item_1_2',
        description: 'Setup Cloud Hosting & Domain SSL Enterprise (1 Tahun)',
        quantity: 1,
        unit: 'paket',
        unitPrice: 3500000,
        discount: 10,
        taxable: true,
        amount: 3150000
      }
    ],
    taxRate: 11,
    taxAmount: 2381500,
    discountType: 'fixed',
    discountValue: 0,
    discountAmount: 0,
    shippingFee: 0,
    subtotal: 21650000,
    totalAmount: 24031500,
    paidAmount: 24031500,
    remainingAmount: 0,
    paymentDetails: {
      ...defaultPaymentDetails,
      paymentTerms: 'Jatuh tempo 14 hari. Lunas.',
      notes: 'Terima kasih! Pembayaran telah diterima secara penuh.'
    },
    payments: [
      {
        id: 'pay_1',
        date: '2026-09-18',
        amount: 24031500,
        method: 'Tunai',
        reference: 'KWT-TNI-2026-0042',
        receivedBy: 'Siti Aminah (Kasir Keuangan)',
        receiptNumber: 'KW-09241',
        note: 'Pelunasan invoice tunai di kasir kantor utama'
      }
    ],
    signature: {
      signerName: 'Hendrawan Pratama',
      signerTitle: 'Direktur Keuangan',
      signatureDate: '2026-09-10'
    },
    createdAt: '2026-09-10T09:00:00.000Z',
    updatedAt: '2026-09-18T14:30:00.000Z',
    syncedToCloud: true
  }),
  normalizeInvoice({
    id: 'inv_sample_2',
    invoiceNumber: 'INV-2026-0043',
    status: 'pending',
    template: 'corporate',
    currency: 'IDR',
    currencySymbol: 'Rp',
    issueDate: '2026-09-20',
    dueDate: '2026-09-27',
    company: {
      name: initialCompanyProfile.name,
      email: initialCompanyProfile.email,
      phone: initialCompanyProfile.phone,
      address: initialCompanyProfile.address,
      taxId: initialCompanyProfile.taxId,
      website: initialCompanyProfile.website
    },
    client: {
      id: 'client_2',
      name: 'Jessica Tanuwijaya',
      company: 'CV Kreatif Visual Citra',
      email: 'jessica@kreatifcitra.id',
      phone: '+62 811-9233-4411',
      address: 'Ruko Senopati Square Blok B-12, Kebayoran Baru, Jakarta'
    },
    items: [
      {
        id: 'item_2_1',
        description: 'Jasa UI/UX Redesign Portal Pelanggan & Desain Sistem',
        quantity: 40,
        unit: 'jam',
        unitPrice: 350000,
        discount: 5,
        taxable: true,
        amount: 13300000
      },
      {
        id: 'item_2_2',
        description: 'Prototyping Interaktif & Usability Testing Sesi',
        quantity: 2,
        unit: 'sesi',
        unitPrice: 1500000,
        discount: 0,
        taxable: true,
        amount: 3000000
      }
    ],
    taxRate: 11,
    taxAmount: 1793000,
    discountType: 'fixed',
    discountValue: 0,
    discountAmount: 0,
    shippingFee: 0,
    subtotal: 1630000,
    totalAmount: 18093000,
    paidAmount: 5000000,
    remainingAmount: 13093000,
    paymentDetails: {
      ...defaultPaymentDetails,
      paymentTerms: 'Termin 2 (Sisa Pelunasan)',
      notes: 'Mohon lakukan pelunasan sebelum tanggal 27 September 2026. Dapat dibayar tunai di kasir atau transfer.'
    },
    payments: [
      {
        id: 'pay_2',
        date: '2026-09-20',
        amount: 5000000,
        method: 'Tunai',
        reference: 'DP-TUNAI-0012',
        receivedBy: 'Ahmad Fauzi (Finance)',
        receiptNumber: 'KWT-DP-0920',
        note: 'Uang Muka 30% Diterima Tunai'
      }
    ],
    signature: {
      signerName: 'Hendrawan Pratama',
      signerTitle: 'Direktur Keuangan',
      signatureDate: '2026-09-20'
    },
    createdAt: '2026-09-20T10:00:00.000Z',
    updatedAt: '2026-09-20T11:00:00.000Z',
    syncedToCloud: true
  }),
  normalizeInvoice({
    id: 'inv_sample_3',
    invoiceNumber: 'INV-2026-0040',
    status: 'overdue',
    template: 'creative',
    currency: 'IDR',
    currencySymbol: 'Rp',
    issueDate: '2026-09-01',
    dueDate: '2026-09-15',
    company: {
      name: initialCompanyProfile.name,
      email: initialCompanyProfile.email,
      phone: initialCompanyProfile.phone,
      address: initialCompanyProfile.address,
      taxId: initialCompanyProfile.taxId,
      website: initialCompanyProfile.website
    },
    client: {
      id: 'client_3',
      name: 'Rahmat Hidayat',
      company: 'PT Borneo Logistik Express',
      email: 'rahmat@borneoexpress.co.id',
      phone: '+62 852-4411-9988',
      address: 'Jl. Ahmad Yani No. 88, Balikpapan, Kalimantan Timur'
    },
    items: [
      {
        id: 'item_3_1',
        description: 'Pemeliharaan Server & Optimasi Basis Data Bulanan',
        quantity: 1,
        unit: 'bulan',
        unitPrice: 8500000,
        discount: 0,
        taxable: true,
        amount: 8500000
      }
    ],
    taxRate: 11,
    taxAmount: 935000,
    discountType: 'fixed',
    discountValue: 0,
    discountAmount: 0,
    shippingFee: 0,
    subtotal: 8500000,
    totalAmount: 9435000,
    paidAmount: 0,
    remainingAmount: 9435000,
    paymentDetails: {
      ...defaultPaymentDetails,
      paymentTerms: 'Net 14 Hari',
      notes: 'Tagihan ini telah melampaui tanggal jatuh tempo 15 September 2026.'
    },
    payments: [],
    signature: {
      signerName: 'Hendrawan Pratama',
      signerTitle: 'Direktur Keuangan',
      signatureDate: '2026-09-01'
    },
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
    syncedToCloud: true
  })
];

// Service functions for Invoices
export async function syncInvoiceToCloud(invoice: Invoice): Promise<void> {
  try {
    const docRef = doc(db, INVOICES_COLLECTION, invoice.id);
    await setDoc(docRef, { ...invoice, syncedToCloud: true, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Failed to sync invoice to cloud, will use offline cache:', err);
    throw err;
  }
}

export async function deleteInvoiceFromCloud(invoiceId: string): Promise<void> {
  try {
    const docRef = doc(db, INVOICES_COLLECTION, invoiceId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Failed to delete invoice from cloud:', err);
    throw err;
  }
}

export async function syncCompanyProfile(profile: CompanyProfile): Promise<void> {
  try {
    const docRef = doc(db, WORKSPACES_COLLECTION, DEFAULT_WORKSPACE_ID);
    await setDoc(docRef, profile, { merge: true });
  } catch (err) {
    console.warn('Failed to sync profile to cloud:', err);
  }
}

export async function syncClientToCloud(client: Client): Promise<void> {
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, client.id);
    await setDoc(docRef, client, { merge: true });
  } catch (err) {
    console.warn('Failed to sync client to cloud:', err);
  }
}

// Local Storage helpers
export function getLocalInvoices(): Invoice[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Invoice[];
      return parsed.map(normalizeInvoice);
    }
  } catch (e) {
    console.error(e);
  }
  return sampleInvoices;
}

export function saveLocalInvoices(invoices: Invoice[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(invoices));
  } catch (e) {
    console.error(e);
  }
}

export function getLocalProfile(): CompanyProfile {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error(e);
  }
  return initialCompanyProfile;
}

export function saveLocalProfile(profile: CompanyProfile): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error(e);
  }
}

export function getLocalClients(): Client[] {
  try {
    const stored = localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error(e);
  }
  return [
    {
      id: 'client_1',
      name: 'Budi Santoso',
      company: 'PT Maju Bersama Sejahtera',
      email: 'budi.santoso@majubersama.com',
      phone: '+62 813-8822-9900',
      address: 'Jl. Gatot Subroto Kav. 52, Jakarta Selatan',
      createdAt: '2026-09-01'
    },
    {
      id: 'client_2',
      name: 'Jessica Tanuwijaya',
      company: 'CV Kreatif Visual Citra',
      email: 'jessica@kreatifcitra.id',
      phone: '+62 811-9233-4411',
      address: 'Ruko Senopati Square Blok B-12, Kebayoran Baru, Jakarta',
      createdAt: '2026-09-05'
    },
    {
      id: 'client_3',
      name: 'Rahmat Hidayat',
      company: 'PT Borneo Logistik Express',
      email: 'rahmat@borneoexpress.co.id',
      phone: '+62 852-4411-9988',
      address: 'Jl. Ahmad Yani No. 88, Balikpapan, Kalimantan Timur',
      createdAt: '2026-09-08'
    }
  ];
}

export function saveLocalClients(clients: Client[]): void {
  try {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
  } catch (e) {
    console.error(e);
  }
}

// Subscribe to Cloud Invoices
export function subscribeToCloudInvoices(
  onData: (invoices: Invoice[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const q = query(collection(db, INVOICES_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudInvoices = snapshot.docs.map((d) => normalizeInvoice(d.data() as Invoice));
          onData(cloudInvoices);
        } else {
          onData([]);
        }
      },
      (error) => {
        console.warn('Firestore subscription error:', error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.warn('Could not set up snapshot listener:', err);
    return () => {};
  }
}
