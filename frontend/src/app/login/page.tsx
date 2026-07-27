'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn, ShieldAlert, Loader2 } from 'lucide-react';
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

  const handleForgotPassword = () => {
    toast.info('Password Reset', {
      description: 'Please contact your administrator to reset your password.',
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50">
      {/* Top Navbar */}
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-slate-900">
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-600">
              <ShieldAlert className="size-4 text-white" />
            </div>
            <span>AssessPlatform</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
              Sign in to AssessPlatform
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Enter your email and password to access your dashboard.
            </p>
          </div>

          {/* Form Card */}
          <Card className="border-slate-100 shadow-sm rounded-xl">
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Email Address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            className="border-slate-200 focus-visible:ring-blue-600 rounded-lg"
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
                          <FormLabel className="text-slate-700">Password</FormLabel>
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
                              className="pr-10 border-slate-200 focus-visible:ring-blue-600 rounded-lg"
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
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors mt-2 rounded-lg"
                    loading={isSubmitting}
                  >
                    <LogIn className="size-4 mr-2" />
                    Sign in
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Footer Link */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link
              href={examId ? `/register?examId=${examId}` : '/register'}
              className="font-medium text-blue-600 hover:underline"
            >
              Register
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-100 bg-white">
        &copy; {new Date().getFullYear()} AssessPlatform. All rights reserved.
      </footer>
    </div>
  );
}

export default function LoginPage() {
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
