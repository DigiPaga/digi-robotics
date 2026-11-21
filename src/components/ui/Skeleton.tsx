import type { HTMLAttributes } from "react";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export function Skeleton({ className = "", label, ...props }: SkeletonProps) {
  return (
    <div
      {...props}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`relative overflow-hidden rounded-xl bg-white/[0.065] before:absolute before:inset-0 before:-translate-x-full before:animate-[skeleton-shimmer_1.8s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-[#84cc16]/[0.08] before:to-transparent ${className}`}
    />
  );
}
