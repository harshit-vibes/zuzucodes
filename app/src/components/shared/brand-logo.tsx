"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface BrandLogoProps {
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
}

export function BrandLogo({
  width = 32,
  height = 32,
  className = "",
  alt = "zuzu.codes",
}: BrandLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Avoid hydration mismatch by showing light logo initially
  const logoSrc = mounted && resolvedTheme === "dark"
    ? "/zuzu-logo-dark.png"
    : "/zuzu-logo.png";

  return (
    <Image
      src={logoSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
