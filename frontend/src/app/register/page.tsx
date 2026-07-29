'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { UserPlus, ShieldAlert, Loader2 } from 'lucide-react';
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
import { candidateRegister, fetchExamByQrToken, getApiErrorMessage } from '@/services';
import { useAuth } from '@/components/providers/auth-provider';

// Student Registration Zod Schema
const studentSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name').max(120),
  email: z.string().email('Enter a valid email address'),
  phone: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, 'Enter a valid phone number')
    .min(1, 'Phone number is required'),
  collegeName: z.string().min(1, 'College name is required').max(200),
  degree: z.string().min(1, 'Degree is required').max(100),
  branch: z.string().min(1, 'Branch is required').max(100),
  graduationYear: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number({ required_error: 'Year of passing is required' }).int().min(1990, 'Year must be 1990 or later').max(2100, 'Year must be 2100 or earlier')
  ),
});

type StudentFormValues = z.infer<typeof studentSchema>;

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrRef = searchParams.get('ref') ?? undefined;
  const token = searchParams.get('token') ?? undefined;
  const examId = searchParams.get('examId') ?? undefined;

  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [examTitle, setExamTitle] = React.useState<string>('');
  const [loadingExam, setLoadingExam] = React.useState(true);

  // Load exam details dynamically via token or examId
  React.useEffect(() => {
    async function loadExam() {
      if (token) {
        try {
          const details = await fetchExamByQrToken(token);
          setExamTitle(details.title);
        } catch (err) {
          console.error(err);
          toast.error('Unable to fetch exam details for this token');
        }
      } else if (examId) {
        setExamTitle('Assessment Drive');
      }
      setLoadingExam(false);
    }
    loadExam();
  }, [token, examId]);

  // Auto redirect if Admin is already logged in
  React.useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user && user.userType === 'ADMIN') {
      router.replace('/admin/dashboard');
    }
  }, [isAuthenticated, user, isAuthLoading, router]);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      collegeName: '',
      degree: '',
      branch: '',
    },
  });

  async function onSubmit(values: StudentFormValues) {
    setIsSubmitting(true);
    try {
      const response = await candidateRegister({
        email: values.email,
        fullName: values.fullName,
        phone: values.phone,
        collegeName: values.collegeName,
        branch: values.branch,
        degree: values.degree,
        graduationYear: values.graduationYear,
        qrRef,
        examId,
        examToken: token,
      });

      toast.success('Registration successful!', {
        description: 'Waiting for administrator approval.',
      });

      router.push(`/exam/${response.sessionId}/waiting`);
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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[480px]">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Candidate Registration
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {loadingExam ? (
                <span className="inline-flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin" /> Loading assessment details...</span>
              ) : (
                examTitle ? `Registering for: ${examTitle}` : 'Fill in your details below to begin the assessment.'
              )}
            </p>
          </div>

          {/* Form Card */}
          <Card className="border-slate-100 shadow-lg rounded-2xl bg-white">
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-medium">Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Ananya Verma" className="border-slate-200 focus-visible:ring-blue-600 rounded-xl" {...field} />
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
                        <FormLabel className="text-slate-700 font-medium">Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="ananya@example.com" className="border-slate-200 focus-visible:ring-blue-600 rounded-xl" {...field} />
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
                        <FormLabel className="text-slate-700 font-medium">Mobile Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+91 98765 43210" className="border-slate-200 focus-visible:ring-blue-600 rounded-xl" {...field} />
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
                          <FormLabel className="text-slate-700 font-medium">College Name</FormLabel>
                          <FormControl>
                            <Input placeholder="BITS Pilani" className="border-slate-200 focus-visible:ring-blue-600 rounded-xl" {...field} />
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
                          <FormLabel className="text-slate-700 font-medium">Branch / Stream</FormLabel>
                          <FormControl>
                            <Input placeholder="Computer Science" className="border-slate-200 focus-visible:ring-blue-600 rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="degree"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 font-medium">Degree</FormLabel>
                          <FormControl>
                            <Input placeholder="B.Tech" className="border-slate-200 focus-visible:ring-blue-600 rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="graduationYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 font-medium">Year of Passing *</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="2026" className="border-slate-200 focus-visible:ring-blue-600 rounded-xl" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors mt-4 rounded-xl"
                    loading={isSubmitting}
                  >
                    <UserPlus className="size-4 mr-2" />
                    Register for Assessment
                  </Button>
                </form>
              </Form>
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
