/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Invoice, CompanyProfile, Client, NotificationItem } from './types/invoice';
import { 
  getLocalInvoices, 
  saveLocalInvoices, 
  getLocalProfile, 
  saveLocalProfile, 
  getLocalClients, 
  saveLocalClients,
  syncInvoiceToCloud,
  deleteInvoiceFromCloud,
  syncCompanyProfile,
  syncClientToCloud,
  subscribeToCloudInvoices
} from './lib/firebase';
import { calculateInvoiceNotifications } from './lib/notifications';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { InvoiceListView } from './components/InvoiceListView';
import { InvoiceEditor } from './components/InvoiceEditor';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { NotificationModal } from './components/NotificationModal';
import { ClientDirectoryModal } from './components/ClientDirectoryModal';
import { CompanyProfileModal } from './components/CompanyProfileModal';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';

export default function App() {
  // Main states
  const [invoices, setInvoices] = useState<Invoice[]>(() => getLocalInvoices());
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => getLocalProfile());
  const [clients, setClients] = useState<Client[]>(() => getLocalClients());
  
  // Navigation & View mode
  const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'editor'>('dashboard');
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // Modals
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Cloud sync status
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  // Compute live notifications
  const notifications = useMemo(() => {
    return calculateInvoiceNotifications(invoices);
  }, [invoices]);

  // Check URL params on initial mount (for PWA shortcut actions)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action === 'new-invoice') {
      handleCreateNewInvoice();
    } else if (action === 'dashboard') {
      setActiveTab('dashboard');
    }
  }, []);

  // Listen to network status
  useEffect(() => {
    const updateOnlineStatus = () => {
      if (!navigator.onLine) {
        setSyncStatus('offline');
      } else {
        setSyncStatus('synced');
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Subscribe to Cloud Firestore
  useEffect(() => {
    setSyncStatus('syncing');
    const unsubscribe = subscribeToCloudInvoices(
      (cloudInvoices) => {
        if (cloudInvoices && cloudInvoices.length > 0) {
          // Merge cloud invoices with local ones, preferring the latest updated
          setInvoices((prev) => {
            const mergedMap = new Map<string, Invoice>();
            prev.forEach((inv) => mergedMap.set(inv.id, inv));
            cloudInvoices.forEach((inv) => mergedMap.set(inv.id, inv));
            const merged = Array.from(mergedMap.values());
            saveLocalInvoices(merged);
            return merged;
          });
        }
        setSyncStatus(navigator.onLine ? 'synced' : 'offline');
      },
      (error) => {
        console.warn('Sync error or offline mode:', error);
        setSyncStatus('offline');
      }
    );

    return () => unsubscribe();
  }, []);

  // Helper: generate new default invoice
  const generateNewInvoiceObject = useCallback((clientPreset?: Client): Invoice => {
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 14); // Net 14 default

    const year = today.getFullYear();
    const sequenceNum = String(invoices.length + 1).padStart(4, '0');
    const invoiceNumber = `INV-${year}-${sequenceNum}`;

    return {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      invoiceNumber,
      status: 'pending',
      template: 'modern',
      currency: companyProfile.defaultCurrency || 'IDR',
      currencySymbol: 'Rp',
      issueDate: today.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      company: {
        name: companyProfile.name,
        email: companyProfile.email,
        phone: companyProfile.phone,
        address: companyProfile.address,
        taxId: companyProfile.taxId,
        website: companyProfile.website,
        logoUrl: companyProfile.logoUrl
      },
      client: clientPreset ? {
        id: clientPreset.id,
        name: clientPreset.name,
        company: clientPreset.company || '',
        email: clientPreset.email,
        phone: clientPreset.phone,
        address: clientPreset.address
      } : {
        name: '',
        company: '',
        email: '',
        phone: '',
        address: ''
      },
      items: [
        {
          id: `item_${Date.now()}_1`,
          description: 'Jasa Konsultasi / Layanan Profesional',
          quantity: 1,
          unit: 'proyek',
          unitPrice: 5000000,
          discount: 0,
          taxable: true,
          amount: 5000000
        }
      ],
      taxRate: companyProfile.defaultTaxRate ?? 11,
      taxAmount: 550000,
      discountType: 'fixed',
      discountValue: 0,
      discountAmount: 0,
      shippingFee: 0,
      subtotal: 5000000,
      totalAmount: 5550000,
      paidAmount: 0,
      remainingAmount: 5550000,
      paymentDetails: {
        enabledMethods: ['cash', 'bank_transfer', 'qris'],
        cash: companyProfile.defaultCashOptions || {
          enabled: true,
          location: 'Kasir Kantor / Bayar di Tempat (COD)',
          recipientName: 'Bagian Kasir / Finance',
          instructions: 'Dapat dibayarkan secara tunai langsung di kasir atau saat penyerahan dokumen/pekerjaan (COD). Harap meminta tanda terima / kuitansi resmi bertanda tangan.'
        },
        bankName: companyProfile.bankName,
        accountNumber: companyProfile.accountNumber,
        accountHolder: companyProfile.accountHolder,
        secondaryBanks: [
          {
            id: `sec_${Date.now()}`,
            bankName: 'Bank Mandiri',
            accountNumber: '122-00-983102-1',
            accountHolder: companyProfile.accountHolder,
            branch: 'KCP Sudirman'
          }
        ],
        qrisImageUrl: companyProfile.qrisImageUrl,
        onlinePayment: companyProfile.defaultOnlineOptions || {
          enabled: false,
          url: '',
          providerName: 'Kartu Kredit / Debit Online'
        },
        cheque: {
          enabled: false,
          payableTo: companyProfile.name,
          instructions: 'Cek / Bilyet Giro dapat diserahkan langsung.'
        },
        notes: companyProfile.defaultNotes || 'Terima kasih atas kerja samanya. Tersedia pilihan pembayaran Tunai (Cash/COD), Transfer Bank, dan QRIS.',
        paymentTerms: companyProfile.defaultTerms || 'Net 14 Hari Kerja'
      },
      payments: [],
      signature: {
        signerName: companyProfile.name,
        signerTitle: 'Finance & Billing',
        signatureDate: today.toISOString().split('T')[0]
      },
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
      syncedToCloud: false
    };
  }, [companyProfile, invoices.length]);

  // Actions
  const handleCreateNewInvoice = () => {
    const newInv = generateNewInvoiceObject();
    setEditingInvoice(newInv);
    setActiveTab('editor');
  };

  const handleCreateInvoiceForClient = (client: Client) => {
    const newInv = generateNewInvoiceObject(client);
    setEditingInvoice(newInv);
    setActiveTab('editor');
  };

  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setActiveTab('editor');
  };

  const handleSaveInvoice = async (invoiceToSave: Invoice) => {
    setSyncStatus('syncing');

    // 1. Update local state
    setInvoices((prev) => {
      const exists = prev.some((i) => i.id === invoiceToSave.id);
      let updated: Invoice[];
      if (exists) {
        updated = prev.map((i) => (i.id === invoiceToSave.id ? invoiceToSave : i));
      } else {
        updated = [invoiceToSave, ...prev];
      }
      saveLocalInvoices(updated);
      return updated;
    });

    // 2. Also save client to client directory if not already saved
    if (invoiceToSave.client.name.trim()) {
      const clientExists = clients.some(
        (c) => c.name.toLowerCase() === invoiceToSave.client.name.trim().toLowerCase()
      );
      if (!clientExists) {
        const newClient: Client = {
          id: `client_${Date.now()}`,
          name: invoiceToSave.client.name.trim(),
          company: invoiceToSave.client.company || '',
          email: invoiceToSave.client.email || '',
          phone: invoiceToSave.client.phone || '',
          address: invoiceToSave.client.address || '',
          createdAt: new Date().toISOString()
        };
        const updatedClients = [newClient, ...clients];
        setClients(updatedClients);
        saveLocalClients(updatedClients);
        syncClientToCloud(newClient).catch(() => {});
      }
    }

    // 3. Sync to Firebase Cloud
    try {
      await syncInvoiceToCloud(invoiceToSave);
      setSyncStatus('synced');
    } catch {
      setSyncStatus('offline');
    }

    // Switch view back to list
    setActiveTab('invoices');
    setEditingInvoice(null);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    setInvoices((prev) => {
      const updated = prev.filter((i) => i.id !== invoiceId);
      saveLocalInvoices(updated);
      return updated;
    });

    try {
      await deleteInvoiceFromCloud(invoiceId);
    } catch (err) {
      console.warn('Delete cloud failed:', err);
    }
  };

  const handleDuplicateInvoice = (invoiceToDup: Invoice) => {
    const today = new Date();
    const year = today.getFullYear();
    const sequenceNum = String(invoices.length + 1).padStart(4, '0');

    const duplicated: Invoice = {
      ...invoiceToDup,
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      invoiceNumber: `INV-${year}-${sequenceNum}`,
      status: 'pending',
      issueDate: today.toISOString().split('T')[0],
      paidAmount: 0,
      remainingAmount: invoiceToDup.totalAmount,
      payments: [],
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
      syncedToCloud: false
    };

    setEditingInvoice(duplicated);
    setActiveTab('editor');
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    const target = invoices.find((i) => i.id === invoiceId);
    if (!target) return;

    const updated: Invoice = {
      ...target,
      status: 'paid',
      paidAmount: target.totalAmount,
      remainingAmount: 0,
      payments: [
        ...target.payments,
        {
          id: `pay_${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          amount: target.remainingAmount > 0 ? target.remainingAmount : target.totalAmount,
          method: 'Transfer Bank',
          note: 'Pelunasan invoice'
        }
      ],
      updatedAt: new Date().toISOString()
    };

    setInvoices((prev) => {
      const next = prev.map((i) => (i.id === invoiceId ? updated : i));
      saveLocalInvoices(next);
      return next;
    });

    if (viewingInvoice && viewingInvoice.id === invoiceId) {
      setViewingInvoice(updated);
    }

    try {
      await syncInvoiceToCloud(updated);
    } catch (err) {
      console.warn('Sync paid status failed:', err);
    }
  };

  const handleSaveProfile = async (newProfile: CompanyProfile) => {
    setCompanyProfile(newProfile);
    saveLocalProfile(newProfile);
    await syncCompanyProfile(newProfile);
  };

  const handleSaveClient = async (newClient: Client) => {
    setClients((prev) => {
      const exists = prev.some((c) => c.id === newClient.id);
      let updated: Client[];
      if (exists) {
        updated = prev.map((c) => (c.id === newClient.id ? newClient : c));
      } else {
        updated = [newClient, ...prev];
      }
      saveLocalClients(updated);
      return updated;
    });
    await syncClientToCloud(newClient);
  };

  const handleManualSync = async () => {
    setSyncStatus('syncing');
    try {
      // Sync all unsynced or modified local invoices
      for (const inv of invoices) {
        await syncInvoiceToCloud(inv);
      }
      setSyncStatus('synced');
    } catch {
      setSyncStatus('offline');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* PWA offline / install banner */}
      <PwaInstallPrompt />

      {/* Main Navbar */}
      <Navbar
        currentTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'editor') setEditingInvoice(null);
        }}
        onNewInvoice={handleCreateNewInvoice}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onOpenClients={() => setIsClientModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        notificationsCount={notifications.length}
        syncStatus={syncStatus}
        onManualSync={handleManualSync}
      />

      {/* Main App Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            invoices={invoices}
            notifications={notifications}
            onNewInvoice={handleCreateNewInvoice}
            onEditInvoice={handleEditInvoice}
            onViewInvoice={(inv) => setViewingInvoice(inv)}
            onMarkAsPaid={handleMarkAsPaid}
            onOpenNotifications={() => setIsNotificationOpen(true)}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoiceListView
            invoices={invoices}
            onNewInvoice={handleCreateNewInvoice}
            onEditInvoice={handleEditInvoice}
            onViewInvoice={(inv) => setViewingInvoice(inv)}
            onDeleteInvoice={handleDeleteInvoice}
            onDuplicateInvoice={handleDuplicateInvoice}
            onMarkAsPaid={handleMarkAsPaid}
          />
        )}

        {activeTab === 'editor' && editingInvoice && (
          <InvoiceEditor
            initialInvoice={editingInvoice}
            savedClients={clients}
            companyProfile={companyProfile}
            onSaveInvoice={handleSaveInvoice}
            onCancel={() => {
              setActiveTab('invoices');
              setEditingInvoice(null);
            }}
          />
        )}
      </main>

      {/* Modals & Dialogs */}
      <InvoiceDetailModal
        invoice={viewingInvoice}
        isOpen={!!viewingInvoice}
        onClose={() => setViewingInvoice(null)}
        onEdit={(inv) => {
          setViewingInvoice(null);
          handleEditInvoice(inv);
        }}
        onDelete={handleDeleteInvoice}
        onDuplicate={handleDuplicateInvoice}
        onMarkAsPaid={handleMarkAsPaid}
      />

      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        invoices={invoices}
        onMarkAsPaid={handleMarkAsPaid}
        onViewInvoice={(inv) => setViewingInvoice(inv)}
      />

      <ClientDirectoryModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        clients={clients}
        invoices={invoices}
        onSaveClient={handleSaveClient}
        onCreateInvoiceForClient={handleCreateInvoiceForClient}
      />

      <CompanyProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={companyProfile}
        onSaveProfile={handleSaveProfile}
      />
    </div>
  );
}
