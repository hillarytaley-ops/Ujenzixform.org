import React from "react";
import { Link } from "react-router-dom";
import { Truck, Clock, ShieldCheck, LogOut, Home } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { DeliveryHiringStatus } from "@/utils/deliveryProviderHiringApproval";
import { SUPPORT_EMAIL, SUPPORT_PHONE_PRIMARY } from "@/config/appIdentity";

type DeliveryProviderHiringGateScreenProps = {
  message: string;
  status?: DeliveryHiringStatus;
  userName?: string;
  onExit: () => void;
  onLogout: () => void;
};

const STATUS_HEADINGS: Record<DeliveryHiringStatus, string> = {
  approved: "Approved",
  pending: "Application pending review",
  rejected: "Application not approved",
  under_review: "Application under review",
  none: "Complete your registration",
};

export function DeliveryProviderHiringGateScreen({
  message,
  status = "pending",
  userName,
  onExit,
  onLogout,
}: DeliveryProviderHiringGateScreenProps) {
  const heading = STATUS_HEADINGS[status] || STATUS_HEADINGS.pending;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex flex-col">
      <header className="border-b bg-white/90 backdrop-blur px-4 py-4">
        <div className="container mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-600 text-white">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Delivery partner</p>
              <p className="text-xs text-muted-foreground">UjenziXform</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onExit}>
              <Home className="h-4 w-4 mr-1" />
              Home
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-10 flex items-center justify-center">
        <Card className="max-w-lg w-full shadow-lg border-teal-100">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 p-3 rounded-full bg-amber-100 w-fit">
              <Clock className="h-8 w-8 text-amber-700" />
            </div>
            <CardTitle className="text-xl">{heading}</CardTitle>
            <CardDescription>
              {userName ? `Hi ${userName} — ` : ""}
              Your delivery dashboard is locked until an admin or Hiring Manager approves your
              application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50">
              <ShieldCheck className="h-4 w-4 text-amber-800" />
              <AlertDescription className="text-amber-950 text-sm">
                {message ||
                  "Your application is pending Hiring Manager review. You cannot view jobs or accept deliveries until you are approved."}
              </AlertDescription>
            </Alert>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
              <li>You cannot browse delivery alerts, maps, or job requests until approved.</li>
              <li>We review lorry, pickup, van, tuk tuk, and motorbike partners for safety and compliance.</li>
              <li>You will be able to sign in here again once your status is approved.</li>
            </ul>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700" asChild>
                <Link to="/">Back to UjenziXform</Link>
              </Button>
              <Button variant="outline" className="flex-1" asChild>
                <a href={`mailto:${SUPPORT_EMAIL}`}>Contact support</a>
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Support: {SUPPORT_PHONE_PRIMARY} · {SUPPORT_EMAIL}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
