'use client';

import { motion } from 'motion/react';
import { ReactNode } from 'react';

interface SectionHeaderProps {
  tag: string;
  headline: string;
  description?: string;
  align?: 'left' | 'center';
  children?: ReactNode;
}

export function SectionHeader({
  tag,
  headline,
  description,
  align = 'center',
  children,
}: SectionHeaderProps) {
  const alignClass = align === 'center' ? 'text-center' : 'text-left';
  const descMaxWidth = align === 'center' ? 'max-w-[600px] mx-auto' : '';

  return (
    <motion.header
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`mb-16 ${alignClass}`}
    >
      <span className="tag mb-6 inline-block">{tag}</span>
      <h2 className="display-lg text-balance">{headline}</h2>
      {description && (
        <p className={`body-lg text-[var(--text-secondary)] mt-5 ${descMaxWidth}`}>
          {description}
        </p>
      )}
      {children}
    </motion.header>
  );
}
