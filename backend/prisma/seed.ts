import { PrismaClient, QuestionType, QuestionFormat, DifficultyLevel, ExamStatus, ExamSessionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';

const prisma = new PrismaClient();

interface DefaultQuestionInput {
  type: QuestionType;
  format: QuestionFormat;
  domain: string;
  topic: string;
  difficulty: DifficultyLevel;
  text: string;
  options: { id: string; text: string }[];
  correctOptId: string;
  explanation: string;
}

const defaultAptitudeQuestions: DefaultQuestionInput[] = [
  // 1. Quantitative Aptitude (5)
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Quantitative Aptitude',
    difficulty: DifficultyLevel.EASY,
    text: 'If a train running at a speed of 72 km/h crosses a pole in 15 seconds, what is the length of the train?',
    options: [
      { id: 'A', text: '150 m' },
      { id: 'B', text: '200 m' },
      { id: 'C', text: '300 m' },
      { id: 'D', text: '250 m' },
    ],
    correctOptId: 'C',
    explanation: 'Speed in m/s = 72 * (5/18) = 20 m/s. Length of train = Speed * Time = 20 * 15 = 300 meters.',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Quantitative Aptitude',
    difficulty: DifficultyLevel.EASY,
    text: 'A person sells an article for $450 at a loss of 10%. At what price should he sell it to gain 20%?',
    options: [
      { id: 'A', text: '$500' },
      { id: 'B', text: '$600' },
      { id: 'C', text: '$550' },
      { id: 'D', text: '$650' },
    ],
    correctOptId: 'B',
    explanation: 'Cost Price = 450 / 0.90 = $500. Selling price for 20% gain = 500 * 1.20 = $600.',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Quantitative Aptitude',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'A and B together can complete a work in 12 days, while B alone can finish it in 30 days. In how many days can A alone complete the work?',
    options: [
      { id: 'A', text: '18 days' },
      { id: 'B', text: '20 days' },
      { id: 'C', text: '24 days' },
      { id: 'D', text: '25 days' },
    ],
    correctOptId: 'B',
    explanation: 'A\'s 1 day work = 1/12 - 1/30 = (5 - 2)/60 = 3/60 = 1/20. Thus, A alone takes 20 days.',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Quantitative Aptitude',
    difficulty: DifficultyLevel.HARD,
    text: 'Two pipes A and B can fill a tank in 20 minutes and 30 minutes respectively. If both pipes are opened together, after how much time should pipe B be closed so that the tank is full in 15 minutes?',
    options: [
      { id: 'A', text: '7.5 minutes' },
      { id: 'B', text: '8 minutes' },
      { id: 'C', text: '10 minutes' },
      { id: 'D', text: '12 minutes' },
    ],
    correctOptId: 'A',
    explanation: 'Pipe A works for the full 15 min -> fills 15/20 = 3/4 of the tank. Pipe B needs to fill remaining 1/4 -> Time = (1/4) * 30 = 7.5 minutes.',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Quantitative Aptitude',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'What is the compound interest on $10,000 at 10% per annum for 2 years compounded annually?',
    options: [
      { id: 'A', text: '$2,000' },
      { id: 'B', text: '$2,100' },
      { id: 'C', text: '$2,200' },
      { id: 'D', text: '$2,050' },
    ],
    correctOptId: 'B',
    explanation: 'Amount = 10000 * (1 + 0.10)^2 = $12,100. CI = Amount - Principal = $2,100.',
  },

  // 2. Logical Reasoning (5)
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Logical Reasoning',
    difficulty: DifficultyLevel.EASY,
    text: 'Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?',
    options: [
      { id: 'A', text: '(1/3)' },
      { id: 'B', text: '(1/8)' },
      { id: 'C', text: '(2/8)' },
      { id: 'D', text: '(1/16)' },
    ],
    correctOptId: 'B',
    explanation: 'This is a simple division series; each number is one-half of the previous number. (1/4) * (1/2) = (1/8).',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Logical Reasoning',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'If in a certain code language, "COVET" is written as "FRYHW", then how is "SHAPE" written in that code?',
    options: [
      { id: 'A', text: 'VKDSH' },
      { id: 'B', text: 'VKDPH' },
      { id: 'C', text: 'VKEPS' },
      { id: 'D', text: 'VLDSH' },
    ],
    correctOptId: 'A',
    explanation: 'Each letter is shifted 3 steps forward: C->F, O->R, V->Y, E->H, T->W. Applying same to SHAPE yields VKDSH.',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Logical Reasoning',
    difficulty: DifficultyLevel.EASY,
    text: 'Point A is 10m West of Point B. Point C is 6m North of Point B. In which direction is Point C with respect to Point A?',
    options: [
      { id: 'A', text: 'North-East' },
      { id: 'B', text: 'North-West' },
      { id: 'C', text: 'South-East' },
      { id: 'D', text: 'South-West' },
    ],
    correctOptId: 'A',
    explanation: 'C is North of B, which is East of A. Thus, C is North-East of A.',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Logical Reasoning',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Introducing a boy, a girl said, "He is the son of the daughter of the father of my uncle." How is the boy related to the girl?',
    options: [
      { id: 'A', text: 'Brother' },
      { id: 'B', text: 'Nephew' },
      { id: 'C', text: 'Uncle' },
      { id: 'D', text: 'Son-in-law' },
    ],
    correctOptId: 'A',
    explanation: 'Father of uncle = grandfather. Daughter of grandfather = mother or aunt. Son of mother/aunt = brother or cousin. Since brother is the closest option, it fits brother.',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Logical Reasoning',
    difficulty: DifficultyLevel.HARD,
    text: 'Statements: All dogs are cats. All cats are lions. Conclusion: I. All dogs are lions. II. Some lions are dogs.',
    options: [
      { id: 'A', text: 'Only Conclusion I follows' },
      { id: 'B', text: 'Only Conclusion II follows' },
      { id: 'C', text: 'Both I and II follow' },
      { id: 'D', text: 'Neither I nor II follows' },
    ],
    correctOptId: 'C',
    explanation: 'By categorical syllogism, if All A are B and All B are C, then All A are C.',
  },

  // 3. Verbal Ability (5)
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Verbal Ability',
    difficulty: DifficultyLevel.EASY,
    text: 'Select the antonym for the word "OBSTINATE".',
    options: [
      { id: 'A', text: 'Stubborn' },
      { id: 'B', text: 'Flexible' },
      { id: 'C', text: 'Rigid' },
      { id: 'D', text: 'Firm' },
    ],
    correctOptId: 'B',
    explanation: 'Obstinate means stubbornly refusing to change one\'s opinion; flexible is its direct antonym.',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Verbal Ability',
    difficulty: DifficultyLevel.EASY,
    text: 'Choose the correctly spelt word from the options below.',
    options: [
      { id: 'A', text: 'Accommodate' },
      { id: 'B', text: 'Acommodate' },
      { id: 'C', text: 'Accomodate' },
      { id: 'D', text: 'Acomodate' },
    ],
    correctOptId: 'A',
    explanation: 'The correct English spelling is Accommodate with double c and double m.',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Verbal Ability',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Fill in the blank: "Neither the manager nor the employees _____ present at the meeting yesterday."',
    options: [
      { id: 'A', text: 'was' },
      { id: 'B', text: 'were' },
      { id: 'C', text: 'is' },
      { id: 'D', text: 'have' },
    ],
    correctOptId: 'B',
    explanation: 'When subjects are joined by "neither... nor", the verb agrees with the closer subject ("employees", which is plural past -> "were").',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Verbal Ability',
    difficulty: DifficultyLevel.HARD,
    text: 'Identify the idiom that means "to reveal a secret carelessly or prematurely".',
    options: [
      { id: 'A', text: 'Burn the midnight oil' },
      { id: 'B', text: 'Spill the beans' },
      { id: 'C', text: 'Bite the bullet' },
      { id: 'D', text: 'Break a leg' },
    ],
    correctOptId: 'B',
    explanation: '"Spill the beans" is an established idiom meaning to divulge secret information.',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Verbal Ability',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Select the synonym for the word "CANDID".',
    options: [
      { id: 'A', text: 'Secretive' },
      { id: 'B', text: 'Frank' },
      { id: 'C', text: 'Deceitful' },
      { id: 'D', text: 'Hesitant' },
    ],
    correctOptId: 'B',
    explanation: 'Candid means truthful and straightforward; frank is its synonym.',
  },

  // 4. Data Interpretation (5)
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Data Interpretation',
    difficulty: DifficultyLevel.EASY,
    text: 'A company\'s revenue increased from $80,000 in 2022 to $100,000 in 2023. What is the percentage increase in revenue?',
    options: [
      { id: 'A', text: '20%' },
      { id: 'B', text: '25%' },
      { id: 'C', text: '30%' },
      { id: 'D', text: '15%' },
    ],
    correctOptId: 'B',
    explanation: 'Increase = $20,000. Percentage Increase = (20,000 / 80,000) * 100 = 25%.',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Data Interpretation',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'In a pie chart representing student enrollment across 5 departments, Computer Science accounts for a central angle of 108 degrees. What percentage of total students belong to Computer Science?',
    options: [
      { id: 'A', text: '25%' },
      { id: 'B', text: '30%' },
      { id: 'C', text: '33.3%' },
      { id: 'D', text: '35%' },
    ],
    correctOptId: 'B',
    explanation: 'Total angle of circle = 360 degrees. Percentage = (108 / 360) * 100 = 30%.',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Data Interpretation',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'The average score of 5 tests is 84. If the highest score of 96 is removed, what is the new average score of the remaining 4 tests?',
    options: [
      { id: 'A', text: '80' },
      { id: 'B', text: '81' },
      { id: 'C', text: '82' },
      { id: 'D', text: '83' },
    ],
    correctOptId: 'B',
    explanation: 'Total sum = 5 * 84 = 420. Sum of 4 tests = 420 - 96 = 324. New average = 324 / 4 = 81.',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Data Interpretation',
    difficulty: DifficultyLevel.HARD,
    text: 'The ratio of males to females in an organization is 5:3. If 20% of males and 40% of females are postgraduates, what percentage of the total employees are NOT postgraduates?',
    options: [
      { id: 'A', text: '72.5%' },
      { id: 'B', text: '75%' },
      { id: 'C', text: '77.5%' },
      { id: 'D', text: '80%' },
    ],
    correctOptId: 'A',
    explanation: 'Assume 50 males and 30 females (total 80). PG males = 10, PG females = 12 (total 22). Non-PG = 58. Percentage = (58/80)*100 = 72.5%.',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Data Interpretation',
    difficulty: DifficultyLevel.EASY,
    text: 'In a bar graph showing monthly sales, January sales were 200 units and February sales were 300 units. What is the ratio of January sales to February sales?',
    options: [
      { id: 'A', text: '1:2' },
      { id: 'B', text: '2:3' },
      { id: 'C', text: '3:2' },
      { id: 'D', text: '3:4' },
    ],
    correctOptId: 'B',
    explanation: 'Ratio = 200 : 300 = 2 : 3.',
  },
];

