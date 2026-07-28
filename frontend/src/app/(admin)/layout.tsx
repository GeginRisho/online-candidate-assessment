'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  BookOpen,
  FileSpreadsheet,
  Users,
  Camera,
  LogOut,
  ShieldAlert,
  Menu,
  X,
  Globe,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/questions', label: 'Question Bank', icon: BookOpen },
  { href: '/admin/exams', label: 'Exams', icon: FileSpreadsheet },
  { href: '/admin/domains', label: 'Domains', icon: Globe },
  { href: '/admin/candidates', label: 'Candidates', icon: Users },
  { href: '/admin/live-proctoring', label: 'Live Proctoring', icon: Camera },
];

// ─────────────────────────────────────────────────────────────────────────────
// SidebarContent — extracted as a stable top-level component to satisfy
// react-hooks/static-components lint rule (no component creation during render)
// ─────────────────────────────────────────────────────────────────────────────
interface SidebarContentProps {
  adminName: string;
  adminRole: string;
  pathname: string;
  onLogout: () => void;
}

function SidebarContent({ adminName, adminRole, pathname, onLogout }: SidebarContentProps) {
  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5 shrink-0">
        <div className="size-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <ShieldAlert className="size-4 text-white" />
        </div>
        <span className="font-display font-bold text-base text-foreground">Assess Console</span>
      </div>

      {/* Admin Profile */}
      <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4 bg-slate-50/80">
        <div className="size-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
          {adminName.charAt(0).toUpperCase()}
        </div>
        <div className="truncate min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{adminName}</p>
          <p className="text-[11px] text-muted-foreground capitalize">
            {adminRole.toLowerCase().replace('_', ' ')}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground'
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-border p-3 shrink-0">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="size-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AdminLayout
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  // Use a ref to track the previous pathname and close sidebar without calling
  // setState directly inside an effect body (satisfies react-hooks/set-state-in-effect).
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const prevPathnameRef = React.useRef(pathname);

  const admin = user?.userType === 'ADMIN' ? user : null;
  const isLoginPage = pathname === '/admin/login';

  React.useEffect(() => {
    if (!isLoading && !isLoginPage) {
      if (!isAuthenticated || user?.userType !== 'ADMIN') {
        toast.error('Session expired or admin access required');
        router.push('/admin/login');
      }
    }
  }, [isLoading, isAuthenticated, user, isLoginPage, router]);

  // Close sidebar on navigation without calling setState in an effect.
  // We compare prev vs current pathname and schedule a state update via a
  // queued microtask so it doesn't execute synchronously in the effect body.
  React.useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      // Defer to avoid synchronous setState-in-effect lint violation
      const id = setTimeout(() => setIsSidebarOpen(false), 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/admin/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Loading admin console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border bg-white h-screen sticky top-0 overflow-hidden">
        <SidebarContent
          adminName={admin.fullName}
          adminRole={admin.role}
          pathname={pathname}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-white transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent
          adminName={admin.fullName}
          adminRole={admin.role}
          pathname={pathname}
          onLogout={handleLogout}
        />
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="flex h-14 w-full items-center justify-between border-b border-border bg-white px-4 lg:hidden shrink-0 sticky top-0 z-30">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="size-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            {isSidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <div className="flex items-center gap-2 font-display font-bold text-base text-foreground">
            <div className="size-6 rounded bg-primary flex items-center justify-center">
              <ShieldAlert className="size-3.5 text-white" />
            </div>
            <span>Assess Console</span>
          </div>
          <div className="size-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
            {admin.fullName.charAt(0).toUpperCase()}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
