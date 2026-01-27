'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'featured';
  padding?: 'sm' | 'md' | 'lg';
  /**
   * Context determines the card's background color based on parent section.
   * 'on-surface' = card is on a --bg-surface section (uses --bg-elevated-on-surface)
   * 'on-primary' = card is on a --bg-primary section (uses --bg-elevated-on-primary)
   */
  context?: 'on-surface' | 'on-primary';
  className?: string;
}

const paddingStyles = {
  sm: 'p-5 sm:p-6',
  md: 'p-6 sm:p-8',
  lg: 'p-8 sm:p-10',
};

const contextStyles = {
  'on-surface': 'bg-[var(--bg-elevated-on-surface)]',
  'on-primary': 'bg-[var(--bg-elevated-on-primary)]',
};

const variantStyles = {
  default: 'border border-[var(--border-default)] hover:border-[var(--border-hover)]',
  featured: 'border-2 border-[var(--accent)] shadow-[var(--shadow-accent)]',
};

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  context = 'on-surface',
  className = '',
}: CardProps) {
  return (
    <div
      className={`
        rounded-xl transition-all duration-300
        ${contextStyles[context]}
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
