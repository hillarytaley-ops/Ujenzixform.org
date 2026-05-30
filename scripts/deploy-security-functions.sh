#!/usr/bin/env bash
# Deploy security-hardened Supabase Edge Functions
set -euo pipefail

FUNCTIONS=(
  process-payment
  paystack-initialize
  paystack-verify
  send-email
  staff-auth-bootstrap
  provision-staff-auth
  verify-admin-staff-login
  paystack-webhook
  etims-proxy
)

echo "Deploying security Edge Functions..."
for fn in "${FUNCTIONS[@]}"; do
  echo "→ $fn"
  supabase functions deploy "$fn"
done

echo "Done. Apply migrations with: supabase db push"
