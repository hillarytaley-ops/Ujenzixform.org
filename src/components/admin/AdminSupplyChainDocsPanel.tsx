import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ClipboardList,
  FileCheck2,
  FileText,
  ExternalLink,
  Info,
  Truck,
  Store,
  HardHat,
  BookOpen,
} from "lucide-react";
import { AdminSupplyChainLiveSummary } from "@/components/admin/AdminSupplyChainLiveSummary";

const BUILDER_INVOICES_URL = "/professional-builder-dashboard?tab=invoices";
const SUPPLIER_INVOICE_URL = "/supplier-dashboard?tab=invoice";

export function AdminSupplyChainDocsPanel() {
  return (
    <div className="space-y-10">
      {/* Primary: live data */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 border-b border-slate-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-white">Live activity</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-400">
              Row counts and the latest records your staff session can read (RLS). Use{" "}
              <span className="font-medium text-gray-300">PDF</span> to download from storage or open a printable
              view.
            </p>
          </div>
        </div>
        <AdminSupplyChainLiveSummary />
      </section>

      {/* Quick actions */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold tracking-tight text-white">Open as builder or supplier</h3>
        <p className="max-w-2xl text-sm text-gray-500">
          Links open in a new tab. Full DN/GRN screens need the matching role — use test accounts when checking
          end-to-end flows.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <HardHat className="h-5 w-5 text-blue-400" />
                Builder — Invoices hub
              </CardTitle>
              <CardDescription className="text-gray-400">
                Delivery notes, GRN, and invoices in one place.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full bg-slate-800 text-white hover:bg-slate-700" asChild>
                <a href={BUILDER_INVOICES_URL} target="_blank" rel="noopener noreferrer">
                  Open builder Invoices tab
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Store className="h-5 w-5 text-orange-400" />
                Supplier — Invoice hub
              </CardTitle>
              <CardDescription className="text-gray-400">
                Delivery notes, GRN visibility, and invoice tools.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full bg-slate-800 text-white hover:bg-slate-700" asChild>
                <a href={SUPPLIER_INVOICE_URL} target="_blank" rel="noopener noreferrer">
                  Open supplier Invoice tab
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Reference — collapsed by default so the page stays scannable */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-gray-400">
          <BookOpen className="h-4 w-4 shrink-0" />
          <span className="text-xs font-medium uppercase tracking-wide">Reference</span>
        </div>
        <Accordion type="multiple" className="space-y-2">
          <AccordionItem value="staff" className="rounded-lg border border-slate-800 bg-slate-950/40 px-1">
            <AccordionTrigger className="px-3 py-3 text-left text-sm font-medium text-white hover:no-underline">
              Staff tips — test accounts, RLS &amp; storage
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-4">
              <Alert className="border-amber-600/40 bg-amber-950/25 text-amber-100">
                <Info className="h-4 w-4 text-amber-400" />
                <AlertTitle className="text-amber-100">How to validate flows</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed text-amber-100/85">
                  Builder and supplier screens require the correct <strong>user role</strong> in Supabase. An admin
                  session does not impersonate another user&apos;s full DN/GRN UI. Use a <strong>test builder</strong> or{" "}
                  <strong>test supplier</strong> (e.g. incognito) for end-to-end checks. Totals and tables here follow
                  admin RLS and storage policies.
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="flow" className="rounded-lg border border-slate-800 bg-slate-950/40 px-1">
            <AccordionTrigger className="px-3 py-3 text-left text-sm font-medium text-white hover:no-underline">
              <span className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-emerald-400" />
                End-to-end flow (dispatch → invoice)
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-4">
              <ol className="list-decimal space-y-3 pl-5 text-sm text-gray-300">
                <li>
                  <span className="font-medium text-white">Order &amp; dispatch</span> — Supplier prepares materials;
                  logistics may assign a delivery provider.
                </li>
                <li>
                  <span className="font-medium text-white">Delivery note (DN)</span> — What left the supplier / in
                  transit. Builder reviews in the <strong>Invoices</strong> hub.
                </li>
                <li>
                  <span className="font-medium text-white">GRN</span> — Receipt at site; ties delivery to the order.
                </li>
                <li>
                  <span className="font-medium text-white">Invoice</span> — Financial document; builder acknowledges in{" "}
                  <strong>Invoices</strong>. Aggregates also appear under <strong>Finance → Financial</strong>.
                </li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="roles" className="rounded-lg border border-slate-800 bg-slate-950/40 px-1">
            <AccordionTrigger className="px-3 py-3 text-left text-sm font-medium text-white hover:no-underline">
              Role cheat sheet
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 p-4 text-sm">
                  <Store className="mb-2 h-5 w-5 text-orange-400" />
                  <p className="font-medium text-white">Supplier</p>
                  <p className="mt-1 text-gray-400">Dispatch, DN, invoicing, GRN visibility.</p>
                </div>
                <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 p-4 text-sm">
                  <Truck className="mb-2 h-5 w-5 text-teal-400" />
                  <p className="font-medium text-white">Delivery</p>
                  <p className="mt-1 text-gray-400">Pickup, proof of delivery, site handoff.</p>
                </div>
                <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 p-4 text-sm">
                  <HardHat className="mb-2 h-5 w-5 text-blue-400" />
                  <p className="font-medium text-white">Builder</p>
                  <p className="mt-1 text-gray-400">DN sign-off, GRN, invoice acknowledgement.</p>
                </div>
                <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 p-4 text-sm">
                  <FileText className="mb-2 h-5 w-5 text-emerald-400" />
                  <p className="font-medium text-white">Admin / Finance</p>
                  <p className="mt-1 text-gray-400">Oversight via Financial, Orders, and this screen.</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="dn-detail" className="rounded-lg border border-slate-800 bg-slate-950/40 px-1">
            <AccordionTrigger className="px-3 py-3 text-left text-sm font-medium text-white hover:no-underline">
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-orange-400" />
                Delivery notes — operational detail
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-4 text-sm leading-relaxed text-gray-400">
              Delivery notes record the shipment leg: items, quantities, vehicle/driver where applicable, and timestamps.
              Builder signature / inspection often gates later GRN or invoice steps. If stuck, check order status,
              delivery assignment, and builder notifications.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="grn-detail" className="rounded-lg border border-slate-800 bg-slate-950/40 px-1">
            <AccordionTrigger className="px-3 py-3 text-left text-sm font-medium text-white hover:no-underline">
              <span className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-cyan-400" />
                GRN — operational detail
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-4 text-sm leading-relaxed text-gray-400">
              The GRN confirms goods received in acceptable condition. It aligns supplier, transporter, and builder on
              the audit trail; suppliers may mark GRNs viewed after builder receipt.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="inv-detail" className="rounded-lg border border-slate-800 bg-slate-950/40 px-1">
            <AccordionTrigger className="px-3 py-3 text-left text-sm font-medium text-white hover:no-underline">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-400" />
                Invoices — operational detail
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-4 text-sm leading-relaxed text-gray-400">
              Invoices carry amounts, due dates, and status. Use the <strong>Financial</strong> tab for aggregates; open
              individual PDFs here when investigating support tickets. Auto-created invoices should still be checked
              for correct order linkage.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}

export default AdminSupplyChainDocsPanel;