async function parsePdfQuestions(adminId: string) {
  const quizPath = path.resolve(__dirname, '../../assets/question-bank/Tech_Domains_Mixed_Quiz.pdf');
  const buffer = fs.readFileSync(quizPath);
  const parser = new PDFParse(new Uint8Array(buffer));
  await parser.load();
  const textResult = await parser.getText();
  const text = textResult.text;

  const domainHeaders = [
    { num: 1, search: '1) Web Development', name: 'Web Development' },
    { num: 2, search: '2) Data & Machine Learning', name: 'Data Science & Machine Learning' },
    { num: 3, search: '3) Data Analytics', name: 'Data Analytics' },
    { num: 4, search: '4) UI/UX Design', name: 'UI/UX Design' },
    { num: 5, search: '5) Cloud Computing', name: 'Cloud Computing' },
    { num: 6, search: '6) Cybersecurity', name: 'Cybersecurity' },
    { num: 7, search: '7) AI & Automation', name: 'AI & Automation' },
    { num: 8, search: '8) Mobile App Development', name: 'Mobile App Development' },
    { num: 9, search: '9) Digital Marketing', name: 'Digital Marketing' },
    { num: 10, search: '10) HR', name: 'Human Resources (HR)' }
  ];

  const positions = [];
  for (const dh of domainHeaders) {
    const idx = text.indexOf(dh.search);
    if (idx !== -1) {
      positions.push({ ...dh, index: idx });
    }
  }
  positions.sort((a, b) => a.index - b.index);

  const blocks = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index;
    const end = (i + 1 < positions.length) ? positions[i + 1].index : text.length;
    blocks.push({
      name: positions[i].name,
      content: text.substring(start, end)
    });
  }

  const parsedQuestions = [];

  for (const block of blocks) {
    const content = block.content;
    const questionRegex = /Q(\d+)\s*\((MCQ|Technical|Coding)\)\.\s*([\s\S]+?)(?=\nQ\d+\s*\(|\n\d+\)\s+[A-Z]|$)/gi;
    let qMatch;

    while ((qMatch = questionRegex.exec(content)) !== null) {
      const qNum = parseInt(qMatch[1]);
      const qType = qMatch[2].toUpperCase();
      const rawText = qMatch[3].trim();

      const answerRegex = /<span style="color:blue"><b>Answer:\s*([\s\S]+?)<\/b>\s*<\/span>/i;
      const ansMatch = rawText.match(answerRegex);

      let answerText = '';
      let cleanedText = rawText;
      if (ansMatch) {
        answerText = ansMatch[1].trim().replace(/\n/g, ' ');
        cleanedText = rawText.replace(answerRegex, '').trim();
      } else {
        const fallbackAnsRegex = /Answer:\s*([^\n]+)/i;
        const fbMatch = rawText.match(fallbackAnsRegex);
        if (fbMatch) {
          answerText = fbMatch[1].trim();
          cleanedText = rawText.replace(fallbackAnsRegex, '').trim();
        }
      }

      let options = null;
      let questionText = cleanedText;
      let format = QuestionFormat.DESCRIPTIVE;

      if (qType === 'MCQ') {
        format = QuestionFormat.MCQ_SINGLE;
        const optRegex = /A\)\s*([\s\S]+?)\s*B\)\s*([\s\S]+?)\s*C\)\s*([\s\S]+?)\s*D\)\s*([\s\S]+)$/i;
        const optMatch = cleanedText.match(optRegex);
        if (optMatch) {
          questionText = cleanedText.substring(0, optMatch.index).trim();
          options = [
            { id: 'A', text: optMatch[1].trim().replace(/\n/g, ' ') },
            { id: 'B', text: optMatch[2].trim().replace(/\n/g, ' ') },
            { id: 'C', text: optMatch[3].trim().replace(/\n/g, ' ') },
            { id: 'D', text: optMatch[4].trim().replace(/\n/g, ' ') }
          ];
        }
      } else if (qType === 'CODING') {
        format = QuestionFormat.CODING;
      }

      parsedQuestions.push({
        type: QuestionType.TECHNICAL,
        format,
        domain: block.name,
        topic: 'Core Concepts',
        difficulty: DifficultyLevel.MEDIUM,
        text: questionText.replace(/\n/g, ' '),
        options: options as any,
        correctAnswer: [answerText] as any,
        explanation: 'Imported from PDF question bank.',
        marks: 1,
        negativeMarks: 0,
        tags: ['pdf-import', block.name],
        createdById: adminId
      });
    }
  }

  return parsedQuestions;
}

