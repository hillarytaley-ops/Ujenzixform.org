import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Phone, Shield, Lock } from "lucide-react";
import { useSecureDeliveries } from "@/hooks/useSecureDeliveries";

type DeliveryStatus = 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'cancelled';

interface Delivery {
  id: string;
  tracking_number: string;
  material_type: string;
  quantity: number;
  weight_kg: number;
  pickup_address: string;
  delivery_address: string;
  estimated_delivery_time: string;
  actual_delivery_time?: string;
  status: DeliveryStatus;
  // Driver information is now handled securely
  has_driver_assigned?: boolean;
  driver_display_message?: string; // Updated to match new function
  vehicle_details?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  builder_id?: string;
  security_message?: string;
}

interface DeliveryTableProps {
  deliveries: Delivery[];
  userRole: string | null;
  onStatusUpdate: (deliveryId: string, newStatus: DeliveryStatus) => void;
  onViewDetails: (delivery: Delivery) => void;
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-gray-500' },
  picked_up: { label: 'Picked Up', color: 'bg-blue-500' },
  in_transit: { label: 'In Transit', color: 'bg-yellow-500' },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-orange-500' },
  delivered: { label: 'Delivered', color: 'bg-green-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500' }
};

const DeliveryTable = ({ deliveries, userRole, onStatusUpdate, onViewDetails }: DeliveryTableProps) => {
  const { getSecureDeliveryInfo, logDriverContactAccess } = useSecureDeliveries();
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const truncateAddress = (address: string, maxLength = 30) => {
    return address.length > maxLength ? `${address.substring(0, maxLength)}...` : address;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tracking #</TableHead>
            <TableHead>Material</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Pickup</TableHead>
            <TableHead>Delivery</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.map((delivery) => (
            <TableRow key={delivery.id}>
              <TableCell className="font-mono text-sm">
                {delivery.tracking_number}
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{delivery.material_type}</div>
                  <div className="text-sm text-muted-foreground">
                    {delivery.quantity} items • {delivery.weight_kg}kg
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-2">
                  <Badge variant="outline" className={statusConfig[delivery.status].color + " text-white"}>
                    {statusConfig[delivery.status].label}
                  </Badge>
                  {userRole === 'supplier' && (
                    <Select
                      value={delivery.status}
                      onValueChange={(value) => onStatusUpdate(delivery.id, value as DeliveryStatus)}
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="picked_up">Picked Up</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm">
                  <MapPin className="h-3 w-3" />
                  {truncateAddress(delivery.pickup_address)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm">
                  <MapPin className="h-3 w-3" />
                  {truncateAddress(delivery.delivery_address)}
                </div>
              </TableCell>
              <TableCell>
                {delivery.has_driver_assigned ? (
                  <div className="space-y-1">
                    <div className="font-medium text-sm flex items-center gap-2">
                      <Shield className="h-3 w-3 text-green-600" />
                      {delivery.driver_display_message || 'Driver assigned'}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      Contact secured
                    </div>
                     <Button
                       variant="outline"
                       size="sm"
                       className="mt-1"
                        onClick={async () => {
                          await logDriverContactAccess(delivery.id, 'Delivery coordination');
                           const secureInfo = await getSecureDeliveryInfo(delivery.id);
                           alert(secureInfo?.driver_access_message || 'Driver contact access restricted');
                        }}
                     >
                      <Phone className="h-3 w-3 mr-1" />
                      Request Contact
                    </Button>
                    {delivery.vehicle_details && (
                      <div className="text-xs text-muted-foreground">
                        {delivery.vehicle_details}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {delivery.driver_display_message || 'Not assigned'}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {formatDate(delivery.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {deliveries.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No deliveries found
        </div>
      )}
    </div>
  );
};

export default DeliveryTable;