import React, { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Landmark } from "lucide-react";
import { isValidKraPin, normalizeKraPin } from "@/lib/etims/kraPin";
import { fetchMySupplierRecords } from "@/lib/resolveMySuppliers";

type Props = {
  supplierRecordId: string | null;
  onCompleteProfile?: () => void;
  className?: string;
};

export const SupplierTaxIdentityBanner: React.FC<Props> = ({
  supplierRecordId,
  onCompleteProfile,
  className,
}) => {
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supplierRecordId) {
      setMissing(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const owned = await fetchMySupplierRecords();
      const row = owned.find((r) => r.id === supplierRecordId) ?? owned[0] ?? null;
      const hasLegal =
        Boolean(row?.legal_business_name?.trim()) || Boolean(row?.company_name?.trim());
      const hasPin = isValidKraPin(normalizeKraPin(row?.kra_pin));
      setMissing(!hasLegal || !hasPin);
    } catch {
      setMissing(true);
    } finally {
      setLoading(false);
    }
  }, [supplierRecordId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !missing) return null;

  return (
    <Alert variant="destructive" className={className}>
      <Landmark className="h-4 w-4" />
      <AlertTitle>KRA tax identity required</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          Buyers cannot complete checkout against your store until you add a valid{" "}
          <strong>KRA PIN</strong> and <strong>legal business name</strong>. These are sent to the KRA
          eTIMS sandbox when an order is confirmed.
        </p>
        {onCompleteProfile ? (
          <Button type="button" size="sm" variant="outline" className="border-red-300" onClick={onCompleteProfile}>
            Open KRA / eTIMS settings
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
};

export default SupplierTaxIdentityBanner;
