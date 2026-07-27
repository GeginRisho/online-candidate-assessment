import Link from 'next/link';
import { AuthShell } from '@/components/layout/auth-shell';
import { CandidateRegisterForm } from '@/components/forms/candidate-register-form';

export const metadata = {
  title: 'Candidate registration',
};

interface RegisterPageProps {
  searchParams: Promise<{ ref?: string; examId?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { ref } = await searchParams;

  return (
    <AuthShell
      eyebrow="Candidate"
      title="Create your candidate account"
      description="You'll use this to sign in for every step of your assessment."
    >
      <CandidateRegisterForm qrRef={ref} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already registered?{' '}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
