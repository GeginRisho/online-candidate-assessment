'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  LogIn,
  ShieldAlert,
  Loader2,
  QrCode,
  Copy,
  ExternalLink,
  Check,
  Award,
  Users,
  LineChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { candidateLogin, adminLogin, getApiErrorMessage } from '@/services';
import { useAuth } from '@/components/providers/auth-provider';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get('examId');
  const { user, isAuthenticated, isLoading: isAuthLoading, setUser } = useAuth();
  
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [qrModalOpen, setQrModalOpen] = React.useState(false);
  const [qrCodeUrl, setQrCodeUrl] = React.useState('');
  const [isCopied, setIsCopied] = React.useState(false);

  // Derive target candidate registration URL
  const regUrl = React.useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
    const targetUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
    return examId ? `${targetUrl}/register?examId=${examId}` : `${targetUrl}/register`;
  }, [examId]);

  // Auto redirect if already authenticated
  React.useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user) {
      if (user.userType === 'ADMIN') {
        router.replace('/admin/dashboard');
      } else {
        const dest = examId ? `/candidate/dashboard?examId=${examId}` : '/candidate/dashboard';
        router.replace(dest);
      }
    }
  }, [isAuthenticated, user, isAuthLoading, examId, router]);

  // Generate QR Code dynamically
  React.useEffect(() => {
    QRCode.toDataURL(regUrl, {
      width: 200,
      margin: 1.5,
      color: {
        dark: '#1e293b', // slate-800
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error('Failed to generate QR Code:', err));
  }, [regUrl]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    try {
      // 1. Try Candidate login
      try {
        const candidate = await candidateLogin(values);
        setUser({ ...candidate, userType: 'CANDIDATE' });
        toast.success(`Welcome back, ${candidate.fullName.split(' ')[0]}`);
        const dest = examId ? `/candidate/dashboard?examId=${examId}` : '/candidate/dashboard';
        router.push(dest);
        return;
      } catch (candidateError: any) {
        if (candidateError.response?.status === 400 || candidateError.response?.status === 422) {
          throw candidateError;
        }

        // 2. Try Admin login
        const admin = await adminLogin(values);
        setUser({ ...admin, userType: 'ADMIN' });
        toast.success(`Welcome back, ${admin.fullName.split(' ')[0]}`);
        router.push('/admin/dashboard');
        return;
      }
    } catch (error) {
      toast.error('Sign-in failed', {
        description: getApiErrorMessage(error, 'Invalid email or password'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(regUrl);
      setIsCopied(true);
      toast.success('Registration link copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleOpenLink = () => {
    window.open(regUrl, '_blank');
  };

  const handleForgotPassword = () => {
    toast.info('Password Reset', {
      description: 'Please contact your administrator to reset your password.',
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header with minimal Top-Right Quick Access Actions */}
      <header className="border-b border-slate-100 bg-white sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-slate-900">
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-600">
              <ShieldAlert className="size-4 text-white" />
            </div>
            <span>AssessPlatform</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQrModalOpen(true)}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all shadow-sm"
              title="View Candidate QR Registration Code"
              aria-label="QR Code"
            >
              <QrCode className="size-4" />
            </button>
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all shadow-sm"
              title="Copy Candidate Registration Link"
              aria-label="Copy Link"
            >
              {isCopied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
            </button>
            <button
              onClick={handleOpenLink}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all shadow-sm"
              title="Open Candidate Registration Page"
              aria-label="Open Link"
            >
              <ExternalLink className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <div className="flex-1 grid md:grid-cols-12 max-w-7xl mx-auto w-full px-6 py-6 md:py-12 gap-8 md:gap-12 items-center">
        {/* Left Column: Geometric Illustration */}
        <div className="md:col-span-7 flex flex-col justify-center space-y-8 bg-slate-50/55 rounded-3xl p-8 lg:p-12 border border-slate-100 min-h-[400px] md:min-h-[500px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold uppercase tracking-wider">
              <Award className="size-3.5" />
              Assessments Redefined
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-[1.1]">
              Online Candidate Assessment Platform
            </h2>
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-lg">
              Secure online examinations with live monitoring and automated evaluation.
            </p>
          </div>

          {/* Geometric Accent Mockup / Graphics */}
          <div className="relative w-full aspect-[2/1] rounded-2xl bg-white border border-slate-200/60 p-4 shadow-sm overflow-hidden flex items-center justify-around gap-4">
            {/* Stats Badge */}
            <div className="flex flex-col items-center p-3 rounded-xl bg-blue-50/45 border border-blue-100/50 w-28 text-center shrink-0">
              <Users className="size-5 text-blue-600 mb-1" />
              <span className="text-xs font-bold text-slate-800">500+</span>
              <span className="text-[10px] text-slate-400">Candidates</span>
            </div>

            {/* AI Proctoring Mock */}
            <div className="flex flex-col items-center p-3 rounded-xl bg-emerald-50/45 border border-emerald-100/50 w-28 text-center shrink-0">
              <ShieldAlert className="size-5 text-emerald-600 mb-1" />
              <span className="text-xs font-bold text-slate-800">Active</span>
              <span className="text-[10px] text-slate-400">AI Proctoring</span>
            </div>

            {/* Performance Analysis Mock */}
            <div className="flex flex-col items-center p-3 rounded-xl bg-indigo-50/45 border border-indigo-100/50 w-28 text-center shrink-0">
              <LineChart className="size-5 text-indigo-600 mb-1" />
              <span className="text-xs font-bold text-slate-800">Automated</span>
              <span className="text-[10px] text-slate-400">Evaluation</span>
            </div>
          </div>
        </div>

        {/* Right Column: Unified Login Card */}
        <div className="md:col-span-5 flex justify-center w-full">
          <div className="w-full max-w-[380px] space-y-6">
            <div className="text-center md:text-left space-y-2">
              <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                Welcome to AssessPlatform
              </h3>
              <p className="text-slate-500 text-xs sm:text-sm">
                Enter your credentials to access your scheduled drive.
              </p>
            </div>

            <Card className="border-slate-100 shadow-lg rounded-2xl overflow-hidden bg-white">
              <CardContent className="p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 font-medium">Email Address</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="name@example.com"
                              autoComplete="email"
                              className="border-slate-200 focus-visible:ring-blue-600 rounded-xl"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-slate-700 font-medium">Password</FormLabel>
                            <button
                              type="button"
                              onClick={handleForgotPassword}
                              className="text-xs font-medium text-blue-600 hover:underline"
                            >
                              Forgot password?
                            </button>
                          </div>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                className="pr-10 border-slate-200 focus-visible:ring-blue-600 rounded-xl"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                              >
                                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center space-x-2 pt-1">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(!!checked)}
                        className="border-slate-300 text-blue-600 focus-visible:ring-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded"
                      />
                      <Label htmlFor="remember" className="text-xs font-normal text-slate-500 cursor-pointer">
                        Remember me for 30 days
                      </Label>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors mt-2 rounded-xl"
                      loading={isSubmitting}
                    >
                      <LogIn className="size-4 mr-2" />
                      Sign in
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <p className="text-center text-xs sm:text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <Link
                href={examId ? `/register?examId=${examId}` : '/register'}
                className="font-medium text-blue-600 hover:underline"
              >
                Register as Student
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* QR Code Popup Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-6 bg-white border border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-center font-display text-base font-semibold tracking-tight text-slate-800">
              Scan Registration Link
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 pt-2">
            <div className="flex size-44 items-center justify-center rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm shrink-0">
              {qrCodeUrl ? (
                <Image
                  src={qrCodeUrl}
                  alt="Candidate Registration QR"
                  width={150}
                  height={150}
                  className="object-contain rounded-lg"
                  unoptimized
                />
              ) : (
                <Loader2 className="size-6 animate-spin text-slate-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 text-center max-w-[260px]">
              Scan this QR code to access candidate registration.
            </p>
            <Button
              onClick={() => setQrModalOpen(false)}
              className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-xl"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-100 bg-white mt-auto">
        &copy; {new Date().getFullYear()} AssessPlatform. All rights reserved.
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="size-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <LoginContent />
    </React.Suspense>
  );
}
