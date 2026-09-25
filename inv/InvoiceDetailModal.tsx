import React, { useState } from 'react';
import { Client, Invoice } from '../types/invoice';
import { formatCurrency } from '../lib/pdfExport';
import { 
  X, 
  UserPlus, 
  Users, 
  Phone, 
  Mail, 
  Building, 
  FileText, 
  Plus, 
  Edit2, 
  Trash2,
  Check
} from 'lucide-react';

interface ClientDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  invoices: Invoice[];
  onSaveClient: (client: Client) => Promise<void>;
  onCreateInvoiceForClient: (client: Client) => void;
}

export const ClientDirectoryModal: React.FC<ClientDirectoryModalProps> = ({
  isOpen,
  onClose,
  clients,
  invoices,
  onSaveClient,
  onCreateInvoiceForClient,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: ''
  });

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormData({ name: '', company: '', email: '', phone: '', address: '' });
    setShowAddForm(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || ''
    });
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Nama klien wajib diisi.');
      return;
    }

    const clientToSave: Client = {
      id: editingClient ? editingClient.id : `client_${Date.now()}`,
      name: formData.name.trim(),
      company: formData.company.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      createdAt: editingClient ? editingClient.createdAt : new Date().toISOString()
    };

    await onSaveClient(clientToSave);
    setShowAddForm(false);
  };

  // Helper to compute client's total invoice stats
  const getClientStats = (clientName: string) => {
    const matched = invoices.filter((i) => i.client.name.toLowerCase() === clientName.toLowerCase());
    const totalAmount = matched.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalPaid = matched.reduce((sum, i) => sum + (i.paidAmount || (i.status === 'paid' ? i.totalAmount : 0)), 0);
    return {
      count: matched.length,
      totalAmount,
      totalPaid
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Direktori & Buku Kontak Klien
              </h3>
              <p className="text-xs text-slate-500">
                Simpan kontak klien untuk pengisian invoice otomatis dalam 1 klik
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
          {/* Top Actions */}
          {!showAddForm && (
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Klien Terdaftar: {clients.length}
              </span>
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Tambah Klien Baru</span>
              </button>
            </div>
          )}

          {/* Add / Edit Client Form */}
          {showAddForm && (
            <form onSubmit={handleSubmit} className="p-5 bg-indigo-50/50 border border-indigo-200/80 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  {editingClient ? 'Edit Informasi Klien' : 'Tambah Klien Baru'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Lengkap / Kontak *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Budi Santoso"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Perusahaan (Opsional)</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="PT Maju Bersama"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="klien@gmail.com"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">No. Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+62 812-3456-7890"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Alamat Penagihan</label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Jl. Sudirman No..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  {editingClient ? 'Simpan Perubahan' : 'Simpan Klien'}
                </button>
              </div>
            </form>
          )}

          {/* Client List Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {clients.map((client) => {
              const stats = getClientStats(client.name);

              return (
                <div 
                  key={client.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs space-y-3 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {client.name}
                      </h4>
                      {client.company && (
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{client.company}</span>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleEdit(client)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Financial stats with this client */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Total Transaksi:</span>
                    <span className="font-bold font-mono text-slate-900">
                      {formatCurrency(stats.totalPaid, 'IDR')} ({stats.count} inv)
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onCreateInvoiceForClient(client);
                      onClose();
                    }}
                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Buat Invoice Klien Ini</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
