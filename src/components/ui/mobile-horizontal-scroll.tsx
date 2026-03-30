import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Tone = "default" | "dark";

export interface MobileHorizontalScrollProps {
  children: ReactNode;
  /** Classes on the outer wrapper (e.g. rounded border) */
  className?: string;
  /** Extra classes on the scroll viewport (e.g. max-h, rounded) */
  scrollClassName?: string;
  /** Styling for the mobile arrow strip */
  tone?: Tone;
}

/**
 * Wraps wide tables on small screens: swipe/scroll horizontally, plus red/blue chevron buttons
 * visible only below `md` when content overflows.
 */
export function MobileHorizontalScroll({
  children,
  className = "",
  scrollClassName = "",
  tone = "default",
}: MobileHorizontalScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowX, setOverflowX] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setOverflowX(el.scrollWidth > el.clientWidth + 2);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const scrollStep = useCallback((dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const delta = Math.min(el.clientWidth * 0.72, 300) * dir;
    el.scrollBy({ left: delta, behavior: "smooth" });
  }, []);

  const footerTone =
    tone === "dark"
      ? "border-slate-700/80 bg-slate-950/95 text-slate-200"
      : "border-border/60 bg-muted/90 text-foreground backdrop-blur-sm";

  return (
    <div className={className}>
      <div
        ref={ref}
        className={`overflow-x-auto overflow-y-visible scroll-smooth touch-pan-x ${scrollClassName}`}
        onScroll={measure}
      >
        {children}
      </div>
      {overflowX ? (
        <div
          className={`flex md:hidden justify-center items-center gap-8 border-t py-2.5 px-2 ${footerTone}`}
          role="toolbar"
          aria-label="Scroll table horizontally"
        >
          <button
            type="button"
            onClick={() => scrollStep(-1)}
            className="h-12 w-12 shrink-0 rounded-full bg-red-600 text-white shadow-md flex items-center justify-center active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => scrollStep(1)}
            className="h-12 w-12 shrink-0 rounded-full bg-blue-600 text-white shadow-md flex items-center justify-center active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
