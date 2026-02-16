import { Fragment } from 'react';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm mb-8">
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <svg
              className="w-4 h-4 text-muted-foreground/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 -mx-1.5 rounded hover:bg-muted"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium px-1.5">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
