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
} from "lucide-react";
import { AdminSupplyChainLiveSummary } from "@/components/admin/AdminSupplyChainLiveSummary";

const BUILDER_INVOICES_URL = "/professional-builder-dashboard?tab=invoices";
const SUPPLIER_INVOICE_URL = "/supplier-dashboard?tab=invoice";

export function AdminSupplyChainDocsPanel() {
  return (
    <div className="space-y-6">
      <Alert className="border-amber-600/50 bg-amber-950/30 text-amber-100">
        <Info className="h-4 w-4 text-amber-400" />
        <AlertTitle className="text-amber-100">How staff should use these links</AlertTitle>
        <AlertDescription className="text-amber-100/85 text-sm leading-relaxed">
          Builder and supplier screens require the corresponding <strong>user role</strong> in Supabase. Your
          admin session will not impersonate another user&apos;s full DN/GRN screens. Use a{" "}
          <strong>test builder</strong> or <strong>test supplier</strong> account (e.g. incognito or another
          browser profile) when validating flows end-to-end. Below, <strong>live totals and recent rows</strong>{" "}
          reflect database records your admin JWT can read (RLS). Links open in a <strong>new tab</strong> so
          you keep this dashboard open.
        </AlertDescription>
      </Alert>

      <AdminSupplyChainLiveSummary />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <HardHat className="h-5 w-5 text-blue-400" />
              Builder — Invoices hub
            </CardTitle>
            <CardDescription className="text-gray-400">
              Delivery notes, GRN, and invoices (tabs inside one area).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              className="w-full bg-slate-800 text-white hover:bg-slate-700"
              asChild
            >
              <a href={BUILDER_INVOICES_URL} target="_blank" rel="noopener noreferrer">
                Open builder Invoices tab
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Store className="h-5 w-5 text-orange-400" />
              Supplier — Invoice hub
            </CardTitle>
            <CardDescription className="text-gray-400">
              Delivery notes, GRN visibility, and invoice tooling for suppliers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              className="w-full bg-slate-800 text-white hover:bg-slate-700"
              asChild
            >
              <a href={SUPPLIER_INVOICE_URL} target="_blank" rel="noopener noreferrer">
                Open supplier Invoice tab
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-emerald-400" />
            End-to-end flow (reference)
          </CardTitle>
          <CardDescription className="text-gray-400">
            Typical sequence from dispatch to payment documentation. Wording may vary slightly per order type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-3 text-sm text-gray-300">
            <li>
              <span className="text-white font-medium">Order & dispatch</span> — Supplier prepares materials;
              delivery provider may be assigned via platform logistics.
            </li>
            <li>
              <span className="text-white font-medium">Delivery note (DN)</span> — Documents what left the
              supplier / is in transit. Builder reviews, may sign or run inspection steps in the{" "}
              <strong>Invoices</strong> hub (Delivery notes section).
            </li>
            <li>
              <span className="text-white font-medium">GRN (Goods Received Note)</span> — Confirms receipt at
              site; ties physical delivery to the order. Managed alongside delivery documentation in the same
              builder workflow area.
            </li>
            <li>
              <span className="text-white font-medium">Invoice</span> — Financial document (supplier →
              builder). Created or surfaced after delivery milestones; builder acknowledges in{" "}
              <strong>Invoices</strong>. Admin visibility for totals and status appears under{" "}
              <strong>Finance → Financial</strong> on this dashboard.
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">Role cheat sheet</CardTitle>
          <CardDescription className="text-gray-400">
            Who usually touches each artifact.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 p-4">
            <Store className="h-5 w-5 text-orange-400 mb-2" />
            <p className="text-white font-medium">Supplier</p>
            <p className="text-gray-400 mt-1">
              Dispatch, DN support, invoice issuance, GRN visibility where configured.
            </p>
          </div>
          <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 p-4">
            <Truck className="h-5 w-5 text-teal-400 mb-2" />
            <p className="text-white font-medium">Delivery</p>
            <p className="text-gray-400 mt-1">Pickup, proof of delivery, handoff to site.</p>
          </div>
          <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 p-4">
            <HardHat className="h-5 w-5 text-blue-400 mb-2" />
            <p className="text-white font-medium">Builder</p>
            <p className="text-gray-400 mt-1">Sign / inspect DN, confirm GRN, acknowledge invoices.</p>
          </div>
          <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 p-4">
            <FileText className="h-5 w-5 text-emerald-400 mb-2" />
            <p className="text-white font-medium">Admin / Finance</p>
            <p className="text-gray-400 mt-1">
              Oversight via <strong>Financial</strong>, <strong>Orders</strong>, and this guide — not a substitute
              for on-site verification.
            </p>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="space-y-2">
        <AccordionItem value="dn" className="border border-slate-800 rounded-lg px-4 bg-slate-900/40">
          <AccordionTrigger className="text-white hover:no-underline py-4">
            <span className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-orange-400" />
              Delivery notes — operational detail
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-gray-400 text-sm pb-4 leading-relaxed">
            Delivery notes record the shipment leg: items, quantities, vehicle/driver where applicable, and
            timestamps. The builder&apos;s action (signature / inspection) is the gate before GRN or invoice
            steps advance in many workflows. If a note is &quot;stuck&quot;, check the related order status,
            delivery assignment, and builder notifications.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="grn" className="border border-slate-800 rounded-lg px-4 bg-slate-900/40">
          <AccordionTrigger className="text-white hover:no-underline py-4">
            <span className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-cyan-400" />
              GRN — operational detail
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-gray-400 text-sm pb-4 leading-relaxed">
            The GRN proves goods were received in acceptable condition at the destination. It reduces disputes
            between supplier, transporter, and builder. Suppliers may need to mark GRNs as viewed once the
            builder completes receipt so everyone shares the same audit trail.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="inv" className="border border-slate-800 rounded-lg px-4 bg-slate-900/40">
          <AccordionTrigger className="text-white hover:no-underline py-4">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" />
              Invoices — operational detail
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-gray-400 text-sm pb-4 leading-relaxed">
            Invoices carry amounts, tax lines if used, due dates, and status (draft, sent, paid, overdue).
            Cross-check the <strong>Financial</strong> tab here for aggregates; drill into individual records
            when investigating support tickets. Auto-created invoices should still be reviewed for correct
            linkage to orders and delivery completion.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export default AdminSupplyChainDocsPanel;
