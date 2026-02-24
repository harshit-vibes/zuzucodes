export interface ParsedError {
  errorType: string;
  message: string;
  line: number | null;
  raw: string;
}

export function parsePythonError(stderr: string): ParsedError {
  const raw = stderr;

  // Extract last "File "<exec>", line N" → user code line
  let line: number | null = null;
  const lineMatches = [...stderr.matchAll(/File "[^"]+", line (\d+)/g)];
  if (lineMatches.length > 0) {
    line = parseInt(lineMatches[lineMatches.length - 1][1], 10);
  }

  // Extract last line of traceback: "ErrorType: message"
  let errorType = 'Error';
  let message = stderr.trim();
  const errorLineMatch = stderr.match(/^(\w+(?:Error|Exception|Warning|KeyboardInterrupt|SystemExit|GeneratorExit)):\s*(.+)$/m);
  if (errorLineMatch) {
    errorType = errorLineMatch[1];
    message = errorLineMatch[2].trim();
  } else {
    // Fallback: last non-empty line
    const lines = stderr.trim().split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      message = lines[lines.length - 1].trim();
    }
  }

  return { errorType, message, line, raw };
}

export function isAssertionError(parsed: ParsedError): boolean {
  return parsed.errorType === 'AssertionError';
}

export function extractAssertionMessage(parsed: ParsedError): string {
  // The assertion message is what's after "AssertionError: "
  if (parsed.message) return parsed.message;
  // Try to extract from raw
  const match = parsed.raw.match(/AssertionError:\s*(.+)/);
  return match ? match[1].trim() : 'Assertion failed';
}

export type FormattedOutput =
  | { type: 'json'; value: string }
  | { type: 'text'; value: string };

export function formatOutput(raw: string): FormattedOutput {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return { type: 'json', value: JSON.stringify(parsed, null, 2) };
    } catch {
      // Not valid JSON — fall through to text
    }
  }
  return { type: 'text', value: raw };
}
