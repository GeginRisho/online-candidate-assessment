import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const adminLoginSchema = z.object({
  body: z.object({
    email: z.string().email('Enter a valid email address').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const candidateRegisterSchema = z.object({
  body: z.object({
    email: z.string().email('Enter a valid email address').toLowerCase(),
    fullName: z.string().min(2, 'Full name is too short').max(120),
    phone: z
      .string()
      .regex(/^\+?[0-9]{7,15}$/, 'Enter a valid phone number')
      .optional()
      .or(z.literal('')),
    collegeName: z.string().max(200).optional().or(z.literal('')),
    degree: z.string().max(100).optional().or(z.literal('')),
    branch: z.string().max(100).optional().or(z.literal('')),
    yearOfStudy: z.string().max(100).optional().or(z.literal('')),
    graduationYear: z.coerce.number().int().min(1990).max(2100).optional(),
    qrRef: z.string().max(200).optional(), // opaque reference captured from a scanned QR poster
    examId: z.string().uuid().optional(),
    examToken: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const candidateLoginSchema = z.object({
  body: z.object({
    email: z.string().email('Enter a valid email address').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const qrRegistrationQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    examId: z.string().uuid().optional(),
  }),
  params: z.object({}).optional(),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    // optional fallback for non-browser clients that can't rely on cookies
    refreshToken: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const adminRegisterSchema = z.object({
  body: z.object({
    email: z.string().email('Enter a valid email address').toLowerCase(),
    password: passwordSchema,
    fullName: z.string().min(2, 'Admin name is too short').max(120),
    organization: z.string().min(2, 'Organization name is too short').max(120),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>['body'];
export type AdminRegisterInput = z.infer<typeof adminRegisterSchema>['body'];
export type CandidateRegisterInput = z.infer<typeof candidateRegisterSchema>['body'];
export type CandidateLoginInput = z.infer<typeof candidateLoginSchema>['body'];
