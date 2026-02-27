'use client';

import { motion } from 'motion/react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { WHATSAPP_URL } from '@/lib/constants';

const termsContent = `
# Terms of Service

**Last updated: January 2026**

zuzu.codes is operated by **Kuma Learn**.

## 1. Acceptance of Terms

By accessing and using zuzu.codes, you agree to be bound by these Terms of Service.

## 2. Services

zuzu.codes provides AI-native upskilling courses and educational content. Course access is subject to enrollment and payment terms.

## 3. User Responsibilities

- Provide accurate information during registration
- Maintain confidentiality of your account
- Use the platform for lawful purposes only
- Respect intellectual property rights

## 4. Intellectual Property

All course content, materials, and branding are owned by Kuma Learn. Unauthorized reproduction or distribution is prohibited.

## 5. Payment & Refunds

Payment terms are specified at checkout. Refund policies vary by course tier and are communicated during enrollment.

## 6. Limitation of Liability

Kuma Learn is not liable for indirect, incidental, or consequential damages arising from use of our services.

## 7. Contact

For questions, reach out via WhatsApp.
`;

const privacyContent = `
# Privacy Policy

**Last updated: January 2026**

zuzu.codes is operated by **Kuma Learn**.

## 1. Information We Collect

- **Account Information**: Name, email, payment details
- **Usage Data**: Course progress, interactions, preferences
- **Technical Data**: Browser type, IP address, device information

## 2. How We Use Your Information

- Provide and improve our services
- Process payments and enrollments
- Send course updates and communications
- Analyze usage patterns to enhance experience

## 3. Data Sharing

We do not sell your personal information. We may share data with:
- Payment processors for transactions
- Service providers who assist our operations
- Legal authorities when required by law

## 4. Data Security

We implement industry-standard security measures to protect your information.

## 5. Your Rights

You may request access to, correction of, or deletion of your personal data by contacting us.

## 6. Cookies

We use essential cookies for site functionality and analytics cookies to improve our services.

## 7. Contact

For privacy inquiries, reach out via WhatsApp.
`;

function Dialog({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="relative bg-[var(--cream)] rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-[var(--border)]">
        <div
          className="flex items-center justify-between bg-[var(--cream)] border-b border-[var(--border)]"
          style={{ padding: '20px 28px' }}
        >
          <h2 id="dialog-title" className="font-medium text-lg text-[var(--text-dark)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--warm-gray)] transition-colors"
          >
            <svg className="w-5 h-5 text-[var(--text-medium)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(85vh-80px)]" style={{ padding: '28px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function CTASection() {
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <>
      <section
        id="cta"
        className="section bg-dark flex flex-col"
      >
        {/* CTA content — vertically centered, grows to fill */}
        <div className="w-full max-w-[720px] mx-auto flex flex-col items-center text-center flex-grow justify-center py-16">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            className="w-full"
          >
            <span
              className="tag mb-10 inline-block"
              style={{ background: 'rgba(184, 134, 11, 0.15)', color: 'var(--gold)' }}
            >
              Start today
            </span>
            <h2
              className="text-heading mb-8 text-balance"
              style={{ color: 'var(--dark-text)' }}
            >
              Start your AI journey today.
            </h2>
            <p
              className="text-body mb-12 mx-auto max-w-[560px]"
              style={{ color: 'rgba(245, 243, 239, 0.65)' }}
            >
              Join 500+ professionals building AI-native instincts. The next cohort starts soon.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Get Started
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              <button
                onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-secondary-dark"
              >
                View Courses
              </button>
            </div>
          </motion.div>
        </div>

        {/* Footer strip */}
        <div
          className="w-full border-t py-6 mt-auto"
          style={{ borderColor: 'var(--dark-border)' }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm max-w-[1200px] mx-auto px-6">
            <span className="font-medium" style={{ color: 'var(--dark-text)' }}>
              zuzu<span style={{ color: 'var(--gold)' }}>.</span>codes
            </span>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'rgba(245, 243, 239, 0.5)' }}
              className="hover:text-[var(--gold)] transition-colors"
            >
              Contact
            </a>
            <button
              onClick={() => setTermsOpen(true)}
              style={{ color: 'rgba(245, 243, 239, 0.5)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit' }}
              className="hover:text-[var(--gold)] transition-colors"
            >
              Terms
            </button>
            <button
              onClick={() => setPrivacyOpen(true)}
              style={{ color: 'rgba(245, 243, 239, 0.5)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit' }}
              className="hover:text-[var(--gold)] transition-colors"
            >
              Privacy
            </button>
            <span style={{ color: 'rgba(245, 243, 239, 0.4)' }}>
              &copy; {new Date().getFullYear()} Kuma Learn
            </span>
          </div>
        </div>
      </section>

      <Dialog isOpen={termsOpen} onClose={() => setTermsOpen(false)} title="Terms of Service">
        <div className="prose-content">
          <ReactMarkdown>{termsContent}</ReactMarkdown>
        </div>
      </Dialog>

      <Dialog isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} title="Privacy Policy">
        <div className="prose-content">
          <ReactMarkdown>{privacyContent}</ReactMarkdown>
        </div>
      </Dialog>
    </>
  );
}
