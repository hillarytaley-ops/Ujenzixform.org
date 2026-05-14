/**
 * KRA eTIMS fiscal receipt layout — structured like an OSCU/VFD tax receipt
 * with verification QR at the bottom (standard size).
 */

import React, { useMemo } from 'react';
import { parseEtimsReceiptForDisplay } from '@/lib/etims/formatEtimsReceiptForUi';
import { EtimsVerificationQr } from '@/components/etims/EtimsVerificationQr';
import { cn } from '@/lib/utils';

function ReceiptMetaRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs leading-snug">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-mono text-foreground">{value.trim()}</span>
    </div>
  );
}

export type EtimsFiscalReceiptViewProps = {
  poNumber: string;
  verificationUrl?: string | null;
  etimsResponse: unknown;
  traderInvoiceNoDb?: string | null;
  etimsSubmittedAt?: string | null;
  supplierName?: string | null;
  className?: string;
};

export const EtimsFiscalReceiptView: React.FC<EtimsFiscalReceiptViewProps> = ({
  poNumber,
  verificationUrl,
  etimsResponse,
  traderInvoiceNoDb,
  etimsSubmittedAt,
  supplierName,
  className,
}) => {
  const receipt = useMemo(
    () =>
      parseEtimsReceiptForDisplay(etimsResponse, {
        storedVerificationUrl: verificationUrl,
        traderInvoiceNoDb,
        poNumber,
      }),
    [etimsResponse, verificationUrl, traderInvoiceNoDb, poNumber],
  );

  const hasPayload =
    etimsResponse != null &&
    typeof etimsResponse === 'object' &&
    Object.keys(etimsResponse as Record<string, unknown>).length > 0;

  const submittedLabel = etimsSubmittedAt
    ? new Date(etimsSubmittedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  const displayDate = receipt.salesDate || submittedLabel;

  return (
    <article
      className={cn(
        'mx-auto w-full max-w-md overflow-hidden rounded-lg border border-slate-300 bg-white font-sans text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100',
        className,
      )}
    >
      {/* Header */}
      <header className="border-b border-slate-200 px-4 py-4 text-center dark:border-slate-800">
        {supplierName?.trim() ? (
          <p className="text-sm font-bold uppercase tracking-wide">{supplierName.trim()}</p>
        ) : null}
        <p className="text-[11px] text-muted-foreground">Purchase order {poNumber}</p>
        <p className="mt-3 text-xs font-semibold tracking-[0.2em] text-slate-700 dark:text-slate-300">
          ——— FISCAL TAX RECEIPT ———
        </p>
      </header>

      {/* Invoice meta */}
      <section className="space-y-1.5 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <ReceiptMetaRow label="Invoice No" value={receipt.invoiceNo} />
        <ReceiptMetaRow label="Trader Inv No" value={receipt.traderInvoiceNo} />
        <ReceiptMetaRow label="Date" value={displayDate} />
        <ReceiptMetaRow label="Customer" value={receipt.customerName || 'WALK-IN CUSTOMER'} />
        <ReceiptMetaRow label="Customer PIN" value={receipt.customerPin} />
        <ReceiptMetaRow label="Payment Type" value={receipt.paymentType} />
        <ReceiptMetaRow label="Currency" value={receipt.currency} />
      </section>

      {/* Line items */}
      {receipt.lines.length > 0 ? (
        <section className="border-b border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                  <th className="w-8 px-2 py-1.5 text-left font-semibold">#</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Item</th>
                  <th className="w-10 px-2 py-1.5 text-right font-semibold">Qty</th>
                  <th className="w-14 px-2 py-1.5 text-right font-semibold">Price</th>
                  <th className="w-16 px-2 py-1.5 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {receipt.lines.map((line) => (
                  <tr key={line.index} className="border-b border-slate-100 last:border-0 dark:border-slate-800/80">
                    <td className="px-2 py-1.5 text-muted-foreground">{line.index}</td>
                    <td className="px-2 py-1.5">
                      <span className="block leading-tight">{line.name}</span>
                      {line.code !== '—' ? (
                        <span className="font-mono text-[9px] text-muted-foreground">{line.code}</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">{line.qty}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{line.unitPrice}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{line.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : !hasPayload ? (
        <section className="border-b border-slate-200 px-4 py-3 text-xs text-amber-800 dark:border-slate-800 dark:text-amber-200">
          Line items were not stored for this receipt. Open the KRA verification link below if available.
        </section>
      ) : null}

      {/* Totals */}
      {(receipt.taxableAmount || receipt.taxAmount || receipt.totalAmount) && (
        <section className="flex justify-end border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="min-w-[9rem] space-y-1 border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
            {receipt.taxableAmount ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Taxable</span>
                <span className="font-mono">{receipt.taxableAmount}</span>
              </div>
            ) : null}
            {receipt.taxAmount ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-mono">{receipt.taxAmount}</span>
              </div>
            ) : null}
            {receipt.totalAmount ? (
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-1 font-semibold dark:border-slate-700">
                <span>Total</span>
                <span className="font-mono">{receipt.totalAmount}</span>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* SCU / compliance block */}
      {(receipt.scdcId ||
        receipt.scuReceiptNo ||
        receipt.scuDate ||
        receipt.internalData ||
        receipt.signature ||
        receipt.exchangeRate) && (
        <section className="space-y-1 border-b border-slate-200 px-4 py-3 text-[10px] leading-relaxed dark:border-slate-800">
          <ReceiptMetaRow label="Currency" value={receipt.currency} />
          <ReceiptMetaRow label="SCDC ID" value={receipt.scdcId} />
          <ReceiptMetaRow label="SCU Receipt No" value={receipt.scuReceiptNo || receipt.receiptNo} />
          <ReceiptMetaRow label="SCU Date" value={receipt.scuDate} />
          <ReceiptMetaRow label="Internal Data" value={receipt.internalData} />
          <ReceiptMetaRow label="Signature" value={receipt.signature} />
          <ReceiptMetaRow label="Exchange rate" value={receipt.exchangeRate} />
        </section>
      )}

      {/* QR verification footer */}
      {receipt.verificationUrl ? (
        <footer className="px-4 py-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wide">Scan QR Code To Verify Receipt</p>
          <EtimsVerificationQr
            verificationUrl={receipt.verificationUrl}
            size={120}
            variant="footer"
            className="mt-3 border-0 bg-transparent p-0 shadow-none dark:bg-transparent"
          />
        </footer>
      ) : null}

      {/* Technical JSON — collapsed */}
      {hasPayload ? (
        <details className="border-t border-slate-200 px-4 py-2 text-[10px] dark:border-slate-800">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Technical response (JSON)
          </summary>
          <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-50 p-2 font-mono dark:bg-slate-900/50">
            {JSON.stringify(etimsResponse, null, 2)}
          </pre>
        </details>
      ) : null}

      <p className="border-t border-slate-200 py-2 text-center text-[10px] font-medium text-muted-foreground dark:border-slate-800">
        Powered by eTIMS
      </p>
    </article>
  );
};

export default EtimsFiscalReceiptView;
