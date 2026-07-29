'use client';

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Activity,
  Camera,
  AlertTriangle,
  Clock,
  Ban,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { fetchAllCandidateSessionsAdmin } from '@/services';
import { apiClient } from '@/services/apiClient';

export default function LiveProctoringPage() {
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = React.useState(() => Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['admin-proctoring-sessions'],
    queryFn: fetchAllCandidateSessionsAdmin,
    refetchInterval: 5000, // Poll every 5 seconds for live status updates
  });

  const activeSessions = sessions.filter(
    (s: any) => s.status === 'IN_PROGRESS' || s.status === 'PAUSED'
  );
  const completedSessions = sessions.filter(
    (s: any) => s.status === 'SUBMITTED' || s.status === 'AUTO_SUBMITTED'
  );

  const handleExport = async () => {
    try {
      toast.info('Generating results export... Please wait.');
      const response = await apiClient.get('/exam-sessions/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'candidate_results.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Results spreadsheet downloaded successfully!');
    } catch (err: any) {
      toast.error('Failed to export candidate results', {
        description: err.message || 'Please try again later.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Live Proctoring Console</h1>
          <p className="text-muted-foreground mt-1">
            Real-time candidate session monitoring, integrity alerts, camera feeds, and instant intervention.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={handleExport} className="gap-2" variant="outline">
            Export Candidate Results
          </Button>
          <div className="flex items-center gap-2 font-mono text-xs bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            <Activity className="size-4 animate-pulse" />
            <span>Polling Live (5s)</span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
              Active Sessions Running
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{activeSessions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Candidates attempting exams right now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
              Completed Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{completedSessions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Exams submitted today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
              Total Candidates Registered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{sessions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Configured drive roster</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Proctoring Grid */}
      <div className="space-y-4">
        <h2 className="font-semibold text-xl">Active Proctor Streams ({activeSessions.length})</h2>

        {activeSessions.length === 0 ? (
          <Card className="border-dashed p-12 text-center flex flex-col items-center justify-center">
            <ShieldAlert className="size-12 text-muted-foreground/60 mb-4" />
            <CardTitle className="text-lg">No Active Candidate Sessions</CardTitle>
            <CardDescription className="max-w-xs mt-2">
              There are no candidates currently taking exams in real-time. When a candidate launches an assessment, their live feed will appear here.
            </CardDescription>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeSessions.map((s: any) => {
              const c = s.candidate;
              const isOnline = s.status === 'IN_PROGRESS' && s.lastHeartbeatAt && (currentTime - new Date(s.lastHeartbeatAt).getTime() < 30000);
              
              const totalDurationSec = (s.exam?.aptitudeDurationSec || 0) + (s.exam?.technicalDurationSec || 0);
              const elapsedSec = s.startedAt ? Math.floor((currentTime - new Date(s.startedAt).getTime()) / 1000) : 0;
              const timeRemainingSec = Math.max(0, totalDurationSec - elapsedSec);
              
              const formatTimeRemaining = (sec: number) => {
                if (sec <= 0) return 'Expired';
                const h = Math.floor(sec / 3600);
                const m = Math.floor((sec % 3600) / 60);
                const secs = sec % 60;
                return h > 0 ? `${h}h ${m}m` : `${m}m ${secs}s`;
              };

              return (
                <Card key={s.id} className="relative overflow-hidden border-border/80 flex flex-col justify-between">
                  <div>
                    {/* Simulated camera feed container */}
                    <div className="bg-slate-900 aspect-video relative flex items-center justify-center text-white">
                      <div className="text-center space-y-2">
                        <Camera className="size-8 text-slate-400 mx-auto animate-pulse" />
                        <p className="text-xs font-mono text-slate-300">
                          Camera Status: {s.webcamStatus || 'INACTIVE'}
                        </p>
                      </div>
                      <div className="absolute left-3 top-3 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-white animate-ping" />
                        <span>LIVE</span>
                      </div>
                      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                        <span
                          className={`size-2.5 rounded-full ${
                            isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                          }`}
                          title={isOnline ? 'Online' : 'Offline'}
                        />
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 text-white uppercase">
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="text-base font-semibold">{c?.fullName}</CardTitle>
                      <CardDescription className="text-xs">{c?.email} · {c?.collegeName}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Exam:</span>
                        <span className="font-semibold text-foreground truncate max-w-[160px]">{s.exam?.title}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Warnings:</span>
                        <span className="font-bold text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="size-3.5" />
                          {s.warningCount} / {s.exam?.maxWarnings || 3}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Time Remaining:</span>
                        <span className={`font-semibold ${timeRemainingSec < 300 ? 'text-red-500 animate-pulse' : 'text-foreground'}`}>
                          {formatTimeRemaining(timeRemainingSec)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Current Question:</span>
                        <span className="font-semibold text-foreground">
                          {s.currentQuestionNum ? `Question ${s.currentQuestionNum}` : '—'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Webcam Feed:</span>
                        <span className={`font-semibold ${s.webcamStatus === 'ACTIVE' ? 'text-emerald-600' : s.webcamStatus === 'DISCONNECTED' ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                          {s.webcamStatus || 'INACTIVE'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Microphone Status:</span>
                        <span className={`font-semibold ${s.microphoneStatus === 'ACTIVE' ? 'text-emerald-600' : s.microphoneStatus === 'MUTED' || s.microphoneStatus === 'DISCONNECTED' ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                          {s.microphoneStatus || 'INACTIVE'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Fullscreen Lock:</span>
                        <span className={`font-semibold ${s.fullscreenStatus === 'ACTIVE' ? 'text-emerald-600' : s.fullscreenStatus === 'EXITED' ? 'text-red-500' : 'text-slate-400'}`}>
                          {s.fullscreenStatus || 'INACTIVE'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Heartbeat:</span>
                        <span className="font-mono text-foreground">
                          {s.lastHeartbeatAt ? new Date(s.lastHeartbeatAt).toLocaleTimeString() : '—'}
                        </span>
                      </div>
                    </CardContent>
                  </div>

                  <div className="p-4 border-t border-border/40 flex items-center gap-2 bg-muted/20">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={async () => {
                        if (confirm(`Force submit exam for ${c?.fullName}?`)) {
                          try {
                            await apiClient.post(`/exam-sessions/${s.id}/force-submit`);
                            toast.success('Session force submitted');
                            queryClient.invalidateQueries({ queryKey: ['admin-proctoring-sessions'] });
                          } catch (err: any) {
                            toast.error('Failed to force submit: ' + (err.response?.data?.message || err.message));
                          }
                        }
                      }}
                    >
                      <Clock className="size-3.5 mr-1" />
                      Force Submit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={async () => {
                        if (confirm(`Disqualify candidate ${c?.fullName}?`)) {
                          try {
                            await apiClient.post(`/exam-sessions/${s.id}/disqualify`, { reason: 'Disqualified by proctor from live console' });
                            toast.success('Session disqualified');
                            queryClient.invalidateQueries({ queryKey: ['admin-proctoring-sessions'] });
                          } catch (err: any) {
                            toast.error('Failed to disqualify: ' + (err.response?.data?.message || err.message));
                          }
                        }
                      }}
                    >
                      <Ban className="size-3.5 mr-1" />
                      Disqualify
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
