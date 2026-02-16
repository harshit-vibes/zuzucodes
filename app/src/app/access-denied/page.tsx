import Link from 'next/link';

export default function AccessDeniedPage() {
  const mainSiteUrl =
    process.env.NODE_ENV === 'production'
      ? `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'zuzu.codes'}`
      : 'http://localhost:3000';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          You don&apos;t have access to this organization. Please contact your
          administrator if you believe this is a mistake.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href={mainSiteUrl}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go to zuzu.codes
          </Link>
        </div>
      </div>
    </div>
  );
}
