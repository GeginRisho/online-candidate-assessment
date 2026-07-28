import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/auth';

export interface Exam {
  id: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  isActive: boolean;
  aptitudeDurationSec: number;
  technicalDurationSec: number;
  aptitudeQuestionCount: number;
  technicalQuestionCount: number;
  passingScorePercent: number;
  maxWarnings: number;
  autoDisqualifyEnabled: boolean;
  requireFullscreen: boolean;
  requireCamera: boolean;
  requireMicrophone?: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  qrToken?: string | null;
  totalDurationSec?: number | null;
  examQuestions?: any[];
}

export interface ExamSession {
  id: string;
  examId: string;
  candidateId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'SUBMITTED' | 'AUTO_SUBMITTED' | 'DISQUALIFIED' | 'EXPIRED';
  startedAt: string | null;
  aptitudeStartedAt?: string | null;
  technicalStartedAt?: string | null;
  endedAt: string | null;
  warningCount: number;
  isDisqualified: boolean;
  attemptNumber?: number;
  maxAttempts?: number;
  reattemptReason?: string | null;
  exam: Exam;
  answers: any[];
  warnings: any[];
  selectedDomain?: string | null;
  microphoneStatus?: string | null;
  configuredDomains?: string[];
  candidate: {
    id: string;
    email: string;
    fullName: string;
    collegeName?: string | null;
    branch?: string | null;
    degree?: string | null;
    yearOfStudy?: string | null;
    status: string;
  };
}

export async function fetchExams(): Promise<Exam[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<Exam[]>>('/exams');
  return data.data;
}

export async function fetchMySessions(): Promise<ExamSession[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<ExamSession[]>>('/exam-sessions/my');
  return data.data;
}

export async function fetchAllCandidateSessionsAdmin(): Promise<ExamSession[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<ExamSession[]>>('/exam-sessions/all');
  return data.data;
}

export async function startExamSession(examId: string): Promise<ExamSession> {
  const { data } = await apiClient.post<ApiSuccessResponse<ExamSession>>('/exam-sessions', { examId });
  return data.data;
}

export async function fetchSessionDetails(sessionId: string): Promise<ExamSession> {
  const { data } = await apiClient.get<ApiSuccessResponse<ExamSession>>(`/exam-sessions/${sessionId}`);
  return data.data;
}

export interface SaveAnswerPayload {
  questionId: string;
  selectedOptions?: string[] | null;
  codeAnswer?: string | null;
  textAnswer?: string | null;
  timeSpentSec?: number;
  isFlagged?: boolean;
}

export async function saveAnswer(sessionId: string, payload: SaveAnswerPayload): Promise<any> {
  const { data } = await apiClient.post<ApiSuccessResponse<any>>(`/exam-sessions/${sessionId}/answer`, payload);
  return data.data;
}

export interface LogWarningPayload {
  type: string;
  message: string;
  severity?: string;
  currentQuestionNum?: number;
  fullscreenStatus?: string;
  webcamStatus?: string;
  visibilityState?: string;
  metadata?: any;
}

export async function logWarning(sessionId: string, payload: LogWarningPayload): Promise<any> {
  const { data } = await apiClient.post<ApiSuccessResponse<any>>(`/exam-sessions/${sessionId}/warning`, payload);
  return data.data;
}

export async function submitSession(sessionId: string, isAutoSubmit = false): Promise<any> {
  const { data } = await apiClient.post<ApiSuccessResponse<any>>(`/exam-sessions/${sessionId}/submit`, { isAutoSubmit });
  return data.data;
}

export async function heartbeat(
  sessionId: string,
  payload?: { webcamStatus?: string; microphoneStatus?: string; fullscreenStatus?: string; currentQuestionNum?: number }
): Promise<any> {
  const { data } = await apiClient.post<ApiSuccessResponse<any>>(`/exam-sessions/${sessionId}/heartbeat`, payload);
  return data.data;
}

export async function approveCandidate(candidateId: string): Promise<any> {
  const { data } = await apiClient.post<ApiSuccessResponse<any>>(`/exam-sessions/candidates/${candidateId}/approve`);
  return data.data;
}

export async function rejectCandidate(candidateId: string): Promise<any> {
  const { data } = await apiClient.post<ApiSuccessResponse<any>>(`/exam-sessions/candidates/${candidateId}/reject`);
  return data.data;
}

export async function startCandidateExam(candidateId: string): Promise<any> {
  const { data } = await apiClient.post<ApiSuccessResponse<any>>(`/exam-sessions/candidates/${candidateId}/start-exam`);
  return data.data;
}

export async function selectDomain(sessionId: string, domain: string): Promise<any> {
  const { data } = await apiClient.post<ApiSuccessResponse<any>>(`/exam-sessions/${sessionId}/select-domain`, { domain });
  return data.data;
}

export async function regenerateExamQrToken(examId: string): Promise<Exam> {
  const { data } = await apiClient.post<ApiSuccessResponse<Exam>>(`/exams/${examId}/qr`);
  return data.data;
}

export async function fetchExamByQrToken(qrToken: string): Promise<{
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  totalDurationSec?: number | null;
}> {
  const { data } = await apiClient.get<ApiSuccessResponse<{
    id: string;
    title: string;
    description: string;
    isActive: boolean;
    totalDurationSec?: number | null;
  }>>(`/exams/public/${qrToken}`);
  return data.data;
}

export async function approveAllCandidates(): Promise<any> {
  const { data } = await apiClient.post<ApiSuccessResponse<any>>('/exam-sessions/approve-all');
  return data.data;
}

export async function allowReattempt(sessionId: string, reason: string): Promise<any> {
  const { data } = await apiClient.post<ApiSuccessResponse<any>>(`/exam-sessions/${sessionId}/allow-reattempt`, { reason });
  return data.data;
}
