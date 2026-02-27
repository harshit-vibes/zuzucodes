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
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width / 2, canvas.height / 2],
    });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`${courseTitle.replace(/\s+/g, '-').toLowerCase()}-certificate.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Certificate card — this div is captured by html2canvas */}
      <div
        ref={certRef}
        className="rounded-xl border-2 border-border/40 bg-background p-10 text-center space-y-5"
      >
        <p className="font-mono text-[10px] text-muted-foreground/40 uppercase tracking-[0.3em]">
          zuzu.codes
        </p>

        <div className="w-12 h-px bg-border/40 mx-auto" />

        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40">
          Certificate of Completion
        </p>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground/50">This certifies that</p>
          <p className="text-2xl font-semibold text-foreground">{studentName}</p>
          <p className="text-xs text-muted-foreground/50">has successfully completed</p>
          <p className="text-xl font-semibold text-foreground mt-1">{courseTitle}</p>
        </div>

        <div className="w-12 h-px bg-border/40 mx-auto" />

        <p className="font-mono text-[10px] text-muted-foreground/40">{completionDate}</p>
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
