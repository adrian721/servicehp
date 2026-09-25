import React, { useState } from 'react';
import { 
  FileText, 
  LayoutDashboard, 
  Users, 
  Settings, 
  Plus, 
  Cloud, 
  CloudCheck, 
  CloudOff, 
  BellRing, 
  DownloadCloud, 
  Smartphone,
  RefreshCw
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'dashboard' | 'invoices' | 'editor';
  onSelectTab: (tab: 'dashboard' | 'invoices' | 'editor') => void;
  onNewInvoice: () => void;
  onOpenNotifications: () => void;
  onOpenClients: () => void;
  onOpenProfile: () => void;
  notificationsCount: number;
  syncStatus: 'synced' | 'syncing' | 'offline';
  onManualSync: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onNewInvoice,
  onOpenNotifications,
  onOpenClients,
  onOpenProfile,
  notificationsCount,
  syncStatus,
  onManualSync,
}) => {
  const [isSyncSpinning, setIsSyncSpinning] = useState(false);

  const handleSyncClick = () => {
    setIsSyncSpinning(true);
    onManualSync();
    setTimeout(() => setIsSyncSpinning(false), 800);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onSelectTab('dashboard')} 
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Invoice<span className="text-indigo-600">Pro</span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-md">
                    PWA
                  </span>
                </div>
                <div className="text-[10px] font-medium text-slate-400 hidden sm:block">
                  Smart Invoice & Billing Cloud
                </div>
              </div>
            </button>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 ml-6 bg-slate-100/80 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => onSelectTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  currentTab === 'dashboard'
                    ? 'bg-white shadow-xs text-indigo-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => onSelectTab('invoices')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  currentTab === 'invoices'
                    ? 'bg-white shadow-xs text-indigo-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Daftar Invoice</span>
              </button>

              <button
                onClick={onOpenClients}
                className="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Klien</span>
              </button>

              <button
                onClick={onOpenProfile}
                className="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Profil Bisnis</span>
              </button>
            </nav>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cloud Sync Status Indicator */}
            <button
              onClick={handleSyncClick}
              title="Status Sinkronisasi Cloud Firestore. Klik untuk sinkron manual."
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                syncStatus === 'synced'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncSpinning || syncStatus === 'syncing' ? 'animate-spin text-indigo-600' : 'text-emerald-600'}`} />
              <span className="hidden lg:inline text-[11px]">
                {syncStatus === 'synced' ? 'Cloud Terhubung' : syncStatus === 'syncing' ? 'Sinkronisasi...' : 'Tersimpan Lokal'}
              </span>
            </button>

            {/* Notification Bell Button */}
            <button
              onClick={onOpenNotifications}
              title="Notifikasi Pengingat Jatuh Tempo"
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <BellRing className={`w-5 h-5 ${notificationsCount > 0 ? 'text-rose-500 animate-pulse' : ''}`} />
              {notificationsCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-black text-white bg-rose-500 rounded-full px-1 shadow-xs">
                  {notificationsCount}
                </span>
              )}
            </button>

            {/* Primary CTA: Buat Invoice Baru */}
            <button
              onClick={onNewInvoice}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Buat Invoice</span>
              <span className="sm:hidden">Baru</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 text-xs font-semibold text-slate-600">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`py-1 px-2 rounded-lg flex items-center gap-1 ${currentTab === 'dashboard' ? 'text-indigo-600 font-bold bg-indigo-50' : ''}`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => onSelectTab('invoices')}
            className={`py-1 px-2 rounded-lg flex items-center gap-1 ${currentTab === 'invoices' ? 'text-indigo-600 font-bold bg-indigo-50' : ''}`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Invoices</span>
          </button>
          <button
            onClick={onOpenClients}
            className="py-1 px-2 rounded-lg flex items-center gap-1"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Klien</span>
          </button>
          <button
            onClick={onOpenProfile}
            className="py-1 px-2 rounded-lg flex items-center gap-1"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Profil</span>
          </button>
        </div>
      </div>
    </header>
  );
};
