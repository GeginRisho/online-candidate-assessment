'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchExams, fetchAllCandidateSessionsAdmin } from '@/services';

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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Quick actions */}
        <Card className="lg:col-span-2 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common admin shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              { href: '/admin/questions', icon: Upload, label: 'Question Bank', desc: 'Manage & import questions' },
              { href: '/admin/exams', icon: Plus, label: 'Create Exam', desc: 'Configure assessment drives' },
              { href: '/admin/candidates', icon: Users, label: 'Candidate Roster', desc: 'View all candidates & scores' },
              { href: '/admin/live-proctoring', icon: Activity, label: 'Live Proctoring', desc: 'Monitor active sessions' },
            ].map((item) => (
              <Button key={item.href} variant="outline" className="h-16 sm:h-20 justify-start gap-3 p-3 sm:p-4 text-left" asChild>
                <Link href={item.href}>
                  <div className="size-9 sm:size-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                    <item.icon className="size-4 sm:size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.desc}</p>
                  </div>
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
  );
}
