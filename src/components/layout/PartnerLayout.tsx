import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PartnerSidebar from '@/components/partner/PartnerSidebar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Building2, ChevronRight, ChevronLeft, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePartnerNotifications } from '@/hooks/usePartnerNotifications';

interface PartnerLayoutProps {
  children: React.ReactNode;
  partner: any;
}

export default function PartnerLayout({ children, partner }: PartnerLayoutProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = usePartnerNotifications(partner?.id || null);

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
          <PartnerSidebar partner={partner} onLogout={handleLogout} />
        </div>
      </div>

      {/* Desktop collapse/expand button */}
      <button
        onClick={() => setDesktopCollapsed(!desktopCollapsed)}
        className={`hidden lg:flex fixed top-1/2 -translate-y-1/2 z-50
          h-10 rounded-r-full bg-card border border-l-0 border-border shadow-md
          items-center justify-center text-muted-foreground hover:text-foreground
          hover:bg-accent transition-all duration-300
          ${desktopCollapsed ? 'left-0 w-8 bg-secondary text-secondary-foreground hover:bg-secondary/90 border-secondary' : 'left-[248px] w-6'}`}
        aria-label={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {desktopCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Mobile floating toggle — only when sheet is closed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-50
            w-8 h-10 rounded-r-full bg-secondary text-secondary-foreground shadow-lg
            flex items-center justify-center
            hover:bg-secondary/90 active:scale-95 hover:animate-floating"
          style={{ touchAction: 'manipulation' }}
          aria-label="Open sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Mobile sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SheetTitle className="sr-only">Partner Navigation</SheetTitle>
          <div onClick={() => setOpen(false)}>
            <PartnerSidebar partner={partner} onLogout={handleLogout} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-secondary-foreground" />
            </div>
            <span className="font-bold text-foreground truncate">{partner?.name || 'Partner'}</span>
          </div>
          <div className="hidden lg:block" />
          {/* Notification Bell */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive rounded-full text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="p-3 border-b flex items-center justify-between">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllAsRead}>
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No new notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-3 border-b last:border-b-0 hover:bg-accent/50 transition-colors">
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span>
                        <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => markAsRead(n.id)}>
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
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
