'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Clock,
  Layers,
  Camera,
  CheckCircle,
  Plus,
  ShieldCheck,
  QrCode,
  Copy,
  Share2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { fetchExams, regenerateExamQrToken } from '@/services';
import { apiClient } from '@/services/apiClient';
import { toast } from 'sonner';

export default function ExamsPage() {
  const queryClient = useQueryClient();
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [selectedExamForQr, setSelectedExamForQr] = React.useState<any>(null);
  const [regenerating, setRegenerating] = React.useState(false);

  const { data: exams = [], isLoading, error, isError } = useQuery({
    queryKey: ['admin-exams'],
    queryFn: fetchExams,
    staleTime: 0,
  });

  const toggleActivationMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      setTogglingId(id);
      const { data } = await apiClient.put(`/exams/${id}`, { isActive });
      return data;
    },
    onSuccess: () => {
      toast.success('Exam status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] });
    },
    onError: (error: any) => {
      toast.error('Failed to update status', {
        description: error.response?.data?.message || error.message || 'Please try again.',
      });
    },
    onSettled: () => {
      setTogglingId(null);
    },
  });

  const handleRegenerateQr = async (examId: string) => {
    setRegenerating(true);
    try {
      const updated = await regenerateExamQrToken(examId);
      toast.success('QR Code and Public Link generated successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] });
      if (selectedExamForQr && selectedExamForQr.id === examId) {
        setSelectedExamForQr(updated);
      }
    } catch (err: any) {
      toast.error('Failed to generate QR token');
    } finally {
      setRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 border border-destructive/20 bg-destructive/10 text-destructive rounded-lg space-y-2">
        <h3 className="font-bold">Failed to load exams</h3>
        <p className="text-sm">{(error as any)?.response?.data?.message || error?.message || 'Unknown error occurred'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Assessment Drives & Exams</h1>
          <p className="text-muted-foreground mt-1">
            Manage assessment drives, configure question rounds, and set proctoring parameters.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="size-4" />
          <span>Create New Exam</span>
        </Button>
      </div>

      {exams.length === 0 ? (
        <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center">
          <FileText className="size-12 text-muted-foreground/60 mb-4" />
          <CardTitle className="text-lg">No Exams Created</CardTitle>
          <CardDescription className="max-w-xs mt-2">
            Get started by creating your first assessment drive.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => {
            const totalDurationMins = Math.round(
              ((exam.aptitudeDurationSec || 0) + (exam.technicalDurationSec || 0)) / 60
            );
            const totalQuestions =
              (exam.aptitudeQuestionCount || 0) + (exam.technicalQuestionCount || 0);

            return (
              <Card key={exam.id} className="relative overflow-hidden border-border/80 flex flex-col justify-between">
                <div>
                  <div className="absolute right-3 top-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        exam.isActive
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-600 border border-red-500/20'
                      }`}
                    >
                      {exam.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <CardHeader className="pb-3 pr-24">
                    <CardTitle className="text-lg font-semibold leading-snug">{exam.title}</CardTitle>
                    <CardDescription className="line-clamp-2 text-xs mt-1">
                      {exam.description || 'Standard drive assessment.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-primary shrink-0" />
                      <span>Duration: {totalDurationMins} minutes</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Layers className="size-4 text-primary shrink-0" />
                      <span>
                        Questions: {totalQuestions} ({exam.aptitudeQuestionCount} Apt + {exam.technicalQuestionCount} Tech)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Camera className="size-4 text-primary shrink-0" />
                      <span>AI Camera Proctoring: {exam.requireCamera ? 'Enabled' : 'Disabled'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-primary shrink-0" />
                      <span>Max Warnings: {exam.maxWarnings}</span>
                    </div>
                  </CardContent>
                </div>

                <div className="p-6 pt-0 border-t border-border/40 mt-4 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="size-3.5" />
                    Passing: {exam.passingScorePercent}%
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={exam.isActive ? 'destructive' : 'default'}
                      size="sm"
                      disabled={toggleActivationMutation.isPending && togglingId === exam.id}
                      onClick={() => toggleActivationMutation.mutate({ id: exam.id, isActive: !exam.isActive })}
                    >
                      {exam.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (exam.qrToken) {
                          setSelectedExamForQr(exam);
                        } else {
                          handleRegenerateQr(exam.id);
                        }
                      }}
                      className="gap-1 text-xs"
                    >
                      <QrCode className="size-3.5" />
                      <span>{exam.qrToken ? 'QR Code' : 'Gen Link'}</span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* QR Code and Share Dialog */}
      <Dialog open={Boolean(selectedExamForQr)} onOpenChange={(open) => !open && setSelectedExamForQr(null)}>
        <DialogContent className="max-w-md w-[90vw] rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <QrCode className="size-5 text-blue-600" />
              Public Link & QR Access
            </DialogTitle>
            <DialogDescription>
              Share this access portal with candidates. No registration login required.
            </DialogDescription>
          </DialogHeader>

          {selectedExamForQr && (
            <div className="flex flex-col items-center space-y-6 pt-4">
              {/* QR Image */}
              <div className="size-52 bg-slate-100 border border-slate-200 rounded-2xl p-3 flex items-center justify-center relative group">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    `${typeof window !== 'undefined' ? window.location.origin : ''}/register?token=${selectedExamForQr.qrToken}`
                  )}`}
                  alt="Exam QR Code"
                  className="size-full object-contain"
                />
              </div>

              {/* Public Link details */}
              <div className="w-full space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Public Exam Link
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/register?token=${selectedExamForQr.qrToken}`}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 focus:outline-none"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 h-9 rounded-xl px-3 border-slate-200 text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      const link = `${window.location.origin}/register?token=${selectedExamForQr.qrToken}`;
                      navigator.clipboard.writeText(link);
                      toast.success('Link copied to clipboard!');
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Sharing / Regenerating buttons */}
              <div className="w-full flex gap-3 pt-2">
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl gap-2 text-xs py-5"
                  onClick={async () => {
                    const link = `${window.location.origin}/register?token=${selectedExamForQr.qrToken}`;
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: selectedExamForQr.title,
                          text: `Join the assessment drive: ${selectedExamForQr.title}`,
                          url: link,
                        });
                        toast.success('Shared successfully!');
                      } catch {}
                    } else {
                      navigator.clipboard.writeText(link);
                      toast.success('Link copied (Web Share API not supported on this browser)');
                    }
                  }}
                >
                  <Share2 className="size-4" />
                  Share Public Link
                </Button>

                <Button
                  variant="outline"
                  className="border-slate-200 text-slate-700 hover:bg-slate-50 font-medium rounded-xl gap-2 text-xs py-5"
                  disabled={regenerating}
                  onClick={() => handleRegenerateQr(selectedExamForQr.id)}
                >
                  <RefreshCw className={`size-4 ${regenerating ? 'animate-spin' : ''}`} />
                  Regenerate QR
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
