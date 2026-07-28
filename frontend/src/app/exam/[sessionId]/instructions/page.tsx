'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  FileText,
  Clock,
  AlertTriangle,
  Play,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { fetchSessionDetails } from '@/services';

export default function ExamInstructionsPage() {
  const router = useRouter();
  const { sessionId } = useParams() as { sessionId: string };
  const [pledgeChecked, setPledgeChecked] = React.useState(false);

  // Fetch session details
  const { data: session, isLoading, error, isError } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => fetchSessionDetails(sessionId),
    retry: false,
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const channelName = `exam_session_channel_${sessionId}`;
    const bc = new BroadcastChannel(channelName);

    bc.postMessage({ type: 'CHECK_DUPLICATE' });

    bc.onmessage = (event) => {
      if (event.data?.type === 'CHECK_DUPLICATE') {
        bc.postMessage({ type: 'DUPLICATE_RESPONSE' });
      } else if (event.data?.type === 'DUPLICATE_RESPONSE') {
        toast.error('Multiple Tabs Detected', {
          description: 'This exam session is already open in another tab.',
        });
        router.replace('/dashboard');
      }
    };

    return () => {
      bc.close();
    };
  }, [sessionId, router]);

  const handleStartExam = () => {
    if (!pledgeChecked) {
      toast.error('You must agree to the integrity pledge to proceed.');
      return;
    }

    // Verify browser is in fullscreen before moving to exam
    const isFullscreen = document.fullscreenElement !== null;
    if (!isFullscreen) {
      toast.error('Fullscreen mode is required. Enter fullscreen to begin.');
      // Attempt to trigger fullscreen
      document.documentElement.requestFullscreen().then(() => {
        router.push(`/exam/${sessionId}`);
      }).catch(() => {
        router.push(`/exam/${sessionId}`);
      });
    } else {
      router.push(`/exam/${sessionId}`);
    }
  };

  if (isError) {
    const errorMsg = (error as any)?.response?.data?.message || error?.message || 'Failed to load session details.';
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 items-center justify-center p-6 md:p-8">
        <Card className="max-w-md w-full border-border/80 shadow-lg text-center p-8 space-y-6 bg-white">
          <div className="size-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <XCircle className="size-8" />
          </div>
          <CardTitle className="text-xl font-bold font-display text-destructive">Assessment Error</CardTitle>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {errorMsg.includes('contact') || errorMsg.includes('not available') || errorMsg.includes('active')
              ? 'Assessment is not available. Please contact the administrator.'
              : errorMsg}
          </p>
          <Button onClick={() => router.push('/dashboard')} className="w-full">
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/10">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const exam = session.exam;
  if (!exam) return null;

  return (
    <div className="flex min-h-screen flex-col bg-secondary/10 items-center justify-center p-6 md:p-8">
      <Card className="max-w-2xl w-full border-border/80 shadow-lg">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <CardTitle className="text-2xl font-bold font-display">{exam.title}</CardTitle>
              <CardDescription>General rules and instructions for this assessment.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Duration info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 border rounded-lg p-4 bg-muted/10">
              <Clock className="size-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Exam Duration</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Aptitude: <strong>{Math.round(exam.aptitudeDurationSec / 60)} mins</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  Technical: <strong>{Math.round(exam.technicalDurationSec / 60)} mins</strong>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 border rounded-lg p-4 bg-muted/10">
              <FileText className="size-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Question Composition</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Aptitude count: <strong>{exam.aptitudeQuestionCount}</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  Technical count: <strong>{exam.technicalQuestionCount}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Rules */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base font-display flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Proctoring Rules & Policy
            </h3>
            <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-5 leading-relaxed">
              <li>
                <strong>Automatic Disqualification:</strong> If you exceed {exam.maxWarnings} integrity violations (including tab-switching, exiting fullscreen, minimizing browser window, copy/paste shortcuts, right-clicking), you will be disqualified automatically.
              </li>
              <li>
                <strong>Socket Connection Alert:</strong> The exam is synced live to the proctoring panel. Proctors can see when you disconnect, switch windows, or receive warnings, and have powers to force-submit or disqualify.
              </li>
              <li>
                <strong>Auto-Save answer system:</strong> Answers are auto-saved in the background row-by-row. If your browser crashes or network drops, reconnecting will resume from your exact state.
              </li>
              <li>
                <strong>Strict Timer submit:</strong> When time runs out, the exam will auto-submit answers and grading will happen instantly.
              </li>
            </ul>
          </div>

          {/* Integrity Pledge */}
          <div className="border border-border/80 rounded-lg p-4 bg-primary/5 flex items-start gap-3">
            <div className="pt-0.5">
              <Checkbox
                id="pledge"
                checked={pledgeChecked}
                onCheckedChange={(checked) => setPledgeChecked(checked === true)}
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="pledge"
                className="text-sm font-semibold leading-none cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                Integrity & Honor Code Pledge
              </label>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                I hereby declare that I will attempt this assessment independently. I will not seek external help, utilize unauthorized tabs, reference notes, or attempt to circumvent proctoring filters.
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="border-t border-border/50 pt-4 flex gap-4">
          <Button variant="outline" className="flex-1" onClick={() => router.push('/dashboard')}>
            Cancel
          </Button>
          <Button disabled={!pledgeChecked} onClick={handleStartExam} className="flex-1 gap-2">
            <Play className="size-4 fill-current" />
            <span>Launch Exam Paper</span>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
