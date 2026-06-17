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
import { tis } from "./tisTheme";

const SUB_TABS = [
  { id: "platform", label: "Platform & certification", icon: ShieldCheck },
  { id: "vendors", label: "Vendor onboarding", icon: Users },
  { id: "submissions", label: "Submission ops", icon: ClipboardList },
  { id: "api", label: "Integrator API", icon: Cpu },
] as const;

export const TisIntegratorHub: React.FC = () => {
  const [subTab, setSubTab] = useState<string>("platform");

  return (
    <div className={`space-y-4 ${tis.shell} p-4 sm:p-5`}>
      <div className={tis.banner}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-6 w-6 shrink-0 text-indigo-600" />
            <div>
              <h2 className={tis.h2}>TIS Integrator Services</h2>
              <p className={tis.subtitle}>
                UjenziXform is the KRA third-party TIS integrator — sandbox certification, vendor OSCU onboarding,
                and API console. Pair with <strong>eTIMS live</strong> for end-to-end tests using real suppliers,
                buyers, and catalog item codes.
              </p>
            </div>
          </div>
          <Badge className="shrink-0 bg-indigo-600 text-white hover:bg-indigo-600">UjenziXform Solution</Badge>
        </div>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className={tis.tabsList}>
          {SUB_TABS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id} className={tis.tabsTrigger}>
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
