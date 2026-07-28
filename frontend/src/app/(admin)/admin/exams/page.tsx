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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchExams } from '@/services';
import { apiClient } from '@/services/apiClient';
import { toast } from 'sonner';

export default function ExamsPage() {
  const queryClient = useQueryClient();
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

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
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
