import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { CreditCard, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar — collapsible */}
      <div className={`hidden lg:block transition-all duration-300 ${desktopCollapsed ? 'w-0 overflow-hidden' : 'w-auto'}`}>
        <AdminSidebar onLogout={handleLogout} />
      </div>

      {/* Floating toggle arrow — visible when sidebar is hidden */}
      <AnimatePresence>
        {(desktopCollapsed || true) && (
          <motion.button
            key="floating-toggle"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => {
              // On desktop: toggle collapsed state; on mobile: open sheet
              if (window.innerWidth >= 1024) {
                setDesktopCollapsed(false);
              } else {
                setOpen(true);
              }
            }}
            className={`fixed left-0 top-1/2 -translate-y-1/2 z-50 
              w-10 h-10 rounded-r-full bg-primary text-primary-foreground shadow-lg
              flex items-center justify-center
              transition-opacity duration-300
              ${desktopCollapsed ? 'lg:flex' : 'lg:hidden'}
              ${open ? 'hidden' : 'flex lg:hidden'}
              hover:bg-primary/90 active:scale-95
              animate-[floating_2s_ease-in-out_infinite]`}
            style={{ touchAction: 'manipulation' }}
            aria-label="Open sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Desktop collapse button — shown when sidebar is open */}
      {!desktopCollapsed && (
        <button
          onClick={() => setDesktopCollapsed(true)}
          className="hidden lg:flex fixed left-[248px] top-1/2 -translate-y-1/2 z-50
            w-6 h-12 rounded-r-lg bg-card border border-l-0 border-border
            items-center justify-center text-muted-foreground hover:text-foreground
            hover:bg-accent transition-colors shadow-sm"
          aria-label="Collapse sidebar"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
      )}

      {/* Mobile sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
          <div onClick={() => setOpen(false)}>
            <AdminSidebar onLogout={handleLogout} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Admin</span>
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
