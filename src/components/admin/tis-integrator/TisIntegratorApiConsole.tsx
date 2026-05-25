/**
 * Integrator API console — master data, customers, items registration (KRA TIS ops).
 */

import React, { useState } from "react";
import {
  Bell,
  Boxes,
  Building2,
  Globe2,
  Hash,
  Loader2,
  Package,
  PackagePlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { invokeEtimsProxy } from "@/lib/etims/invokeEtimsProxy";
import { logTisSubmission } from "@/lib/etims/logTisSubmission";

type ApiAction = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  method: "GET" | "POST";
  path: string;
  bodyTemplate?: string;
};

const GET_ACTIONS: ApiAction[] = [
  { id: "branches", label: "Branches", description: "Vendor branch offices (initialization)", icon: Building2, method: "GET", path: "branches" },
  { id: "countries", label: "Countries", description: "Country reference codes", icon: Globe2, method: "GET", path: "countries" },
  { id: "currencies", label: "Currencies", description: "Currency codes", icon: Hash, method: "GET", path: "currencies" },
  { id: "qtyunits", label: "Qty units", description: "Quantity unit codes", icon: Boxes, method: "GET", path: "qtyunitcodes" },
  { id: "pkgunits", label: "Pack units", description: "Package unit codes", icon: Package, method: "GET", path: "pkgunitcodes" },
  { id: "itemcodes", label: "Item codes", description: "KRA item classification codes", icon: PackagePlus, method: "GET", path: "itemcodes" },
  { id: "notices", label: "Notices", description: "KRA system notices", icon: Bell, method: "GET", path: "notices" },
  { id: "items", label: "Items", description: "Registered item master list", icon: Package, method: "GET", path: "items" },
  { id: "customers", label: "Customers", description: "Registered buyer customers", icon: Users, method: "GET", path: "customers" },
];

const POST_TEMPLATES: ApiAction[] = [
  {
    id: "post-item",
    label: "Register item",
    description: "POST /items — register catalog line with KRA",
    icon: PackagePlus,
    method: "POST",
    path: "items",
    bodyTemplate: JSON.stringify(
      {
        itemCode: "ITEM001",
        name: "Product name",
        taxCode: "B",
        qtyUnitCode: "U",
        pkgUnitCode: "NT",
        itemClassCode: "50101500",
      },
      null,
      2,
    ),
  },
  {
    id: "post-customer",
    label: "Register customer",
    description: "POST /customers — buyer KRA PIN",
    icon: Users,
    method: "POST",
    path: "customers",
    bodyTemplate: JSON.stringify(
      {
        customerPin: "P000000000X",
        customerName: "Buyer Company Ltd",
        address: "Nairobi, Kenya",
      },
      null,
      2,
    ),
  },
];

export const TisIntegratorApiConsole: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string>("");
  const [postBody, setPostBody] = useState(POST_TEMPLATES[0]?.bodyTemplate ?? "{}");
  const [activePost, setActivePost] = useState(POST_TEMPLATES[0]?.id ?? "post-item");
  const [syncDate, setSyncDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}000000`;
  });

  const runGet = async (action: ApiAction) => {
    setLoading(action.id);
    try {
      const res = await invokeEtimsProxy({ method: "GET", path: action.path });
      setLastResult(JSON.stringify(res, null, 2));
      if (!res.ok) {
        toast({ title: `${action.label} failed`, description: res.message, variant: "destructive" });
      } else {
        toast({ title: `${action.label} loaded` });
      }
    } finally {
      setLoading(null);
    }
  };

  const runPost = async () => {
    const tpl = POST_TEMPLATES.find((t) => t.id === activePost);
    if (!tpl) return;
    setLoading(tpl.id);
    try {
      let body: unknown;
      try {
        body = JSON.parse(postBody);
      } catch {
        toast({ title: "Invalid JSON body", variant: "destructive" });
        return;
      }
      const res = await invokeEtimsProxy({ method: "POST", path: tpl.path, body });
      setLastResult(JSON.stringify(res, null, 2));
      await logTisSubmission({
        submissionType: tpl.path === "items" ? "item" : "customer",
        status: res.ok ? "success" : "failed",
        errorMessage: res.ok ? null : res.message,
        responseSnapshot: res.data,
      });
      if (!res.ok) {
        toast({ title: `${tpl.label} failed`, description: res.message, variant: "destructive" });
      } else {
        toast({ title: `${tpl.label} succeeded` });
      }
    } finally {
      setLoading(null);
    }
  };

  const runSyncQuery = async (path: "purchases/queries" | "imports/queries" | "stock/transfer/queries") => {
    setLoading(path);
    try {
      const res = await invokeEtimsProxy({
        method: "GET",
        path,
        query: { last_request_date: syncDate.trim() },
      });
      setLastResult(JSON.stringify(res, null, 2));
      if (!res.ok) {
        toast({ title: "Sync query failed", description: res.message, variant: "destructive" });
      } else {
        toast({ title: "Sync query loaded" });
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-700 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-base text-white">Master data (GET)</CardTitle>
          <CardDescription className="text-gray-400">
            KRA reference endpoints required for TIS initialization and catalog setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {GET_ACTIONS.map((action) => {
              const Icon = action.icon;
              const busy = loading === action.id;
              return (
                <Button
                  key={action.id}
                  type="button"
                  variant="outline"
                  className="h-auto flex-col items-start gap-1 py-3 text-left"
                  disabled={!!loading}
                  onClick={() => void runGet(action)}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                    {action.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{action.description}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-700 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-base text-white">Registration (POST)</CardTitle>
          <CardDescription className="text-gray-400">
            Register items and customers with the integrator before invoicing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {POST_TEMPLATES.map((tpl) => (
              <Button
                key={tpl.id}
                type="button"
                size="sm"
                variant={activePost === tpl.id ? "default" : "outline"}
                onClick={() => {
                  setActivePost(tpl.id);
                  setPostBody(tpl.bodyTemplate ?? "{}");
                }}
              >
                {tpl.label}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Request body (JSON)</Label>
            <Textarea value={postBody} onChange={(e) => setPostBody(e.target.value)} rows={10} className="font-mono text-xs bg-slate-950/60" />
          </div>
          <Button type="button" onClick={() => void runPost()} disabled={!!loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send POST
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-700 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-base text-white">Purchase / import sync queries</CardTitle>
          <CardDescription className="text-gray-400">
            Poll KRA for purchase and import data (last_request_date = yyyyMMddHHmmss).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label>last_request_date</Label>
              <Input value={syncDate} onChange={(e) => setSyncDate(e.target.value)} className="font-mono bg-slate-950/60 max-w-xs" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" disabled={!!loading} onClick={() => void runSyncQuery("purchases/queries")}>
                Purchases
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={!!loading} onClick={() => void runSyncQuery("imports/queries")}>
                Imports
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={!!loading} onClick={() => void runSyncQuery("stock/transfer/queries")}>
                Stock transfers
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {lastResult ? (
        <Card className="border-slate-700 bg-slate-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              Last response
              <Badge variant="outline">JSON</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-64 overflow-auto rounded-md bg-slate-950/80 p-3 text-[11px] text-gray-300">
              {lastResult}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default TisIntegratorApiConsole;
