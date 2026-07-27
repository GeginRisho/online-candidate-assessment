export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errorCode: string;
  details?: unknown;
}

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECRUITER' | 'PROCTOR';

export type CandidateStatus =
  | 'REGISTERED'
  | 'VERIFIED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'DISQUALIFIED'
  | 'COMPLETED'
  | 'ABSENT';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
}

export interface CandidateUser {
  id: string;
  email: string;
  fullName: string;
  candidateCode: string;
  status: CandidateStatus;
  phone?: string | null;
  collegeName?: string | null;
  degree?: string | null;
  branch?: string | null;
  graduationYear?: number | null;
}

export type AuthenticatedUser =
  | ({ userType: 'ADMIN' } & AdminUser)
  | ({ userType: 'CANDIDATE' } & CandidateUser);

export interface LoginResult<TUser> {
  accessToken: string;
  user: TUser;
}

export interface QrRegistrationResult {
  registrationUrl: string;
  qrCodeDataUrl: string;
  qrRef: string;
}
