export function SiteFooter() {
  return (
    <footer className="border-t border-border/80">
      <div className="container flex flex-col items-center justify-between gap-2 py-8 text-sm text-muted-foreground sm:flex-row">
        <p>&copy; {new Date().getFullYear()} AssessPlatform. Built for campus recruitment.</p>
        <p className="font-mono text-xs">v1.0.0</p>
      </div>
    </footer>
  );
}
