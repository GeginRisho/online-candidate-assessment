'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Camera,
  Mic,
  Monitor,
  ShieldCheck,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchSessionDetails } from '@/services';

export default function SystemCheckPage() {
  const router = useRouter();
  const { sessionId } = useParams() as { sessionId: string };

  const [videoPermission, setVideoPermission] = React.useState<'idle' | 'checking' | 'granted' | 'denied'>('idle');
  const [audioPermission, setAudioPermission] = React.useState<'idle' | 'checking' | 'granted' | 'denied'>('idle');
  
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Fetch session details
  const { data: session, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => fetchSessionDetails(sessionId),
  });

  // Check camera and mic
  const verifyDevices = async () => {
    setVideoPermission('checking');
    setAudioPermission('checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: true,
      });
      streamRef.current = stream;
      setVideoPermission('granted');
      setAudioPermission('granted');

      // Bind to video tag
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      toast.success('Camera and microphone verified successfully!');
    } catch {
      setVideoPermission('denied');
      setAudioPermission('denied');
      toast.error('Device permissions denied. Ensure your camera/mic are enabled.');
    }
  };

  const handleProceed = async () => {
    // Force fullscreen
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
        
        // Stop stream before page transition
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        
        router.push(`/exam/${sessionId}/instructions`);
      } else {
        toast.error('Fullscreen mode is not supported by your browser');
      }
    } catch {
      toast.error('Failed to trigger fullscreen mode. Please click to allow.');
    }
  };

  React.useEffect(() => {
    // Clean up streams on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/10">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const allPassed = videoPermission === 'granted' && audioPermission === 'granted';

  return (
    <div className="flex min-h-screen flex-col bg-secondary/10 items-center justify-center p-6 md:p-8">
      <Card className="max-w-2xl w-full border-border/80 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary mb-4">
            <ShieldCheck className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold font-display">System Compatibility Check</CardTitle>
          <CardDescription>
            Verify proctor permissions and hardware compatibility before starting.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Video Preview */}
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative flex items-center justify-center">
            {videoPermission === 'granted' ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="text-center p-6 text-muted-foreground">
                <Camera className="size-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Camera preview will appear here.</p>
              </div>
            )}
          </div>

          {/* Test items status list */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Camera className="size-5 text-primary/80" />
                <div>
                  <h4 className="font-semibold text-sm">Video feed (Camera)</h4>
                  <p className="text-xs text-muted-foreground">Required for facial monitoring</p>
                </div>
              </div>
              <div>
                {videoPermission === 'granted' ? (
                  <CheckCircle className="size-5 text-emerald-500" />
                ) : videoPermission === 'denied' ? (
                  <XCircle className="size-5 text-red-500" />
                ) : (
                  <span className="text-xs text-muted-foreground">Pending</span>
                )}
              </div>
            </div>

            <div className="border rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mic className="size-5 text-primary/80" />
                <div>
                  <h4 className="font-semibold text-sm">Audio stream (Mic)</h4>
                  <p className="text-xs text-muted-foreground">Required for room check</p>
                </div>
              </div>
              <div>
                {audioPermission === 'granted' ? (
                  <CheckCircle className="size-5 text-emerald-500" />
                ) : audioPermission === 'denied' ? (
                  <XCircle className="size-5 text-red-500" />
                ) : (
                  <span className="text-xs text-muted-foreground">Pending</span>
                )}
              </div>
            </div>
          </div>

          {/* Instructions check alert */}
          <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-lg flex items-start gap-3">
            <Monitor className="size-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700 leading-relaxed">
              <p className="font-semibold">Important Fullscreen Lock notice:</p>
              <p className="mt-1">
                Proceeding will launch the exam in <strong>strict fullscreen mode</strong>.
                If you exit fullscreen, switch tabs, or minimize the browser, it will trigger an integrity warning. Exceeding warnings will cause automatic disqualification.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/50">
            {allPassed ? (
              <Button onClick={handleProceed} className="flex-1 gap-2 bg-emerald-500 hover:bg-emerald-600 text-white">
                <Play className="size-4 fill-current" />
                <span>Enter Fullscreen & Proceed</span>
              </Button>
            ) : (
              <Button onClick={verifyDevices} className="flex-1 gap-2">
                <Camera className="size-4" />
                <span>Allow Camera & Mic Permissions</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
