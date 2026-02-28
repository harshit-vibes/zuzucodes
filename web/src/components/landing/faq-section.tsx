"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "Do I need any prior coding experience?",
    answer:
      "None at all. We start from the very first concept — what code is, how a computer reads it, and how to write your first program. No shortcuts, no assumptions.",
  },
  {
    question: "How long does the course take?",
    answer:
      "Go at your own pace. Most learners complete the first track in 4–6 weeks spending about an hour a day. There are no deadlines or cohort schedules.",
  },
  {
    question: "What happens after the 7-day trial ends?",
    answer:
      "You'll be charged the monthly subscription fee automatically. If you cancel before day 7, you won't be charged anything. No questions, no hassle.",
  },
  {
    question: "Is this for me if I'm not planning a career in tech?",
    answer:
      "Absolutely. In the AI era, knowing how to code makes you better at almost any job — it's like knowing Excel was 20 years ago, but far more powerful. It gives you the ability to build tools, automate work, and understand what AI is actually doing.",
  },
  {
    question: "How is this different from freeCodeCamp or Codecademy?",
    answer:
      "Those platforms give you exercises. zuzu.codes gives you a learning system built for this moment — when AI makes coding relevant to everyone, not just developers. The 4-quadrant method builds genuine understanding, not just the ability to pass tests.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Cancel directly from your account settings, no email required. If you cancel mid-month, you keep access until the end of your billing period.",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="font-medium text-foreground pr-4">{question}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{answer}</p>
      )}
    </div>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />

      <div className="container relative mx-auto px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Common Questions
            </h2>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8">
            {faqs.map((faq) => (
              <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
