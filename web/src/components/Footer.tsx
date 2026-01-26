'use client';

import FadeContent from '@/components/FadeContent';

export function Footer() {
  return (
    <footer className="relative py-24 px-6 bg-[var(--bg-primary)]">
      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-[var(--border-subtle)]" />

      <div className="max-w-5xl mx-auto">
        {/* CTA Section */}
        <FadeContent duration={800}>
          <div className="text-center mb-20">
            <h3 className="text-3xl md:text-4xl font-serif text-[var(--text-primary)] mb-4">
              Ready to start your journey?
            </h3>
            <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
              Join learners building the future of automation with AI-powered workflows.
            </p>

            <button className="btn-premium group">
              <span className="flex items-center gap-3">
                Get Started Free
                <svg
                  className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </button>
          </div>
        </FadeContent>

        {/* Divider */}
        <div className="section-divider mb-12" />

        {/* Bottom section */}
        <FadeContent duration={800} delay={200}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo/Brand */}
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="ZuzuCodes"
                className="w-8 h-8 rounded-lg opacity-80"
              />
              <span className="text-lg font-medium text-[var(--text-primary)]">
                zuzu<span className="text-[var(--accent-primary)]">.</span>codes
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-8 text-sm text-[var(--text-muted)]">
              <a href="#" className="hover:text-[var(--text-primary)] transition-colors">About</a>
              <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Contact</a>
              <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Terms</a>
            </div>

            {/* Copyright */}
            <p className="text-sm text-[var(--text-muted)]">
              &copy; {new Date().getFullYear()} ZuzuCodes
            </p>
          </div>
        </FadeContent>
      </div>
    </footer>
  );
}
