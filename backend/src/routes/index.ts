import { Router } from 'express';
import { authRouter } from '@modules/auth/auth.routes';
import { examsRouter } from '@modules/exams/exams.routes';
import { sessionsRouter } from '@modules/exam-sessions/exam-sessions.routes';
import { questionsRouter } from '@modules/questions/questions.routes';

export const apiRouter = Router();

// ---------------------------------------------------------------------------
// API root
// ---------------------------------------------------------------------------
apiRouter.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Assessment Platform API',
    version: '1.0.0',
  });
});

// ---------------------------------------------------------------------------
// Auth routes — /api/v1/auth/*
// ---------------------------------------------------------------------------
apiRouter.use('/auth', authRouter);

// ---------------------------------------------------------------------------
// Resource routes — /api/v1/exams, /api/v1/exam-sessions, /api/v1/questions
// These are the canonical paths used by the frontend API client.
// ---------------------------------------------------------------------------
apiRouter.use('/exams', examsRouter);
apiRouter.use('/exam-sessions', sessionsRouter);
apiRouter.use('/questions', questionsRouter);

// ---------------------------------------------------------------------------
// Admin-prefixed aliases — /api/v1/admin/exams, /api/v1/admin/exam-sessions
// Mounted alongside the canonical paths so both URL shapes work.
// Authentication and role enforcement is handled inside each router.
// ---------------------------------------------------------------------------
apiRouter.use('/admin/exams', examsRouter);
apiRouter.use('/admin/exam-sessions', sessionsRouter);
apiRouter.use('/admin/questions', questionsRouter);
