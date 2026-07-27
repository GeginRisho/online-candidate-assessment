'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, UserPlus, ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { candidateRegister, getApiErrorMessage } from '@/services';
import { useAuth } from '@/components/providers/auth-provider';

// Password Validation Schema
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[0-9]/, 'Include a number');

// Student Registration Zod Schema
const studentSchema = z
  .object({
    fullName: z.string().min(2, 'Enter your full name').max(120),
    email: z.string().email('Enter a valid email address'),
    phone: z
      .string()
      .regex(/^\+?[0-9]{7,15}$/, 'Enter a valid phone number')
      .optional()
      .or(z.literal('')),
    collegeName: z.string().max(200).optional().or(z.literal('')),
    branch: z.string().max(100).optional().or(z.literal('')),
    graduationYear: z.coerce.number().int().min(1990).max(2100).optional(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type StudentFormValues = z.infer<typeof studentSchema>;

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrRef = searchParams.get('ref') ?? undefined;

  const { setUser } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      collegeName: '',
      branch: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: StudentFormValues) {
    setIsSubmitting(true);
    try {
      const candidate = await candidateRegister({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        phone: values.phone || undefined,
        collegeName: values.collegeName || undefined,
        branch: values.branch || undefined,
        graduationYear: values.graduationYear || undefined,
        qrRef,
      });
      setUser({ ...candidate, userType: 'CANDIDATE' });
      toast.success('Registration successful!', {
        description: `Your candidate code is ${candidate.candidateCode}.`,
      });
      router.push('/candidate/dashboard');
    } catch (error) {
      toast.error('Registration failed', {
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

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
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[480px]">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
              Register as Student
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Fill in your details below to create your candidate profile.
            </p>
          </div>

          {/* Form Card */}
          <Card className="border-slate-100 shadow-sm rounded-xl">
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Ananya Verma" className="border-slate-200 focus-visible:ring-blue-600 rounded-lg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="ananya@example.com" className="border-slate-200 focus-visible:ring-blue-600 rounded-lg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+91 98765 43210" className="border-slate-200 focus-visible:ring-blue-600 rounded-lg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="collegeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700">College / University</FormLabel>
                          <FormControl>
                            <Input placeholder="BITS Pilani" className="border-slate-200 focus-visible:ring-blue-600 rounded-lg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="branch"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700">Department / Branch</FormLabel>
                          <FormControl>
                            <Input placeholder="Computer Science" className="border-slate-200 focus-visible:ring-blue-600 rounded-lg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="graduationYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Graduation Year</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="2026" className="border-slate-200 focus-visible:ring-blue-600 rounded-lg" {...field} value={field.value ?? ''} />
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
                        <FormLabel className="text-slate-700">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              className="pr-10 border-slate-200 focus-visible:ring-blue-600 rounded-lg"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? 'text' : 'password'}
                              className="pr-10 border-slate-200 focus-visible:ring-blue-600 rounded-lg"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors mt-2 rounded-lg"
                    loading={isSubmitting}
                  >
                    <UserPlus className="size-4 mr-2" />
                    Register as Student
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Footer Link */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:underline"
            >
              Sign in
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

export default function RegisterPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="size-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <RegisterContent />
    </React.Suspense>
  );
}
