'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { fetchSessionDetails, getApiErrorMessage } from '@/services';
import { Loader2, CheckCircle2, ShieldAlert, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export default function CandidateWaitingPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [candidateName, setCandidateName] = React.useState('');
  const [candidateStatus, setCandidateStatus] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState('');

  React.useEffect(() => {
    let intervalId: NodeJS.Timeout;

    async function checkStatus() {
      try {
        const session = await fetchSessionDetails(sessionId);
        setCandidateName(session.candidate.fullName);
        setCandidateStatus(session.candidate.status);
        setLoading(false);

        if (session.candidate.status === 'IN_PROGRESS') {
          toast.success('Your assessment is ready! Directing to system check.');
          router.push(`/exam/${sessionId}/system-check`);
        } else if (session.candidate.status === 'DISQUALIFIED') {
          setErrorMsg('Your registration or session has been disqualified.');
        }
      } catch (err) {
        console.error('Error fetching session status:', err);
        setErrorMsg(getApiErrorMessage(err, 'Failed to fetch session details'));
        setLoading(false);
      }
    }

    // Initial check
    checkStatus();

    // Poll every 3 seconds
    intervalId = setInterval(checkStatus, 3000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [sessionId, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <Loader2 className="size-8 animate-spin text-blue-600" />
        <p className="mt-4 text-sm text-slate-500 font-medium">Entering waiting room...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/30">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-slate-900">
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-600">
              <ShieldAlert className="size-4 text-white" />
            </div>
            <span>AssessPlatform</span>
          </div>
          {candidateName && (
            <div className="text-xs text-slate-500 font-medium">
              Candidate: <span className="text-slate-800 font-semibold">{candidateName}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-[520px] space-y-6">
          <Card className="border-slate-100 shadow-xl rounded-2xl bg-white p-8">
            <CardContent className="flex flex-col items-center text-center space-y-6 p-0">
              {errorMsg ? (
                <>
                  <div className="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <AlertCircle className="size-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-display text-xl font-bold text-slate-900">Access Restricted</h2>
                    <p className="text-slate-500 text-sm leading-relaxed">{errorMsg}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex size-16 items-center justify-center rounded-full bg-green-50 text-green-600 animate-bounce">
                    <CheckCircle2 className="size-10" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                      Registration Completed!
                    </h2>
                    <p className="text-slate-600 text-sm leading-relaxed px-2">
                      Your registration has been completed successfully. Please wait for the administrator to start your assessment.
                    </p>
                  </div>

                  {/* Pulsing indicator */}
                  <div className="flex items-center justify-center gap-3 py-3 px-6 rounded-2xl bg-slate-50 border border-slate-100 w-full">
                    <div className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full size-2 bg-blue-500"></span>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {candidateStatus === 'VERIFIED' ? 'Approved • Waiting for Exam Start' : 'Awaiting Administrator Approval'}
                    </span>
                  </div>
                </>
              )}
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
