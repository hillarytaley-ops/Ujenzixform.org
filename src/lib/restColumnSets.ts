/** Explicit PostgREST column lists — avoid select=* on sensitive tables. */

export const PROFILE_SELF_COLUMNS =
  'id,user_id,full_name,email,phone,company_name,role,user_type,avatar_url,location,description,specialties,years_experience,portfolio_url,is_verified,created_at,updated_at,is_paused,kra_pin,billing_company_name,billing_address,procurement_contact_email,procurement_contact_name,procurement_contact_phone';

export const PROFILE_DIRECTORY_COLUMNS =
  'id,user_id,full_name,company_name,role,user_type,avatar_url,description,location,is_verified,years_experience,specialties,portfolio_url';

export const PROFILE_PARTNER_COLUMNS = 'user_id,full_name,company_name';

export const SUPPLIER_SELF_COLUMNS =
  'id,user_id,company_name,is_verified,rating,specialties,materials_offered,location,status,profile_id,company_logo_url';

export const SUPPLIER_LOOKUP_COLUMNS = 'id,user_id,company_name';

/** Display-only supplier address fields allowed via PostgREST (no revoked `address`). */
export const SUPPLIER_LOCATION_COLUMNS =
  'id,company_name,location,physical_business_address';

export const SUPPLIER_TAX_COLUMNS = 'kra_pin,legal_business_name,company_name';

export const DELIVERY_PROVIDER_SELF_COLUMNS =
  'id,user_id,company_name,email,phone,vehicle_type,is_verified,status,rating';

export const PURCHASE_ORDER_LIST_COLUMNS =
  'id,po_number,supplier_id,buyer_id,builder_id,status,total_amount,created_at,updated_at,items,project_name,delivery_address,quote_valid_until,project_id,special_instructions,supplier_notes,quote_amount,delivery_requested_at';

export const PURCHASE_ORDER_SEARCH_COLUMNS =
  'id,po_number,supplier_id,buyer_id,status,created_at';

export const PAYMENT_LIST_COLUMNS =
  'id,user_id,amount,currency,status,payment_method,provider,reference,created_at,updated_at,purchase_order_id,metadata';

export const SUPPLIER_PRODUCT_PRICE_COLUMNS =
  'id,supplier_id,product_id,price,in_stock,created_at,updated_at,description,stock_quantity,min_stock_level,max_stock_level,last_restocked,market_price,etims_item_code';

export const MATERIAL_ITEM_COLUMNS =
  'id,supplier_id,purchase_order_id,material_type,category,quantity,unit,status,qr_code,created_at';

export const DELIVERY_REQUEST_COLUMNS =
  'id,provider_id,purchase_order_id,status,created_at,updated_at,pickup_address,delivery_address,latitude,longitude,builder_id,supplier_id,tracking_number,estimated_delivery_at';

export const INVOICE_LIST_COLUMNS =
  'id,invoice_number,supplier_id,buyer_id,status,total_amount,currency,created_at,updated_at,purchase_order_id';

export const CONVERSATION_LIST_COLUMNS =
  'id,client_id,client_name,client_email,status,source,priority,agent_id,agent_name,metadata,last_message,last_message_at,unread_count,rating,rating_comment,created_at,closed_at';

export const CHAT_MESSAGE_COLUMNS =
  'id,conversation_id,sender_id,sender_type,sender_name,content,message_type,file_url,file_name,read,created_at';

export const CHAT_FEEDBACK_COLUMNS =
  'id,message_id,user_id,feedback_type,message_content,user_query,metadata,created_at,status,staff_response,staff_response_at,staff_responder_id,staff_responder_name';

export const CHAT_TRANSCRIPT_COLUMNS =
  'id,conversation_id,user_email,transcript,sent_at';

export const SUPPORT_CHAT_COLUMNS =
  'id,user_id,user_role,subject,status,created_at,updated_at,last_message_at';

export const SUPPORT_MESSAGE_COLUMNS =
  'id,chat_id,sender_id,sender_type,message,created_at';

export const CHATBOT_MESSAGE_COLUMNS =
  'id,session_id,user_id,message,sender,created_at,staff_replied';

export const CONTACT_FEEDBACK_COLUMNS =
  'id,category,comment,rating,created_at,user_id,email';

export const ADMIN_FINANCIAL_INVOICE_COLUMNS = INVOICE_LIST_COLUMNS;

export const ADMIN_FINANCIAL_PO_COLUMNS = PURCHASE_ORDER_LIST_COLUMNS;

export const ADMIN_FINANCIAL_RECEIPT_COLUMNS =
  'id,purchase_order_id,supplier_id,buyer_id,amount,currency,status,created_at,updated_at';

export const ADMIN_FINANCIAL_DELIVERY_ORDER_COLUMNS =
  'id,purchase_order_id,status,provider_id,created_at,updated_at,tracking_number';

export const ADMIN_FINANCIAL_QUOTATION_COLUMNS =
  'id,builder_id,supplier_id,status,created_at,updated_at,total_amount';

export const ADMIN_APPLICATION_COLUMNS =
  'id,applicant_user_id,status,company_name,created_at,updated_at,email,phone';

export const ADMIN_REGISTRATION_COLUMNS =
  'id,user_id,status,full_name,company_name,email,phone,created_at,updated_at';

export const ADMIN_DELIVERY_PROVIDER_COLUMNS =
  'id,user_id,company_name,provider_name,phone,is_verified,status,created_at,updated_at';

export const QR_SCAN_EVENT_COLUMNS =
  'id,scanned_at,scan_type,material_item_id,purchase_order_id,scanner_user_id,location,metadata';

export const TRACKING_NUMBER_COLUMNS =
  'id,tracking_number,status,purchase_order_id,delivery_request_id,created_at,updated_at,current_location';

export const DELIVERY_NOTIFICATION_COLUMNS =
  'id,user_id,title,message,read,created_at,delivery_request_id,type';

export const JOB_POSITION_COLUMNS =
  'id,title,department,location,is_active,is_featured,created_at,updated_at,description';

export const MATERIAL_CATALOG_COLUMNS =
  'id,supplier_id,name,description,category,unit,unit_price,image_url,in_stock,approval_status,created_at,updated_at,pricing_type,variants,etims_item_code';

export const MONITORING_SERVICE_REQUEST_COLUMNS =
  'id,user_id,status,created_at,updated_at,project_name,project_location,project_type,estimated_cost,access_code,camera_count,quote_amount';
