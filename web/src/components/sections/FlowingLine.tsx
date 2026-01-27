'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import { useRef, useEffect, useState } from 'react';

interface FlowingLineProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function FlowingLine({ containerRef }: FlowingLineProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (typeof window !== 'undefined') {
        setDimensions({
          width: window.innerWidth,
          height: document.documentElement.scrollHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    // Slight delay to get correct height after content loads
    const timer = setTimeout(updateDimensions, 100);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timer);
    };
  }, []);

  // Animate the line draw progress
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // Generate a gentle weaving path
  const generatePath = () => {
    const { width, height } = dimensions;
    if (height === 0) return '';

    const centerX = width / 2;
    const amplitude = Math.min(150, width * 0.1); // Max 150px or 10% of width
    const numSections = 6;
    const sectionHeight = height / numSections;

    let path = `M ${centerX} 0`;

    for (let i = 0; i < numSections; i++) {
      const startY = i * sectionHeight;
      const midY = startY + sectionHeight / 2;
      const endY = (i + 1) * sectionHeight;

      // Alternate side
      const offset = i % 2 === 0 ? amplitude : -amplitude;

      // Cubic bezier curve to create smooth S-wave
      path += ` C ${centerX} ${startY + sectionHeight * 0.25}, ${centerX + offset} ${midY - sectionHeight * 0.1}, ${centerX + offset} ${midY}`;
      path += ` C ${centerX + offset} ${midY + sectionHeight * 0.1}, ${centerX} ${endY - sectionHeight * 0.25}, ${centerX} ${endY}`;
    }

    return path;
  };

  if (dimensions.height === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="absolute top-0 left-0"
        style={{ minHeight: '100vh' }}
      >
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--border-default)" stopOpacity="0" />
            <stop offset="10%" stopColor="var(--border-default)" stopOpacity="1" />
            <stop offset="90%" stopColor="var(--border-default)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--border-default)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="glowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
            <stop offset="10%" stopColor="var(--accent)" stopOpacity="1" />
            <stop offset="90%" stopColor="var(--accent)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background line (full path, subtle) */}
        <path
          d={generatePath()}
          className="flowing-line-path"
          stroke="url(#lineGradient)"
          strokeWidth="1"
          fill="none"
          opacity="0.5"
        />

        {/* Animated glow line (follows scroll) */}
        <motion.path
          d={generatePath()}
          stroke="url(#glowGradient)"
          strokeWidth="2"
          fill="none"
          filter="url(#glow)"
          style={{
            pathLength,
          }}
          strokeLinecap="round"
        />

        {/* Section markers - small circles at each section */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const y = (dimensions.height / 6) * i + dimensions.height / 12;
          const x = dimensions.width / 2 + (i % 2 === 0 ? 1 : -1) * Math.min(150, dimensions.width * 0.1);

          return (
            <motion.circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="var(--bg-card)"
              stroke="var(--border-default)"
              strokeWidth="1"
              style={{
                opacity: useTransform(
                  scrollYProgress,
                  [
                    Math.max(0, (i - 0.5) / 6),
                    i / 6,
                    Math.min(1, (i + 0.5) / 6),
                  ],
                  [0.3, 1, 0.3]
                ),
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}
