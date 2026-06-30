import fs from 'fs';
import path from 'path';

const files = [
  'src/components/admin/EnhancedCommunicationsManager.tsx',
  'src/components/admin/LiveChatManager.tsx',
  'src/components/admin/AdminConversationsViewer.tsx',
  'src/components/support/SupportChat.tsx',
  'src/components/chat/LiveChatWidget.tsx',
  'src/pages/admin/tabs/FinancialTab.tsx',
  'src/pages/admin/hooks/useAdminData.ts',
  'src/pages/admin/tabs/RegistersTab.tsx',
  'src/components/qr/AdminScanDashboard.tsx',
  'src/components/communication/InAppCommunication.tsx',
  'src/hooks/useDataIsolation.ts',
  'src/services/TrackingNumberService.ts',
  'src/pages/Tracking.tsx',
  'src/components/tracking/TrackingTab.tsx',
  'src/components/builders/DeliveryPromptDialog.tsx',
  'src/components/supplier/ProductManagement.tsx',
  'src/components/suppliers/MaterialsGrid.tsx',
  'src/pages/Careers.tsx',
  'src/utils/myMonitoringServiceRequests.ts',
];

const colImport =
  "import { CONVERSATION_LIST_COLUMNS, CHAT_MESSAGE_COLUMNS, CHAT_FEEDBACK_COLUMNS, CHAT_TRANSCRIPT_COLUMNS, SUPPORT_CHAT_COLUMNS, ADMIN_FINANCIAL_INVOICE_COLUMNS, ADMIN_FINANCIAL_PO_COLUMNS, ADMIN_FINANCIAL_RECEIPT_COLUMNS, ADMIN_FINANCIAL_DELIVERY_ORDER_COLUMNS, ADMIN_FINANCIAL_QUOTATION_COLUMNS, ADMIN_APPLICATION_COLUMNS, ADMIN_REGISTRATION_COLUMNS, ADMIN_DELIVERY_PROVIDER_COLUMNS, QR_SCAN_EVENT_COLUMNS, TRACKING_NUMBER_COLUMNS, DELIVERY_NOTIFICATION_COLUMNS, JOB_POSITION_COLUMNS, MATERIAL_CATALOG_COLUMNS, SUPPLIER_PRODUCT_PRICE_COLUMNS, DELIVERY_REQUEST_COLUMNS } from '@/lib/restColumnSets';\n";

for (const rel of files) {
  const p = path.join(process.cwd(), rel);
  if (!fs.existsSync(p)) {
    console.log('skip', rel);
    continue;
  }
  let s = fs.readFileSync(p, 'utf8');
  const orig = s;

  s = s.replace(/conversations\?select=\*/g, 'conversations?select=${CONVERSATION_LIST_COLUMNS}');
  s = s.replace(/chat_messages\?[^'`"]*select=\*/g, (m) =>
    m.replace('select=*', 'select=${CHAT_MESSAGE_COLUMNS}')
  );
  s = s.replace(/chat_feedback\?select=\*/g, 'chat_feedback?select=${CHAT_FEEDBACK_COLUMNS}');
  s = s.replace(/chat_transcripts\?select=\*/g, 'chat_transcripts?select=${CHAT_TRANSCRIPT_COLUMNS}');
  s = s.replace(/support_chats\?[^'`"]*select=\*/g, (m) =>
    m.replace('select=*', 'select=${SUPPORT_CHAT_COLUMNS}')
  );
  s = s.replace(/qr_scan_events\?select=\*/g, 'qr_scan_events?select=${QR_SCAN_EVENT_COLUMNS}');
  s = s.replace(/tracking_numbers\?[^'`"]*select=\*/g, (m) =>
    m.replace('select=*', 'select=${TRACKING_NUMBER_COLUMNS}')
  );
  s = s.replace(/job_positions\?select=\*/g, 'job_positions?select=${JOB_POSITION_COLUMNS}');
  s = s.replace(/materials\?select=\*/g, 'materials?select=${MATERIAL_CATALOG_COLUMNS}');
  s = s.replace(/delivery_notifications\?select=\*/g, 'delivery_notifications?select=${DELIVERY_NOTIFICATION_COLUMNS}');
  s = s.replace(/monitoring_service_requests\?[^'`"]*select=\*/g, (m) =>
    m.replace('select=*', 'select=id,user_id,status,created_at,updated_at,package_type,site_address')
  );
  s = s.replace(/supplier_product_prices\?[^'`"]*select=\*/g, (m) =>
    m.replace('select=*', 'select=${SUPPLIER_PRODUCT_PRICE_COLUMNS}')
  );
  s = s.replace(/delivery_requests\?id=eq\.[^&]+&select=\*/g, (m) =>
    m.replace('select=*', 'select=${DELIVERY_REQUEST_COLUMNS}')
  );

  s = s.replace(
    /\.from\('invoices'\)\.select\('\*'\)/g,
    ".from('invoices').select(ADMIN_FINANCIAL_INVOICE_COLUMNS)"
  );
  s = s.replace(
    /\.from\('purchase_orders'\)\.select\('\*'\)/g,
    ".from('purchase_orders').select(ADMIN_FINANCIAL_PO_COLUMNS)"
  );
  s = s.replace(
    /\.from\('purchase_receipts'\)\.select\('\*'\)/g,
    ".from('purchase_receipts').select(ADMIN_FINANCIAL_RECEIPT_COLUMNS)"
  );
  s = s.replace(
    /\.from\('delivery_orders'\)\.select\('\*'\)/g,
    ".from('delivery_orders').select(ADMIN_FINANCIAL_DELIVERY_ORDER_COLUMNS)"
  );
  s = s.replace(
    /\.from\('quotation_requests'\)\.select\('\*'\)/g,
    ".from('quotation_requests').select(ADMIN_FINANCIAL_QUOTATION_COLUMNS)"
  );
  s = s.replace(
    /\.from\('supplier_applications'\)\.select\('\*'\)/g,
    ".from('supplier_applications').select(ADMIN_APPLICATION_COLUMNS)"
  );
  s = s.replace(
    /\.from\('builder_registrations'\)\.select\('\*'\)/g,
    ".from('builder_registrations').select(ADMIN_REGISTRATION_COLUMNS)"
  );
  s = s.replace(
    /\.from\('delivery_provider_registrations'\)\.select\('\*'\)/g,
    ".from('delivery_provider_registrations').select(ADMIN_REGISTRATION_COLUMNS)"
  );
  s = s.replace(
    /\.from\('delivery_providers'\)\.select\('\*'\)/g,
    ".from('delivery_providers').select(ADMIN_DELIVERY_PROVIDER_COLUMNS)"
  );
  s = s.replace(
    /\.from\('conversations'\)\.select\('\*'\)/g,
    ".from('conversations').select(CONVERSATION_LIST_COLUMNS)"
  );
  s = s.replace(
    /\.from\('chat_messages'\)\.select\('\*'\)/g,
    ".from('chat_messages').select(CHAT_MESSAGE_COLUMNS)"
  );

  if (s !== orig && !s.includes('restColumnSets')) {
    const idx = s.indexOf('\n');
    s = s.slice(0, idx + 1) + colImport + s.slice(idx + 1);
  }
  if (s !== orig) {
    fs.writeFileSync(p, s);
    console.log('updated', rel);
  }
}
