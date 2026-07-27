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
  Menu,
  X,
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
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
    const targetUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
    
    const timeoutId = setTimeout(() => {
      setAppUrl(targetUrl);
    }, 0);

    // QR Code encodes candidate registration URL
    const registrationUrl = `${targetUrl}/register`;

    QRCode.toDataURL(registrationUrl, {
      width: 160,
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
    link.download = 'assessplatform-register-qr.png';
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
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-600">
              <ShieldAlert className="size-4 text-white" />
            </div>
            <span className="text-slate-900 font-bold">AssessPlatform</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Login
            </Link>
            <Button
              asChild
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 font-medium px-4 rounded-lg shadow-sm"
            >
              <Link href="/register">Register</Link>
            </Button>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-all"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Mobile Nav Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-6 py-4 flex flex-col gap-4 shadow-sm">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 py-1"
              onClick={() => setMobileMenuOpen(false)}
            >
              Login
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 py-1"
              onClick={() => setMobileMenuOpen(false)}
            >
              Register
            </Link>
          </div>
        )}
      </header>

      {/* Hero & Card Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 md:py-24 max-w-5xl mx-auto w-full">
        <div className="grid gap-12 md:grid-cols-12 items-center w-full">
          
          {/* Left Column: Hero Text */}
          <div className="md:col-span-7 space-y-6 text-left max-w-xl">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.1]">
              Online Candidate Assessment Platform
            </h1>
            <p className="text-base sm:text-lg text-slate-500 leading-relaxed">
              Secure online examinations with live monitoring, automated evaluation and reporting.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Button
                asChild
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-5 rounded-lg shadow-sm transition-all text-center"
              >
                <Link href="/login">
                  Login
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-slate-200 text-slate-700 hover:bg-slate-50 font-medium px-6 py-5 rounded-lg transition-all text-center"
              >
                <Link href="/register">Register</Link>
              </Button>
            </div>
          </div>

          {/* Right Column: Quick Access Card */}
          <div className="md:col-span-5 flex justify-center md:justify-end w-full">
            <div className="w-full max-w-[360px]">
              <Card className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-xl rounded-2xl overflow-hidden card-shadow">
                <div className="bg-slate-50/50 border-b border-slate-100/50 px-6 py-4">
                  <h2 className="font-display text-sm font-semibold text-slate-800 tracking-tight text-center">
                    Quick Access
                  </h2>
                </div>
                <CardContent className="p-6 flex flex-col items-center space-y-5">
                  
                  {/* Link Container */}
                  <div className="w-full bg-white/80 rounded-lg p-2.5 border border-slate-100 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-mono text-slate-600 truncate break-all">
                      {appUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="p-1 rounded hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                      title="Copy link"
                    >
                      {isCopied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
                    </button>
                  </div>

                  {/* QR Code Container */}
                  <div className="flex size-40 items-center justify-center rounded-xl border border-slate-100/50 bg-white p-2.5 shadow-sm">
                    {isGenerating ? (
                      <Loader2 className="size-6 animate-spin text-slate-400" />
                    ) : (
                      qrUrl && (
                        <Image
                          src={qrUrl}
                          alt="AssessPlatform URL QR Code"
                          width={140}
                          height={140}
                          className="object-contain rounded-lg"
                          unoptimized
                        />
                      )
                    )}
                  </div>

                  <p className="text-[10px] text-slate-400 text-center max-w-[240px]">
                    Scan this QR code to open the candidate registration page instantly.
                  </p>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 w-full pt-1">
                    <Button
                      variant="outline"
                      onClick={handleCopyLink}
                      className="border-slate-200/80 text-slate-600 hover:bg-slate-50 text-[11px] px-1 h-8.5 rounded-lg transition-all"
                    >
                      <Copy className="size-3 mr-1" />
                      Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleOpenPlatform}
                      className="border-slate-200/80 text-slate-600 hover:bg-slate-50 text-[11px] px-1 h-8.5 rounded-lg transition-all"
                    >
                      <ExternalLink className="size-3 mr-1" />
                      Open
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownloadQr}
                      className="border-slate-200/80 text-slate-600 hover:bg-slate-50 text-[11px] px-1 h-8.5 rounded-lg transition-all"
                      disabled={!qrUrl}
                    >
                      <Download className="size-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-100 bg-white">
        &copy; {new Date().getFullYear()} AssessPlatform. All rights reserved.
      </footer>
    </div>
  );
}
