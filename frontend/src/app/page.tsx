import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Cpu,
  QrCode,
  ScanFace,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { LiveSessionMonitor } from '@/components/marketing/live-session-monitor';

const journey = [
  {
    step: '01',
    title: 'Register',
    description: 'Candidates sign up directly or scan a QR code at a recruitment drive to start instantly.',
  },
  {
    step: '02',
    title: 'System check',
    description: 'Camera, microphone, and fullscreen access are verified before the clock ever starts.',
  },
  {
    step: '03',
    title: 'Take the test',
    description: 'Timed aptitude and technical rounds, auto-saved answer by answer, proctored throughout.',
  },
  {
    step: '04',
    title: 'Get the result',
    description: 'Scores, duration, and integrity status are ready the moment the session ends.',
  },
];

const features = [
  {
    icon: ShieldCheck,
    title: 'Real proctoring, not a checkbox',
    description:
      'Tab switches, blur events, fullscreen exits, copy/paste, and right-click are all detected and counted toward auto-disqualification thresholds you control.',
  },
  {
    icon: Cpu,
    title: 'Aptitude and technical question banks',
    description:
      'Tag questions by domain and difficulty, import from JSON or Excel, and let each exam draw a shuffled set automatically.',
  },
  {
    icon: BarChart3,
    title: 'Reporting that recruiters trust',
    description:
      'Start and end time, duration, warning count, and score for every candidate — exportable to Excel or PDF.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="container grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Timer className="size-3.5" />
                Built for high-stakes campus recruitment
              </span>

              <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
                Assessments that hold up to scrutiny.
              </h1>

              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Run aptitude and technical rounds at scale with live proctoring, auto-save,
                auto-submit, and reporting your hiring panel can act on the same day.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild>
                  <Link href="/register">
                    Register as a candidate
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/register/qr">
                    <QrCode className="size-4" />
                    Scan to register
                  </Link>
                </Button>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Recruiting or proctoring an exam?{' '}
                <Link href="/admin/login" className="font-medium text-primary underline-offset-4 hover:underline">
                  Sign in to the admin console
                </Link>
              </p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <LiveSessionMonitor />
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-secondary/30">
          <div className="container py-20">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              From registration to result, in four steps
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {journey.map((item) => (
                <div key={item.step} className="relative rounded-lg border border-border bg-card p-5">
                  <span className="font-mono text-sm font-medium text-primary">{item.step}</span>
                  <h3 className="mt-3 font-display text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container py-20">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Everything a hiring team needs, none of what it doesn&apos;t
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <Card key={title}>
                <CardContent className="pt-6">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-accent">
                    <Icon className="size-5 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription className="mt-2 leading-relaxed">{description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-secondary/30">
          <div className="container flex flex-col items-center gap-4 py-16 text-center">
            <ScanFace className="size-8 text-primary" />
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Ready to run your next assessment drive?
            </h2>
            <p className="max-w-md text-muted-foreground">
              Set up your exam, generate a registration QR code, and watch sessions live as they happen.
            </p>
            <Button size="lg" asChild className="mt-2">
              <Link href="/admin/login">
                Go to admin console
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
