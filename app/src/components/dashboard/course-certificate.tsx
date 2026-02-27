'use client';

import { useRef } from 'react';

interface CourseCertificateProps {
  studentName: string;
  courseTitle: string;
  completionDate: string;
}

export function CourseCertificate({
  studentName,
  courseTitle,
  completionDate,
}: CourseCertificateProps) {
  const certRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!certRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');

    const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width / 2, canvas.height / 2],
    });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`${courseTitle.replace(/\s+/g, '-').toLowerCase()}-certificate.pdf`);
  };

  const gold = '#c9a84c';
  const bg = '#0f0f0f';
  const textPrimary = '#f5f0e8';
  const textMuted = 'rgba(245, 240, 232, 0.45)';

  return (
    <div className="space-y-4">
      {/* Wrapper centres the fixed-width card */}
      <div className="flex justify-center">
        {/* Certificate card — captured by html2canvas */}
        <div
          ref={certRef}
          style={{
            width: 600,
            height: 800,
            backgroundColor: bg,
            color: textPrimary,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '48px 64px',
            boxSizing: 'border-box',
            borderRadius: 16,
            border: `1px solid rgba(201, 168, 76, 0.2)`,
          }}
        >
          {/* Top double rule */}
          <div style={{ width: '100%', marginBottom: 24 }}>
            <div style={{ height: 3, backgroundColor: gold, borderRadius: 2, marginBottom: 4 }} />
            <div style={{ height: 1, backgroundColor: gold, opacity: 0.35, borderRadius: 1 }} />
          </div>

          {/* Brand row */}
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.28em', color: gold, textTransform: 'uppercase' }}>
              zuzu.codes
            </span>
            <span style={{ color: gold, fontSize: 18, lineHeight: '1' }}>★</span>
          </div>

          {/* Lower top rule */}
          <div style={{ width: '100%', marginBottom: 56 }}>
            <div style={{ height: 1, backgroundColor: gold, opacity: 0.35, borderRadius: 1, marginBottom: 4 }} />
            <div style={{ height: 1, backgroundColor: gold, opacity: 0.15, borderRadius: 1 }} />
          </div>

          {/* "Certificate of Completion" label */}
          <p style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.3em', color: gold, textTransform: 'uppercase', marginBottom: 20, textAlign: 'center' }}>
            Certificate of Completion
          </p>

          {/* Short gold rule */}
          <div style={{ width: 64, height: 1, backgroundColor: gold, opacity: 0.5, marginBottom: 40 }} />

          {/* "This certifies that" */}
          <p style={{ fontSize: 12, color: textMuted, marginBottom: 20, fontStyle: 'italic', textAlign: 'center' }}>
            This certifies that
          </p>

          {/* Student name — Playfair Display */}
          <p style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: 34, fontWeight: 600, color: gold, marginBottom: 24, textAlign: 'center', lineHeight: 1.2 }}>
            {studentName}
          </p>

          {/* "has successfully completed" */}
          <p style={{ fontSize: 12, color: textMuted, marginBottom: 20, textAlign: 'center' }}>
            has successfully completed
          </p>

          {/* Course title */}
          <p style={{ fontSize: 20, fontWeight: 600, color: textPrimary, marginBottom: 40, textAlign: 'center', lineHeight: 1.35, maxWidth: 400 }}>
            {courseTitle}
          </p>

          {/* Completion date */}
          <p style={{ fontFamily: 'monospace', fontSize: 11, color: textMuted, textAlign: 'center' }}>
            {completionDate}
          </p>

          {/* Spacer to push footer down */}
          <div style={{ flex: 1 }} />

          {/* Bottom double rule */}
          <div style={{ width: '100%', marginBottom: 16 }}>
            <div style={{ height: 1, backgroundColor: gold, opacity: 0.35, borderRadius: 1, marginBottom: 4 }} />
            <div style={{ height: 3, backgroundColor: gold, borderRadius: 2 }} />
          </div>

          {/* Footer */}
          <p style={{ fontFamily: 'monospace', fontSize: 10, color: textMuted, letterSpacing: '0.12em', textAlign: 'center' }}>
            zuzu.codes © 2026
          </p>
        </div>
      </div>

      {/* Download button — outside certRef, not captured in PDF */}
      <button
        onClick={handleDownload}
        className="w-full h-9 rounded-lg border border-border text-sm font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        Download Certificate →
      </button>
    </div>
  );
}
