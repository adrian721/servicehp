import React, { useState } from 'react';
import { CompanyProfile } from '../types/invoice';
import { X, Building2, CreditCard, Save, Upload, Check, Banknote, Shield } from 'lucide-react';

interface CompanyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CompanyProfile;
  onSaveProfile: (profile: CompanyProfile) => Promise<void>;
}

export const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}) => {
  const [formData, setFormData] = useState<CompanyProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQrisUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, qrisImageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveProfile(formData);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan profil bisnis.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Profil Perusahaan & Pengaturan Pembayaran
              </h3>
              <p className="text-xs text-slate-500">
                Informasi bisnis dan opsi pembayaran default (Tunai, Transfer, QRIS)
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Identity Section */}
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Identitas Bisnis
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Perusahaan / Bisnis *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Resmi</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">No. WhatsApp / Telepon</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Alamat Kantor / Toko</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">NPWP / Tax ID</label>
                <input
                  type="text"
                  value={formData.taxId || ''}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  placeholder="01.234.567.8-012.000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Logo Usaha</label>
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{formData.logoUrl ? 'Ganti Logo' : 'Upload Logo'}</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {/* Opsi Pembayaran Tunai (Cash) */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-emerald-600" />
              Pengaturan Pembayaran Tunai (Cash / Bayar di Tempat)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/80">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Lokasi Kasir Tunai Default</label>
                <input
                  type="text"
                  value={formData.defaultCashOptions?.location || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    defaultCashOptions: {
                      enabled: true,
                      recipientName: formData.defaultCashOptions?.recipientName || 'Bagian Kasir / Finance',
                      instructions: formData.defaultCashOptions?.instructions || '',
                      location: e.target.value
                    }
                  })}
                  placeholder="Kasir Kantor Pusat / Bayar di Tempat (COD)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Petugas Penerima Kas Default</label>
                <input
                  type="text"
                  value={formData.defaultCashOptions?.recipientName || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    defaultCashOptions: {
                      enabled: true,
                      location: formData.defaultCashOptions?.location || '',
                      instructions: formData.defaultCashOptions?.instructions || '',
                      recipientName: e.target.value
                    }
                  })}
                  placeholder="Bagian Kasir / Finance Resmi"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Instruksi Pembayaran Tunai</label>
                <textarea
                  rows={2}
                  value={formData.defaultCashOptions?.instructions || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    defaultCashOptions: {
                      enabled: true,
                      location: formData.defaultCashOptions?.location || '',
                      recipientName: formData.defaultCashOptions?.recipientName || '',
                      instructions: e.target.value
                    }
                  })}
                  placeholder="Dapat dibayarkan secara tunai langsung di kasir atau COD. Harap meminta tanda terima / kuitansi resmi bertanda tangan."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Payment Section (Bank & QRIS) */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              Rekening Transfer Bank & QRIS Default
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Bank</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="Bank Central Asia (BCA)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">No. Rekening</label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="8830-1928-33"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Atas Nama Pemilik</label>
                <input
                  type="text"
                  value={formData.accountHolder}
                  onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                  placeholder="PT DIGITAL SOLUSI"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Upload QRIS (Opsional)</label>
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{formData.qrisImageUrl ? 'Ganti QRIS' : 'Upload Gambar QRIS'}</span>
                  <input type="file" accept="image/*" onChange={handleQrisUpload} className="hidden" />
                </label>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Catatan Tagihan Default</label>
                <textarea
                  rows={2}
                  value={formData.defaultNotes || ''}
                  onChange={(e) => setFormData({ ...formData, defaultNotes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Profil'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
