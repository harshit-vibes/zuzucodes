import { AuthView } from '@neondatabase/auth/react';
import { BrandLogo } from '@/components/shared/brand-logo';
import Link from 'next/link';

export const dynamicParams = false;

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden px-4 py-20">

      {/* Background: neural grid */}
      <div className="absolute inset-0 neural-grid opacity-20" />

      {/* Background: gradient orbs */}
      <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />

      {/* Logo bar — top left */}
      <div className="absolute top-0 left-0 p-6">
        <Link
          href="https://zuzu.codes"
          className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors"
        >
          <BrandLogo width={28} height={28} />
          <span className="font-display font-semibold text-lg">zuzu.codes</span>
        </Link>
      </div>

      {/* Auth card */}
      <div className="relative z-10 w-full max-w-sm glass-premium rounded-2xl shadow-lg p-8">
        <AuthView path={path} />
      </div>

    </div>
  );
}
