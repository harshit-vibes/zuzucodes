'use client';

import { useState } from 'react';
import { Sparkles, Bug, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ItemType = 'feature' | 'bug' | 'learning';

const TYPE_OPTIONS: { value: ItemType; label: string; Icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { value: 'feature',  label: 'Feature',  Icon: Sparkles,  description: 'Platform improvement' },
  { value: 'bug',      label: 'Bug',      Icon: Bug,        description: 'Something is broken'  },
  { value: 'learning', label: 'Learning', Icon: BookOpen,   description: 'New course or lesson'  },
];

interface SubmitIdeaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmitIdeaModal({ open, onOpenChange }: SubmitIdeaModalProps) {
  const [type, setType] = useState<ItemType>('feature');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleClose(value: boolean) {
    if (!value) {
      setType('feature');
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
        body: JSON.stringify({ title: title.trim(), description: description.trim(), type }),
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
            {/* Type selector */}
            <div>
              <label className="text-xs font-medium text-foreground/80 mb-1.5 block">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {TYPE_OPTIONS.map(({ value, label, Icon, description }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-all',
                      type === value
                        ? 'border-primary/50 bg-primary/8 text-primary'
                        : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-medium">{label}</span>
                    <span className="text-[9px] text-muted-foreground/60 leading-tight">{description}</span>
                  </button>
                ))}
              </div>
            </div>
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
