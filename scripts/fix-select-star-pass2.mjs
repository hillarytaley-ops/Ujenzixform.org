import fs from 'fs';
import path from 'path';

const files = [
  'src/components/builders/BuilderFacebookLayout.tsx',
  'src/components/projects/ProjectDetails.tsx',
  'src/services/dataPrefetch.ts',
  'src/components/analytics/AnalyticsDashboard.tsx',
  'src/hooks/useDataIsolation.ts',
  'src/components/delivery/ArrivalScanReminder.tsx',
  'src/components/delivery/DeliveryNotifications.tsx',
  'src/components/suppliers/MaterialsGrid.tsx',
  'src/components/qr/EnhancedQRCodeManager.tsx',
];

const colImport =
  "import { PROFILE_PARTNER_COLUMNS, PURCHASE_ORDER_LIST_COLUMNS, PURCHASE_ORDER_SEARCH_COLUMNS, SUPPLIER_PRODUCT_PRICE_COLUMNS, DELIVERY_REQUEST_COLUMNS, MATERIAL_ITEM_COLUMNS } from '@/lib/restColumnSets';\n";

for (const rel of files) {
  const p = path.join(process.cwd(), rel);
  if (!fs.existsSync(p)) continue;
  let s = fs.readFileSync(p, 'utf8');
  const orig = s;

  s = s.replace(/profiles\?user_id=in\.\([^)]+\)&select=\*/g, (m) =>
    m.replace('select=*', 'select=${PROFILE_PARTNER_COLUMNS}')
  );
  s = s.replace(/purchase_orders\?buyer_id=in\.\([^)]+\)&select=\*&/g, (m) =>
    m.replace('select=*', 'select=${PURCHASE_ORDER_LIST_COLUMNS}')
  );
  s = s.replace(/supplier_product_prices\?[^'`"]*select=\*/g, (m) =>
    m.replace('select=*', 'select=${SUPPLIER_PRODUCT_PRICE_COLUMNS}')
  );
  s = s.replace(/delivery_requests\?[^'`"]*select=\*/g, (m) =>
    m.replace('select=*', 'select=${DELIVERY_REQUEST_COLUMNS}')
  );
  s = s.replace(/material_items\?[^'`"]*select=\*/g, (m) =>
    m.replace('select=*', 'select=${MATERIAL_ITEM_COLUMNS}')
  );
  s = s.replace(/\.from\('purchase_orders'\)\.select\('\*'\)/g, ".from('purchase_orders').select(PURCHASE_ORDER_LIST_COLUMNS)");
  s = s.replace(/\.from\('suppliers'\)\.select\('\*'\)/g, ".from('suppliers').select('id,company_name,user_id,is_verified,rating')");
  s = s.replace(/\.from\('delivery_requests'\)\.select\('\*'\)/g, ".from('delivery_requests').select(DELIVERY_REQUEST_COLUMNS)");

  if (s !== orig && !s.includes('restColumnSets')) {
    const idx = s.indexOf('\n');
    s = s.slice(0, idx + 1) + colImport + s.slice(idx + 1);
  }
  if (s !== orig) {
    fs.writeFileSync(p, s);
    console.log('updated', rel);
  }
}
