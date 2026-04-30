/**
 * Types aligned with the approved integrator VFD / eTIMS REST API (SalesReq, etc.).
 * Field meanings: see integrator Swagger / KRA OSCU documentation.
 */

export type PaymentTypeCode = "01" | "02" | "03" | "04" | "05" | "06" | "07";

/** C Copy, N Normal, P Proforma, T Training */
export type SalesTypeCode = "C" | "N" | "P" | "T";

/** S Sale, R Credit note */
export type ReceiptTypeCode = "S" | "R";

/** 01 wait approval … 06 transferred (per integrator schema) */
export type SalesStatusCode = "01" | "02" | "03" | "04" | "05" | "06";

export interface EtimsSalesItem {
  itemCode: string;
  qty: number;
  pkg?: number;
  unitPrice: number;
  amount: number;
  discountAmount?: number;
  /** Optional override per line (integrator extension); omit if unused */
  taxCode?: string;
  insuranceCompanyCode?: string;
}

export interface EtimsGenerateInvoiceRequest {
  traderInvoiceNo: string;
  traderOrgInvoiceNo?: string;
  totalAmount: number;
  paymentType: PaymentTypeCode;
  salesTypeCode: SalesTypeCode;
  receiptTypeCode: ReceiptTypeCode;
  salesStatusCode?: SalesStatusCode;
  /** yyyyMMddHHmmss (12h hour per integrator spec) */
  salesDate: string;
  currency: string;
  exchangeRate?: number;
  salesItems: EtimsSalesItem[];
  customerPin?: string;
  customerName?: string;
}

export interface EtimsStoreItemRequest {
  name: string;
  orgCountryCode: string;
  unitPrice: number;
  itemTypeCode: "1" | "2" | "3";
  taxCode: "A" | "B" | "C" | "D" | "E";
  qtyUnitCode: string;
  pkgUnitCode: string;
  itemClassCode: string;
  initialStock?: number;
}

export interface EtimsUpdateItemStockRequest {
  stock: number;
}
