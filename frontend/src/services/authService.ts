import { apiClient, setAccessToken } from './apiClient';
import type {
  AdminUser,
  ApiSuccessResponse,
  AuthenticatedUser,
  CandidateUser,
  LoginResult,
  QrRegistrationResult,
} from '@/types/auth';

export interface AdminLoginPayload {
  email: string;
  password: string;
}

export interface AdminRegisterPayload {
  email: string;
  password: string;
  fullName: string;
  organization: string;
}


export interface CandidateRegisterPayload {
  email: string;
  fullName: string;
  phone?: string;
  collegeName?: string;
  degree?: string;
  branch?: string;
  yearOfStudy?: string;
  graduationYear?: number;
  qrRef?: string;
  examId?: string;
  examToken?: string;
}

export interface CandidateLoginPayload {
  email: string;
  password: string;
}

export async function adminLogin(payload: AdminLoginPayload): Promise<AdminUser> {
  const { data } = await apiClient.post<ApiSuccessResponse<LoginResult<AdminUser>>>(
    '/auth/admin/login',
    payload,
  );
  setAccessToken(data.data.accessToken);
  return data.data.user;
}

export async function adminRegister(payload: AdminRegisterPayload): Promise<AdminUser> {
  const { data } = await apiClient.post<ApiSuccessResponse<LoginResult<AdminUser>>>(
    '/auth/admin/register',
    payload,
  );
  setAccessToken(data.data.accessToken);
  return data.data.user;
}


export async function candidateRegister(
  payload: CandidateRegisterPayload,
): Promise<{ sessionId: string; user: CandidateUser }> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ sessionId: string; user: CandidateUser }>>(
    '/auth/candidate/register',
    payload,
  );
  return data.data;
}

export async function candidateLogin(payload: CandidateLoginPayload): Promise<CandidateUser> {
  const { data } = await apiClient.post<ApiSuccessResponse<LoginResult<CandidateUser>>>(
    '/auth/candidate/login',
    payload,
  );
  setAccessToken(data.data.accessToken);
  return data.data.user;
}

export async function fetchCurrentUser(): Promise<AuthenticatedUser> {
  const { data } = await apiClient.get<ApiSuccessResponse<AuthenticatedUser>>('/auth/me');
  return data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
  setAccessToken(null);
}

export async function getQrRegistration(examId?: string): Promise<QrRegistrationResult> {
  const { data } = await apiClient.get<ApiSuccessResponse<QrRegistrationResult>>(
    '/auth/candidate/qr',
    { params: examId ? { examId } : undefined },
  );
  return data.data;
}
