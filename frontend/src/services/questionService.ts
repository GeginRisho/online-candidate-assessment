import { apiClient } from './apiClient';
import type { ApiSuccessResponse } from '@/types/auth';

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  type: 'APTITUDE' | 'TECHNICAL';
  format: 'MCQ_SINGLE' | 'MCQ_MULTIPLE' | 'TRUE_FALSE' | 'CODING' | 'DESCRIPTIVE';
  domain: string;
  topic: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  text: string;
  codeSnippet: string | null;
  options: Option[] | null;
  correctAnswer: string[];
  explanation: string | null;
  marks: number;
  negativeMarks: number;
  timeLimitSec: number | null;
  tags: string[];
  isActive: boolean;
  createdAt: string;
}

export interface QuestionFilters {
  type?: 'APTITUDE' | 'TECHNICAL';
  format?: 'MCQ_SINGLE' | 'MCQ_MULTIPLE' | 'TRUE_FALSE' | 'CODING' | 'DESCRIPTIVE';
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  domain?: string;
  search?: string;
  isActive?: boolean;
}

export async function fetchQuestions(filters?: QuestionFilters): Promise<Question[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<Question[]>>('/questions', {
    params: filters,
  });
  return data.data;
}

export async function createQuestion(payload: Omit<Question, 'id' | 'createdAt'>): Promise<Question> {
  const { data } = await apiClient.post<ApiSuccessResponse<Question>>('/questions', payload);
  return data.data;
}

export async function updateQuestion(
  id: string,
  payload: Partial<Omit<Question, 'id' | 'createdAt'>>,
): Promise<Question> {
  const { data } = await apiClient.put<ApiSuccessResponse<Question>>(`/questions/${id}`, payload);
  return data.data;
}

export async function deleteQuestion(id: string): Promise<void> {
  await apiClient.delete(`/questions/${id}`);
}

export async function importQuestionsJson(payload: Omit<Question, 'id' | 'createdAt'>[]): Promise<any> {
  const { data } = await apiClient.post<ApiSuccessResponse<any>>('/questions/import/json', payload);
  return data.data;
}

export async function importQuestionsExcel(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<ApiSuccessResponse<any>>('/questions/import/excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data.data;
}
