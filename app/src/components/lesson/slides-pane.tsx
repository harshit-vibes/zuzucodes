'use client';

import { useEffect, useRef } from 'react';
import { ProblemPanel } from '@/components/lesson/problem-panel';
import type { TestCase } from '@/lib/judge0';

interface SlidesPaneProps {
  content: string;
  problemSummary: string | null;
  problemConstraints: string[];
  problemHints: string[];
  testCases: TestCase[] | null;
  entryPoint: string | null;
}

/**
 * Prepend <!-- .slide: data-auto-animate --> to any section that contains
 * a fenced code block, so reveal.js morphs code between adjacent slides.
 * Authors write plain markdown — this is injected automatically.
 */
function injectAutoAnimate(content: string): string {
  return content
    .split('\n---\n')
    .map((section) =>
      /^```/m.test(section)
        ? '<!-- .slide: data-auto-animate -->\n' + section.trimStart()
        : section
    )
    .join('\n---\n');
}

export function SlidesPane({
  content,
  problemSummary,
  problemConstraints,
  problemHints,
  testCases,
  entryPoint,
}: SlidesPaneProps) {
  const deckRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const processedContent = injectAutoAnimate(content);

  useEffect(() => {
    const container = deckRef.current;
    const textarea = textareaRef.current;
    if (!container || !textarea) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let deck: any;

    async function init() {
      const [
        { default: Reveal },
        { default: RevealMarkdown },
        { default: RevealHighlight },
        { KaTeX },
      ] = await Promise.all([
        // @ts-ignore — no type declarations for reveal.js
        import('reveal.js'),
        // @ts-ignore — no type declarations for reveal.js plugins
        import('reveal.js/plugin/markdown/markdown.esm.js'),
        // @ts-ignore — no type declarations for reveal.js plugins
        import('reveal.js/plugin/highlight/highlight.esm.js'),
        // @ts-ignore — no type declarations for reveal.js plugins
        import('reveal.js/plugin/math/katex'),
      ]);

      // @ts-ignore — CSS module types not declared for reveal.js assets
      await import('reveal.js/dist/reveal.css');
      // @ts-ignore — CSS module types not declared for reveal.js assets
      await import('reveal.js/plugin/highlight/monokai.css');

      // Set textarea innerHTML so reveal.js markdown plugin can read it.
      // Must happen before deck.initialize().
      // textarea is guaranteed non-null: checked in outer scope before init() is called
      textarea!.innerHTML = processedContent;

      deck = new Reveal(container, {
        embedded: true,
        disableLayout: true,
        hash: false,
        respondToHashChanges: false,
        view: 'scroll',
        scrollSnap: 'mandatory',
        transition: 'none',
        backgroundTransition: 'none',
        autoAnimate: true,
        autoAnimateDuration: 0.4,
        autoAnimateEasing: 'ease',
        autoAnimateUnmatched: true,
        controls: false,
        progress: false,
        slideNumber: false,
        help: false,
        keyboard: true,
        touch: true,
        navigationMode: 'linear',
        plugins: [RevealMarkdown, RevealHighlight, KaTeX],
      });

      await deck.initialize();
    }

    init();

    return () => {
      deck?.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty — key={lessonId} on parent forces remount between lessons

  return (
    <div ref={deckRef} className="reveal h-full w-full">
      <div className="slides">
        <section data-markdown>
          <textarea ref={textareaRef} data-template readOnly />
        </section>

        {problemSummary && (
          <section>
            <div className="overflow-y-auto h-full px-8 py-8">
              <ProblemPanel
                problemSummary={problemSummary}
                problemConstraints={problemConstraints}
                problemHints={problemHints}
                testCases={testCases}
                entryPoint={entryPoint}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
