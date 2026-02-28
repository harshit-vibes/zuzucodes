'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CoursePlayerShell } from '@/components/course/course-player-shell'
import { CodeEditor } from '@/components/lesson/code-editor'
import { Markdown } from '@/components/shared/markdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Play, Send, CheckCircle2, ChevronDown } from 'lucide-react'
import type { Capstone } from '@/lib/data'
import type { CourseStep } from '@/lib/course-sequence'

type ExecutionPhase = 'idle' | 'running' | 'run-pass' | 'run-fail' | 'error' | 'tle'

interface CapstoneLayoutProps {
  capstone: Capstone
  savedCode: string | null
  savedOutput: string | null
  isSubmitted: boolean
  prevStep: CourseStep | null
  nextStep: CourseStep | null
}

export function CapstoneLayout({
  capstone,
  savedCode,
  savedOutput,
  isSubmitted: initialIsSubmitted,
  prevStep,
  nextStep,
}: CapstoneLayoutProps) {
  const router = useRouter()
  const [code, setCode] = useState(savedCode ?? capstone.starterCode ?? '')
  const [phase, setPhase] = useState<ExecutionPhase>('idle')
  const [stdout, setStdout] = useState<string | null>(savedOutput)
  const [isSubmitted, setIsSubmitted] = useState(initialIsSubmitted)
  const [hasRun, setHasRun] = useState(!!savedOutput)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'done'>('idle')
  const [openHint, setOpenHint] = useState<number | null>(null)

  const handleRun = useCallback(async () => {
    setPhase('running')
    try {
      const res = await fetch('/api/code/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (!res.ok) {
        setPhase('error')
        setStdout(res.status === 429
          ? 'Service busy — please try again in a moment.'
          : 'Execution service unavailable.')
        setHasRun(false)
        return
      }
      const result = await res.json()
      const out: string = result.stdout ?? result.stderr ?? ''
      setStdout(out)
      setHasRun(true)
      if (result.statusId === 5) {
        setPhase('tle')
      } else if (result.stderr || (result.statusId !== 3 && result.statusId !== 0)) {
        setPhase('error')
      } else {
        setPhase('run-pass')
      }
    } catch {
      setPhase('error')
      setStdout('Network error — could not reach executor.')
    }
  }, [code])

  const handleSubmit = useCallback(async () => {
    setSubmitStatus('submitting')
    try {
      await fetch('/api/capstone/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capstoneId: capstone.id, code, output: stdout }),
      })
      setIsSubmitted(true)
      setSubmitStatus('done')
      router.refresh()
    } catch {
      setSubmitStatus('idle')
    }
  }, [capstone.id, code, stdout, router])

  const canSubmit = hasRun && phase !== 'tle' && phase !== 'running' && phase !== 'error'

  return (
    <CoursePlayerShell
      eyebrow="Capstone Project"
      title={capstone.title}
      prevHref={prevStep?.href ?? null}
      prevLabel={prevStep?.label ?? null}
      nextHref={nextStep?.href ?? null}
      nextLabel={nextStep?.label ?? null}
      nextLocked={!isSubmitted}
      scrollable={false}
    >
      <div className="flex h-full divide-x divide-border overflow-hidden">
        {/* Left: Project brief */}
        <div className="w-[44%] flex flex-col overflow-y-auto p-6 gap-4">
          {capstone.requiredPackages.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Uses:</span>
              {capstone.requiredPackages.map((pkg) => (
                <Badge key={pkg} variant="secondary" className="text-xs font-mono">{pkg}</Badge>
              ))}
            </div>
          )}

          {capstone.description && <Markdown content={capstone.description} />}

          {capstone.hints.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Hints</p>
              {capstone.hints.map((hint, i) => (
                <button
                  key={i}
                  onClick={() => setOpenHint(openHint === i ? null : i)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Hint {i + 1}</span>
                    <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', openHint === i && 'rotate-180')} />
                  </div>
                  {openHint === i && (
                    <p className="mt-1.5 text-foreground/80">{hint}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {isSubmitted && (
            <div className="mt-auto flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400 ring-1 ring-green-500/20">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Submitted — under review
            </div>
          )}
        </div>

        {/* Right: Editor + output */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <CodeEditor value={code} onChange={setCode} />
          </div>

          <div className="h-44 border-t border-border bg-muted/10 flex flex-col shrink-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 shrink-0">
              <span className="text-xs font-medium text-muted-foreground">Output</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRun}
                  disabled={phase === 'running'}
                  className="h-7 px-3 text-xs gap-1.5"
                >
                  <Play className="h-3 w-3" />
                  {phase === 'running' ? 'Running…' : 'Run'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitStatus === 'submitting'}
                  className="h-7 px-3 text-xs gap-1.5"
                >
                  <Send className="h-3 w-3" />
                  {submitStatus === 'submitting'
                    ? 'Submitting…'
                    : isSubmitted
                    ? 'Resubmit'
                    : 'Submit for Review'}
                </Button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto p-3 text-xs font-mono text-foreground/80 whitespace-pre-wrap">
              {phase === 'running' ? (
                <span className="text-muted-foreground animate-pulse">Running…</span>
              ) : stdout ? (
                stdout
              ) : (
                <span className="text-muted-foreground">Run your code to see output here.</span>
              )}
            </pre>
          </div>
        </div>
      </div>
    </CoursePlayerShell>
  )
}
