import fs from 'fs';
import path from 'path';

const files = [
  'src/components/profile/ProfileViewDialog.tsx',
  'src/components/profile/ProfileEditDialog.tsx',
  'src/components/builders/BuilderProfileEdit.tsx',
  'src/components/builders/BuilderFacebookLayout.tsx',
  'src/components/builders/BuilderOrdersTracker.tsx',
  'src/components/builders/PendingQuoteRequests.tsx',
  'src/components/projects/ProjectDetails.tsx',
  'src/components/supplier/OrderManagement.tsx',
  'src/pages/admin/tabs/FinancialTab.tsx',
  'src/services/dataPrefetch.ts',
  'src/components/delivery/ArrivalScanReminder.tsx',
  'src/pages/DeliveryDashboard.tsx',
  'src/components/analytics/AnalyticsDashboard.tsx',
  'src/components/delivery/DeliveryNotifications.tsx',
  'src/hooks/useDataIsolation.ts',
];

const colImport =
  "import { PROFILE_SELF_COLUMNS, PROFILE_DIRECTORY_COLUMNS, PROFILE_PARTNER_COLUMNS, SUPPLIER_SELF_COLUMNS, DELIVERY_PROVIDER_SELF_COLUMNS, PURCHASE_ORDER_LIST_COLUMNS, PURCHASE_ORDER_SEARCH_COLUMNS, PAYMENT_LIST_COLUMNS, SUPPLIER_PRODUCT_PRICE_COLUMNS } from '@/lib/restColumnSets';\n";

for (const rel of files) {
  const p = path.join(process.cwd(), rel);
  if (!fs.existsSync(p)) {
    console.log('skip', rel);
    continue;
  }
  let s = fs.readFileSync(p, 'utf8');
  const orig = s;

  s = s.replace(/profiles\?[^'`"]*select=\*/g, (m) =>
    m.includes('role=eq.professional_builder')
      ? m.replace('select=*', 'select=${PROFILE_DIRECTORY_COLUMNS}')
      : m.includes('user_id=in.')
        ? m.replace('select=*', 'select=${PROFILE_PARTNER_COLUMNS}')
        : m.replace('select=*', 'select=${PROFILE_SELF_COLUMNS}')
  );
  s = s.replace(/suppliers\?[^'`"]*select=\*/g, (m) =>
    m.replace('select=*', 'select=${SUPPLIER_SELF_COLUMNS}')
  );
  s = s.replace(/delivery_providers\?[^'`"]*select=\*/g, (m) =>
    m.replace('select=*', 'select=${DELIVERY_PROVIDER_SELF_COLUMNS}')
  );
  s = s.replace(/purchase_orders\?[^'`"]*select=\*/g, (m) =>
    m.includes('limit=5') || m.includes('po_number=ilike')
      ? m.replace('select=*', 'select=${PURCHASE_ORDER_SEARCH_COLUMNS}')
      : m.replace('select=*', 'select=${PURCHASE_ORDER_LIST_COLUMNS}')
  );
  s = s.replace(/payments\?[^'`"]*select=\*/g, (m) =>
    m.replace('select=*', 'select=${PAYMENT_LIST_COLUMNS}')
  );
  s = s.replace(/\.from\('profiles'\)\.select\('\*'\)/g, ".from('profiles').select(PROFILE_SELF_COLUMNS)");
  s = s.replace(/\.from\("profiles"\)\.select\("\*"\)/g, '.from("profiles").select(PROFILE_SELF_COLUMNS)');
  s = s.replace(/\.from\('payments'\)\.select\('\*'\)/g, ".from('payments').select(PAYMENT_LIST_COLUMNS)");

  if (s !== orig && !s.includes('restColumnSets')) {
    const idx = s.indexOf('\n');
    s = s.slice(0, idx + 1) + colImport + s.slice(idx + 1);
  }
  if (s !== orig) {
    fs.writeFileSync(p, s);
    console.log('updated', rel);
  }
}
