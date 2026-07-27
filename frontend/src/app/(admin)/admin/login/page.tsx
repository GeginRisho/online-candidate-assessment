import { AuthShell } from '@/components/layout/auth-shell';
import { AdminLoginForm } from '@/components/forms/admin-login-form';

export const metadata = {
  title: 'Admin login',
};

export default function AdminLoginPage() {
  return (
    <AuthShell
      eyebrow="Admin console"
      title="Sign in to manage assessments"
      description="For recruiters, proctors, and administrators only."
    >
      <AdminLoginForm />
    </AuthShell>
  );
}
