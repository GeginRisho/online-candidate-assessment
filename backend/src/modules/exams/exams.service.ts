import { prisma } from '@config/prisma';
import { NotFoundError } from '@utils/AppError';
import type { CreateExamInput, UpdateExamInput } from './exams.validation';
import { formatQuestion } from '@utils/formatQuestion';

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
