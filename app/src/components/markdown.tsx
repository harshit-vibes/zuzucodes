import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  return (
    <div className="prose-article">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-display text-3xl font-semibold tracking-tight mt-12 mb-6 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display text-2xl font-semibold tracking-tight mt-10 mb-4 pt-6 border-t border-border/50 first:border-t-0 first:pt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display text-xl font-semibold mt-8 mb-3">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="font-semibold mt-6 mb-2">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="my-5 leading-[1.8] text-foreground/90">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-5 ml-1 space-y-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-5 ml-1 space-y-2 list-decimal list-inside">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="relative pl-6 leading-[1.8] text-foreground/90 before:content-[''] before:absolute before:left-0 before:top-[0.75em] before:w-1.5 before:h-1.5 before:rounded-full before:bg-primary/40">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="relative my-6 pl-5 py-1 border-l-2 border-primary/40 bg-gradient-to-r from-primary/5 to-transparent rounded-r-lg">
              <div className="text-muted-foreground italic">{children}</div>
            </blockquote>
          ),
          code: ({ className, children }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-muted text-[0.9em] font-mono text-primary/90 before:content-none after:content-none">
                  {children}
                </code>
              );
            }
            return (
              <code className="font-mono text-sm leading-relaxed">{children}</code>
            );
          },
          pre: ({ children }) => (
            <pre className="relative my-6 p-5 rounded-xl bg-[oklch(0.15_0.015_280)] text-[oklch(0.9_0.01_280)] overflow-x-auto border border-[oklch(0.25_0.02_280)]">
              <div className="absolute top-3 right-3 flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[oklch(0.5_0.15_25)]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[oklch(0.7_0.15_85)]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[oklch(0.6_0.15_145)]" />
              </div>
              {children}
            </pre>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary transition-colors"
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          hr: () => (
            <hr className="my-10 border-none h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          ),
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50 border-b border-border">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 border-t border-border/50">{children}</td>
          ),
          img: ({ src, alt }) => (
            <span className="block my-6 rounded-xl overflow-hidden border border-border shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt || ''} className="w-full" />
              {alt && (
                <span className="block px-4 py-2 bg-muted/50 text-sm text-muted-foreground text-center">
                  {alt}
                </span>
              )}
            </span>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
