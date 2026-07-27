export interface OptionItem {
  id: string;
  text: string;
}

/**
 * Safely parses and normalizes options into an array of { id: string, text: string }.
 * Handles JSON strings, JavaScript arrays, and Key-Value objects.
 */
export function parseQuestionOptions(rawOptions: any): OptionItem[] {
  if (!rawOptions) return [];

  let parsed = rawOptions;
  if (typeof rawOptions === 'string') {
    try {
      parsed = JSON.parse(rawOptions);
    } catch {
      return [];
    }
  }

  // Handle Array format
  if (Array.isArray(parsed)) {
    return parsed
      .map((opt, idx) => {
        if (typeof opt === 'string') {
          return { id: String.fromCharCode(65 + idx), text: opt };
        }
        if (opt && typeof opt === 'object') {
          return {
            id: String(opt.id || opt.key || String.fromCharCode(65 + idx)),
            text: String(opt.text || opt.label || opt.value || ''),
          };
        }
        return { id: String.fromCharCode(65 + idx), text: String(opt) };
      })
      .filter((o) => Boolean(o.text));
  }

  // Handle Object / Dictionary format
  if (parsed && typeof parsed === 'object') {
    return Object.entries(parsed)
      .map(([key, val]) => {
        if (val && typeof val === 'object') {
          const objVal = val as any;
          return {
            id: String(objVal.id || key),
            text: String(objVal.text || objVal.label || ''),
          };
        }
        return {
          id: key,
          text: String(val),
        };
      })
      .filter((o) => Boolean(o.text));
  }

  return [];
}

/**
 * Safely parses and normalizes correctAnswer into string[].
 */
export function parseCorrectAnswer(rawAnswer: any): string[] {
  if (!rawAnswer) return [];

  let parsed = rawAnswer;
  if (typeof rawAnswer === 'string') {
    try {
      parsed = JSON.parse(rawAnswer);
    } catch {
      return [rawAnswer];
    }
  }

  if (Array.isArray(parsed)) {
    return parsed.map((item) => String(item));
  }

  if (typeof parsed === 'string') {
    return [parsed];
  }

  return [];
}
