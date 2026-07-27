'use client';

import * as React from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2, QrCode, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AuthShell } from '@/components/layout/auth-shell';
import { getQrRegistration, getApiErrorMessage } from '@/services';

function QrRegistrationContent() {
  const searchParams = useSearchParams();
  const examId = searchParams.get('examId') ?? undefined;

  const {
    data,
    isPending,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['qr-registration', examId ?? null],
    queryFn: () => getQrRegistration(examId),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });

  const isLoading = isPending || isRefetching;

  return (
    <AuthShell
      eyebrow="Walk-in registration"
      title="Scan to register"
      description="Point your phone's camera at the code below to start your candidate registration."
    >
      <Card>
        <CardContent className="flex flex-col items-center gap-5 pt-6">
          <div className="flex size-72 items-center justify-center rounded-lg border border-border bg-secondary/40">
            {isLoading && <Loader2 className="size-8 animate-spin text-muted-foreground" />}

            {!isLoading && error && (
              <div className="flex flex-col items-center gap-2 px-6 text-center">
                <QrCode className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {getApiErrorMessage(error, 'Could not generate a QR code right now.')}
                </p>
              </div>
            )}

            {!isLoading && !error && data && (
              <Image
                src={data.qrCodeDataUrl}
                alt="Scan this QR code to open the registration page"
                width={288}
                height={288}
                className="rounded-md"
                unoptimized
              />
            )}
          </div>

          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isLoading}>
            <RefreshCw className="size-3.5" />
            Generate new code
          </Button>

          {data && (
            <p className="max-w-xs text-center text-xs text-muted-foreground">
              Can&apos;t scan? Open{' '}
              <span className="break-all font-mono text-foreground">{data.registrationUrl}</span> on your
              phone instead.
            </p>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}

export default function QrRegistrationPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <QrRegistrationContent />
    </React.Suspense>
  );
}
