import { UserRole } from '@utils/jwt';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  email: string;
  adminRole?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
