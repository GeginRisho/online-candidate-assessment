'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Users,
  ShieldAlert,
  Activity,
  Upload,
  Plus,
  Award,
  CheckCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Check,
  X,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchExams, fetchAllCandidateSessionsAdmin, approveCandidate, rejectCandidate, startCandidateExam } from '@/services';

export default function AdminDashboardPage() {
  const { data: exams = [] } = useQuery({
    queryKey: ['admin-exams'],
    queryFn: fetchExams,
    refetchInterval: 15000,
    staleTime: 0,
  });

  const { data: sessions = [], dataUpdatedAt } = useQuery({
    queryKey: ['admin-candidate-sessions'],
    queryFn: fetchAllCandidateSessionsAdmin,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    staleTime: 0,           // Never serve cached — always fresh
  });

  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: approveCandidate,
    onSuccess: () => {
      toast.success('Candidate approved successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-candidate-sessions'] });
    },
    onError: (err: any) => {
      toast.error('Failed to approve candidate: ' + (err.response?.data?.message || err.message));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectCandidate,
    onSuccess: () => {
      toast.success('Candidate registration rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-candidate-sessions'] });
    },
    onError: (err: any) => {
      toast.error('Failed to reject candidate: ' + (err.response?.data?.message || err.message));
    },
  });

  const startExamMutation = useMutation({
    mutationFn: startCandidateExam,
    onSuccess: () => {
      toast.success('Exam started for candidate. They will be automatically redirected.');
      queryClient.invalidateQueries({ queryKey: ['admin-candidate-sessions'] });
    },
    onError: (err: any) => {
      toast.error('Failed to start candidate exam: ' + (err.response?.data?.message || err.message));
    },
  });

  const pendingSessions = sessions.filter((s: any) => s.candidate?.status === 'REGISTERED');
  const approvedSessions = sessions.filter((s: any) => s.candidate?.status === 'VERIFIED');

  const activeExamsCount = exams.filter((e) => e.status === 'ACTIVE').length;
  const runningSessions = sessions.filter((s: any) => s.status === 'IN_PROGRESS');
  const completedSessions = sessions.filter((s: any) => s.status === 'SUBMITTED' || s.status === 'AUTO_SUBMITTED');
  const notStartedSessions = sessions.filter((s: any) => s.status === 'NOT_STARTED');
  const totalWarnings = sessions.reduce((acc: number, s: any) => acc + (s.warningCount || 0), 0);

  // Use result.status for accurate pass rate
  const passedSessions = completedSessions.filter((s: any) => s.result?.status === 'PASS');
  const passPercent = completedSessions.length > 0 ? Math.round((passedSessions.length / completedSessions.length) * 100) : 0;

  // Average score from result data
  const avgScore = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((acc: number, s: any) => acc + (s.result?.percentage ?? 0), 0) / completedSessions.length)
    : 0;

  const kpis = [
    { label: 'Total Candidates', value: sessions.length, sub: `${activeExamsCount} active exam(s)`, icon: Users, color: 'text-blue-600', iconBg: 'bg-blue-50' },
    { label: 'Submitted', value: completedSessions.length, sub: `${passedSessions.length} passed`, icon: CheckCircle, color: 'text-emerald-600', iconBg: 'bg-emerald-50' },
    { label: 'In Progress', value: runningSessions.length, sub: `${notStartedSessions.length} not yet started`, icon: Clock, color: 'text-amber-600', iconBg: 'bg-amber-50' },
    { label: 'Pass Rate', value: `${passPercent}%`, sub: `Avg score: ${avgScore}%`, icon: Award, color: 'text-purple-600', iconBg: 'bg-purple-50' },
    { label: 'Integrity Warnings', value: totalWarnings, sub: 'Tab-switch & proctor alerts', icon: ShieldAlert, color: 'text-red-600', iconBg: 'bg-red-50' },
    { label: 'Avg Score', value: `${avgScore}%`, sub: `From ${completedSessions.length} submitted exams`, icon: TrendingUp, color: 'text-indigo-600', iconBg: 'bg-indigo-50' },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Welcome back. Live stats — auto-refreshes every 10 seconds.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="size-3.5 animate-spin" style={{ animationDuration: '3s' }} />
          <span>Updated {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'}</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label} className="shadow-sm border-border bg-white">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider truncate">{k.label}</p>
                  <p className={`text-2xl sm:text-3xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{k.sub}</p>
                </div>
                <div className={`size-10 rounded-lg ${k.iconBg} flex items-center justify-center shrink-0`}>
                  <k.icon className={`size-5 ${k.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status breakdown progress bars */}
      {sessions.length > 0 && (
        <Card className="shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Candidate Status Overview</CardTitle>
            <CardDescription>Distribution of all {sessions.length} candidates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Not Started', count: notStartedSessions.length, color: 'bg-slate-300' },
              { label: 'In Progress', count: runningSessions.length, color: 'bg-blue-500' },
              { label: 'Submitted', count: completedSessions.length, color: 'bg-emerald-500' },
            ].map((s) => (
              <div key={s.label} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-foreground">{s.label}</span>
                  <span className="text-muted-foreground">{s.count} / {sessions.length}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${s.color}`}
                    style={{ width: sessions.length > 0 ? `${(s.count / sessions.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Approvals console */}
        <Card className="lg:col-span-2 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-base">Candidate Approvals & Activation Console</CardTitle>
            <CardDescription>Review and manage candidate entry to assessment papers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pending approvals block */}
            <div>
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-3">
                Pending Approvals ({pendingSessions.length})
              </h3>
              {pendingSessions.length > 0 ? (
                <div className="space-y-3">
                  {pendingSessions.map((s: any) => (
                    <div
                      key={s.id}
                      className="p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                          {s.candidate?.fullName}
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                            Yr: {s.candidate?.yearOfStudy || 'N/A'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {s.candidate?.email} · {s.candidate?.collegeName} · {s.candidate?.degree} ({s.candidate?.branch})
                        </div>
                        <div className="text-[11px] text-blue-600 font-semibold mt-1">
                          Exam: {s.exam?.title}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg gap-1"
                          onClick={() => approveMutation.mutate(s.candidate.id)}
                          loading={approveMutation.isPending}
                        >
                          <Check className="size-3.5" />
                          <span>Approve</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-medium text-xs rounded-lg gap-1"
                          onClick={() => rejectMutation.mutate(s.candidate.id)}
                          loading={rejectMutation.isPending}
                        >
                          <X className="size-3.5" />
                          <span>Reject</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic p-4 text-center border border-dashed rounded-xl bg-slate-50/35">
                  No pending candidate approval requests.
                </p>
              )}
            </div>

            {/* Approved waiting to start list */}
            <div>
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-3">
                Approved Candidates Ready for Assessment ({approvedSessions.length})
              </h3>
              {approvedSessions.length > 0 ? (
                <div className="space-y-3">
                  {approvedSessions.map((s: any) => (
                    <div
                      key={s.id}
                      className="p-4 border border-emerald-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/10 hover:bg-emerald-50/20 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground text-sm">
                          {s.candidate?.fullName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {s.candidate?.email} · {s.candidate?.collegeName} · {s.candidate?.degree}
                        </div>
                        <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                          Exam: {s.exam?.title}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg gap-1 shrink-0"
                        onClick={() => startExamMutation.mutate(s.candidate.id)}
                        loading={startExamMutation.isPending}
                      >
                        <Play className="size-3.5 fill-current" />
                        <span>Launch Exam</span>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic p-4 text-center border border-dashed rounded-xl bg-slate-50/35">
                  No approved candidates awaiting exam launch.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right column: live proctor feed and quick links */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {[
                { href: '/admin/questions', icon: Upload, label: 'Question Bank' },
                { href: '/admin/exams', icon: Plus, label: 'Create Exam' },
                { href: '/admin/candidates', icon: Users, label: 'Candidate Roster' },
                { href: '/admin/live-proctoring', icon: Activity, label: 'Live Proctoring' },
              ].map((item) => (
                <Button key={item.href} variant="outline" className="h-11 justify-start gap-3 p-3 text-left w-full rounded-xl" asChild>
                  <Link href={item.href}>
                    <div className="size-6 bg-primary/10 rounded flex items-center justify-center text-primary shrink-0">
                      <item.icon className="size-3.5" />
                    </div>
                    <span className="font-semibold text-xs">{item.label}</span>
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Live Proctor Feed */}
          <Card className="shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base">Live Proctor Feed</CardTitle>
              <CardDescription>{runningSessions.length} active sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {runningSessions.length > 0 ? (
                runningSessions.slice(0, 4).map((s: any) => (
                  <div key={s.id} className="flex items-start gap-2.5 text-sm border-b border-border/50 pb-2.5 last:border-0 last:pb-0">
                    <span className="inline-flex size-2 mt-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{s.candidate?.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.exam?.title}</p>
                      {s.warningCount > 0 && (
                        <p className="text-xs text-amber-600 font-semibold">⚠ {s.warningCount} warning(s)</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-start gap-3 text-sm text-muted-foreground py-4">
                  <Activity className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">No active sessions</p>
                    <p className="text-xs mt-0.5">Sockets & heartbeat engine ready</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
