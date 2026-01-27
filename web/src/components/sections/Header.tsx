'use client';

import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { useEffect, useState, useCallback } from 'react';

interface Section {
  id: string;
  title: string;
}

const sections: Section[] = [
  { id: 'shift', title: 'The Shift' },
  { id: 'method', title: 'The Method' },
  { id: 'audience', title: 'Who It\'s For' },
  { id: 'courses', title: 'The Courses' },
  { id: 'pricing', title: 'Pricing' },
  { id: 'footer', title: 'About' },
];

interface HeaderProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function Header({ containerRef }: HeaderProps) {
  const [activeSection, setActiveSection] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Track active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map((s) =>
        document.getElementById(s.id)
      );

      const scrollPosition = window.scrollY + window.innerHeight / 3;

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const section = sectionElements[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(i);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = useCallback((index: number) => {
    const section = document.getElementById(sections[index].id);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <header className="header">
      {/* Progress bar */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--accent)] origin-left"
        style={{ scaleX }}
      />

      <div className="header-inner">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2"
        >
          <span className="text-lg font-medium text-[var(--text-primary)]">
            zuzu<span className="text-[var(--accent)]">.</span>codes
          </span>
        </motion.div>

        {/* Center: Section title + dots */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="hidden md:flex items-center gap-6"
        >
          {/* Current section title */}
          <motion.span
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-[var(--text-secondary)] min-w-[100px] text-center"
          >
            {sections[activeSection].title}
          </motion.span>

          {/* Section dots */}
          <div className="section-dots">
            {sections.map((section, i) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(i)}
                className={`section-dot ${i === activeSection ? 'active' : ''}`}
                aria-label={`Go to ${section.title}`}
                title={section.title}
              />
            ))}
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <a
            href="https://wa.me/918011858376?text=enquiry%20for%20zuzu.codes"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm py-2.5 px-5"
          >
            Contact Us
          </a>
        </motion.div>
      </div>
    </header>
  );
}
