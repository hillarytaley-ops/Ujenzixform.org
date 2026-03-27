import * as React from "react";
import { Button } from "@/components/ui/button";
import { HamburgerMenuIcon } from "@/components/dashboard/HamburgerMenuIcon";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type DashboardMobileActionSheetProps = {
  title: string;
  /** Shown below the title in the sheet (optional). */
  description?: string;
  /** Extra classes for the hamburger trigger button (e.g. light-on-gradient styles). */
  triggerClassName?: string;
  /** Extra classes for the sheet panel. */
  contentClassName?: string;
  children: React.ReactNode;
};

/**
 * Classic hamburger (☰) opens a right sheet with dashboard navigation/actions.
 * Use with `hidden md:flex` (or similar) for inline desktop controls.
 * Mark blocks that should not close the sheet (Select, language menu) with `data-keep-sheet-open`.
 */
export function DashboardMobileActionSheet({
  title,
  description,
  triggerClassName,
  contentClassName,
  children,
}: DashboardMobileActionSheetProps) {
  const [open, setOpen] = React.useState(false);

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-keep-sheet-open]")) return;
    if (target.closest("a[href]") || target.closest("button")) {
      setOpen(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "h-11 w-11 shrink-0 rounded-xl border-2 md:hidden border-border/80 bg-background/95 p-0 shadow-sm",
            triggerClassName
          )}
          aria-label="Open navigation menu"
          aria-haspopup="dialog"
        >
          <HamburgerMenuIcon className="h-[22px] w-[22px]" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className={cn("flex w-full flex-col sm:max-w-sm", contentClassName)}>
        <SheetHeader className="text-left">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </SheetHeader>
        <div
          className="mt-6 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-4"
          onClick={handleContentClick}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
