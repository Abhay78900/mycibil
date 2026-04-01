import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, LogOut, LayoutDashboard, User, Menu } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export default function Header() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const mobileNav = (to: string) => {
    setMobileOpen(false);
    navigate(to);
  };

  return (
    <header className="px-4 py-4 md:px-8 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
      <nav className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
            <CreditCard className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground font-display">CreditCheck</span>
        </Link>
        
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          {user ? (
            <>
              <Button onClick={() => navigate('/dashboard')} variant="ghost" className="gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-full">
                    <User className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button onClick={() => navigate('/auth')} variant="ghost">
                Sign In
              </Button>
              <Button onClick={() => navigate('/check-score')} variant="hero" className="gap-2">
                Check Score
              </Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden flex items-center gap-1">
          <LanguageSwitcher />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 mt-6">
                {user ? (
                  <>
                    <div className="px-2 py-3 mb-2 border-b border-border">
                      <p className="font-medium text-sm">{profile?.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Button variant="ghost" className="justify-start gap-3" onClick={() => mobileNav('/dashboard')}>
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3" onClick={() => mobileNav('/check-score')}>
                      <CreditCard className="w-4 h-4" />
                      Check Score
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3 text-destructive" onClick={() => { setMobileOpen(false); handleSignOut(); }}>
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="justify-start" onClick={() => mobileNav('/auth')}>
                      Sign In
                    </Button>
                    <Button variant="hero" className="justify-start gap-2" onClick={() => mobileNav('/check-score')}>
                      <CreditCard className="w-4 h-4" />
                      Check Score
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
