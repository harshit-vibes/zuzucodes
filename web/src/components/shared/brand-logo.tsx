import Image from "next/image";

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
  return (
    <Image
      src="/zuzu-logo.png"
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
