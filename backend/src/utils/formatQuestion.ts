export function formatQuestion(q: any) {
  if (!q) return q;

  let options = q.options;
  if (typeof options === 'string') {
    try {
      options = JSON.parse(options);
    } catch {
      options = [];
    }
  }

  if (!Array.isArray(options)) {
    if (options && typeof options === 'object') {
      options = Object.entries(options).map(([key, val]) => {
        if (val && typeof val === 'object') {
          return {
            id: String((val as any).id || key),
            text: String((val as any).text || (val as any).label || ''),
          };
        }
        return { id: key, text: String(val) };
      });
    } else {
      options = [];
    }
  }

  let correctAnswer = q.correctAnswer;
  if (typeof correctAnswer === 'string') {
    try {
      correctAnswer = JSON.parse(correctAnswer);
    } catch {
      correctAnswer = [correctAnswer];
    }
  }

  if (!Array.isArray(correctAnswer)) {
    correctAnswer = correctAnswer !== undefined && correctAnswer !== null ? [correctAnswer] : [];
  }

  const text = q.text || q.question || '';

  return {
    ...q,
    text,
    question: text,
    options,
    correctAnswer,
    section: q.type === 'APTITUDE' ? 'Aptitude' : 'Technical',
  };
}
