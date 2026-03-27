import * as React from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
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
 * Hamburger + right sheet for dashboard header actions on small screens.
 * Use with `hidden md:flex` (or similar) for the inline desktop actions.
 * Mark interactive blocks that should not close the sheet (Select, language menu) with `data-keep-sheet-open`.
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
            "h-10 w-10 shrink-0 md:hidden border-border bg-background/95 shadow-sm",
            triggerClassName
          )}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className={cn("flex w-full flex-col sm:max-w-sm", contentClassName)}>
        <SheetHeader className="text-left">
          <SheetTitle>{title}</SheetTitle>
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
