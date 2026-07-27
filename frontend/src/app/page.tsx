'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import {
  ShieldAlert,
  ArrowRight,
  Copy,
  ExternalLink,
  Download,
  Loader2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function LandingPage() {
  const [qrUrl, setQrUrl] = React.useState<string>('');
  const [appUrl, setAppUrl] = React.useState<string>(() => {
    if (typeof window !== 'undefined') {
      return process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    }
    return process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com';
  });
  const [isCopied, setIsCopied] = React.useState<boolean>(false);
  const [isGenerating, setIsGenerating] = React.useState<boolean>(true);

  React.useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
    const targetUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
    
    // Defer state update to satisfy set-state-in-effect rule
    const timeoutId = setTimeout(() => {
      setAppUrl(targetUrl);
    }, 0);

    QRCode.toDataURL(targetUrl, {
      width: 200,
      margin: 1.5,
      color: {
        dark: '#1e293b', // slate-800
        light: '#ffffff',
      },
    })
      .then((url) => {
        setQrUrl(url);
        setIsGenerating(false);
      })
      .catch((err) => {
        console.error('Failed to generate QR Code:', err);
        setIsGenerating(false);
      });

    return () => clearTimeout(timeoutId);
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setIsCopied(true);
      toast.success('Platform link copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleDownloadQr = () => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = 'assessplatform-qr.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code downloaded successfully!');
  };

  const handleOpenPlatform = () => {
    window.open(appUrl, '_blank');
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 antialiased">
      {/* Navbar */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-600">
              <ShieldAlert className="size-4 text-white" />
            </div>
            <span className="text-slate-900 font-bold">AssessPlatform</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/login?role=student"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Student Login
            </Link>
            <Link
              href="/login?role=admin"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Admin Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-20 max-w-4xl mx-auto w-full">
        <div className="text-center space-y-6 max-w-2xl">
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.15]">
            Online Candidate Assessment Platform
          </h1>
          <p className="text-base sm:text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
            Secure online examinations with live monitoring, question bank, automated evaluation and reporting.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              asChild
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-5 rounded-lg shadow-sm transition-all"
            >
              <Link href="/login?role=student">
                Student Login
                <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-slate-200 text-slate-700 hover:bg-slate-50 font-medium px-6 py-5 rounded-lg transition-all"
            >
              <Link href="/login?role=admin">Admin Login</Link>
            </Button>
          </div>
        </div>

        {/* Access Card */}
        <div className="w-full max-w-md mt-16">
          <Card className="border-slate-100 shadow-lg rounded-2xl overflow-hidden bg-white">
            <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4">
              <h2 className="font-display text-sm font-semibold text-slate-800 tracking-tight text-center">
                Quick Access
              </h2>
            </div>
            <CardContent className="p-6 flex flex-col items-center space-y-6">
              {/* Platform URL display */}
              <div className="w-full bg-slate-50 rounded-lg p-3 border border-slate-100 flex items-center justify-between gap-4">
                <span className="text-xs font-mono text-slate-600 truncate break-all">
                  {appUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-1.5 rounded hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                  title="Copy link"
                >
                  {isCopied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
                </button>
              </div>

              {/* QR Code Container */}
              <div className="flex size-48 items-center justify-center rounded-xl border border-slate-100 bg-white p-2 shadow-inner">
                {isGenerating ? (
                  <Loader2 className="size-8 animate-spin text-slate-400" />
                ) : (
                  qrUrl && (
                    <Image
                      src={qrUrl}
                      alt="AssessPlatform URL QR Code"
                      width={180}
                      height={180}
                      className="object-contain rounded-lg"
                      unoptimized
                    />
                  )
                )}
              </div>

              <p className="text-xs text-slate-400 text-center max-w-[280px]">
                Scan this QR code to open the assessment platform instantly.
              </p>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 w-full pt-2">
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs px-2 h-9 rounded-lg transition-all"
                >
                  <Copy className="size-3.5 mr-1.5" />
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  onClick={handleOpenPlatform}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs px-2 h-9 rounded-lg transition-all"
                >
                  <ExternalLink className="size-3.5 mr-1.5" />
                  Open
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadQr}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs px-2 h-9 rounded-lg transition-all"
                  disabled={!qrUrl}
                >
                  <Download className="size-3.5 mr-1.5" />
                  Download
                </Button>
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
