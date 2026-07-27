import { Router } from 'express';
import { authRouter } from '@modules/auth/auth.routes';
import { examsRouter } from '@modules/exams/exams.routes';
import { sessionsRouter } from '@modules/exam-sessions/exam-sessions.routes';
import { questionsRouter } from '@modules/questions/questions.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/exams', examsRouter);
apiRouter.use('/exam-sessions', sessionsRouter);
apiRouter.use('/questions', questionsRouter);

apiRouter.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Assessment Platform API',
    version: '1.0.0',
  });
});
