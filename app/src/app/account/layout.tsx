import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>

        {/* Card */}
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b">
            <h1 className="text-base font-semibold">Account</h1>
          </div>
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
