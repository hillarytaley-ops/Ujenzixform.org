import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  CheckCircle,
  Map,
  Scan,
  Wallet,
  BarChart3,
  Bell,
  Headphones,
} from "lucide-react";

const navBtnBase =
  "relative h-auto min-h-12 min-w-0 flex flex-col items-center justify-center gap-1.5 px-2 py-3.5 transition-all sm:px-3";

const navLabelClass = "text-xs font-medium leading-tight sm:text-sm text-center";

type Props = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  deliveriesBadgeCount: number;
  deliveryHistoryCount: number;
  builderPayPromptCount: number;
  pendingNotificationCount: number;
  onOpenDeliveries: () => void;
};

export function DeliveryDashboardNavCards({
  activeTab,
  setActiveTab,
  isDarkMode,
  deliveriesBadgeCount,
  deliveryHistoryCount,
  builderPayPromptCount,
  pendingNotificationCount,
  onOpenDeliveries,
}: Props) {
  const inactive = isDarkMode
    ? "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
    : "bg-white text-gray-700 hover:bg-teal-50 border border-gray-200 shadow-sm";
  const active =
    "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg ring-2 ring-teal-300";

  return (
    <div
      className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 gap-2.5 mb-8"
      role="tablist"
      aria-label="Delivery dashboard sections"
    >
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "deliveries"}
        variant="ghost"
        className={`${navBtnBase} ${activeTab === "deliveries" ? active : inactive}`}
        onClick={onOpenDeliveries}
      >
        <Truck className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Deliveries</span>
        {deliveriesBadgeCount > 0 && (
          <Badge className="text-[10px] px-1 py-0 bg-yellow-500 text-white border-0">{deliveriesBadgeCount}</Badge>
        )}
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "history"}
        variant="ghost"
        className={`${navBtnBase} relative ${activeTab === "history" ? active : inactive}`}
        onClick={() => setActiveTab("history")}
      >
        <CheckCircle className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>History</span>
        {deliveryHistoryCount > 0 && (
          <Badge className="absolute -top-1 -right-1 text-[10px] px-1 py-0 bg-green-500 text-white">
            {deliveryHistoryCount}
          </Badge>
        )}
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "map"}
        variant="ghost"
        className={`${navBtnBase} ${activeTab === "map" ? active : inactive}`}
        onClick={() => setActiveTab("map")}
      >
        <Map className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Map</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "scanning"}
        variant="ghost"
        className={`${navBtnBase} ${activeTab === "scanning" ? active : inactive}`}
        onClick={() => setActiveTab("scanning")}
      >
        <Scan className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Scan QR</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "pay"}
        variant="ghost"
        className={`${navBtnBase} ${activeTab === "pay" ? active : inactive}`}
        onClick={() => setActiveTab("pay")}
      >
        <span className="relative inline-flex">
          <Wallet className="h-5 w-5" aria-hidden />
          {builderPayPromptCount > 0 && (
            <Badge className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold px-1 py-0 bg-red-600 text-white ring-2 ring-white shadow-md rounded-full">
              {builderPayPromptCount > 9 ? "9+" : builderPayPromptCount}
            </Badge>
          )}
        </span>
        <span className={navLabelClass}>Pay</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "analytics"}
        variant="ghost"
        className={`${navBtnBase} ${activeTab === "analytics" ? active : inactive}`}
        onClick={() => setActiveTab("analytics")}
      >
        <BarChart3 className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Analytics</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "notifications"}
        title={
          pendingNotificationCount > 0
            ? `${pendingNotificationCount} new delivery request${pendingNotificationCount !== 1 ? "s" : ""} — click to view`
            : "Alerts"
        }
        variant="ghost"
        className={`${navBtnBase} relative overflow-visible ${activeTab === "notifications" ? active : inactive}`}
        onClick={() => setActiveTab("notifications")}
      >
        <span className="relative inline-flex">
          <Bell className="h-5 w-5" aria-hidden />
          {pendingNotificationCount > 0 && (
            <Badge className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold px-1.5 py-0 bg-red-500 text-white animate-pulse ring-2 ring-white shadow-md rounded-full">
              {pendingNotificationCount > 99 ? "99+" : pendingNotificationCount}
            </Badge>
          )}
        </span>
        <span className={navLabelClass}>Alerts</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "support"}
        variant="ghost"
        className={`${navBtnBase} ${activeTab === "support" ? active : inactive}`}
        onClick={() => setActiveTab("support")}
      >
        <Headphones className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Support</span>
      </Button>
    </div>
  );
}
