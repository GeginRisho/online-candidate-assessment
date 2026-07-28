'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

export default function ThankYouPage() {
  React.useEffect(() => {
    // Exit fullscreen if still active
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50">
      {/* Top Navbar */}
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-slate-900">
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-600">
              <ShieldAlert className="size-4 text-white" />
            </div>
            <span>AssessPlatform</span>
          </div>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[480px]">
          <Card className="border-slate-100 shadow-xl rounded-2xl bg-white p-8">
            <CardContent className="flex flex-col items-center text-center space-y-6 p-0">
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="size-10" />
              </div>
              <div className="space-y-3">
                <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                  Assessment Completed
                </h1>
                <p className="text-slate-600 text-sm font-medium leading-relaxed px-4">
                  Your assessment has been submitted successfully. Thank you for attending.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-100 bg-white">
        &copy; {new Date().getFullYear()} AssessPlatform. All rights reserved.
      </footer>
    </div>
  );
}
