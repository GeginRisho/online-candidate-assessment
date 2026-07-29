'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  Clock,
  Flag,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchSessionDetails, saveAnswer, logWarning, submitSession, heartbeat, SaveAnswerPayload, selectDomain, startAptitudeTimer, endAptitudeRound } from '@/services';
import { parseQuestionOptions } from '@/utils/questionUtils';

export default function ExamPage() {
  const router = useRouter();
  const { sessionId } = useParams() as { sessionId: string };

  const [activeSection, setActiveSection] = React.useState<'APTITUDE' | 'TECHNICAL'>('APTITUDE');
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [selectedAnswers, setSelectedAnswers] = React.useState<Record<string, string[]>>({});
  const [codeAnswers, setCodeAnswers] = React.useState<Record<string, string>>({});
  const [textAnswers, setTextAnswers] = React.useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = React.useState<Record<string, boolean>>({});
  const [visitedQuestions, setVisitedQuestions] = React.useState<Record<string, boolean>>({});

  // Proctoring warnings count
  const [warningCount, setWarningCount] = React.useState(0);
  const [isFullscreenActive, setIsFullscreenActive] = React.useState(true);

  const currentQuestionIndexRef = React.useRef(0);
  React.useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  // Unified continuous timer state (seconds remaining)
  const [examTimer, setExamTimer] = React.useState(999999);
  const [showDomainSelection, setShowDomainSelection] = React.useState(false);
  const [isPaletteCollapsed, setIsPaletteCollapsed] = React.useState(true);
  const [isCameraCollapsed, setIsCameraCollapsed] = React.useState(true);
  const [selectedDomainLocal, setSelectedDomainLocal] = React.useState<string | null>(null);
  const [isTimerHydrated, setIsTimerHydrated] = React.useState(false);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const socketRef = React.useRef<Socket | null>(null);

  const cleanupProctoring = React.useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  }, []);

  // Fetch session details
  const { data: session, isLoading, refetch } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => fetchSessionDetails(sessionId),
  });

  // Start Aptitude timer when Question 1 is first displayed
  React.useEffect(() => {
    if (session && session.status === 'IN_PROGRESS' && !session.aptitudeStartedAt) {
      startAptitudeTimer(sessionId)
        .then(() => refetch())
        .catch((err) => console.error('Failed to start aptitude timer:', err));
    }
  }, [session, sessionId, refetch]);

  const exam = session?.exam;
  const questions: any[] = React.useMemo(
    () => exam?.examQuestions?.map((eq: any) => eq.question) || [],
    [exam?.examQuestions]
  );
  const activeQuestion = questions[currentQuestionIndex] || questions[0];

  // Trigger Domain selection modal when candidate starts technical round and hasn't chosen one
  React.useEffect(() => {
    if (session && !session.selectedDomain && activeSection === 'TECHNICAL') {
      setTimeout(() => setShowDomainSelection(true), 0);
    }
  }, [session, activeSection]);

  // Auto update visited status & active section tab based on current question
  React.useEffect(() => {
    if (!activeQuestion?.id) return;
    const qId = activeQuestion.id;
    const qType = activeQuestion.type;
    const timer = setTimeout(() => {
      setVisitedQuestions((prev) => (prev[qId] ? prev : { ...prev, [qId]: true }));
      if (qType) {
        setActiveSection((prev) => (prev === qType ? prev : qType));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [activeQuestion?.id, activeQuestion?.type]);

  // Save Answer Mutation
  const saveAnswerMutation = useMutation({
    mutationFn: (payload: SaveAnswerPayload) => saveAnswer(sessionId, payload),
    onSuccess: () => {},
  });

  // Log Warning Mutation
  const warningMutation = useMutation({
    mutationFn: (payload: { type: string; message: string }) => {
      const webcamStatus = session?.exam?.requireCamera
        ? (streamRef.current && streamRef.current.getVideoTracks().some(t => t.readyState === 'live') ? 'ACTIVE' : 'DISCONNECTED')
        : 'INACTIVE';
      const fullscreenStatus = document.fullscreenElement !== null ? 'ACTIVE' : 'EXITED';
      const currentQuestionNum = currentQuestionIndexRef.current + 1;
      const visibilityState = document.visibilityState;

      return logWarning(sessionId, {
        type: payload.type as any,
        message: payload.message,
        severity: 'MEDIUM',
        currentQuestionNum,
        fullscreenStatus,
        webcamStatus,
        visibilityState,
      });
    },
    onSuccess: (data: any) => {
      setWarningCount(data.session.warningCount);
      const count = data.session.warningCount;
      
      if (count >= 3 || data.session.status === 'DISQUALIFIED') {
        alert(`Warning ${count} of 3\n\nYou have been disqualified from this assessment.`);
        cleanupProctoring();
        router.push(`/exam/${sessionId}/thank-you`);
      } else {
        alert(`Warning ${count} of 3\n\n${data.warning.message}\n\nPlease return to the exam immediately.`);
      }
    },
  });

  // Submit Session Mutation
  const submitMutation = useMutation({
    mutationFn: (isAutoSubmit: boolean) => submitSession(sessionId, isAutoSubmit),
    onSuccess: () => {
      toast.success('Exam submitted successfully!');
      cleanupProctoring();
      router.push(`/exam/${sessionId}/thank-you`);
    },
    onError: () => {
      toast.error('Failed to submit exam. Please try again.');
    },
  });

  // BroadcastChannel duplicate tab prevention
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const channelName = `exam_session_channel_${sessionId}`;
    const bc = new BroadcastChannel(channelName);

    bc.postMessage({ type: 'CHECK_DUPLICATE' });

    bc.onmessage = (event) => {
      if (event.data?.type === 'CHECK_DUPLICATE') {
        bc.postMessage({ type: 'DUPLICATE_RESPONSE' });
      } else if (event.data?.type === 'DUPLICATE_RESPONSE') {
        toast.error('Multiple Tabs Detected', {
          description: 'This exam session is already open in another tab. Closing this instance.',
        });
        router.replace(`/exam/${sessionId}/waiting`);
      }
    };

    return () => {
      bc.close();
    };
  }, [sessionId, router]);

  // Initialize socket connection & periodic heartbeat
  React.useEffect(() => {
    let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl && process.env.NEXT_PUBLIC_API_URL) {
      socketUrl = process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
    }
    if (!socketUrl) {
      socketUrl = 'http://localhost:4000';
    }
    const socket = io(socketUrl, {
      auth: {
        sessionId,
      },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('candidate:join_session', sessionId);
    });

    socket.on('session:disqualified', () => {
      toast.error('Disqualified by proctor', { description: 'This session has been disqualified.' });
      cleanupProctoring();
      router.push(`/exam/${sessionId}/thank-you`);
    });

    socket.on('session:autosubmitted', () => {
      toast.error('Exam auto-submitted', { description: 'This session has been automatically completed.' });
      cleanupProctoring();
      router.push(`/exam/${sessionId}/thank-you`);
    });

    const heartbeatInterval = setInterval(() => {
      if (session?.status === 'IN_PROGRESS') {
        const webcamStatus = session?.exam?.requireCamera
          ? (streamRef.current && streamRef.current.getVideoTracks().some(t => t.readyState === 'live') ? 'ACTIVE' : 'DISCONNECTED')
          : 'INACTIVE';
        const fullscreenStatus = document.fullscreenElement !== null ? 'ACTIVE' : 'EXITED';
        const currentQuestionNum = currentQuestionIndexRef.current + 1;

        void heartbeat(sessionId, { webcamStatus, fullscreenStatus, currentQuestionNum });
        socket.emit('candidate:heartbeat', sessionId);
      }
    }, 5000); // 5 seconds heartbeat interval

    return () => {
      clearInterval(heartbeatInterval);
      socket.disconnect();
    };
  }, [sessionId, session, cleanupProctoring, router]);

  // Setup device feed
  React.useEffect(() => {
    const getMedia = async () => {
      try {
        const constraints = {
          video: !!session?.exam?.requireCamera,
          audio: !!session?.exam?.requireMicrophone,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        toast.error('Media monitoring stream dropped.');
        warningMutation.mutate({ type: 'CAMERA_DISCONNECT', message: 'Webcam/Microphone permissions or feed dropped' });
      }
    };

    if (session?.exam?.requireCamera || session?.exam?.requireMicrophone) {
      void getMedia();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [session?.exam?.requireCamera, session?.exam?.requireMicrophone, warningMutation]);

  // Webcam & Microphone Track end / Device Change listeners
  React.useEffect(() => {
    if (!streamRef.current) return;

    const handleTrackEnded = (e: any) => {
      const kind = e.target.kind; // 'video' or 'audio'
      toast.error(`${kind === 'video' ? 'Webcam' : 'Microphone'} feed disconnected!`);
      warningMutation.mutate({
        type: 'CAMERA_DISCONNECT',
        message: `${kind === 'video' ? 'Webcam' : 'Microphone'} video/audio track ended`,
      });
    };

    const tracks = streamRef.current.getTracks();
    tracks.forEach((track) => track.addEventListener('ended', handleTrackEnded));

    const handleDeviceChange = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (session?.exam?.requireCamera) {
          const videoDevices = devices.filter((d) => d.kind === 'videoinput');
          if (videoDevices.length === 0) {
            toast.error('No video input hardware detected!');
            warningMutation.mutate({ type: 'CAMERA_DISCONNECT', message: 'Webcam hardware disconnected' });
          }
        }
        if (session?.exam?.requireMicrophone) {
          const audioDevices = devices.filter((d) => d.kind === 'audioinput');
          if (audioDevices.length === 0) {
            toast.error('No audio input hardware detected!');
            warningMutation.mutate({ type: 'CAMERA_DISCONNECT', message: 'Microphone hardware disconnected' });
          }
        }
      } catch {}
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      tracks.forEach((track) => track.removeEventListener('ended', handleTrackEnded));
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [session, warningMutation]);

  // Enforce Fullscreen overlay & exit warning log
  React.useEffect(() => {
    if (session?.status !== 'IN_PROGRESS') return;

    const checkFs = () => {
      const active = document.fullscreenElement !== null;
      setIsFullscreenActive(active);
      if (!active) {
        warningMutation.mutate({ type: 'FULLSCREEN_EXIT', message: 'Exited proctored fullscreen mode' });
      }
    };

    document.addEventListener('fullscreenchange', checkFs);
    setTimeout(() => {
      setIsFullscreenActive(document.fullscreenElement !== null);
    }, 0);

    return () => {
      document.removeEventListener('fullscreenchange', checkFs);
    };
  }, [session?.status, warningMutation]);

  // Disable Right-Click and Copy-Paste-Select Shortcuts
  React.useEffect(() => {
    if (session?.status !== 'IN_PROGRESS') return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.warning('Right-click is disabled during the exam.');
      warningMutation.mutate({ type: 'RIGHT_CLICK', message: 'Right-click context menu event' });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        const type = e.key.toLowerCase() === 'c' ? 'COPY_ATTEMPT' : e.key.toLowerCase() === 'v' ? 'PASTE_ATTEMPT' : 'OTHER';
        toast.warning('Copy/Paste/Cut/Select-All is disabled during the exam.');
        warningMutation.mutate({ type, message: `Attempted key combo Ctrl+${e.key.toUpperCase()}` });
      }

      if (e.key === 'F12') {
        e.preventDefault();
        toast.warning('DevTools shortcuts are disabled.');
        warningMutation.mutate({ type: 'DEVTOOLS_OPENED', message: 'Pressed F12 key' });
      }

      if (isCtrl && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        toast.warning('DevTools shortcuts are disabled.');
        warningMutation.mutate({ type: 'DEVTOOLS_OPENED', message: `Pressed Ctrl+Shift+${e.key.toUpperCase()}` });
      }

      if (isCtrl && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        toast.warning('View source code is disabled.');
        warningMutation.mutate({ type: 'DEVTOOLS_OPENED', message: 'Attempted to view source code (Ctrl+U)' });
      }
    };

    const preventClipboard = (e: Event) => {
      e.preventDefault();
      const type = e.type === 'copy' ? 'COPY_ATTEMPT' : e.type === 'paste' ? 'PASTE_ATTEMPT' : 'OTHER';
      toast.warning(`${e.type.toUpperCase()} is disabled during the exam.`);
      warningMutation.mutate({ type, message: `Attempted clipboard action: ${e.type}` });
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', preventClipboard);
    document.addEventListener('paste', preventClipboard);
    document.addEventListener('cut', preventClipboard);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', preventClipboard);
      document.removeEventListener('paste', preventClipboard);
      document.removeEventListener('cut', preventClipboard);
    };
  }, [session?.status, warningMutation]);

  // VisibilityChange / PageHide / Window Blur detectors
  const lastSwitchTimeRef = React.useRef<number>(0);
  const logSwitchWarning = React.useCallback((type: string, message: string) => {
    const now = Date.now();
    if (now - lastSwitchTimeRef.current < 2500) return;
    lastSwitchTimeRef.current = now;
    warningMutation.mutate({ type, message });
  }, [warningMutation]);

  React.useEffect(() => {
    if (session?.status !== 'IN_PROGRESS') return;

    const handleBlur = () => {
      logSwitchWarning('WINDOW_BLUR', 'Switched focus away from proctored window');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        logSwitchWarning('TAB_SWITCH', 'Switched browser tab / hidden visibility');
      }
    };

    const handlePageHide = () => {
      logSwitchWarning('TAB_SWITCH', 'Page hid/unloaded');
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [session?.status, logSwitchWarning]);

  // Warning reload alerts
  React.useEffect(() => {
    if (session?.status !== 'IN_PROGRESS') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Refreshing will log a warning! Are you sure?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [session?.status]);

  // Multiple tab detection
  React.useEffect(() => {
    if (session?.status !== 'IN_PROGRESS' || !sessionId) return;

    const channel = new BroadcastChannel(`exam_session_${sessionId}`);
    
    channel.onmessage = (event) => {
      if (event.data === 'ping') {
        warningMutation.mutate({ type: 'OTHER', message: 'Multiple browser tabs detected' });
        channel.postMessage('pong');
      } else if (event.data === 'pong') {
        warningMutation.mutate({ type: 'OTHER', message: 'Multiple browser tabs detected' });
      }
    };

    channel.postMessage('ping');

    return () => {
      channel.close();
    };
  }, [session?.status, sessionId, warningMutation]);

  // Restore current question index on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined' && questions.length > 0) {
      const stored = localStorage.getItem(`current_q_idx_${sessionId}`);
      if (stored !== null) {
        const idx = parseInt(stored, 10);
        if (!isNaN(idx) && idx >= 0 && idx < questions.length) {
          setTimeout(() => setCurrentQuestionIndex(idx), 0);
        }
      }
    }
  }, [sessionId, questions.length]);

  // Persist current question index
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`current_q_idx_${sessionId}`, String(currentQuestionIndex));
    }
  }, [currentQuestionIndex, sessionId]);

  const serverClientOffsetRef = React.useRef<number>(0);

  // Setup timers & hydrate answers with session recovery
  React.useEffect(() => {
    if (!session) return;

    const serverTimeStr = (session as any).serverTime;
    if (serverTimeStr) {
      serverClientOffsetRef.current = new Date(serverTimeStr).getTime() - Date.now();
    }

    const totalDuration = (session.exam?.aptitudeDurationSec || 900) + (session.exam?.technicalDurationSec || 900);
    const wc = session.warningCount;

    const currentServerTime = Date.now() + serverClientOffsetRef.current;
    
    let remaining = totalDuration;
    if (session.aptitudeStartedAt) {
      if (!session.aptitudeEndedAt) {
        // Aptitude in progress
        const elapsed = Math.floor((currentServerTime - new Date(session.aptitudeStartedAt).getTime()) / 1000);
        remaining = Math.max(0, totalDuration - elapsed);
      } else if (!session.technicalStartedAt) {
        // Paused during Domain Selection
        const elapsedApt = Math.floor((new Date(session.aptitudeEndedAt).getTime() - new Date(session.aptitudeStartedAt).getTime()) / 1000);
        remaining = Math.max(0, totalDuration - elapsedApt);
      } else {
        // Technical in progress
        const elapsedApt = Math.floor((new Date(session.aptitudeEndedAt).getTime() - new Date(session.aptitudeStartedAt).getTime()) / 1000);
        const elapsedTech = Math.floor((currentServerTime - new Date(session.technicalStartedAt).getTime()) / 1000);
        remaining = Math.max(0, totalDuration - elapsedApt - elapsedTech);
      }
    }

    let currentSection: 'APTITUDE' | 'TECHNICAL' = 'APTITUDE';
    if (session.aptitudeEndedAt || session.selectedDomain) {
      currentSection = 'TECHNICAL';
    }

    const answersMap: Record<string, string[]> = {};
    const codeMap: Record<string, string> = {};
    const textMap: Record<string, string> = {};
    const flaggedMap: Record<string, boolean> = {};

    (session.answers || []).forEach((ans: any) => {
      if (ans.selectedOptions) {
        answersMap[ans.questionId] = ans.selectedOptions;
      }
      if (ans.codeAnswer) {
        codeMap[ans.questionId] = ans.codeAnswer;
      }
      if (ans.textAnswer) {
        textMap[ans.questionId] = ans.textAnswer;
      }
      if (ans.isFlagged) {
        flaggedMap[ans.questionId] = true;
      }
    });

    setTimeout(() => {
      // Restore domain selection status on refresh
      if (session.aptitudeEndedAt && !session.selectedDomain) {
        setShowDomainSelection(true);
      } else {
        setShowDomainSelection(false);
      }

      setExamTimer(remaining);
      setIsTimerHydrated(true);
      setActiveSection(currentSection);
      setWarningCount(wc);
      setSelectedAnswers(answersMap);
      setCodeAnswers(codeMap);
      setTextAnswers(textMap);
      setFlaggedQuestions(flaggedMap);
    }, 0);
  }, [session]);

  // Timer tick down
  React.useEffect(() => {
    if (!session || session.status !== 'IN_PROGRESS') return;

    const timer = setInterval(() => {
      const currentServerTime = Date.now() + serverClientOffsetRef.current;
      const totalDuration = (session.exam?.aptitudeDurationSec || 900) + (session.exam?.technicalDurationSec || 900);

      if (session.aptitudeStartedAt) {
        if (!session.aptitudeEndedAt) {
          // Aptitude in progress
          const elapsed = Math.floor((currentServerTime - new Date(session.aptitudeStartedAt).getTime()) / 1000);
          const rem = Math.max(0, totalDuration - elapsed);
          setExamTimer(rem);
          if (rem <= 0) {
            // Auto-move to next phase or submit
            endAptitudeRound(sessionId)
              .then(() => refetch())
              .catch(console.error);
          }
        } else if (!session.technicalStartedAt) {
          // Paused during Domain Selection - remaining time stays visible and doesn't decrement
          const elapsedApt = Math.floor((new Date(session.aptitudeEndedAt).getTime() - new Date(session.aptitudeStartedAt).getTime()) / 1000);
          const rem = Math.max(0, totalDuration - elapsedApt);
          setExamTimer(rem);
        } else {
          // Technical in progress - resumes from remaining time
          const elapsedApt = Math.floor((new Date(session.aptitudeEndedAt).getTime() - new Date(session.aptitudeStartedAt).getTime()) / 1000);
          const elapsedTech = Math.floor((currentServerTime - new Date(session.technicalStartedAt).getTime()) / 1000);
          const rem = Math.max(0, totalDuration - elapsedApt - elapsedTech);
          setExamTimer(rem);
          if (rem <= 0) {
            submitMutation.mutate(true); // Auto-submit when time expires
          }
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session, sessionId, refetch, submitMutation]);

  // Auto submit when time expires
  React.useEffect(() => {
    if (!session || session.status !== 'IN_PROGRESS' || !isTimerHydrated) return;

    if (examTimer <= 0) {
      const currentSection = session.aptitudeEndedAt ? 'TECHNICAL' : 'APTITUDE';
      if (currentSection === 'APTITUDE') {
        endAptitudeRound(sessionId)
          .then(() => refetch())
          .catch(console.error);
      } else {
        submitMutation.mutate(true);
      }
    }
  }, [examTimer, session, sessionId, refetch, submitMutation, isTimerHydrated]);

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/10">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // Save selected MCQ answer option
  const handleSelectOption = (optionId: string) => {
    if (!activeQuestion) return;

    let updatedSelection: string[] = [];
    if (activeQuestion.format === 'MCQ_SINGLE' || activeQuestion.format === 'TRUE_FALSE') {
      updatedSelection = [optionId];
    } else {
      const prev = selectedAnswers[activeQuestion.id] || [];
      updatedSelection = prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId];
    }

    setSelectedAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: updatedSelection,
    }));

    saveAnswerMutation.mutate({
      questionId: activeQuestion.id,
      selectedOptions: updatedSelection,
      timeSpentSec: 5,
    });
  };

  // Flag/Unflag Question for review
  const toggleFlagReview = () => {
    if (!activeQuestion) return;
    const isFlagged = !flaggedQuestions[activeQuestion.id];
    setFlaggedQuestions((prev) => ({
      ...prev,
      [activeQuestion.id]: isFlagged,
    }));

    saveAnswerMutation.mutate({
      questionId: activeQuestion.id,
      isFlagged,
    });
  };

  const handleNext = () => {
    if (activeSection === 'APTITUDE' && currentQuestionIndex === 14) {
      endAptitudeRound(sessionId)
        .then(() => {
          setShowDomainSelection(true);
          setActiveSection('TECHNICAL');
          return refetch();
        })
        .catch(() => {
          toast.error('Failed to end Aptitude section');
        });
      return;
    }
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (activeSection === 'TECHNICAL' && !showDomainSelection) {
      const techIdx = questions.findIndex((q) => q.type === 'TECHNICAL');
      if (currentQuestionIndex === techIdx) {
        toast.info('You cannot return to the Aptitude section.');
        return;
      }
    }
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleJumpToSection = (section: 'APTITUDE' | 'TECHNICAL') => {
    if (section === 'APTITUDE') {
      if (activeSection === 'TECHNICAL') {
        toast.error('You cannot return to the Aptitude section.');
        return;
      }
      setCurrentQuestionIndex(0);
    } else {
      if (!session?.selectedDomain) {
        if (currentQuestionIndex < 14) {
          toast.error('Please complete all 15 aptitude questions first.');
          return;
        }
        setShowDomainSelection(true);
        setActiveSection('TECHNICAL');
      } else {
        const techIdx = questions.findIndex((q) => q.type === 'TECHNICAL');
        if (techIdx !== -1) {
          setCurrentQuestionIndex(techIdx);
        }
      }
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex h-screen flex-col bg-secondary/10 overflow-hidden font-sans select-none">
      {/* Fullscreen Overlay Lock */}
      {!isFullscreenActive && session?.status === 'IN_PROGRESS' && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center text-center p-6 text-white backdrop-blur-sm">
          <div className="max-w-md space-y-6">
            <div className="size-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20 animate-pulse">
              <AlertTriangle className="size-8" />
            </div>
            <h2 className="text-2xl font-bold font-display">Fullscreen Mode Required</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              This is a proctored assessment. You cannot access the exam paper or record answers unless the browser is locked in fullscreen mode.
            </p>
            <Button
              onClick={async () => {
                try {
                  await document.documentElement.requestFullscreen();
                } catch {
                  toast.error('Failed to enter fullscreen. Check browser settings.');
                }
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-semibold"
            >
              Re-enter Fullscreen Mode
            </Button>
          </div>
        </div>
      )}

      {/* Header bar */}
      <header className="flex flex-col sm:flex-row border-b border-border bg-card px-4 sm:px-6 py-3 sm:py-0 sm:h-16 items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <span className="font-display font-semibold truncate max-w-xs">{exam?.title}</span>
        </div>

        {/* Section Tabs */}
        <div className="flex border rounded overflow-hidden text-[10px] sm:text-xs font-semibold bg-muted/30 flex-wrap">
          <button
            onClick={() => handleJumpToSection('APTITUDE')}
            disabled={activeSection === 'TECHNICAL'}
            className={`px-4 py-2 transition-colors ${
              activeSection === 'APTITUDE' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:bg-slate-100 disabled:opacity-50'
            }`}
          >
            Aptitude Section (15 Qs)
          </button>
          <button
            onClick={() => handleJumpToSection('TECHNICAL')}
            disabled={activeSection === 'APTITUDE' && currentQuestionIndex < 14}
            className={`px-4 py-2 transition-colors ${
              activeSection === 'TECHNICAL' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:bg-slate-100 disabled:opacity-50'
            }`}
          >
            Technical Section {session?.selectedDomain ? `(${session.selectedDomain})` : ''}
          </button>
        </div>

        {/* Timer status */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2 font-mono font-semibold text-sm sm:text-lg bg-primary/10 text-primary px-3 py-1.5 rounded-lg border border-primary/20">
            <Clock className="size-4 animate-pulse" />
            <span>
              {formatTimer(examTimer)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
            <AlertTriangle className="size-4" />
            <span>
              Warnings: {warningCount}/{exam?.maxWarnings}
            </span>
          </div>
        </div>
      </header>

      {/* Main engine section */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Left Side: Question paper sheet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex flex-col justify-between bg-background">
          {showDomainSelection ? (
            <div className="space-y-6 max-w-3xl w-full mx-auto py-8">
              <div className="text-center space-y-4">
                <div className="size-14 bg-blue-500/10 text-blue-600 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
                  <ShieldCheck className="size-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                    Select Your Technical Specialization
                  </h2>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto">
                    Please select one of the specialization tracks below. You will be served technical questions matching your choice. Once selected, this track cannot be changed.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-6">
                {(session?.configuredDomains && session.configuredDomains.length > 0
                  ? session.configuredDomains
                  : ['Java Full Stack', 'Python Full Stack', 'MERN Stack', 'Data Science']
                ).map((dom: string) => {
                  const isSelected = selectedDomainLocal === dom;
                  return (
                    <button
                      key={dom}
                      type="button"
                      onClick={() => setSelectedDomainLocal(dom)}
                      className={`p-5 border rounded-2xl text-left transition-all duration-300 flex flex-col justify-between group shadow-sm ${
                        isSelected
                          ? 'bg-primary/5 border-primary ring-1 ring-primary'
                          : 'bg-card border-slate-200 hover:bg-blue-50/50 hover:border-blue-500'
                      }`}
                    >
                      <div>
                        <h4 className={`font-semibold text-sm transition-colors ${
                          isSelected ? 'text-primary font-bold' : 'text-slate-900 group-hover:text-blue-600'
                        }`}>
                          {dom}
                        </h4>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          Access technical questions and exercises specifically for the {dom} track.
                        </p>
                      </div>
                      <span className={`font-semibold text-xs mt-4 inline-flex items-center gap-1 transition-all ${
                        isSelected ? 'text-primary font-bold' : 'text-blue-600 group-hover:translate-x-1'
                      }`}>
                        {isSelected ? '✓ Selected' : 'Select Track →'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-center pt-8 border-t border-border/50 mt-6">
                <Button
                  onClick={async () => {
                    if (!selectedDomainLocal) {
                      toast.error('Please select a domain specialization track.');
                      return;
                    }
                    try {
                      await selectDomain(sessionId, selectedDomainLocal);
                      toast.success(`Track selected: ${selectedDomainLocal}`);
                      setShowDomainSelection(false);
                      await refetch();
                      setActiveSection('TECHNICAL');
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || 'Unable to set domain specialization');
                    }
                  }}
                  disabled={!selectedDomainLocal}
                  className="w-full sm:w-64 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-base"
                >
                  Continue to Technical Section
                </Button>
              </div>
            </div>
          ) : activeQuestion ? (
            <div className="space-y-6 max-w-3xl w-full mx-auto">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
              </div>

              <div className="space-y-4">
                <h2 className="font-semibold text-lg leading-relaxed">{activeQuestion.text}</h2>

                {activeQuestion.codeSnippet && (
                  <pre className="p-4 bg-secondary/50 rounded-lg font-mono text-sm overflow-x-auto border border-border/30 max-h-60">
                    <code>{activeQuestion.codeSnippet}</code>
                  </pre>
                )}
              </div>

              {/* Options Selection */}
              {(() => {
                const opts = parseQuestionOptions(activeQuestion.options);
                if (opts.length === 0) return null;
                return (
                  <div className="grid gap-3 pt-4">
                    {opts.map((opt: any) => {
                      const isSelected = (selectedAnswers[activeQuestion.id] || []).includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectOption(opt.id)}
                          className={`flex items-center gap-4 p-4 border rounded-xl text-left transition-all ${
                            isSelected
                              ? 'bg-primary/5 border-primary text-primary font-semibold shadow-sm'
                              : 'bg-card border-border/60 hover:bg-secondary/40'
                          }`}
                        >
                          <span
                            className={`size-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {opt.id}
                          </span>
                          <span className="text-sm">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Coding answer text box */}
              {activeQuestion.format === 'CODING' && (
                <div className="space-y-2 pt-4">
                  <Label>Write your code below:</Label>
                  <textarea
                    className="w-full min-h-[300px] rounded-lg border border-input bg-card p-4 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="// Write your code answer here..."
                    value={codeAnswers[activeQuestion.id] || ''}
                    onChange={(e) => {
                      const text = e.target.value;
                      setCodeAnswers((prev) => ({ ...prev, [activeQuestion.id]: text }));
                      saveAnswerMutation.mutate({ questionId: activeQuestion.id, codeAnswer: text });
                    }}
                  />
                </div>
              )}

              {/* Descriptive textbox */}
              {activeQuestion.format === 'DESCRIPTIVE' && (
                <div className="space-y-2 pt-4">
                  <Label>Write your answer details:</Label>
                  <textarea
                    className="w-full min-h-[200px] rounded-lg border border-input bg-card p-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Enter your detailed response..."
                    value={textAnswers[activeQuestion.id] || ''}
                    onChange={(e) => {
                      const text = e.target.value;
                      setTextAnswers((prev) => ({ ...prev, [activeQuestion.id]: text }));
                      saveAnswerMutation.mutate({ questionId: activeQuestion.id, textAnswer: text });
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <HelpCircle className="size-12 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-lg">No Active Question</h3>
              <p className="text-sm text-muted-foreground">Select a question from the palette.</p>
            </div>
          )}

          {/* Navigation buttons */}
          {!showDomainSelection && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-5 max-w-3xl w-full mx-auto mt-6">
              <div className="flex gap-2">
                <Button variant="outline" disabled={currentQuestionIndex === 0} onClick={handlePrevious}>
                  <ChevronLeft className="size-4" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={toggleFlagReview}
                  className={flaggedQuestions[activeQuestion?.id] ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : ''}
                >
                  <Flag className="size-4" />
                  <span>{flaggedQuestions[activeQuestion?.id] ? 'Flagged' : 'Flag for Review'}</span>
                </Button>
              </div>

              <div className="flex gap-3">
                {currentQuestionIndex === questions.length - 1 ? (
                  activeSection === 'APTITUDE' ? (
                    <Button
                      onClick={async () => {
                        try {
                          await endAptitudeRound(sessionId);
                          setShowDomainSelection(true);
                          setActiveSection('TECHNICAL');
                          await refetch();
                        } catch {
                          toast.error('Failed to end Aptitude section');
                        }
                      }}
                      className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <span>Proceed to Technical Section</span>
                      <ChevronRight className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        if (confirm('Are you sure you want to submit your final exam responses?')) {
                          submitMutation.mutate(false);
                        }
                      }}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <span>Submit Exam</span>
                      <CheckCircle className="size-4" />
                    </Button>
                  )
                ) : (
                  <Button onClick={handleNext}>
                    <span>Next</span>
                    <ChevronRight className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right Side: Palette and Video Stream */}
        <aside className="w-full lg:w-72 xl:w-80 border-t lg:border-t-0 lg:border-l border-border bg-white p-4 sm:p-5 flex flex-col justify-between shrink-0 lg:max-h-none overflow-y-auto">
          {/* Mobile Toggles */}
          <div className="flex gap-2 lg:hidden mb-4 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setIsPaletteCollapsed(p => !p)}
            >
              {isPaletteCollapsed ? 'Show Palette' : 'Hide Palette'}
            </Button>
            {exam?.requireCamera && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setIsCameraCollapsed(c => !c)}
              >
                {isCameraCollapsed ? 'Show Camera' : 'Hide Camera'}
              </Button>
            )}
          </div>

          <div className={`space-y-6 ${isPaletteCollapsed ? 'hidden lg:block' : 'block'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm">Question Palette</h3>
              <span className="text-xs text-muted-foreground font-medium">{questions.length} Questions</span>
            </div>

            {/* 1-50 Question Palette Grid */}
            {!showDomainSelection ? (
              <div className="grid grid-cols-5 gap-2 max-h-[320px] overflow-y-auto pr-1">
                {questions.map((q: any, i: number) => {
                  const isCurrent = currentQuestionIndex === i;
                  const isAnswered =
                    (selectedAnswers[q.id] || []).length > 0 ||
                    Boolean(codeAnswers[q.id]) ||
                    Boolean(textAnswers[q.id]);
                  const isFlagged = Boolean(flaggedQuestions[q.id]);
                  const isVisited = Boolean(visitedQuestions[q.id]);

                  let colorStyle = 'bg-muted text-muted-foreground hover:bg-secondary font-medium'; // Gray = Not Visited
                  if (isCurrent) {
                    colorStyle = 'bg-blue-600 text-white font-bold ring-2 ring-blue-600 ring-offset-2'; // Blue = Current
                  } else if (isFlagged) {
                    colorStyle = 'bg-amber-500 text-white font-bold'; // Yellow = Review
                  } else if (isAnswered) {
                    colorStyle = 'bg-emerald-600 text-white font-bold'; // Green = Answered
                  } else if (isVisited) {
                    colorStyle = 'bg-red-500 text-white font-bold'; // Red = Visited but Unanswered
                  }

                  return (
                    <button
                      key={q.id || i}
                      onClick={() => setCurrentQuestionIndex(i)}
                      className={`h-9 w-full rounded flex items-center justify-center font-bold text-xs transition-colors ${colorStyle}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-6 border border-dashed rounded-xl bg-slate-50 text-muted-foreground text-xs leading-relaxed">
                Please select your specialization track to view the question palette.
              </div>
            )}

            {/* Color Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-medium border-t border-border pt-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded bg-blue-600 shrink-0" />
                <span>Current</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3 rounded bg-emerald-600 shrink-0" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3 rounded bg-amber-500 shrink-0" />
                <span>Review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3 rounded bg-red-500 shrink-0" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <span className="size-3 rounded bg-muted border border-border shrink-0" />
                <span>Not Visited</span>
              </div>
            </div>
          </div>

          {/* Floating visual proctor container */}
          {exam?.requireCamera && (
            <div className={`border border-border/80 rounded-xl overflow-hidden shadow-md bg-black aspect-video relative flex items-center justify-center mt-4 ${isCameraCollapsed ? 'hidden lg:flex' : 'flex'}`}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute left-3 top-3 bg-red-500 text-white text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                <Camera className="size-3 animate-pulse" />
                <span>Live Feed</span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-semibold text-foreground">{children}</label>;
}
