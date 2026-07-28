'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Users,
  Search,
  AlertTriangle,
  Clock,
  Ban,
  FileSpreadsheet,
  Eye,
  CheckCircle2,
  XCircle,
  MinusCircle,
  RefreshCw,
  Award,
  Calendar,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { fetchAllCandidateSessionsAdmin } from '@/services';
import { apiClient } from '@/services/apiClient';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    NOT_STARTED: 'bg-slate-100 text-slate-600 border border-slate-200',
    IN_PROGRESS: 'bg-blue-50 text-blue-700 border border-blue-200',
    SUBMITTED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    AUTO_SUBMITTED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    DISQUALIFIED: 'bg-red-50 text-red-700 border border-red-200',
    PAUSED: 'bg-amber-50 text-amber-700 border border-amber-200',
    EXPIRED: 'bg-red-50 text-red-700 border border-red-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${map[status] ?? 'bg-muted text-muted-foreground'}`}>
      {status === 'IN_PROGRESS' && <Clock className="size-3 animate-spin" />}
      {status.replace('_', ' ')}
    </span>
  );
}

function ScoreCell({ session }: { session: any }) {
  const isSubmitted = session.status === 'SUBMITTED' || session.status === 'AUTO_SUBMITTED';
  const result = session.result;

  if (!isSubmitted || !result) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const isPassed = result.status === 'PASS';
  return (
    <div className="text-xs">
      <div className="font-bold text-foreground">{result.totalScore ?? 0} / {result.totalMarks ?? 50}</div>
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-muted-foreground">{Math.round(result.percentage ?? 0)}%</span>
        <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {isPassed ? 'PASS' : 'FAIL'}
        </span>
      </div>
    </div>
  );
}

