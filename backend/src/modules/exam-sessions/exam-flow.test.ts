import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { startCandidateExam, selectDomain, endAptitudeRound, getSessionDetails } from './exam-sessions.service';

const prisma = new PrismaClient();

describe('Candidate Exam Flow E2E Integration Test', () => {
  let testExamId: string;
  let testCandidateId: string;
  let testSessionId: string;

  beforeAll(async () => {
    // 1. Clean up and setup a clean Exam, Candidate, and Questions
    const admin = await prisma.admin.findFirst();
    const adminId = admin ? admin.id : (await prisma.admin.create({
      data: {
        email: 'testadmin@assessment.local',
        passwordHash: 'dummyhash',
        fullName: 'Test Admin',
      }
    })).id;

    // Create 15 Aptitude questions
    const aptQuestions = [];
    for (let i = 1; i <= 15; i++) {
      aptQuestions.push(await prisma.question.create({
        data: {
          type: 'APTITUDE',
          format: 'MCQ_SINGLE',
          domain: 'Aptitude',
          text: `Aptitude Question ${i}`,
          correctAnswer: ['A'],
          createdById: adminId,
        }
      }));
    }

    // Create 15 Technical questions for MERN Stack domain
    const techQuestions = [];
    for (let i = 1; i <= 15; i++) {
      techQuestions.push(await prisma.question.create({
        data: {
          type: 'TECHNICAL',
          format: 'MCQ_SINGLE',
          domain: 'MERN Stack',
          text: `MERN Question ${i}`,
          correctAnswer: ['A'],
          createdById: adminId,
        }
      }));
    }

    // Create Active Domain
    await prisma.domain.upsert({
      where: { name: 'MERN Stack' },
      update: { isActive: true },
      create: { name: 'MERN Stack', isActive: true },
    });

    // Create Exam
    const exam = await prisma.exam.create({
      data: {
        title: 'E2E Test Assessment',
        aptitudeDurationSec: 900,
        technicalDurationSec: 900,
        aptitudeQuestionCount: 15,
        technicalQuestionCount: 15,
        createdById: adminId,
      }
    });
    testExamId = exam.id;

    // Map questions to Exam
    for (const q of aptQuestions) {
      await prisma.examQuestion.create({
        data: { examId: testExamId, questionId: q.id }
      });
    }
    for (const q of techQuestions) {
      await prisma.examQuestion.create({
        data: { examId: testExamId, questionId: q.id }
      });
    }

    // Create Candidate
    const candidate = await prisma.candidate.create({
      data: {
        candidateCode: `CAND_E2E_${Date.now()}`,
        email: `e2e_candidate_${Date.now()}@example.com`,
        fullName: 'E2E Test Candidate',
        status: 'WAITING_APPROVAL',
      }
    });
    testCandidateId = candidate.id;

    // Create Session
    const session = await prisma.examSession.create({
      data: {
        examId: testExamId,
        candidateId: testCandidateId,
        status: 'NOT_STARTED',
      }
    });
    testSessionId = session.id;
  });

  afterAll(async () => {
    // Clean up created records
    await prisma.examQuestion.deleteMany({ where: { examId: testExamId } });
    await prisma.answer.deleteMany({ where: { examSessionId: testSessionId } });
    await prisma.examSession.deleteMany({ where: { id: testSessionId } });
    await prisma.candidate.deleteMany({ where: { id: testCandidateId } });
    await prisma.exam.deleteMany({ where: { id: testExamId } });
  });

  it('should verify start exam validation and initial questions returned', async () => {
    // 1. Start candidate exam
    const startResult = await startCandidateExam(testCandidateId);
    expect(startResult.candidate.status).toBe('IN_PROGRESS');
    expect(startResult.session.status).toBe('IN_PROGRESS');

    // 2. Fetch session details for Candidate and verify only Aptitude questions are returned
    const sessionDetails = await getSessionDetails(testSessionId, 'CANDIDATE');
    expect(sessionDetails.exam.examQuestions.length).toBe(15);
    
    // All 15 questions must be of type APTITUDE
    for (const eq of sessionDetails.exam.examQuestions) {
      expect(eq.question.type).toBe('APTITUDE');
    }
  });

  it('should verify domain selection occurs only after aptitude is ended and selects domain specialization', async () => {
    // 1. End Aptitude Round
    const endResult = await endAptitudeRound(testSessionId);
    expect(endResult.aptitudeEndedAt).not.toBeNull();

    // Verify no technical questions are generated in database answers yet
    const sessionDetailsBeforeDomain = await prisma.examSession.findUnique({
      where: { id: testSessionId },
      include: { answers: { include: { question: true } } }
    });
    const techAnswersBefore = sessionDetailsBeforeDomain?.answers.filter(a => a.question.type === 'TECHNICAL');
    expect(techAnswersBefore?.length).toBe(0);

    // 2. Call selectDomain for MERN Stack
    const selectResult = await selectDomain(testSessionId, 'MERN Stack');
    expect(selectResult.selectedDomain).toBe('MERN Stack');
    expect(selectResult.technicalStartedAt).not.toBeNull();

    // 3. Verify exactly 15 technical questions are now generated
    const sessionDetailsAfterDomain = await prisma.examSession.findUnique({
      where: { id: testSessionId },
      include: { answers: { include: { question: true } } }
    });
    const techAnswersAfter = sessionDetailsAfterDomain?.answers.filter(a => a.question.type === 'TECHNICAL');
    expect(techAnswersAfter?.length).toBe(15);
    for (const a of techAnswersAfter || []) {
      expect(a.question.domain).toBe('MERN Stack');
    }
  });

  it('should verify domain selection cannot be changed', async () => {
    await expect(selectDomain(testSessionId, 'MERN Stack')).rejects.toThrow();
  });
});
