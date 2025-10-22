import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Phone, MapPin, Shield, Eye, EyeOff, Lock } from 'lucide-react';
import { ContactProtectionAlert } from './ContactProtectionAlert';

interface SecureContactDisplayProps {
  supplier: {
    id: string;
    company_name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
    contact_access_level?: string;
    can_view_contact?: boolean;
    has_business_relationship?: boolean;
  };
  userRole?: string | null;
  onRequestContact?: (supplierId: string) => void;
  className?: string;
}

export const SecureContactDisplay: React.FC<SecureContactDisplayProps> = ({
  supplier,
  userRole,
  onRequestContact,
  className = ""
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const isAdmin = userRole === 'admin';
  const hasBusinessRelationship = supplier.has_business_relationship || false;
  const canViewContact = isAdmin || hasBusinessRelationship;

  const renderContactField = (label: string, value: string | undefined, icon: React.ElementType, isProtected: boolean = false) => {
    const IconComponent = icon;
    
    if (!value) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <IconComponent className="h-4 w-4" />
          <span className="text-sm">{label}: Not provided</span>
        </div>
      );
    }

    // Check if this is a protected placeholder message
    const isPlaceholder = value.includes('[') && value.includes(']');
    
    if (isPlaceholder || isProtected) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span className="text-sm">{label}: {value}</span>
          <Badge variant="secondary" className="text-xs">Protected</Badge>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <IconComponent className="h-4 w-4 text-primary" />
        <span className="text-sm">
          <strong>{label}:</strong> {value}
        </span>
        {canViewContact && (
          <Badge variant="default" className="text-xs">Verified Access</Badge>
        )}
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Contact Information
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2"
          >
            {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <ContactProtectionAlert
          contactAccessLevel={supplier.contact_access_level || 'basic_directory_only'}
          hasBusinessRelationship={hasBusinessRelationship}
          isAdmin={isAdmin}
        />

        {showDetails && (
          <div className="space-y-3 pt-4 border-t">
            {renderContactField(
              'Contact Person', 
              supplier.contact_person, 
              Mail, 
              !canViewContact && !!supplier.contact_person
            )}
            {renderContactField(
              'Email', 
              supplier.email, 
              Mail, 
              !canViewContact && !!supplier.email
            )}
            {renderContactField(
              'Phone', 
              supplier.phone, 
              Phone, 
              !canViewContact && !!supplier.phone
            )}
            {renderContactField(
              'Address', 
              supplier.address, 
              MapPin, 
              !canViewContact && !!supplier.address
            )}

            {!canViewContact && onRequestContact && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Need to contact this supplier? Request access to their contact information.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRequestContact(supplier.id)}
                  className="w-full"
                >
                  Request Contact Information
                </Button>
              </div>
            )}
          </div>
        )}

        {supplier.contact_access_level && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Access Level: {supplier.contact_access_level.replace(/_/g, ' ').toUpperCase()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};