/** Separates catalog material UUID from variant key in cart line ids */
export const CART_VARIANT_SUFFIX = "::v:";

export function buildVariantCartLineId(
  materialId: string,
  variantKey: string
): string {
  return `${materialId}${CART_VARIANT_SUFFIX}${variantKey}`;
}

/** Real admin_material_images / catalog id for DB FKs (purchase_orders.items, etc.) */
export function catalogMaterialIdFromCartLineId(cartLineId: string): string {
  const idx = cartLineId.indexOf(CART_VARIANT_SUFFIX);
  if (idx === -1) return cartLineId;
  return cartLineId.slice(0, idx);
}

/** Minimal variant shape for cart line id (MaterialsGrid / marketplace) */
export type CartVariantLike = {
  id?: string;
  sizeLabel?: string;
  color?: string;
  texture?: string;
  price?: number;
};

function variantKeyFromVariant(v: CartVariantLike, index: number): string {
  if (v?.id && String(v.id).trim()) return String(v.id);
  return `idx:${index}`;
}

function variantByStoredKey(
  variants: CartVariantLike[],
  key: string | undefined
): CartVariantLike | undefined {
  if (!variants?.length) return undefined;
  if (!key) return variants[0];
  if (key.startsWith("idx:")) {
    const i = parseInt(key.slice(4), 10);
    if (!Number.isNaN(i) && i >= 0 && i < variants.length) return variants[i];
  }
  const byId = variants.find((v) => v.id === key);
  if (byId) return byId;
  return variants[0];
}

/**
 * Stable cart row id: one line per catalog material + variant (different prices/colors = different lines).
 */
export function buildMaterialCartLineId(
  materialId: string,
  pricingType: string | undefined,
  variants: CartVariantLike[] | undefined,
  selectedVariantKey: string | undefined
): string {
  if (pricingType !== "variants" || !variants?.length) {
    return materialId;
  }
  const sv = variantByStoredKey(variants, selectedVariantKey) ?? variants[0];
  const vi = Math.max(0, variants.indexOf(sv));
  return buildVariantCartLineId(materialId, variantKeyFromVariant(sv, vi));
}
