'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Camera, Maximize, Mic, ShieldAlert, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const START_SECONDS = 42 * 60 + 18;

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

const statusItems = [
  { icon: Maximize, label: 'Fullscreen', active: true },
  { icon: Camera, label: 'Camera', active: true },
  { icon: Mic, label: 'Microphone', active: true },
  { icon: Wifi, label: 'Connection', active: true },
];

export function LiveSessionMonitor() {
  const [secondsLeft, setSecondsLeft] = React.useState(START_SECONDS);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 0 ? START_SECONDS : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-xl"
      aria-hidden="true"
    >
      <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/70" />
            <span className="relative inline-flex size-2 rounded-full bg-destructive" />
          </span>
          <span className="text-xs font-medium text-muted-foreground">Session monitoring — live</span>
        </div>
        <Badge variant="secondary" className="font-mono text-[10px]">
          SID-8841
        </Badge>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Technical round · time remaining
            </p>
            <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-foreground">
              {formatClock(secondsLeft)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge variant="warning" className="gap-1">
              <ShieldAlert className="size-3" />
              1 warning
            </Badge>
            <span className="text-[11px] text-muted-foreground">2 remaining before auto-submit</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {statusItems.map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-secondary/40 py-3"
            >
              <Icon className={active ? 'size-4 text-success' : 'size-4 text-muted-foreground'} />
              <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>Question 14 of 30</span>
            <span>Auto-saved</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-[46%] rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
