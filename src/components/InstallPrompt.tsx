import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Don't show in iframe / preview
    try {
      if (window.self !== window.top) return;
    } catch { return; }
    if (window.location.hostname.includes('id-preview--') || window.location.hostname.includes('lovableproject.com')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border bg-card p-4 shadow-lg flex items-center gap-3">
      <Download className="h-6 w-6 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Install Credit Scorewala</p>
        <p className="text-xs text-muted-foreground">Add to home screen for quick access</p>
      </div>
      <Button size="sm" onClick={handleInstall}>Install</Button>
      <button onClick={() => setShowBanner(false)} className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
