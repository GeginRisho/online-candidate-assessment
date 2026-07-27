import Link from 'next/link';
import { AuthShell } from '@/components/layout/auth-shell';
import { CandidateLoginForm } from '@/components/forms/candidate-login-form';

export const metadata = {
  title: 'Candidate Sign In',
};

export default function CandidateLoginPage() {
  return (
    <AuthShell
      eyebrow="Candidate"
      title="Sign in to your assessment"
      description="Enter your registered email and password to access your dashboard."
    >
      <CandidateLoginForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New candidate?{' '}
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
