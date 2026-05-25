/**
 * Admin hub: UjenziXform as KRA third-party TIS integrator.
 * Separate from the eTIMS sandbox tab (etims-test) and supplier dashboards.
 */

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, ClipboardList, Cpu, ShieldCheck, Users } from "lucide-react";
import { TisIntegratorPlatformPanel } from "./TisIntegratorPlatformPanel";
import { TisVendorOnboardingPanel } from "./TisVendorOnboardingPanel";
import { TisSubmissionOpsPanel } from "./TisSubmissionOpsPanel";
import { TisIntegratorApiConsole } from "./TisIntegratorApiConsole";

const SUB_TABS = [
  { id: "platform", label: "Platform & certification", icon: ShieldCheck },
  { id: "vendors", label: "Vendor onboarding", icon: Users },
  { id: "submissions", label: "Submission ops", icon: ClipboardList },
  { id: "api", label: "Integrator API", icon: Cpu },
] as const;

export const TisIntegratorHub: React.FC = () => {
  const [subTab, setSubTab] = useState<string>("platform");

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-indigo-500/25 bg-gradient-to-r from-indigo-950/40 to-slate-900/40 px-4 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-6 w-6 shrink-0 text-indigo-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">TIS Integrator Services</h2>
              <p className="text-sm text-gray-400">
                Full third-party integrator package — onboard vendor taxpayers, operate KRA eTIMS invoicing, and track
                certification. This is separate from the eTIMS sandbox test tab.
              </p>
            </div>
          </div>
          <Badge className="shrink-0 bg-indigo-700/90 hover:bg-indigo-700/90">UjenziXform KRA Invoicing</Badge>
        </div>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="flex h-auto flex-wrap gap-1 bg-slate-800/80 p-1">
          {SUB_TABS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id} className="gap-2 data-[state=active]:bg-indigo-700">
              <Icon className="h-4 w-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="platform" className="mt-4">
          <TisIntegratorPlatformPanel />
        </TabsContent>
        <TabsContent value="vendors" className="mt-4">
          <TisVendorOnboardingPanel />
        </TabsContent>
        <TabsContent value="submissions" className="mt-4">
          <TisSubmissionOpsPanel />
        </TabsContent>
        <TabsContent value="api" className="mt-4">
          <TisIntegratorApiConsole />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TisIntegratorHub;
