import { Button } from "@/components/ui/button";
import {
  Package,
  QrCode,
  Truck,
  Navigation as NavigationIcon,
  Plus,
  Receipt,
  Heart,
  Video,
  Headphones,
} from "lucide-react";

const navBtnBase =
  "relative h-auto min-h-12 min-w-0 flex flex-col items-center justify-center gap-1.5 px-2 py-3.5 transition-all sm:px-3";

const navLabelClass = "text-xs font-medium leading-tight sm:text-sm text-center";

type Props = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

export function PrivateClientDashboardNavCards({ activeTab, setActiveTab }: Props) {
  return (
    <div
      className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 mb-6"
      role="tablist"
      aria-label="Dashboard sections"
    >
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "orders"}
        className={`${navBtnBase} ${
          activeTab === "orders"
            ? "bg-gradient-to-r from-green-500 to-emerald-600 ring-2 ring-green-300 shadow-lg text-white"
            : "bg-white hover:bg-green-50 text-gray-700 border shadow-sm"
        }`}
        onClick={() => setActiveTab("orders")}
      >
        <Package className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Orders</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "order-tracking"}
        className={`${navBtnBase} ${
          activeTab === "order-tracking"
            ? "bg-gradient-to-r from-cyan-500 to-sky-600 ring-2 ring-cyan-300 shadow-lg text-white"
            : "bg-white hover:bg-cyan-50 text-gray-700 border shadow-sm"
        }`}
        onClick={() => setActiveTab("order-tracking")}
      >
        <QrCode className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>QR Status</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "deliveries"}
        className={`${navBtnBase} ${
          activeTab === "deliveries"
            ? "bg-gradient-to-r from-amber-500 to-orange-500 ring-2 ring-amber-300 shadow-lg text-white"
            : "bg-white hover:bg-amber-50 text-gray-700 border shadow-sm"
        }`}
        onClick={() => setActiveTab("deliveries")}
      >
        <Truck className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Deliveries</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "tracking"}
        className={`${navBtnBase} ${
          activeTab === "tracking"
            ? "bg-gradient-to-r from-blue-500 to-indigo-600 ring-2 ring-blue-300 shadow-lg text-white"
            : "bg-white hover:bg-blue-50 text-gray-700 border shadow-sm"
        }`}
        onClick={() => setActiveTab("tracking")}
      >
        <NavigationIcon className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Tracking</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "request-delivery"}
        className={`${navBtnBase} ${
          activeTab === "request-delivery"
            ? "bg-gradient-to-r from-teal-500 to-emerald-500 ring-2 ring-teal-300 shadow-lg text-white"
            : "bg-white hover:bg-teal-50 text-gray-700 border shadow-sm"
        }`}
        onClick={() => setActiveTab("request-delivery")}
      >
        <Plus className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Request</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "payments"}
        className={`${navBtnBase} ${
          activeTab === "payments"
            ? "bg-gradient-to-r from-green-600 to-emerald-700 ring-2 ring-green-300 shadow-lg text-white"
            : "bg-white hover:bg-green-50 text-gray-700 border shadow-sm"
        }`}
        onClick={() => setActiveTab("payments")}
      >
        <Receipt className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Payments</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "wishlist"}
        className={`${navBtnBase} ${
          activeTab === "wishlist"
            ? "bg-gradient-to-r from-pink-500 to-rose-500 ring-2 ring-pink-300 shadow-lg text-white"
            : "bg-white hover:bg-pink-50 text-gray-700 border shadow-sm"
        }`}
        onClick={() => setActiveTab("wishlist")}
      >
        <Heart className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Wishlist</span>
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
        <Video className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Monitor</span>
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeTab === "support"}
        className={`${navBtnBase} ${
          activeTab === "support"
            ? "bg-gradient-to-r from-purple-500 to-violet-600 ring-2 ring-purple-300 shadow-lg text-white"
            : "bg-white hover:bg-purple-50 text-gray-700 border shadow-sm"
        }`}
        onClick={() => setActiveTab("support")}
      >
        <Headphones className="h-5 w-5 shrink-0" aria-hidden />
        <span className={navLabelClass}>Support</span>
      </Button>
    </div>
  );
}
