import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/auth';

export interface Exam {
  id: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  aptitudeDurationSec: number;
  technicalDurationSec: number;
  aptitudeQuestionCount: number;
  technicalQuestionCount: number;
  passingScorePercent: number;
  maxWarnings: number;
  autoDisqualifyEnabled: boolean;
  requireFullscreen: boolean;
  requireCamera: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  examQuestions?: any[];
}

export interface ExamSession {
  id: string;
  examId: string;
  candidateId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'SUBMITTED' | 'AUTO_SUBMITTED' | 'DISQUALIFIED' | 'EXPIRED';
  startedAt: string | null;
  endedAt: string | null;
  warningCount: number;
  isDisqualified: boolean;
  exam: Exam;
  answers: any[];
  warnings: any[];
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

export async function heartbeat(sessionId: string): Promise<any> {
  const { data } = await apiClient.post<ApiSuccessResponse<any>>(`/exam-sessions/${sessionId}/heartbeat`);
  return data.data;
}
