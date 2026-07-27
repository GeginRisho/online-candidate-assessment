import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white shadow-sm">
      <div className="container flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-foreground">
          <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
            <ShieldCheck className="size-4 text-white" aria-hidden="true" />
          </div>
          AssessPlatform
        </Link>

        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Candidate Login</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/login">Admin Login</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
