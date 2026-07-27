import { PrismaClient, QuestionType, QuestionFormat, DifficultyLevel, ExamStatus, ExamSessionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

const defaultQuestions: DefaultQuestionInput[] = [
  // ==========================================
  // 20 APTITUDE QUESTIONS
  // ==========================================

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
    explanation: 'Amount = 10000 * (1.10)^2 = $12,100. Interest = 12,100 - 10,000 = $2,100.',
  },

  // 2. Logical Reasoning (5)
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Logical Reasoning',
    difficulty: DifficultyLevel.EASY,
    text: 'Look at this series: 2, 6, 18, 54, ... What number should come next?',
    options: [
      { id: 'A', text: '108' },
      { id: 'B', text: '148' },
      { id: 'C', text: '162' },
      { id: 'D', text: '216' },
    ],
    correctOptId: 'C',
    explanation: 'Each term is multiplied by 3 to get the next term (54 * 3 = 162).',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Logical Reasoning',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Pointing to a photograph of a boy, Suresh said, "He is the son of the only son of my mother." How is Suresh related to that boy?',
    options: [
      { id: 'A', text: 'Brother' },
      { id: 'B', text: 'Uncle' },
      { id: 'C', text: 'Father' },
      { id: 'D', text: 'Grandfather' },
    ],
    correctOptId: 'C',
    explanation: 'Mother\'s only son is Suresh himself. So the boy in the photo is Suresh\'s son, making Suresh his Father.',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Logical Reasoning',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'If CODING is written as DPEJOH in a certain code language, how is LISTEN written in that code?',
    options: [
      { id: 'A', text: 'MJTUFO' },
      { id: 'B', text: 'MKTUFO' },
      { id: 'C', text: 'MJTVEP' },
      { id: 'D', text: 'MKTVEP' },
    ],
    correctOptId: 'A',
    explanation: 'Each letter is shifted by +1 (L->M, I->J, S->T, T->U, E->F, N->O), resulting in MJTUFO.',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Logical Reasoning',
    difficulty: DifficultyLevel.HARD,
    text: 'In a row of 40 students, Rahul is 19th from the right end and Amit is 15th from the left end. How many students are standing between Rahul and Amit?',
    options: [
      { id: 'A', text: '6' },
      { id: 'B', text: '7' },
      { id: 'C', text: '8' },
      { id: 'D', text: '9' },
    ],
    correctOptId: 'A',
    explanation: 'Rahul\'s position from left = (40 - 19) + 1 = 22nd. Amit is 15th from left. Number of students between them = 22 - 15 - 1 = 6.',
  },
  {
    type: QuestionType.APTITUDE,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Aptitude',
    topic: 'Logical Reasoning',
    difficulty: DifficultyLevel.EASY,
    text: 'Statement: All cats are animals. All animals have four legs. Conclusion: All cats have four legs. Is this conclusion logically valid?',
    options: [
      { id: 'A', text: 'Valid' },
      { id: 'B', text: 'Invalid' },
      { id: 'C', text: 'Uncertain' },
      { id: 'D', text: 'Irrelevant' },
    ],
    correctOptId: 'A',
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

  // ==========================================
  // 30 TECHNICAL / CORE QUESTIONS
  // ==========================================

  // 5. Java (5)
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Java',
    difficulty: DifficultyLevel.EASY,
    text: 'Which Java keyword is used to prevent a class from being inherited by subclasses?',
    options: [
      { id: 'A', text: 'static' },
      { id: 'B', text: 'abstract' },
      { id: 'C', text: 'final' },
      { id: 'D', text: 'synchronized' },
    ],
    correctOptId: 'C',
    explanation: 'The final keyword when applied to a class declaration prevents subclassing.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Java',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'What happens if you define two public classes inside a single .java file in Java?',
    options: [
      { id: 'A', text: 'Compiles and runs normally' },
      { id: 'B', text: 'Compilation error' },
      { id: 'C', text: 'Runtime exception' },
      { id: 'D', text: 'Linkage error' },
    ],
    correctOptId: 'B',
    explanation: 'Java requires that each public class resides in its own source file matching the class name.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Java',
    difficulty: DifficultyLevel.EASY,
    text: 'Which memory area in Java JVM stores objects created with the new keyword?',
    options: [
      { id: 'A', text: 'Stack' },
      { id: 'B', text: 'Heap' },
      { id: 'C', text: 'Method Area' },
      { id: 'D', text: 'PC Register' },
    ],
    correctOptId: 'B',
    explanation: 'All class instances and arrays in Java are allocated memory on the Heap.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Java',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Which collection interface implementation in Java guarantees unique elements while preserving insertion order?',
    options: [
      { id: 'A', text: 'HashSet' },
      { id: 'B', text: 'TreeSet' },
      { id: 'C', text: 'LinkedHashSet' },
      { id: 'D', text: 'ArrayList' },
    ],
    correctOptId: 'C',
    explanation: 'LinkedHashSet maintains a doubly-linked list running through all of its entries, preserving insertion order.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Java',
    difficulty: DifficultyLevel.HARD,
    text: 'What is the average time complexity for basic operations (get and put) in a HashMap assuming proper hash code distribution?',
    options: [
      { id: 'A', text: 'O(1)' },
      { id: 'B', text: 'O(log N)' },
      { id: 'C', text: 'O(N)' },
      { id: 'D', text: 'O(N log N)' },
    ],
    correctOptId: 'A',
    explanation: 'With good hash distribution, HashMap achieves constant time O(1) performance for get and put.',
  },

  // 6. Python (5)
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Python',
    difficulty: DifficultyLevel.EASY,
    text: 'What is the data type of the expression (42,) in Python?',
    options: [
      { id: 'A', text: 'int' },
      { id: 'B', text: 'tuple' },
      { id: 'C', text: 'list' },
      { id: 'D', text: 'set' },
    ],
    correctOptId: 'B',
    explanation: 'The trailing comma creates a single-element tuple in Python.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Python',
    difficulty: DifficultyLevel.HARD,
    text: 'How does Python\'s CPython implementation manage memory for unused objects?',
    options: [
      { id: 'A', text: 'Manual deallocation with free()' },
      { id: 'B', text: 'Reference counting combined with a generational cyclic garbage collector' },
      { id: 'C', text: 'Stop-the-world Mark and Sweep' },
      { id: 'D', text: 'Stack allocation only' },
    ],
    correctOptId: 'B',
    explanation: 'CPython relies primarily on reference counting, supplemented by a cyclic GC to clean up reference cycles.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Python',
    difficulty: DifficultyLevel.EASY,
    text: 'Which built-in function in Python returns the number of items in a container or collection?',
    options: [
      { id: 'A', text: 'size()' },
      { id: 'B', text: 'count()' },
      { id: 'C', text: 'len()' },
      { id: 'D', text: 'length()' },
    ],
    correctOptId: 'C',
    explanation: 'The len() function returns the length (number of items) of an object.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Python',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'What is the result of [1, 2, 3] * 2 in Python?',
    options: [
      { id: 'A', text: '[2, 4, 6]' },
      { id: 'B', text: '[1, 2, 3, 1, 2, 3]' },
      { id: 'C', text: 'TypeError' },
      { id: 'D', text: '[[1, 2, 3], [1, 2, 3]]' },
    ],
    correctOptId: 'B',
    explanation: 'The * operator when applied to lists performs repetition.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Python',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Which keyword in Python is used to define an anonymous inline function?',
    options: [
      { id: 'A', text: 'def' },
      { id: 'B', text: 'inline' },
      { id: 'C', text: 'lambda' },
      { id: 'D', text: 'func' },
    ],
    correctOptId: 'C',
    explanation: 'Lambda functions are small anonymous functions defined using the lambda keyword.',
  },

  // 7. C Programming (5)
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'C Programming',
    difficulty: DifficultyLevel.EASY,
    text: 'What is the value of sizeof(char) in standard C on all compliant architectures?',
    options: [
      { id: 'A', text: '1 byte' },
      { id: 'B', text: '2 bytes' },
      { id: 'C', text: '4 bytes' },
      { id: 'D', text: 'Architecture dependent' },
    ],
    correctOptId: 'A',
    explanation: 'By C standard specification, sizeof(char) is defined to be exactly 1.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'C Programming',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'What will happen if a C program attempts to dereference a NULL pointer?',
    options: [
      { id: 'A', text: 'Returns 0' },
      { id: 'B', text: 'Returns garbage value' },
      { id: 'C', text: 'Segmentation Fault / Runtime Crash' },
      { id: 'D', text: 'Compiles to NOP' },
    ],
    correctOptId: 'C',
    explanation: 'Dereferencing NULL leads to undefined behavior, resulting in a segmentation fault on modern operating systems.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'C Programming',
    difficulty: DifficultyLevel.EASY,
    text: 'Which standard C memory management function allocates memory dynamically and initializes all bytes to zero?',
    options: [
      { id: 'A', text: 'malloc()' },
      { id: 'B', text: 'calloc()' },
      { id: 'C', text: 'realloc()' },
      { id: 'D', text: 'free()' },
    ],
    correctOptId: 'B',
    explanation: 'calloc() allocates memory and clears all bits to zero, unlike malloc().',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'C Programming',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'What does the static keyword specify when applied to a global variable in C?',
    options: [
      { id: 'A', text: 'Value cannot be changed' },
      { id: 'B', text: 'Scope is restricted to the current translation unit (file)' },
      { id: 'C', text: 'Stored in CPU registers' },
      { id: 'D', text: 'Automatically freed on function exit' },
    ],
    correctOptId: 'B',
    explanation: 'Static at global scope limits variable visibility to that specific C file.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'C Programming',
    difficulty: DifficultyLevel.HARD,
    text: 'What is the output of printf("%d", 5 >> 1); in standard C?',
    options: [
      { id: 'A', text: '10' },
      { id: 'B', text: '2' },
      { id: 'C', text: '1' },
      { id: 'D', text: '0' },
    ],
    correctOptId: 'B',
    explanation: 'Right shift 5 (0101 in binary) by 1 yields 2 (0010 in binary).',
  },

  // 8. DBMS (5)
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'DBMS',
    difficulty: DifficultyLevel.EASY,
    text: 'Which SQL clause is used to filter records after an aggregate function (e.g. GROUP BY) has been calculated?',
    options: [
      { id: 'A', text: 'WHERE' },
      { id: 'B', text: 'HAVING' },
      { id: 'C', text: 'GROUP BY' },
      { id: 'D', text: 'ORDER BY' },
    ],
    correctOptId: 'B',
    explanation: 'HAVING filters groups created by GROUP BY based on aggregated calculations.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'DBMS',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Which native PostgreSQL data type allows indexing and querying JSON documents efficiently using GIN indexes?',
    options: [
      { id: 'A', text: 'VARCHAR' },
      { id: 'B', text: 'TEXT' },
      { id: 'C', text: 'JSONB' },
      { id: 'D', text: 'BLOB' },
    ],
    correctOptId: 'C',
    explanation: 'JSONB stores binary JSON representations supporting indexable key-value operations.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'DBMS',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'What is the default storage engine in modern MySQL that provides full ACID compliance and foreign key constraints?',
    options: [
      { id: 'A', text: 'MyISAM' },
      { id: 'B', text: 'InnoDB' },
      { id: 'C', text: 'Memory' },
      { id: 'D', text: 'NDB Cluster' },
    ],
    correctOptId: 'B',
    explanation: 'InnoDB is MySQL\'s default transactional engine featuring row-level locking and ACID transactions.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'DBMS',
    difficulty: DifficultyLevel.HARD,
    text: 'Which index structure is most widely used in relational databases for fast logarithmic lookups and range queries?',
    options: [
      { id: 'A', text: 'Hash Index' },
      { id: 'B', text: 'B-Tree Index' },
      { id: 'C', text: 'Full-Text Index' },
      { id: 'D', text: 'R-Tree Index' },
    ],
    correctOptId: 'B',
    explanation: 'B-Tree indexes maintain balanced order, supporting O(log N) point lookups and range scans.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'DBMS',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'What does Atomicity in ACID database properties guarantee for transactions?',
    options: [
      { id: 'A', text: 'Data availability across multi-node clusters' },
      { id: 'B', text: 'All operations in a transaction complete successfully, or none take effect ("all-or-nothing")' },
      { id: 'C', text: 'Encryption of stored records' },
      { id: 'D', text: 'Data consistency across foreign keys' },
    ],
    correctOptId: 'B',
    explanation: 'Atomicity ensures that a transaction is treated as a single indivisible unit of work.',
  },

  // 9. Operating Systems (5)
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Operating Systems',
    difficulty: DifficultyLevel.EASY,
    text: 'What condition occurs when two or more processes are blocked indefinitely, each waiting for resources held by another?',
    options: [
      { id: 'A', text: 'Starvation' },
      { id: 'B', text: 'Deadlock' },
      { id: 'C', text: 'Thrashing' },
      { id: 'D', text: 'Paging' },
    ],
    correctOptId: 'B',
    explanation: 'Deadlock happens when circular resource dependencies prevent any process from progressing.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Operating Systems',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'In virtual memory, what is the term for excessive page swapping that degrades overall system CPU utilization?',
    options: [
      { id: 'A', text: 'Segmentation' },
      { id: 'B', text: 'Fragmenting' },
      { id: 'C', text: 'Thrashing' },
      { id: 'D', text: 'Spooling' },
    ],
    correctOptId: 'C',
    explanation: 'Thrashing occurs when memory page faulting consumes more CPU time than actual task processing.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Operating Systems',
    difficulty: DifficultyLevel.EASY,
    text: 'Which process state transition occurs when a running process is preempted by the OS CPU scheduler?',
    options: [
      { id: 'A', text: 'Running to Waiting' },
      { id: 'B', text: 'Running to Ready' },
      { id: 'C', text: 'Ready to Running' },
      { id: 'D', text: 'Waiting to Terminated' },
    ],
    correctOptId: 'B',
    explanation: 'When preempted by timer interrupt, a running process transitions back to the Ready queue.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Operating Systems',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Which CPU scheduling algorithm assigns fixed time quanta to processes in a circular queue?',
    options: [
      { id: 'A', text: 'Shortest Job First' },
      { id: 'B', text: 'Priority Scheduling' },
      { id: 'C', text: 'Round Robin' },
      { id: 'D', text: 'Multi-level Queue' },
    ],
    correctOptId: 'C',
    explanation: 'Round Robin scheduling uses time slices (quanta) to cycle through processes fairly.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Operating Systems',
    difficulty: DifficultyLevel.HARD,
    text: 'Which synchronization primitive uses integer variables modified atomically via wait() (P) and signal() (V) operations?',
    options: [
      { id: 'A', text: 'Mutex' },
      { id: 'B', text: 'Semaphore' },
      { id: 'C', text: 'Spinlock' },
      { id: 'D', text: 'Monitor' },
    ],
    correctOptId: 'B',
    explanation: 'Dijkstra introduced semaphores with P (wait) and V (signal) atomic operations.',
  },

  // 10. Computer Networks (5)
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Computer Networks',
    difficulty: DifficultyLevel.EASY,
    text: 'Which OSI layer handles logical IP addressing and packet routing across networks?',
    options: [
      { id: 'A', text: 'Data Link Layer' },
      { id: 'B', text: 'Network Layer' },
      { id: 'C', text: 'Transport Layer' },
      { id: 'D', text: 'Application Layer' },
    ],
    correctOptId: 'B',
    explanation: 'Layer 3 (Network Layer) is responsible for routing IP packets across connected networks.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Computer Networks',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'What key guarantee distinguishes TCP from UDP at the Transport Layer?',
    options: [
      { id: 'A', text: 'UDP provides connection-oriented reliability' },
      { id: 'B', text: 'TCP provides connection-oriented, reliable, ordered byte-stream delivery' },
      { id: 'C', text: 'TCP is connectionless and faster' },
      { id: 'D', text: 'UDP operates at the Application Layer' },
    ],
    correctOptId: 'B',
    explanation: 'TCP guarantees packet delivery and ordering via handshakes and acknowledgments, unlike UDP.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Computer Networks',
    difficulty: DifficultyLevel.EASY,
    text: 'Which protocol maps domain names (e.g. google.com) to IP addresses?',
    options: [
      { id: 'A', text: 'DHCP' },
      { id: 'B', text: 'HTTP' },
      { id: 'C', text: 'DNS' },
      { id: 'D', text: 'FTP' },
    ],
    correctOptId: 'C',
    explanation: 'Domain Name System (DNS) resolves human readable domain names to machine IP addresses.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Computer Networks',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'What is the default port number used by HTTPS (HTTP Secure) protocol?',
    options: [
      { id: 'A', text: '80' },
      { id: 'B', text: '21' },
      { id: 'C', text: '443' },
      { id: 'D', text: '8080' },
    ],
    correctOptId: 'C',
    explanation: 'Port 443 is the standard port for encrypted HTTPS communications.',
  },
  {
    type: QuestionType.TECHNICAL,
    format: QuestionFormat.MCQ_SINGLE,
    domain: 'Core Technical',
    topic: 'Computer Networks',
    difficulty: DifficultyLevel.HARD,
    text: 'Which TCP mechanism prevents a fast sender from flooding a slower receiver with unbuffered packets?',
    options: [
      { id: 'A', text: 'Congestion Control' },
      { id: 'B', text: 'Flow Control (Sliding Window)' },
      { id: 'C', text: 'Error Detection' },
      { id: 'D', text: 'Three-way Handshake' },
    ],
    correctOptId: 'B',
    explanation: 'Flow control uses sliding window advertisements from receiver to sender to prevent buffer overflow.',
  },
];

