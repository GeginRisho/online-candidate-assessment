'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

export default function CandidateDashboardRedirect() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
