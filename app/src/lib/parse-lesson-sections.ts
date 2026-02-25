export interface CodeBlockInfo {
  language: string;
  rawContent: string; // preserves indentation, trailing whitespace trimmed
}

export interface LessonSection {
  id: string;              // "section-0", "section-1", ..., "problem"
  markdownBefore: string;  // prose before first code block
  codeBlock: CodeBlockInfo | null;
  markdownAfter: string;   // prose after first code block
  isProblemSection: boolean;
}

// Regex to match fenced code block — the entire match including fences
// ``` followed by optional language, newline, content, newline, closing ```
const FENCE_RE = /^```(\w*)\n([\s\S]*?)^```/m;

/**
 * Split content into chunks by `---` separator lines, but only when outside
 * a fenced code block (lines matching /^```/).
 */
function splitByHorizontalRule(content: string): string[] {
  const lines = content.split('\n');
  const chunks: string[] = [];
  let currentLines: string[] = [];
  let inFence = false;

  for (const line of lines) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      currentLines.push(line);
    } else if (line === '---' && !inFence) {
      chunks.push(currentLines.join('\n'));
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Push the last chunk (even if empty)
  chunks.push(currentLines.join('\n'));

  return chunks;
}

/**
 * Extract the first fenced code block from a chunk of markdown text.
 * Returns markdownBefore, codeBlock, and markdownAfter.
 */
function extractFirstCodeBlock(chunk: string): {
  markdownBefore: string;
  codeBlock: CodeBlockInfo | null;
  markdownAfter: string;
} {
  const match = FENCE_RE.exec(chunk);

  if (!match) {
    return {
      markdownBefore: chunk,
      codeBlock: null,
      markdownAfter: '',
    };
  }

  const language = match[1] ?? '';
  const rawContent = match[2].trimEnd();
  const matchStart = match.index;
  const matchEnd = match.index + match[0].length;

  const markdownBefore = chunk.substring(0, matchStart).trimEnd();
  const markdownAfter = chunk.substring(matchEnd).trimStart();

  return {
    markdownBefore,
    codeBlock: { language, rawContent },
    markdownAfter,
  };
}

export function parseLessonSections(
  content: string,
  problemSummary: string | null,
): LessonSection[] {
  const chunks = splitByHorizontalRule(content);

  const sections: LessonSection[] = chunks.map((chunk, i) => {
    const { markdownBefore, codeBlock, markdownAfter } = extractFirstCodeBlock(chunk);
    return {
      id: `section-${i}`,
      markdownBefore,
      codeBlock,
      markdownAfter,
      isProblemSection: false,
    };
  });

  if (problemSummary !== null && problemSummary.trim() !== '') {
    sections.push({
      id: 'problem',
      markdownBefore: '',
      codeBlock: null,
      markdownAfter: '',
      isProblemSection: true,
    });
  }

  return sections;
}