async function main() {
  // 1. Super Admin
  const adminEmail = 'superadmin@assessment.local';
  const adminPassword = 'ChangeMe123!';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPasswordHash,
      isActive: true,
      role: 'SUPER_ADMIN',
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Seeded Super Admin (superadmin@assessment.local / ChangeMe123!)');

  // 2. Seed Domains
  const domains = [
    'Cloud Computing',
    'AI & Automation',
    'Data Science & Machine Learning',
    'Data Analytics',
    'Cybersecurity',
    'Web Development',
    'Mobile App Development',
    'UI/UX Design',
    'Digital Marketing',
    'Human Resources (HR)'
  ];

  console.log('🌱 Seeding 10 official domains...');
  for (const d of domains) {
    await prisma.domain.upsert({
      where: { name: d },
      update: { isActive: true },
      create: { name: d, isActive: true }
    });
  }
  console.log('✅ Seeded 10 domains successfully');

  // 3. Clean existing records for fresh idempotent setup
  console.log('🧹 Purging old candidate sessions, questions, and exams...');
  await prisma.answer.deleteMany({});
  await prisma.warning.deleteMany({});
  await prisma.examSession.deleteMany({});
  await prisma.examQuestion.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.exam.deleteMany({});
  await prisma.candidate.deleteMany({});

  // 4. Seed 50 Candidates with WAITING_APPROVAL status
  console.log('🌱 Seeding 50 Candidate accounts...');
  const firstNames = ['Aarav', 'Ananya', 'Rohan', 'Priya', 'Vikram', 'Neha', 'Aditya', 'Kavya', 'Rahul', 'Sneha', 'Arjun', 'Isha', 'Dev', 'Diya', 'Kabir'];
  const lastNames = ['Sharma', 'Verma', 'Patel', 'Rao', 'Nair', 'Gupta', 'Singh', 'Kumar', 'Joshi', 'Mehta', 'Chawla', 'Bhat', 'Dutta', 'Reddy', 'Pillai'];
  const degrees = ['B.Tech', 'M.Sc', 'B.Sc', 'MCA'];
  const branches = ['Computer Science', 'Electrical', 'Mechanical', 'Information Technology'];

  const candidateData = [];
  for (let i = 1; i <= 50; i++) {
    const email = `candidate${i}@example.com`;
    const fullName = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
    candidateData.push({
      candidateCode: `CAND-${1000 + i}`,
      email,
      fullName,
      phone: `98765432${i < 10 ? '0' + i : i}`,
      collegeName: 'National Institute of Technology',
      degree: degrees[i % degrees.length],
      branch: branches[i % branches.length],
      graduationYear: 2024,
      status: 'WAITING_APPROVAL' as const,
      yearOfStudy: 'Final Year',
    });
  }

  await prisma.candidate.createMany({ data: candidateData });
  console.log('✅ Seeded 50 Candidates successfully');

  // 5. Seed Questions (Aptitude & Technical from PDF)
  console.log('🌱 Seeding 20 structured Aptitude questions...');
  const createdQuestions = [];
  for (const q of defaultAptitudeQuestions) {
    const created = await prisma.question.create({
      data: {
        type: q.type,
        format: q.format,
        domain: q.domain,
        topic: q.topic,
        difficulty: q.difficulty,
        text: q.text,
        options: q.options as any,
        correctAnswer: [q.correctOptId] as any,
        explanation: q.explanation,
        marks: 1,
        negativeMarks: 0,
        tags: ['default', q.domain, q.topic],
        createdById: admin.id,
      },
    });
    createdQuestions.push(created);
  }
  console.log(`✅ Seeded ${createdQuestions.length} default aptitude questions successfully`);

  console.log('🌱 Parsing and seeding 150 Technical questions from PDF...');
  const parsedTechQuestions = await parsePdfQuestions(admin.id);
  const createdTechQuestions = [];
  for (const q of parsedTechQuestions) {
    const created = await prisma.question.create({
      data: q,
    });
    createdTechQuestions.push(created);
  }
  console.log(`✅ Seeded ${createdTechQuestions.length} technical questions from PDF successfully`);

  // 6. Create One Default Assessment Drive
  const totalQuestions = [...createdQuestions, ...createdTechQuestions];

  const defaultExam = await prisma.exam.create({
    data: {
      title: 'Graduate Technical Assessment Drive',
      description: 'Official assessment drive covering Aptitude and Domain Specialization Technical Rounds.',
      status: ExamStatus.ACTIVE,
      aptitudeDurationSec: 900,
      technicalDurationSec: 900,
      aptitudeQuestionCount: 15, // default 15 aptitude questions
      technicalQuestionCount: 15, // default 15 technical questions
      createdById: admin.id,
    },
  });

  const examQuestionData = totalQuestions.map((q, idx) => ({
    examId: defaultExam.id,
    questionId: q.id,
    order: idx + 1,
  }));

  await prisma.examQuestion.createMany({ data: examQuestionData });
  console.log(`✅ Created Exam "${defaultExam.title}" and mapped ${examQuestionData.length} questions into pool`);

  // 7. Create ExamSessions for all 50 candidates
  const allCandidates = await prisma.candidate.findMany();
  const sessionData = allCandidates.map((c) => ({
    examId: defaultExam.id,
    candidateId: c.id,
    status: ExamSessionStatus.NOT_STARTED,
  }));

  await prisma.examSession.createMany({ data: sessionData });
  console.log(`✅ Seeded ${sessionData.length} ExamSessions for all candidates`);
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
