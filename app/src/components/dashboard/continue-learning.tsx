import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { ResumeData } from "@/lib/data";

interface ContinueLearningProps {
  data: ResumeData | null;
}

export function ContinueLearning({ data }: ContinueLearningProps) {
  if (!data) {
    return null;
  }

  return (
    <Link
      href={data.href}
      className="block rounded-xl border bg-card p-4 sm:p-6 transition-all hover:border-primary/50 hover:shadow-md group"
    >
      <div className="flex gap-3 sm:gap-4">
        {/* Thumbnail */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {data.course.thumbnail_url ? (
            <Image
              src={data.course.thumbnail_url}
              alt={data.course.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Continue where you left off</p>
          <h3 className="font-semibold text-sm sm:text-base truncate mb-0.5 sm:mb-1 group-hover:text-primary transition-colors">
            {data.course.title}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {data.moduleTitle} · {data.contentTitle}
          </p>

          {/* Progress */}
          <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3">
            <Progress value={data.progress} className="flex-1 h-1.5" />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
              {data.progress}%
            </span>
          </div>
        </div>

        {/* Arrow - hidden on small screens */}
        <div className="hidden sm:flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
            <ArrowRight className="h-5 w-5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
