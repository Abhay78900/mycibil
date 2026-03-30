import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { CreditCard, ChevronRight, ChevronLeft } from 'lucide-react';
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
      {/* Desktop sidebar — collapsible with slide */}
      <div
        className="hidden lg:block shrink-0 transition-[width,opacity] duration-300 ease-in-out overflow-hidden"
        style={{ width: desktopCollapsed ? 0 : 256, opacity: desktopCollapsed ? 0 : 1 }}
      >
        <div className="w-64 min-w-[256px]">
          <AdminSidebar onLogout={handleLogout} />
        </div>
      </div>

      {/* Desktop collapse/expand button */}
      <button
        onClick={() => setDesktopCollapsed(!desktopCollapsed)}
        className={`hidden lg:flex fixed top-1/2 -translate-y-1/2 z-50
          h-10 rounded-r-full bg-card border border-l-0 border-border shadow-md
          items-center justify-center text-muted-foreground hover:text-foreground
          hover:bg-accent transition-all duration-300
          ${desktopCollapsed ? 'left-0 w-8 bg-primary text-primary-foreground hover:bg-primary/90 border-primary' : 'left-[248px] w-6'}`}
        aria-label={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {desktopCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Mobile floating toggle — only when sheet is closed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-50
            w-8 h-10 rounded-r-full bg-primary text-primary-foreground shadow-lg
            flex items-center justify-center
            hover:bg-primary/90 active:scale-95 hover:animate-floating"
          style={{ touchAction: 'manipulation' }}
          aria-label="Open sidebar"
        >
          <ChevronRight className="w-4 h-4" />
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