export default function CandidatesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [selectedSession, setSelectedSession] = React.useState<any>(null);

  const handleDownloadIndividual = async (sessionId: string, candidateName: string) => {
    try {
      toast.info(`Generating assessment report for ${candidateName}...`);
      const response = await apiClient.get(`/exam-sessions/${sessionId}/export`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${candidateName.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Individual report downloaded successfully!');
    } catch (err: any) {
      toast.error('Failed to export candidate report', {
        description: err.message || 'Please try again later.',
      });
    }
  };

  const handleExportAll = async () => {
    try {
      toast.info('Generating all candidate results export...');
      const response = await apiClient.get('/exam-sessions/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'all_candidate_results.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('All candidate results spreadsheet downloaded!');
    } catch (err: any) {
      toast.error('Failed to export all results', {
        description: err.message || 'Please try again later.',
      });
    }
  };

  const { data: sessions = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['admin-candidate-sessions'],
    queryFn: fetchAllCandidateSessionsAdmin,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    staleTime: 0,           // Always consider stale — don't serve cached results
  });

  const disqualifyMutation = useMutation({
    mutationFn: (sessionId: string) =>
      apiClient.post(`/exam-sessions/${sessionId}/disqualify`, { reason: 'Disqualified by Admin from Console' }),
    onSuccess: () => {
      toast.success('Candidate disqualified');
      queryClient.invalidateQueries({ queryKey: ['admin-candidate-sessions'] });
    },
    onError: () => {
      toast.error('Failed to disqualify candidate');
    },
  });

  const filteredSessions = sessions.filter((s: any) => {
    const c = s.candidate;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      c?.fullName?.toLowerCase().includes(q) ||
      c?.email?.toLowerCase().includes(q) ||
      c?.candidateCode?.toLowerCase().includes(q) ||
      c?.collegeName?.toLowerCase().includes(q) ||
      s.status?.toLowerCase().includes(q)
    );
  });

  const stats = React.useMemo(() => {
    const total = sessions.length;
    const completed = sessions.filter((s: any) => s.status === 'SUBMITTED' || s.status === 'AUTO_SUBMITTED').length;
    const active = sessions.filter((s: any) => s.status === 'IN_PROGRESS' || s.status === 'PAUSED').length;
    const disqualified = sessions.filter((s: any) => s.status === 'DISQUALIFIED' || s.result?.isDisqualified === true).length;
    return { total, completed, active, disqualified };
  }, [sessions]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Candidate Roster</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor candidate profiles, attempt statuses, and scores. Auto-refreshes every 10s.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <RefreshCw className="size-3.5" />
          <span>Updated {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Candidates', value: stats.total, color: 'text-foreground' },
          { label: 'Active Candidates', value: stats.active, color: 'text-blue-600' },
          { label: 'Completed Candidates', value: stats.completed, color: 'text-emerald-600' },
          { label: 'Disqualified Candidates', value: stats.disqualified, color: 'text-red-600' },
        ].map((s) => (
          <Card key={s.label} className="shadow-sm">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[11px] uppercase font-semibold text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Export Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by candidate name, code, status, college..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-white"
          />
        </div>
        <Button onClick={handleExportAll} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0">
          <FileSpreadsheet className="size-4" />
          <span>Export All Results</span>
        </Button>
      </div>

      {/* Table */}
      {filteredSessions.length === 0 ? (
        <Card className="border-dashed p-12 text-center flex flex-col items-center justify-center">
          <Users className="size-12 text-muted-foreground/40 mb-4" />
          <p className="font-semibold text-lg">No Candidates Found</p>
          <p className="text-sm text-muted-foreground mt-1">No records match your search.</p>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden sm:block rounded-xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-border text-xs uppercase font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">College / Degree</th>
                    <th className="px-4 py-3">Exam</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Warnings</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSessions.map((s: any) => {
                    const c = s.candidate;
                    const isSubmitted = s.status === 'SUBMITTED' || s.status === 'AUTO_SUBMITTED';
                    const isDisqualified = s.status === 'DISQUALIFIED';
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground text-sm">{c?.fullName}</div>
                          <div className="text-xs text-muted-foreground">{c?.email}</div>
                          <div className="text-[11px] text-muted-foreground/70">{c?.candidateCode}</div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="font-medium">{c?.collegeName}</div>
                          <div className="text-muted-foreground">{c?.degree} · {c?.branch} · Yr: {c?.yearOfStudy || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="flex items-center gap-1.5">
                            <FileSpreadsheet className="size-3.5 text-primary shrink-0" />
                            <span className="font-medium line-clamp-1">{s.exam?.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${s.warningCount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-muted-foreground'}`}>
                            <AlertTriangle className="size-3" />{s.warningCount}
                          </span>
                        </td>
                        <td className="px-4 py-3"><ScoreCell session={s} /></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => setSelectedSession(s)}>
                              <Eye className="size-3.5" /><span>Details</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleDownloadIndividual(s.id, c?.fullName)}
                            >
                              <FileSpreadsheet className="size-3.5" /><span>Download</span>
                            </Button>
                            {!isDisqualified && !isSubmitted && (
                              <Button
                                variant="ghost" size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1 text-xs h-8"
                                onClick={() => { if (confirm(`Disqualify ${c?.fullName}?`)) disqualifyMutation.mutate(s.id); }}
                              >
                                <Ban className="size-3.5" /><span>DQ</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List */}
          <div className="sm:hidden space-y-3">
            {filteredSessions.map((s: any) => {
              const c = s.candidate;
              const isSubmitted = s.status === 'SUBMITTED' || s.status === 'AUTO_SUBMITTED';
              const isDisqualified = s.status === 'DISQUALIFIED';
              return (
                <Card key={s.id} className="p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground">{c?.fullName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{c?.email}</div>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">College: </span>{c?.collegeName}</div>
                    <div><span className="text-muted-foreground">Warnings: </span><span className="font-bold text-amber-600">{s.warningCount}</span></div>
                    <div className="col-span-2"><ScoreCell session={s} /></div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs gap-1 h-8" onClick={() => setSelectedSession(s)}>
                      <Eye className="size-3.5" />Details
                    </Button>
                    {!isDisqualified && !isSubmitted && (
                      <Button
                        variant="ghost" size="sm"
                        className="text-red-500 hover:bg-red-50 gap-1 text-xs h-8"
                        onClick={() => { if (confirm(`Disqualify ${c?.fullName}?`)) disqualifyMutation.mutate(s.id); }}
                      >
                        <Ban className="size-3.5" />DQ
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Details Dialog */}
      <Dialog open={Boolean(selectedSession)} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="size-5 text-primary" />
                Candidate Assessment Report
              </DialogTitle>
              <DialogDescription>Full details for {selectedSession?.candidate?.fullName}</DialogDescription>
            </div>
            {selectedSession && (
              <Button
                variant="outline"
                size="sm"
                className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1 text-xs mr-4 shrink-0"
                onClick={() => handleDownloadIndividual(selectedSession.id, selectedSession.candidate?.fullName)}
              >
                <FileSpreadsheet className="size-4" />
                <span>Export Excel</span>
              </Button>
            )}
          </DialogHeader>

          {selectedSession && <CandidateDetailsContent session={selectedSession} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CandidateDetailsContent({ session }: { session: any }) {
  const c = session.candidate;
  const ex = session.exam;
  const result = session.result;
  const answers = session.answers || [];
  const warnings = session.warnings || [];
  const isSubmitted = session.status === 'SUBMITTED' || session.status === 'AUTO_SUBMITTED';

  const startedAt = session.startedAt ? new Date(session.startedAt) : null;
  const endedAt = session.endedAt ? new Date(session.endedAt) : null;
  const durationSec = result?.durationSec ?? (startedAt && endedAt ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000) : null);
  const durationStr = durationSec != null ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s` : '—';

  const totalQ = (ex?.aptitudeQuestionCount ?? 0) + (ex?.technicalQuestionCount ?? 0);
  const attempted = answers.length;
  const correct = result?.correctCount ?? 0;
  const incorrect = result?.incorrectCount ?? 0;
  const unanswered = result?.unansweredCount ?? (totalQ - attempted);
  const score = result?.totalScore ?? '—';
  const totalMarks = result?.totalMarks ?? totalQ;
  const percentage = result ? Math.round(result.percentage) : '—';
  const isPassed = result?.status === 'PASS';

  return (
    <div className="space-y-5 pt-1 text-sm">
      {/* Personal Info */}
      <div className="grid sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-border">
        <div className="space-y-1">
          <h4 className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Personal Information</h4>
          <p className="font-bold text-foreground text-base">{c?.fullName}</p>
          <p className="text-xs text-muted-foreground">{c?.email}</p>
          <p className="text-xs text-muted-foreground">Phone: {c?.phone || 'N/A'}</p>
          <p className="text-xs text-muted-foreground">College: {c?.collegeName}</p>
          <p className="text-xs text-muted-foreground">{c?.degree} — {c?.branch} · Year: {c?.yearOfStudy || 'N/A'} ({c?.graduationYear || 'N/A'})</p>
          <p className="text-xs text-muted-foreground font-mono">Code: {c?.candidateCode}</p>
        </div>
        <div className="space-y-1">
          <h4 className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Assessment Details</h4>
          <p className="font-semibold text-foreground">{ex?.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={session.status} />
            {isSubmitted && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {isPassed ? '✓ PASSED' : '✗ FAILED'}
              </span>
            )}
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><Calendar className="size-3" />Start: {startedAt ? startedAt.toLocaleString() : '—'}</div>
            <div className="flex items-center gap-1.5"><Calendar className="size-3" />End: {endedAt ? endedAt.toLocaleString() : '—'}</div>
            <div className="flex items-center gap-1.5"><Timer className="size-3" />Duration: {durationStr}</div>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: CheckCircle2, label: 'Score', value: `${score} / ${totalMarks}`, color: 'text-foreground', bg: 'bg-white' },
          { icon: Award, label: 'Percentage', value: typeof percentage === 'number' ? `${percentage}%` : '—', color: isPassed ? 'text-emerald-600' : 'text-red-600', bg: 'bg-white' },
          { icon: CheckCircle2, label: 'Correct', value: isSubmitted ? correct : '—', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: XCircle, label: 'Wrong', value: isSubmitted ? incorrect : '—', color: 'text-red-600', bg: 'bg-red-50' },
          { icon: MinusCircle, label: 'Unanswered', value: isSubmitted ? unanswered : '—', color: 'text-slate-600', bg: 'bg-slate-50' },
          { icon: Users, label: 'Attempted', value: attempted, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: AlertTriangle, label: 'Warnings', value: session.warningCount, color: session.warningCount > 0 ? 'text-amber-600' : 'text-slate-400', bg: session.warningCount > 0 ? 'bg-amber-50' : 'bg-slate-50' },
          { icon: Timer, label: 'Duration', value: durationStr, color: 'text-slate-600', bg: 'bg-white' },
        ].map((item) => (
          <div key={item.label} className={`${item.bg} rounded-lg border border-border p-3 text-xs`}>
            <div className="text-muted-foreground flex items-center gap-1 mb-1">
              <item.icon className="size-3" />{item.label}
            </div>
            <div className={`font-bold text-sm ${item.color}`}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Proctor Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Proctor Warnings ({warnings.length})</h4>
          <div className="space-y-1.5 max-h-28 overflow-y-auto">
            {warnings.map((w: any, i: number) => (
              <div key={w.id || i} className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="size-3.5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-amber-700">{w.type?.replace('_', ' ')}</span>
                  <span className="text-amber-600 ml-1">— {w.message}</span>
                  <span className="text-muted-foreground ml-1">({w.createdAt ? new Date(w.createdAt).toLocaleTimeString() : ''})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question-wise Answers */}
      <div className="space-y-2">
        <h4 className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
          Question-wise Answers ({answers.length} submitted)
        </h4>
        {answers.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No answers recorded for this session.</p>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {answers.map((ans: any, idx: number) => {
              const selected = Array.isArray(ans.selectedOptions) ? ans.selectedOptions.join(', ') : '—';
              const correct = ans.isCorrect;
              const marks = ans.marksAwarded;
              return (
                <div key={ans.id || idx} className={`flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg border ${correct === true ? 'bg-emerald-50 border-emerald-200' : correct === false ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-border'}`}>
                  <div className="flex items-center gap-2">
                    {correct === true ? <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" /> : correct === false ? <XCircle className="size-3.5 text-red-600 shrink-0" /> : <MinusCircle className="size-3.5 text-slate-400 shrink-0" />}
                    <span className="font-semibold text-foreground">Q{idx + 1}</span>
                    <span className="text-muted-foreground">Selected: <span className="font-bold text-foreground">{selected}</span></span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {marks !== undefined && marks !== null && (
                      <span className={`font-bold ${marks > 0 ? 'text-emerald-600' : marks < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {marks > 0 ? '+' : ''}{marks}
                      </span>
                    )}
                    <span className="font-mono text-muted-foreground">{ans.timeSpentSec || 0}s</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
