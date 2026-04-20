import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { TERMS_LAST_UPDATED } from "@/lib/termsPublication";

type TermsFeeSummaryProps = {
  /** Tighter copy for Paystack / payment panels */
  variant?: "registration" | "checkout";
  className?: string;
};

/**
 * Short summary aligned with `/terms` (0.5% fee + in-transit liability).
 * Use next to registration terms checkboxes and before hosted checkout.
 */
export function TermsFeeSummary({ variant = "registration", className }: TermsFeeSummaryProps) {
  const checkout = variant === "checkout";

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground space-y-2",
        className,
      )}
      role="note"
    >
      <p>
        <span className="font-semibold text-foreground">Service fee: </span>
        UjenziXform charges a <span className="font-semibold text-foreground">0.5%</span> service fee on the
        total price of each item, or on the price per unit of measure where pricing is per unit
        {checkout ? ", in addition to other charges shown before you pay." : ", in addition to other platform or payment charges shown before you confirm a transaction where applicable."}
      </p>
      <p>
        <span className="font-semibold text-foreground">Delivery in transit: </span>
        While goods are <span className="font-semibold text-foreground">in transit</span>, UjenziXform is not
        liable for loss or damage from <span className="font-semibold text-foreground">theft</span> or a{" "}
        <span className="font-semibold text-foreground">major accident</span>. Risk during physical carriage is
        between the parties arranging and performing the delivery (for example, supplier, delivery provider,
        and recipient), subject to any separate agreement or insurance those parties may have.
      </p>
      <p>
        Full wording:{" "}
        <Link to="/terms" className="text-primary font-medium underline underline-offset-2">
          Terms of Service
        </Link>{" "}
        (last updated {TERMS_LAST_UPDATED}).
      </p>
    </div>
  );
}
