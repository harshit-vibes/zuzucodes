'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const termsContent = `
# Terms of Service

**Last updated: January 2026**

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

All course content, materials, and branding are owned by ZuzuCodes. Unauthorized reproduction or distribution is prohibited.

## 5. Payment & Refunds

Payment terms are specified at checkout. Refund policies vary by course tier and are communicated during enrollment.

## 6. Limitation of Liability

ZuzuCodes is not liable for indirect, incidental, or consequential damages arising from use of our services.

## 7. Contact

For questions, contact us at hello@zuzu.codes
`;

const privacyContent = `
# Privacy Policy

**Last updated: January 2026**

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

For privacy inquiries, contact us at hello@zuzu.codes
`;

function Dialog({ isOpen, onClose, title, children }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-[var(--cream)] rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-[var(--border)]">
        {/* Header */}
        <div className="flex items-center justify-between bg-[var(--cream)] border-b border-[var(--border)]" style={{ padding: '20px 28px' }}>
          <h2 className="font-medium text-lg text-[var(--text-dark)]">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--warm-gray)] transition-colors"
          >
            <svg className="w-5 h-5 text-[var(--text-medium)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-80px)]" style={{ padding: '28px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const WHATSAPP_URL = 'https://wa.me/918011858376?text=enquiry%20for%20zuzu.codes';

export function Footer() {
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <>
      <footer className="footer-minimal">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm text-[var(--text-light)]">
          <span className="font-medium text-[var(--text-dark)]">
            zuzu<span className="text-[var(--gold)]">.</span>codes
          </span>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--gold)] transition-colors"
          >
            Contact
          </a>
          <button
            onClick={() => setTermsOpen(true)}
            className="hover:text-[var(--gold)] transition-colors"
          >
            Terms
          </button>
          <button
            onClick={() => setPrivacyOpen(true)}
            className="hover:text-[var(--gold)] transition-colors"
          >
            Privacy
          </button>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
      </footer>

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
