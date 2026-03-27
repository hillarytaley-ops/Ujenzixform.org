import { cn } from "@/lib/utils";

/** Classic app-style hamburger: three horizontal bars with rounded ends; uses `currentColor`. */
export function HamburgerMenuIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-6 w-6 shrink-0", className)}
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="3" rx="1.5" fill="currentColor" />
      <rect x="3" y="10.5" width="18" height="3" rx="1.5" fill="currentColor" />
      <rect x="3" y="16" width="18" height="3" rx="1.5" fill="currentColor" />
    </svg>
  );
}
