/**
 * Types aligned with VFD REST **SalesReq** / **SalesItem** (POST `/api/v1/invoices`).
 * See integrator Swagger (`SalesReq`, `SalesItem`, `SalesRes`) and Postman collection.
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
  /** Duplicate for runtimes that only bind snake_case */
  item_code?: string;
  qty: number;
  pkg?: number;
  unitPrice: number;
  amount: number;
  discountAmount?: number;
  /** A–E per Swagger (e.g. D = Non VAT); omit if unused */
  taxCode?: string;
  /** Pharmacy / insurance; omit unless required */
  insuranceCompanyCode?: string;
}

export interface EtimsGenerateInvoiceRequest {
  traderInvoiceNo: string;
  /** Original invoice ref for credit notes; omit for normal sales (Swagger) */
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
  /** When integrator expects a country code on the sales payload (optional). */
  countryCode?: string;
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
