import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentGateway } from "@/components/payment/PaymentGateway";

export type PostOrderPaystackModalProps = {
  open: boolean;
  onClose: () => void;
  amount: number;
  orderId: string;
  description: string;
  successNavigateTo: string;
};

/**
 * Full-viewport Paystack step after an order is created. Uses a body portal with an
 * extreme z-index so it wins over the cart Sheet, mobile nav, and chat widgets (Radix
 * Dialog at the same z-index as Sheet was unreliable on some mobile layouts).
 */
export function PostOrderPaystackModal({
  open,
  onClose,
  amount,
  orderId,
  description,
  successNavigateTo,
}: PostOrderPaystackModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-black/70 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-order-paystack-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-lg border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full"
          onClick={onClose}
          aria-label="Close payment"
        >
          <X className="h-5 w-5" />
        </Button>
        <div className="p-4 pt-12 sm:p-6 sm:pt-6">
          <h2 id="post-order-paystack-title" className="sr-only">
            Pay for your order
          </h2>
          <PaymentGateway
            amount={amount}
            currency="KES"
            description={description}
            orderId={orderId}
            successNavigateTo={successNavigateTo}
            onSuccess={() => {}}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
