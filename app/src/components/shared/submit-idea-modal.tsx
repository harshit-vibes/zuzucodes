'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SubmitIdeaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmitIdeaModal({ open, onOpenChange }: SubmitIdeaModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleClose(value: boolean) {
    if (!value) {
      setTitle('');
      setDescription('');
      setSubmitted(false);
    }
    onOpenChange(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/roadmap/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => handleClose(false), 2000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogTitle>Submit an idea</DialogTitle>
        {submitted ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-foreground mb-1">Thanks!</p>
            <p className="text-xs text-muted-foreground">We'll review your idea soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-1.5 block">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="e.g. Advanced decorators module"
                className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none transition-colors"
              />
              <p className="text-[10px] text-muted-foreground/60 mt-1 text-right">{title.length}/80</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-1.5 block">
                Description <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Any extra context..."
                className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none transition-colors resize-none"
              />
              <p className="text-[10px] text-muted-foreground/60 mt-1 text-right">{description.length}/300</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!title.trim() || submitting}>
                {submitting ? 'Submitting…' : 'Submit idea'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