async function main(): Promise<void> {
  console.log('🌱 Starting full database seed process...');

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

  // 2. Clean existing records for fresh idempotent setup
  console.log('🧹 Purging old candidate sessions, questions, and exams...');
  await prisma.answer.deleteMany({});
  await prisma.warning.deleteMany({});
  await prisma.examSession.deleteMany({});
  await prisma.examQuestion.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.exam.deleteMany({});
  await prisma.candidate.deleteMany({});

  // 3. Seed 50 Candidates with password Candidate@123
  console.log('🌱 Seeding 50 Candidate accounts with password Candidate@123...');
  const candidatePasswordHash = await bcrypt.hash('Candidate@123', 12);
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
      status: 'REGISTERED' as const,
      passwordHash: candidatePasswordHash,
    });
  }

  await prisma.candidate.createMany({ data: candidateData });
  console.log('✅ Seeded 50 Candidates successfully');

  // 4. Seed 50 Questions
  console.log('🌱 Seeding 50 default structured questions...');
  const createdQuestions = [];
  for (const q of defaultQuestions) {
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
  console.log(`✅ Seeded ${createdQuestions.length} default questions successfully`);

  // 5. Create One Default Assessment Drive
  const aptQuestions = createdQuestions.filter((q) => q.type === QuestionType.APTITUDE);
  const techQuestions = createdQuestions.filter((q) => q.type === QuestionType.TECHNICAL);

  const defaultExam = await prisma.exam.create({
    data: {
      title: 'Full Stack Developer Assessment Drive',
      description: 'Official assessment drive covering 20 Aptitude and 30 Technical Core questions.',
      status: ExamStatus.ACTIVE,
      aptitudeDurationSec: 900,
      technicalDurationSec: 900,
      aptitudeQuestionCount: aptQuestions.length, // 20
      technicalQuestionCount: techQuestions.length, // 30
      createdById: admin.id,
    },
  });

  const examQuestionData = [
    ...aptQuestions.map((q, idx) => ({
      examId: defaultExam.id,
      questionId: q.id,
      order: idx + 1,
    })),
    ...techQuestions.map((q, idx) => ({
      examId: defaultExam.id,
      questionId: q.id,
      order: aptQuestions.length + idx + 1,
    })),
  ];

  await prisma.examQuestion.createMany({ data: examQuestionData });
  console.log(`✅ Created Exam "${defaultExam.title}" with ${examQuestionData.length} assigned questions`);

  // 6. Create ExamSessions for all 50 candidates
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
