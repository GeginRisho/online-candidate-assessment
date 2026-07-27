'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  LogOut,
  User,
  BookOpen,
  Play,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Camera,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchExams, fetchMySessions, startExamSession } from '@/services';

function CandidateDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoExamId = searchParams.get('examId');
  const queryClient = useQueryClient();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  React.useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.userType !== 'CANDIDATE')) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  const { data: exams = [], isLoading: isLoadingExams } = useQuery({
    queryKey: ['exams'],
    queryFn: fetchExams,
    enabled: isAuthenticated && user?.userType === 'CANDIDATE',
  });

  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ['my-sessions'],
    queryFn: fetchMySessions,
    enabled: isAuthenticated && user?.userType === 'CANDIDATE',
  });

  const startSessionMutation = useMutation({
    mutationFn: startExamSession,
    onSuccess: (session) => {
      toast.success('Exam session started!');
      router.push(`/exam/${session.id}/system-check`);
      queryClient.invalidateQueries({ queryKey: ['my-sessions'] });
    },
    onError: (error: any) => {
      toast.error('Failed to start exam', {
        description: error.response?.data?.message || 'Please try again later.',
      });
    },
  });

  React.useEffect(() => {
    if (
      autoExamId &&
      isAuthenticated &&
      user?.userType === 'CANDIDATE' &&
      exams.length > 0 &&
      !isLoadingExams &&
      !isLoadingSessions
    ) {
      const existingSession = sessions.find((s) => s.examId === autoExamId);
      if (existingSession) {
        const isCompleted = existingSession.status === 'SUBMITTED' || existingSession.status === 'AUTO_SUBMITTED';
        const isDisqualified = existingSession.status === 'DISQUALIFIED';
        if (!isCompleted && !isDisqualified) {
          router.replace(`/exam/${existingSession.id}/system-check`);
        }
      } else {
        startSessionMutation.mutate(autoExamId);
      }
    }
  }, [autoExamId, isAuthenticated, user, exams, sessions, isLoadingExams, isLoadingSessions, router, startSessionMutation]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  if (isLoading || isLoadingExams || isLoadingSessions || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const sessionMap = new Map(sessions.map((s) => [s.examId, s]));
  const candidate = user.userType === 'CANDIDATE' ? user : null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white shadow-sm">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-display text-base sm:text-lg font-semibold tracking-tight">
            <ShieldCheck className="size-5 text-primary" />
            <span>Candidate Hub</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <User className="size-4" />
              <span className="font-medium">{candidate?.fullName}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-sm">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container px-4 py-6 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Assessments List */}
          <div className="space-y-5 lg:col-span-2">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Available Assessments
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Select a card to start or resume your assessment.
              </p>
            </div>

            {exams.length === 0 ? (
              <Card className="border-dashed bg-white text-center p-10">
                <BookOpen className="size-10 text-muted-foreground/40 mx-auto mb-3" />
                <CardTitle className="text-base">No Assessments Scheduled</CardTitle>
                <CardDescription className="max-w-xs mx-auto mt-2 text-sm">
                  No active assessment drives are configured for your account yet.
                </CardDescription>
              </Card>
            ) : (
              <div className="space-y-4">
                {exams.map((exam) => {
                  const session = sessionMap.get(exam.id);
                  const isCompleted = session?.status === 'SUBMITTED' || session?.status === 'AUTO_SUBMITTED';
                  const isDisqualified = session?.status === 'DISQUALIFIED';
                  const isInProgress = session?.status === 'IN_PROGRESS';
                  const totalMinutes = Math.round((exam.aptitudeDurationSec + exam.technicalDurationSec) / 60);
                  const totalQ = exam.aptitudeQuestionCount + exam.technicalQuestionCount;

                  return (
                    <Card key={exam.id} className="relative bg-white shadow-sm border-border overflow-hidden">
                      {isCompleted && (
                        <div className="absolute right-0 top-0 bg-emerald-500 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-bl-lg">
                          Completed
                        </div>
                      )}
                      {isDisqualified && (
                        <div className="absolute right-0 top-0 bg-red-500 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-bl-lg">
                          Disqualified
                        </div>
                      )}

                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold leading-snug pr-20">{exam.title}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1 text-sm">
                          {exam.description || 'Complete this assessment to demonstrate your skills.'}
                        </CardDescription>
                      </CardHeader>

                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm text-muted-foreground mb-5">
                          <div className="flex items-center gap-2">
                            <Clock className="size-4 text-primary/70 shrink-0" />
                            <span>{totalMinutes} mins</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Layers className="size-4 text-primary/70 shrink-0" />
                            <span>{totalQ} questions</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Camera className="size-4 text-primary/70 shrink-0" />
                            <span>Proctored: {exam.requireCamera ? 'Yes' : 'No'}</span>
                          </div>
                        </div>

                        <div className="flex justify-end border-t border-border/50 pt-4">
                          {isCompleted ? (
                            <Button disabled className="gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50">
                              <CheckCircle className="size-4" />
                              Exam Submitted
                            </Button>
                          ) : isDisqualified ? (
                            <Button disabled variant="destructive" className="gap-2">
                              <AlertTriangle className="size-4" />
                              Session Disqualified
                            </Button>
                          ) : isInProgress ? (
                            <Button
                              onClick={() => router.push(`/exam/${session.id}/system-check`)}
                              className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                            >
                              <Play className="size-4 fill-current" />
                              Resume Assessment
                            </Button>
                          ) : (
                            <Button
                              onClick={() => startSessionMutation.mutate(exam.id)}
                              loading={startSessionMutation.isPending}
                              className="gap-2"
                            >
                              <Play className="size-4 fill-current" />
                              Start Assessment
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Profile Sidebar */}
          <div className="space-y-4">
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="size-4 text-primary" />
                  Your Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                  <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-base shrink-0">
                    {candidate?.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{candidate?.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{candidate?.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">College</p>
                    <p className="font-medium text-foreground truncate">{candidate?.collegeName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Branch</p>
                    <p className="font-medium text-foreground truncate">{candidate?.branch || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Degree</p>
                    <p className="font-medium text-foreground">{candidate?.degree || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Year</p>
                    <p className="font-medium text-foreground">{candidate?.graduationYear || '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Exam Rules */}
            <Card className="bg-amber-50 border-amber-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="size-4" />
                  Exam Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-amber-800 space-y-1.5 leading-relaxed">
                <p>1. <strong>Fullscreen is mandatory.</strong> Exiting logs a warning.</p>
                <p>2. <strong>Do not switch tabs</strong> or lose focus.</p>
                <p>3. <strong>Copy/Paste is disabled.</strong> Attempts are flagged.</p>
                <p>4. Keep your face clearly visible in the camera at all times.</p>
              </CardContent>
            </Card>

            {/* Academic Stats */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GraduationCap className="size-4 text-primary" />
                  Academic Info
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1 text-muted-foreground">
                <p>Institution: <span className="text-foreground font-medium">{candidate?.collegeName || 'N/A'}</span></p>
                <p>Programme: <span className="text-foreground font-medium">{candidate?.degree} — {candidate?.branch}</span></p>
                <p>Graduation: <span className="text-foreground font-medium">{candidate?.graduationYear || '—'}</span></p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CandidateDashboardPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="size-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <CandidateDashboardContent />
    </React.Suspense>
  );
}

