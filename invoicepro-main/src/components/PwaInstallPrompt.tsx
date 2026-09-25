import React, { useState, useEffect } from 'react';
import { Download, Wifi, WifiOff, Smartphone, X, CheckCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check if running in standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <>
      {/* Offline Alert Bar */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between text-center sticky top-0 z-50 shadow-md">
          <div className="flex items-center justify-center gap-2 mx-auto">
            <WifiOff className="w-4 h-4 animate-pulse" />
            <span>Mode Offline: Anda tetap dapat membuat & mengedit invoice. Perubahan akan disinkronkan ke Cloud secara otomatis saat internet terhubung kembali.</span>
          </div>
        </div>
      )}

      {/* Floating PWA Install Banner */}
      {deferredPrompt && !isInstalled && !isDismissed && (
        <div className="fixed bottom-6 right-6 z-40 max-w-sm bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl shrink-0">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-bold">Pasang Aplikasi InvoicePro</h4>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  Akses lebih cepat langsung dari layar utama perangkat Anda & tetap bisa digunakan saat offline.
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    onClick={handleInstallClick}
                    className="px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    Pasang Sekarang
                  </button>
                  <button
                    onClick={() => setIsDismissed(true)}
                    className="px-2.5 py-1.5 text-slate-400 hover:text-white text-xs transition-colors"
                  >
                    Nanti Saja
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsDismissed(true)}
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
