import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Landmark, PlugZap } from 'lucide-react';
import { testEtimsIntegratorConnection } from '@/lib/etims/purchaseOrderEtims';

const VAT_OPTIONS = [
  { value: 'registered', label: 'VAT registered' },
  { value: 'exempt', label: 'Exempt / zero-rated context' },
  { value: 'not_registered', label: 'Not VAT registered' },
  { value: 'unknown', label: 'Unknown / not specified' },
] as const;

const PAYMENT_TYPES = ['01', '02', '03', '04', '05', '06', '07'] as const;

export type SupplierEtimsSettingsPanelProps = {
  supplierRecordId: string;
  isDarkMode: boolean;
  textColor: string;
  mutedText: string;
  cardBg: string;
};

export const SupplierEtimsSettingsPanel: React.FC<SupplierEtimsSettingsPanelProps> = ({
  supplierRecordId,
  isDarkMode,
  textColor,
  mutedText,
  cardBg,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [legalBusinessName, setLegalBusinessName] = useState('');
  const [kraPin, setKraPin] = useState('');
  const [vatStatus, setVatStatus] = useState<string>('unknown');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [invoicePhone, setInvoicePhone] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [businessPlaceCode, setBusinessPlaceCode] = useState('');
  const [deviceSerial, setDeviceSerial] = useState('');
  const [integratorRef, setIntegratorRef] = useState('');
  const [connectionNotes, setConnectionNotes] = useState('');
  const [defaultPaymentType, setDefaultPaymentType] = useState<string>('01');
  const [invoiceNotes, setInvoiceNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select(
          'legal_business_name,kra_pin,vat_registration_status,physical_business_address,invoice_contact_phone,invoice_contact_email,etims_branch_code,etims_business_place_code,etims_device_serial,etims_integrator_account_ref,etims_connection_notes,etims_default_payment_type,etims_invoice_notes',
        )
        .eq('id', supplierRecordId)
        .maybeSingle();

      if (error) throw error;
      const row = data as Record<string, string | null> | null;
      if (!row) {
        toast({ title: 'Supplier not found', variant: 'destructive' });
        return;
      }
      setLegalBusinessName((row.legal_business_name as string) || '');
      setKraPin((row.kra_pin as string) || '');
      setVatStatus((row.vat_registration_status as string) || 'unknown');
      setPhysicalAddress((row.physical_business_address as string) || '');
      setInvoicePhone((row.invoice_contact_phone as string) || '');
      setInvoiceEmail((row.invoice_contact_email as string) || '');
      setBranchCode((row.etims_branch_code as string) || '');
      setBusinessPlaceCode((row.etims_business_place_code as string) || '');
      setDeviceSerial((row.etims_device_serial as string) || '');
      setIntegratorRef((row.etims_integrator_account_ref as string) || '');
      setConnectionNotes((row.etims_connection_notes as string) || '');
      setDefaultPaymentType((row.etims_default_payment_type as string) || '01');
      setInvoiceNotes((row.etims_invoice_notes as string) || '');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'Could not load KRA settings', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [supplierRecordId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({
          legal_business_name: legalBusinessName.trim() || null,
          kra_pin: kraPin.trim().toUpperCase() || null,
          vat_registration_status: vatStatus || null,
          physical_business_address: physicalAddress.trim() || null,
          invoice_contact_phone: invoicePhone.trim() || null,
          invoice_contact_email: invoiceEmail.trim() || null,
          etims_branch_code: branchCode.trim() || null,
          etims_business_place_code: businessPlaceCode.trim() || null,
          etims_device_serial: deviceSerial.trim() || null,
          etims_integrator_account_ref: integratorRef.trim() || null,
          etims_connection_notes: connectionNotes.trim() || null,
          etims_default_payment_type: defaultPaymentType.trim() || '01',
          etims_invoice_notes: invoiceNotes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', supplierRecordId);

      if (error) throw error;
      toast({ title: 'Saved', description: 'KRA / eTIMS supplier details updated.' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'Save failed', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await testEtimsIntegratorConnection();
      const nowIso = new Date().toISOString();
      await supabase
        .from('suppliers')
        .update({
          etims_last_connection_test_at: nowIso,
          etims_last_connection_test_result: (res.ok ? res.data : { error: res.message, status: res.status }) as object,
          updated_at: nowIso,
        })
        .eq('id', supplierRecordId);

      if (!res.ok) {
        toast({
          title: 'Connection test failed',
          description: res.message,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Integrator reachable',
        description: 'Edge proxy returned a successful response from GET branches.',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'Test failed', description: msg, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${mutedText}`}>
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Loading KRA settings…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className={isDarkMode ? 'border-slate-600 bg-slate-900/50' : ''}>
        <Landmark className="h-4 w-4" />
        <AlertTitle className={textColor}>Legal seller on tax invoices</AlertTitle>
        <AlertDescription className={mutedText}>
          You are the taxpayer; the marketplace only carries data and calls your configured integrator. API passwords
          stay in Supabase Edge secrets — use “Integrator reference” for a non-secret tenant or sub-account label only.
        </AlertDescription>
      </Alert>

      <Card className={cardBg}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-base ${textColor}`}>Business & KRA identity</CardTitle>
          <CardDescription className={mutedText}>
            Used for display, compliance checks, and future payload extensions to the integrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="legal-name">Legal / registered business name</Label>
            <Input
              id="legal-name"
              className="mt-1"
              value={legalBusinessName}
              onChange={(e) => setLegalBusinessName(e.target.value)}
              placeholder="As registered with KRA"
            />
          </div>
          <div>
            <Label htmlFor="kra-pin">KRA PIN</Label>
            <Input
              id="kra-pin"
              className="mt-1 font-mono uppercase"
              value={kraPin}
              onChange={(e) => setKraPin(e.target.value.toUpperCase())}
              placeholder="P051234567X"
            />
          </div>
          <div>
            <Label>VAT / tax registration</Label>
            <Select value={vatStatus} onValueChange={setVatStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {VAT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="phys-addr">Physical business address</Label>
            <Textarea
              id="phys-addr"
              className="mt-1"
              rows={3}
              value={physicalAddress}
              onChange={(e) => setPhysicalAddress(e.target.value)}
              placeholder="Street, town, county — principal place of business or invoicing branch"
            />
          </div>
          <div>
            <Label htmlFor="inv-phone">Invoice contact phone</Label>
            <Input
              id="inv-phone"
              className="mt-1"
              value={invoicePhone}
              onChange={(e) => setInvoicePhone(e.target.value)}
              placeholder="+254 …"
            />
          </div>
          <div>
            <Label htmlFor="inv-email">Invoice contact email</Label>
            <Input
              id="inv-email"
              type="email"
              className="mt-1"
              value={invoiceEmail}
              onChange={(e) => setInvoiceEmail(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className={cardBg}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-base ${textColor}`}>eTIMS / integrator</CardTitle>
          <CardDescription className={mutedText}>
            Branch and device identifiers are often required by KRA OSCU deployments. Match values from your
            integrator or tax device onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="branch">Branch / location code</Label>
            <Input id="branch" className="mt-1" value={branchCode} onChange={(e) => setBranchCode(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="bplace">Business place code</Label>
            <Input
              id="bplace"
              className="mt-1"
              value={businessPlaceCode}
              onChange={(e) => setBusinessPlaceCode(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="dev-serial">Device / OSCU serial (if applicable)</Label>
            <Input id="dev-serial" className="mt-1" value={deviceSerial} onChange={(e) => setDeviceSerial(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="int-ref">Integrator account reference (non-secret)</Label>
            <Input
              id="int-ref"
              className="mt-1"
              value={integratorRef}
              onChange={(e) => setIntegratorRef(e.target.value)}
              placeholder="Tenant label, sub-account id, etc."
            />
          </div>
          <div>
            <Label>Default payment type on invoices</Label>
            <Select value={defaultPaymentType} onValueChange={setDefaultPaymentType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TYPES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="conn-notes">Connection notes (no passwords)</Label>
            <Textarea
              id="conn-notes"
              className="mt-1"
              rows={2}
              value={connectionNotes}
              onChange={(e) => setConnectionNotes(e.target.value)}
              placeholder="e.g. sandbox vs production, support ticket ref…"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="inv-notes">Default invoice remarks / footer</Label>
            <Textarea
              id="inv-notes"
              className="mt-1"
              rows={2}
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save KRA / eTIMS profile
        </Button>
        <Button type="button" variant="outline" onClick={() => void handleTestConnection()} disabled={testing}>
          {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
          Test integrator connection
        </Button>
        <Button type="button" variant="ghost" onClick={() => void load()} disabled={loading}>
          Reload
        </Button>
      </div>
    </div>
  );
};
