import { prisma } from '@config/prisma';
import { NotFoundError } from '@utils/AppError';
import { QuestionType, QuestionFormat, DifficultyLevel } from '@prisma/client';
import type { CreateQuestionInput, UpdateQuestionInput } from './questions.validation';
import { formatQuestion } from '@utils/formatQuestion';
import ExcelJS from 'exceljs';

export async function createQuestion(input: CreateQuestionInput, adminId: string) {
  const created = await prisma.question.create({
    data: {
      ...input,
      options: input.options ? (input.options as any) : undefined,
      correctAnswer: input.correctAnswer as any,
      createdById: adminId,
    },
  });
  return formatQuestion(created);
}

export async function getQuestions(filters: {
  type?: QuestionType;
  format?: QuestionFormat;
  difficulty?: DifficultyLevel;
  domain?: string;
  search?: string;
  isActive?: boolean;
}) {
  const { type, format, difficulty, domain, search, isActive } = filters;

  const questions = await prisma.question.findMany({
    where: {
      type,
      format,
      difficulty,
      isActive,
      domain: domain ? { contains: domain, mode: 'insensitive' } : undefined,
      OR: search
        ? [
            { text: { contains: search, mode: 'insensitive' } },
            { topic: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    },
    orderBy: { createdAt: 'desc' },
  });

  return questions.map(formatQuestion);
}

export async function getQuestionById(id: string) {
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) throw new NotFoundError('Question not found');
  return formatQuestion(question);
}

export async function updateQuestion(id: string, input: UpdateQuestionInput) {
  // Check existence
  await getQuestionById(id);

  const updated = await prisma.question.update({
    where: { id },
    data: {
      ...input,
      options: input.options ? (input.options as any) : undefined,
      correctAnswer: input.correctAnswer ? (input.correctAnswer as any) : undefined,
    },
  });
  return formatQuestion(updated);
}

export async function deleteQuestion(id: string) {
  await getQuestionById(id);
  return prisma.question.delete({ where: { id } });
}

export async function importQuestions(questions: CreateQuestionInput[], adminId: string) {
  const data = questions.map((q) => ({
    ...q,
    options: q.options ? (q.options as any) : undefined,
    correctAnswer: q.correctAnswer as any,
    createdById: adminId,
  }));

  return prisma.question.createMany({
    data,
  });
}

export async function parseExcelQuestions(buffer: Buffer): Promise<CreateQuestionInput[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('Excel sheet is empty');

  const questions: CreateQuestionInput[] = [];

  worksheet.eachRow((row, rowNumber) => {
    // Skip header row
    if (rowNumber === 1) return;

    const typeStr = row.getCell(1).value?.toString().trim().toUpperCase();
    const formatStr = row.getCell(2).value?.toString().trim().toUpperCase();
    const domain = row.getCell(3).value?.toString().trim();
    const topic = row.getCell(4).value?.toString().trim() || null;
    const difficultyStr = row.getCell(5).value?.toString().trim().toUpperCase();
    const text = row.getCell(6).value?.toString().trim();
    const codeSnippet = row.getCell(7).value?.toString().trim() || null;
    const optA = row.getCell(8).value?.toString().trim();
    const optB = row.getCell(9).value?.toString().trim();
    const optC = row.getCell(10).value?.toString().trim();
    const optD = row.getCell(11).value?.toString().trim();
    const correctAnsStr = row.getCell(12).value?.toString().trim();
    const explanation = row.getCell(13).value?.toString().trim() || null;
    const marksVal = row.getCell(14).value;
    const negMarksVal = row.getCell(15).value;
    const tagsStr = row.getCell(16).value?.toString().trim();

    if (!text || !domain || !correctAnsStr) return;

    // Validate Enums
    const type = typeStr === 'TECHNICAL' ? QuestionType.TECHNICAL : QuestionType.APTITUDE;
    
    let format: QuestionFormat = QuestionFormat.MCQ_SINGLE;
    if (formatStr === 'MCQ_MULTIPLE') format = QuestionFormat.MCQ_MULTIPLE;
    else if (formatStr === 'TRUE_FALSE') format = QuestionFormat.TRUE_FALSE;
    else if (formatStr === 'CODING') format = QuestionFormat.CODING;
    else if (formatStr === 'DESCRIPTIVE') format = QuestionFormat.DESCRIPTIVE;

    let difficulty: DifficultyLevel = DifficultyLevel.MEDIUM;
    if (difficultyStr === 'EASY') difficulty = DifficultyLevel.EASY;
    else if (difficultyStr === 'HARD') difficulty = DifficultyLevel.HARD;

    // Parse options for MCQs
    let options: { id: string; text: string }[] | null = null;
    let correctAnswer: any = [correctAnsStr];

    if (format === QuestionFormat.MCQ_SINGLE || format === QuestionFormat.MCQ_MULTIPLE) {
      options = [];
      if (optA) options.push({ id: 'A', text: optA });
      if (optB) options.push({ id: 'B', text: optB });
      if (optC) options.push({ id: 'C', text: optC });
      if (optD) options.push({ id: 'D', text: optD });

      // Split comma separated correct answers (e.g. "A,B")
      correctAnswer = correctAnsStr.split(',').map((ans) => ans.trim().toUpperCase());
    } else if (format === QuestionFormat.TRUE_FALSE) {
      options = [
        { id: 'true', text: 'True' },
        { id: 'false', text: 'False' },
      ];
      correctAnswer = [correctAnsStr.toLowerCase()];
    }

    const marks = typeof marksVal === 'number' ? marksVal : parseInt(marksVal?.toString() || '1', 10) || 1;
    const negativeMarks = typeof negMarksVal === 'number' ? negMarksVal : parseFloat(negMarksVal?.toString() || '0') || 0;
    const tags = tagsStr ? tagsStr.split(',').map((t) => t.trim()) : [];

    questions.push({
      type,
      format,
      domain,
      topic,
      difficulty,
      text,
      codeSnippet,
      options,
      correctAnswer,
      explanation,
      marks,
      negativeMarks,
      tags,
      isActive: true,
    });
  });

  return questions;
}
