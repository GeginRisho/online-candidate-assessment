import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

interface AuthShellProps {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}

export function AuthShell({ children, eyebrow, title, description }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top Nav */}
      <header className="border-b border-border bg-white shadow-sm">
        <div className="container flex h-14 items-center px-4">
          <Link href="/" className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-foreground">
            <div className="size-7 rounded-lg bg-primary flex items-center justify-center">
              <ShieldCheck className="size-4 text-white" aria-hidden="true" />
            </div>
            AssessPlatform
          </Link>
        </div>
      </header>

      {/* Center content */}
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="mb-6 text-center">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
              {eyebrow}
            </span>
            <h1 className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border bg-white">
        &copy; {new Date().getFullYear()} AssessPlatform. All rights reserved.
      </footer>
    </div>
  );
}
