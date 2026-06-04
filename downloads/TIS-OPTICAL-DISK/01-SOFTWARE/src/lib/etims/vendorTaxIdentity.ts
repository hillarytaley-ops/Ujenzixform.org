import { supabase } from "@/integrations/supabase/client";
import { isValidKraPin, kraPinValidationMessage, normalizeKraPin } from "@/lib/etims/kraPin";
import { resolveSuppliersRowId } from "@/lib/etims/purchaseOrderEtims";

export type SupplierTaxIdentity = {
  supplierId: string;
  kraPin: string;
  legalBusinessName: string;
  companyName: string | null;
};

export type SupplierTaxIdentityCheck =
  | { ok: true; identity: SupplierTaxIdentity }
  | { ok: false; message: string };

export async function fetchSupplierTaxIdentity(
  supplierKey: string | null | undefined,
): Promise<SupplierTaxIdentity | null> {
  const canonical = await resolveSuppliersRowId(supplierKey);
  if (!canonical) return null;

  const { data, error } = await supabase
    .from("suppliers")
    .select("id, kra_pin, legal_business_name, company_name")
    .eq("id", canonical)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    id: string;
    kra_pin?: string | null;
    legal_business_name?: string | null;
    company_name?: string | null;
  };

  const kraPin = normalizeKraPin(row.kra_pin);
  const legal =
    (typeof row.legal_business_name === "string" && row.legal_business_name.trim()) ||
    (typeof row.company_name === "string" && row.company_name.trim()) ||
    "";

  if (!kraPin || !legal) return null;

  return {
    supplierId: row.id,
    kraPin,
    legalBusinessName: legal.trim(),
    companyName: typeof row.company_name === "string" ? row.company_name.trim() : null,
  };
}

/** Gate checkout: supplier must have valid KRA PIN and business name on file. */
export async function assertSupplierTaxIdentityForCheckout(
  supplierKey: string | null | undefined,
): Promise<SupplierTaxIdentityCheck> {
  const canonical = await resolveSuppliersRowId(supplierKey);
  if (!canonical) {
    return {
      ok: false,
      message: "Could not resolve the supplier for this order. Choose a supplier again in Compare Prices.",
    };
  }

  const { data, error } = await supabase
    .from("suppliers")
    .select("id, kra_pin, legal_business_name, company_name")
    .eq("id", canonical)
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      message:
        "This supplier is not set up for KRA eTIMS invoicing yet. Ask them to complete KRA PIN and legal business name in their supplier dashboard.",
    };
  }

  const row = data as {
    id: string;
    kra_pin?: string | null;
    legal_business_name?: string | null;
    company_name?: string | null;
  };

  const pinErr = kraPinValidationMessage(row.kra_pin);
  if (pinErr) {
    return {
      ok: false,
      message: `Supplier tax profile incomplete: ${pinErr} The supplier must update KRA details before orders can be invoiced.`,
    };
  }

  const legal =
    (typeof row.legal_business_name === "string" && row.legal_business_name.trim()) ||
    (typeof row.company_name === "string" && row.company_name.trim()) ||
    "";

  if (!legal) {
    return {
      ok: false,
      message:
        "Supplier legal / registered business name is missing. They must complete onboarding in the supplier dashboard before checkout.",
    };
  }

  const kraPin = normalizeKraPin(row.kra_pin);
  if (!isValidKraPin(kraPin)) {
    return { ok: false, message: "Supplier KRA PIN on file is invalid." };
  }

  return {
    ok: true,
    identity: {
      supplierId: row.id,
      kraPin,
      legalBusinessName: legal,
      companyName: typeof row.company_name === "string" ? row.company_name.trim() : null,
    },
  };
}
