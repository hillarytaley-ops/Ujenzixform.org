import { Package, FileSignature, Receipt, FileText, CreditCard, Truck } from "lucide-react";

export interface TabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Array<'professional' | 'private' | 'delivery_provider'>;
  badge?: string;
  description: string;
  shortLabel?: string;
}

export const builderTabConfigs: TabConfig[] = [
  // Professional Builder tabs
  {
    id: 'purchase-orders',
    label: 'Purchase Orders',
    shortLabel: 'PO',
    icon: Package,
    roles: ['professional'],
    badge: 'Professional/Company',
    description: 'Create formal purchase orders with suppliers'
  },
  {
    id: 'delivery-signing',
    label: 'Sign Delivery Notes',
    shortLabel: 'Sign',
    icon: FileSignature,
    roles: ['professional'],
    badge: 'Required Before Payment',
    description: 'Digitally sign delivery notes before payment'
  },
  {
    id: 'invoices',
    label: 'Invoice Manager',
    shortLabel: 'Invoice',
    icon: Receipt,
    roles: ['professional'],
    badge: 'Professional/Company',
    description: 'Create and manage professional invoices'
  },
  {
    id: 'delivery-notes',
    label: 'Delivery Notes',
    shortLabel: 'Notes',
    icon: FileText,
    roles: ['professional'],
    description: 'View and download delivery notes'
  },
  {
    id: 'acknowledgments',
    label: 'Acknowledge & Pay',
    shortLabel: 'Pay',
    icon: CreditCard,
    roles: ['professional'],
    badge: 'Secure Payments',
    description: 'Acknowledge deliveries and process payments'
  },
  {
    id: 'goods-received',
    label: 'Goods Received',
    shortLabel: 'GRN',
    icon: FileText,
    roles: ['professional'],
    badge: 'Inventory Management',
    description: 'Generate GRN for delivered items'
  },
  // Private Builder tabs
  {
    id: 'direct-purchase',
    label: 'Direct Purchase',
    shortLabel: 'Purchase',
    icon: Package,
    roles: ['private'],
    badge: 'Private Builders',
    description: 'Buy materials directly from suppliers'
  },
  {
    id: 'private-payment',
    label: 'Payment Center',
    shortLabel: 'Payment',
    icon: CreditCard,
    roles: ['private'],
    badge: 'Secure Payments',
    description: 'Manage payments for delivered items'
  },
  // Delivery Provider tabs
  {
    id: 'delivery-requests',
    label: 'Delivery Requests',
    shortLabel: 'Requests',
    icon: Truck,
    roles: ['delivery_provider'],
    badge: 'Delivery Provider',
    description: 'View and respond to delivery requests'
  },
];

export const getTabsForUserType = (
  isProfessionalBuilder: boolean,
  isPrivateBuilder: boolean,
  isDeliveryProvider: boolean
): TabConfig[] => {
  return builderTabConfigs.filter(tab => {
    if (isProfessionalBuilder && tab.roles.includes('professional')) return true;
    if (isPrivateBuilder && tab.roles.includes('private')) return true;
    if (isDeliveryProvider && tab.roles.includes('delivery_provider')) return true;
    return false;
  });
};