"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "Do I need any prior coding experience?",
    answer:
      "No. The Python Foundations track assumes you've never written a line of code. We start from the very beginning and move at a pace that makes sense.",
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
      "Absolutely. Knowing Python makes you better at almost any job — it's like knowing Excel was 20 years ago, but more powerful. Doctors, lawyers, analysts, and marketers all benefit from being able to write code.",
  },
  {
    question: "How is this different from freeCodeCamp or Codecademy?",
    answer:
      "Those platforms give you exercises. zuzu.codes gives you a learning system. The Zuzu Method's 4-quadrant approach ensures you build genuine understanding — not just the ability to pass tests and forget what you learned.",
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
        onClick={() => setOpen(!open)}
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
