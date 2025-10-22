import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, CheckCircle, AlertTriangle } from 'lucide-react';

interface ContactProtectionAlertProps {
  contactAccessLevel: string;
  hasBusinessRelationship: boolean;
  isAdmin: boolean;
  className?: string;
}

export const ContactProtectionAlert: React.FC<ContactProtectionAlertProps> = ({
  contactAccessLevel,
  hasBusinessRelationship,
  isAdmin,
  className = ""
}) => {
  const getAlertContent = () => {
    if (isAdmin) {
      return {
        icon: Shield,
        variant: "default" as const,
        title: "Administrator Access",
        description: "You have full access to supplier contact information as an administrator.",
        badge: { text: "Admin Access", variant: "default" as const }
      };
    }

    if (hasBusinessRelationship) {
      return {
        icon: CheckCircle,
        variant: "default" as const,
        title: "Business Relationship Verified",
        description: "You can view contact information due to your verified business relationship with this supplier through recent orders, quotations, or deliveries.",
        badge: { text: "Business Partner", variant: "default" as const }
      };
    }

    return {
      icon: Lock,
      variant: "destructive" as const,
      title: "Contact Information Protected",
      description: "Supplier contact details (email, phone) are only visible to administrators and users with verified business relationships. Complete a purchase order or quotation request to gain access.",
      badge: { text: "Protected", variant: "secondary" as const }
    };
  };

  const alertContent = getAlertContent();
  const IconComponent = alertContent.icon;

  return (
    <Alert className={`border-blue-200 bg-blue-50 ${className}`}>
      <IconComponent className="h-4 w-4" />
      <AlertDescription className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <strong>{alertContent.title}</strong>
          <Badge variant={alertContent.badge.variant}>
            {alertContent.badge.text}
          </Badge>
        </div>
        <p className="text-sm">{alertContent.description}</p>
        {!isAdmin && !hasBusinessRelationship && (
          <div className="text-xs text-muted-foreground mt-2 p-2 bg-yellow-50 rounded">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            <strong>To access contact information:</strong> Submit a quotation request or create a purchase order with this supplier.
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};