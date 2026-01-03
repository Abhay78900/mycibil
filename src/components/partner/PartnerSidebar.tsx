import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Wallet,
  LogOut,
  CreditCard,
  Plus,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PartnerSidebarProps {
  partner: any;
  onLogout: () => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/partner' },
  { icon: Plus, label: 'Generate Report', path: '/partner/generate' },
  { icon: Users, label: 'Clients', path: '/partner/clients' },
  { icon: FileText, label: 'Reports', path: '/partner/reports' },
  { icon: Wallet, label: 'Wallet', path: '/partner/wallet' },
];

export default function PartnerSidebar({ partner, onLogout }: PartnerSidebarProps) {
  const location = useLocation();

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-foreground truncate">{partner?.name || 'Partner'}</h1>
            <p className="text-xs text-muted-foreground">Partner Portal</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-border bg-accent/50">
        <p className="text-xs text-muted-foreground mb-1">Franchise ID</p>
        <p className="font-mono text-sm font-bold text-foreground">{partner?.franchise_id}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium",
                isActive 
                  ? "bg-secondary text-secondary-foreground" 
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="mb-4 p-3 bg-accent rounded-lg">
          <p className="text-xs text-muted-foreground">Wallet Balance</p>
          <p className="text-xl font-bold text-foreground">₹{Number(partner?.wallet_balance || 0).toLocaleString()}</p>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={onLogout}
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
