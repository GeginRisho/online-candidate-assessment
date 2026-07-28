'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  LogIn,
  ShieldAlert,
  Loader2,
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
import { adminLogin, getApiErrorMessage } from '@/services';
import { useAuth } from '@/components/providers/auth-provider';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginContent() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading, setUser } = useAuth();
  
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);

  // Auto redirect if already authenticated as Admin
  React.useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user) {
      if (user.userType === 'ADMIN') {
        router.replace('/admin/dashboard');
      }
    }
  }, [isAuthenticated, user, isAuthLoading, router]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    try {
      const admin = await adminLogin(values);
      setUser({ ...admin, userType: 'ADMIN' });
      toast.success(`Welcome back, ${admin.fullName.split(' ')[0]}`);
      router.push('/admin/dashboard');
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
      description: 'Please contact your system administrator to reset your password.',
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/20">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-slate-900">
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-600">
              <ShieldAlert className="size-4 text-white" />
            </div>
            <span>AssessPlatform</span>
          </Link>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:py-16">
        <div className="w-full max-w-[400px] space-y-6">
          {/* Header Title & Description */}
          <div className="text-center space-y-3">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
              Admin Portal
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Sign in to manage candidate assessments, monitor active drives, and review results.
            </p>
          </div>

          {/* Login Card */}
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
                            placeholder="admin@example.com"
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
        </div>
      </main>

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
