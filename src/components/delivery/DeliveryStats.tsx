import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, Truck, CheckCircle } from "lucide-react";

interface DeliveryStatsProps {
  totalDeliveries: number;
  pendingDeliveries: number;
  inTransitDeliveries: number;
  completedDeliveries: number;
}

const DeliveryStats = ({ 
  totalDeliveries, 
  pendingDeliveries, 
  inTransitDeliveries, 
  completedDeliveries 
}: DeliveryStatsProps) => {
  const stats = [
    {
      title: "Total Deliveries",
      value: totalDeliveries,
      icon: Package,
      color: "text-blue-600"
    },
    {
      title: "Pending",
      value: pendingDeliveries,
      icon: Clock,
      color: "text-yellow-600"
    },
    {
      title: "In Transit",
      value: inTransitDeliveries,
      icon: Truck,
      color: "text-orange-600"
    },
    {
      title: "Completed",
      value: completedDeliveries,
      icon: CheckCircle,
      color: "text-green-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DeliveryStats;