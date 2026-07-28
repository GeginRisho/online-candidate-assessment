import { prisma } from '@config/prisma';
import { NotFoundError, BadRequestError } from '@utils/AppError';
import type { CreateExamInput, UpdateExamInput } from './exams.validation';
import { formatQuestion } from '@utils/formatQuestion';
import { v4 as uuidv4 } from 'uuid';

export async function createExam(input: CreateExamInput, adminId: string) {
  const { scheduledStart, scheduledEnd, ...rest } = input;
  return prisma.exam.create({
    data: {
      ...rest,
      scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
      createdById: adminId,
    },
  });
}

export async function getExams(role: 'ADMIN' | 'CANDIDATE') {
  if (role === 'CANDIDATE') {
    // Candidates should only see active exams
    return prisma.exam.findMany({
      where: {
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  return prisma.exam.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function getExamById(id: string) {
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      examQuestions: {
        orderBy: { order: 'asc' },
        include: {
          question: true,
        },
      },
    },
  });

  if (!exam) throw new NotFoundError('Exam not found');

  return {
    ...exam,
    examQuestions: exam.examQuestions.map((eq) => ({
      ...eq,
      question: formatQuestion(eq.question),
    })),
  };
}

export async function updateExam(id: string, input: UpdateExamInput) {
  // Check existence
  await getExamById(id);

  const { scheduledStart, scheduledEnd, ...rest } = input;

  return prisma.exam.update({
    where: { id },
    data: {
      ...rest,
      scheduledStart: scheduledStart === null ? null : scheduledStart ? new Date(scheduledStart) : undefined,
      scheduledEnd: scheduledEnd === null ? null : scheduledEnd ? new Date(scheduledEnd) : undefined,
    },
  });
}

export async function deleteExam(id: string) {
  await getExamById(id);
  return prisma.exam.delete({
    where: { id },
  });
}

export async function generateQrToken(id: string) {
  await getExamById(id);
  const qrToken = uuidv4();
  return prisma.exam.update({
    where: { id },
    data: { qrToken },
  });
}

export async function getExamByQrToken(qrToken: string) {
  const exam = await prisma.exam.findUnique({
    where: { qrToken },
  });
  if (!exam) throw new NotFoundError('Exam with the provided QR token was not found');

  if (!exam.registrationOpen) {
    throw new BadRequestError('Registration for this assessment is closed.');
  }

  const now = new Date();
  if (exam.qrActiveAt && now < new Date(exam.qrActiveAt)) {
    throw new BadRequestError('This assessment link is not active yet.');
  }
  if (exam.qrExpiresAt && now > new Date(exam.qrExpiresAt)) {
    throw new BadRequestError('This assessment link has expired.');
  }

  return {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    isActive: exam.isActive,
    totalDurationSec: exam.totalDurationSec,
  };
}
