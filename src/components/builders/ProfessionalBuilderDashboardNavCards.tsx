import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  CreditCard,
  Package,
  Truck,
  FileText,
  Settings,
  Camera,
  Video,
  BarChart3,
  History,
  Navigation as NavigationIcon,
} from "lucide-react";

type NavStats = { pendingOrders: number };

const navBtnBase =
  "relative h-auto min-h-12 min-w-0 flex flex-col items-center justify-center gap-1.5 px-2 py-3.5 transition-all sm:px-3";

const navLabelClass = "text-xs font-medium leading-tight sm:text-sm text-center";

type Props = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setExtrasSubTab: (sub: string) => void;
  supplierResponseCount: number;
  stats: NavStats;
  deliveriesNavBadgeCount: number;
  invoiceHubBadgeCount: number;
  /** Prefetch Invoices hub (DN/GRN/Invoice) while hovering so sub-tabs feel instant after click. */
  onInvoicesWarm?: () => void;
};

export function ProfessionalBuilderDashboardNavCards({
  activeTab,
  setActiveTab,
  setExtrasSubTab,
  supplierResponseCount,
  stats,
  deliveriesNavBadgeCount,
  invoiceHubBadgeCount,
  onInvoicesWarm,
}: Props) {
  return (
    <div
      className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-2.5 mb-6"
      role="tablist"
      aria-label="Dashboard sections"
    >
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "projects"}
        className={`${navBtnBase} ${
          activeTab === "projects"
            ? "bg-gradient-to-r from-blue-500 to-blue-600 ring-2 ring-blue-300 shadow-lg text-white"
            : "bg-white hover:bg-blue-50 text-gray-700 border shadow-sm"
        }`}
        onClick={() => setActiveTab("projects")}
      >
        <Building2 className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Projects</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "quotes"}
        className={`${navBtnBase} relative ${
          activeTab === "quotes"
            ? "bg-gradient-to-r from-green-500 to-green-600 ring-2 ring-green-300 shadow-lg text-white"
            : "bg-white hover:bg-green-50 text-gray-700 border shadow-sm"
        }`}
        onClick={() => setActiveTab("quotes")}
      >
        <CreditCard className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Quotes</span>
        {supplierResponseCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 text-white border-2 border-white">
            {supplierResponseCount > 9 ? "9+" : supplierResponseCount}
          </Badge>
        )}
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "orders"}
        className={`${navBtnBase} relative ${
          activeTab === "orders"
            ? "bg-gradient-to-r from-blue-500 to-indigo-600 ring-2 ring-blue-300 shadow-lg text-white"
            : "bg-white hover:bg-blue-50 text-gray-700 border shadow-sm"
        }`}
        onClick={() => setActiveTab("orders")}
      >
        <Package className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Orders</span>
        {stats.pendingOrders > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full p-0 flex items-center justify-center text-[10px] bg-red-500 text-white border-2 border-white">
            {stats.pendingOrders > 9 ? "9+" : stats.pendingOrders}
          </Badge>
        )}
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "deliveries"}
        className={`${navBtnBase} relative ${
          activeTab === "deliveries"
            ? "bg-gradient-to-r from-amber-500 to-orange-500 ring-2 ring-amber-300 shadow-lg text-white"
            : "bg-white hover:bg-amber-50 text-gray-700 border shadow-sm"
        }`}
        onClick={() => setActiveTab("deliveries")}
      >
        <Truck className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Deliveries</span>
        {deliveriesNavBadgeCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full p-0 flex items-center justify-center text-[10px] bg-red-500 text-white border-2 border-white">
            {deliveriesNavBadgeCount > 9 ? "9+" : deliveriesNavBadgeCount}
          </Badge>
        )}
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "tracking"}
        className={`${navBtnBase} ${
          activeTab === "tracking"
            ? "bg-gradient-to-r from-teal-500 to-cyan-500 ring-2 ring-teal-300 shadow-lg text-white"
            : "bg-white hover:bg-teal-50 text-gray-700 border shadow-sm"
        }`}
        onClick={() => setActiveTab("tracking")}
      >
        <NavigationIcon className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Tracking</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "invoices"}
        className={`${navBtnBase} relative ${
          activeTab === "invoices"
            ? "bg-gradient-to-r from-slate-500 to-slate-600 ring-2 ring-slate-300 shadow-lg text-white"
            : "bg-white hover:bg-slate-50 text-gray-700 border shadow-sm"
        }`}
        onPointerEnter={() => onInvoicesWarm?.()}
        onFocus={() => onInvoicesWarm?.()}
        onClick={() => setActiveTab("invoices")}
      >
        <FileText className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Invoices</span>
        {invoiceHubBadgeCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full p-0 flex items-center justify-center text-[10px] bg-red-500 text-white border-2 border-white">
            {invoiceHubBadgeCount > 9 ? "9+" : invoiceHubBadgeCount}
          </Badge>
        )}
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "extras"}
        className={`${navBtnBase} ${
          activeTab === "extras"
            ? "bg-gradient-to-r from-violet-500 to-purple-600 ring-2 ring-violet-300 shadow-lg text-white"
            : "bg-white hover:bg-violet-50 text-gray-700 border shadow-sm"
        }`}
        onClick={() => {
          setActiveTab("extras");
          setExtrasSubTab("team");
        }}
      >
        <Settings className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Extras</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "monitoring"}
        className={`${navBtnBase} ${
          activeTab === "monitoring"
            ? "bg-gradient-to-r from-cyan-500 to-sky-500 ring-2 ring-cyan-300 shadow-lg text-white"
            : "bg-white hover:bg-cyan-50 text-gray-700 border shadow-sm"
        }`}
        onClick={() => setActiveTab("monitoring")}
      >
        <Camera className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Monitor</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "portfolio"}
        className={`${navBtnBase} ${
          activeTab === "portfolio"
            ? "bg-gradient-to-r from-purple-500 to-pink-500 ring-2 ring-purple-300 shadow-lg text-white"
            : "bg-white hover:bg-purple-50 text-gray-700 border shadow-sm"
        }`}
        onClick={() => setActiveTab("portfolio")}
      >
        <Video className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Portfolio</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "order-history"}
        className={`${navBtnBase} ${
          activeTab === "order-history"
            ? "bg-gradient-to-r from-indigo-500 to-violet-600 ring-2 ring-indigo-300 shadow-lg text-white"
            : "bg-white hover:bg-indigo-50 text-gray-700 border shadow-sm"
        }`}
        onClick={() => setActiveTab("order-history")}
      >
        <History className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>History</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "my-analytics"}
        className={`${navBtnBase} ${
          activeTab === "my-analytics"
            ? "bg-gradient-to-r from-pink-500 to-rose-500 ring-2 ring-pink-300 shadow-lg text-white"
            : "bg-white hover:bg-pink-50 text-gray-700 border shadow-sm"
        }`}
        onClick={() => setActiveTab("my-analytics")}
      >
        <BarChart3 className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Analytics</span>
      </Button>
    </div>
  );
}
