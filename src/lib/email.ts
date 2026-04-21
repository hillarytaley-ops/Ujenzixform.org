/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║   📧 EMAIL SERVICE — Resend via Edge Function / Vercel API                           ║
 * ║   Branded templates: logo + company contact + line items (orders / receipts).      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/lib/invokeEdgeFunction';
import {
  wrapTransactionalEmail,
  escapeHtml,
  formatKes,
  lineItemsTableHtml,
  lineItemsFromUnknown,
  emailPublicOrigin,
  type LineItemRow,
} from '@/lib/emailLayout';

const accentGreen = '#15803d';
const accentBlue = '#1d4ed8';
const accentIndigo = '#4f46e5';

function ctaButton(href: string, label: string, color: string): string {
  return `<p style="margin:24px 0 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">${escapeHtml(label)}</a></p>`;
}

export const emailTemplates = {
  welcome: (userName: string, role: string) => {
    const bullets =
      role === 'supplier'
        ? `<ul style="margin:12px 0;padding-left:20px;">
            <li>List your products to builders nationwide</li>
            <li>Manage orders and quotes</li>
            <li>Track deliveries</li>
          </ul>`
        : role === 'professional_builder'
          ? `<ul style="margin:12px 0;padding-left:20px;">
            <li>Request quotes from multiple suppliers</li>
            <li>Compare prices</li>
            <li>Track projects</li>
          </ul>`
          : `<ul style="margin:12px 0;padding-left:20px;">
            <li>Browse verified materials</li>
            <li>Compare supplier prices</li>
            <li>Secure checkout (Paystack / M-Pesa where enabled)</li>
          </ul>`;
    const body = `
      <p style="margin:0;">Karibu, <strong>${escapeHtml(userName)}</strong>!</p>
      <p style="margin:16px 0 0;">Thank you for joining <strong>UjenziXform</strong>. You are registered as a <strong>${escapeHtml(role)}</strong>.</p>
      ${bullets}
      ${ctaButton(`${emailPublicOrigin()}/home`, 'Open your dashboard →', accentGreen)}
      <p style="margin:20px 0 0;color:#64748b;font-size:14px;">Questions? Reply to this email or write to <a href="mailto:info@ujenzixform.org">info@ujenzixform.org</a>.</p>
    `;
    return {
      subject: `Welcome to UjenziXform`,
      html: wrapTransactionalEmail({
        accent: accentGreen,
        title: 'Welcome aboard',
        subtitle: 'Kenya’s construction marketplace',
        preheader: `Welcome, ${userName}`,
        bodyHtml: body,
      }),
    };
  },

  orderConfirmation: (orderDetails: {
    orderNumber: string;
    customerName: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    deliveryAddress: string;
    estimatedDelivery: string;
  }) => {
    const rows: LineItemRow[] = orderDetails.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.price / Math.max(1, i.quantity),
    }));
    const body = `
      <p style="margin:0;">Asante, <strong>${escapeHtml(orderDetails.customerName)}</strong>!</p>
      <p style="margin:12px 0 0;">Your order <strong>${escapeHtml(orderDetails.orderNumber)}</strong> is confirmed.</p>
      <h3 style="margin:24px 0 8px;font-size:15px;color:#0f172a;">Materials</h3>
      ${lineItemsTableHtml(rows)}
      <p style="margin:8px 0 0;text-align:right;font-weight:700;">Total: ${formatKes(orderDetails.total)}</p>
      <h3 style="margin:24px 0 8px;font-size:15px;color:#0f172a;">Delivery</h3>
      <p style="margin:0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;">${escapeHtml(orderDetails.deliveryAddress)}</p>
      <p style="margin:10px 0 0;"><strong>Estimated:</strong> ${escapeHtml(orderDetails.estimatedDelivery)}</p>
      ${ctaButton(`${emailPublicOrigin()}/home`, 'View order status →', accentGreen)}
    `;
    return {
      subject: `Order confirmed — ${orderDetails.orderNumber}`,
      html: wrapTransactionalEmail({
        accent: accentGreen,
        title: 'Order confirmed',
        subtitle: orderDetails.orderNumber,
        bodyHtml: body,
      }),
    };
  },

  /** After Buy Now: order exists; user should complete Paystack if prompted. */
  builderOrderPlacedAwaitingPayment: (p: {
    customerName: string;
    poNumber: string;
    orderId: string;
    total: number;
    items: unknown;
    /** Path only, e.g. `/professional-builder-dashboard` */
    dashboardPath?: string;
  }) => {
    const dash = (p.dashboardPath?.trim() || '/private-client-dashboard').replace(/\/$/, '');
    const rows = lineItemsFromUnknown(p.items);
    const body = `
      <p style="margin:0;">Hello <strong>${escapeHtml(p.customerName)}</strong>,</p>
      <p style="margin:14px 0 0;">Your order <strong>${escapeHtml(p.poNumber)}</strong> has been placed.</p>
      <div style="margin:18px 0;padding:14px 16px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;color:#92400e;">
        <strong>Awaiting payment</strong> — if a Paystack window opens, complete payment there. If you closed it, open your cart or dashboard and pay from your order summary when ready.
      </div>
      <h3 style="margin:20px 0 8px;font-size:15px;">Materials purchased</h3>
      ${lineItemsTableHtml(rows)}
      <p style="margin:8px 0 0;text-align:right;font-weight:700;">Total due: ${formatKes(p.total)}</p>
      ${ctaButton(`${emailPublicOrigin()}${dash}`, 'Go to dashboard →', accentGreen)}
    `;
    return {
      subject: `Order placed — complete payment (${p.poNumber})`,
      html: wrapTransactionalEmail({
        accent: '#ca8a04',
        title: 'Order placed',
        subtitle: `PO ${escapeHtml(p.poNumber)}`,
        preheader: `Total ${formatKes(p.total)} — payment pending`,
        bodyHtml: body,
      }),
    };
  },

  builderPaymentReceived: (p: {
    customerName: string;
    poNumber: string;
    total: number;
    reference?: string;
    items?: unknown;
    dashboardPath?: string;
  }) => {
    const dash = (p.dashboardPath?.trim() || '/private-client-dashboard').replace(/\/$/, '');
    const rows = p.items ? lineItemsFromUnknown(p.items) : [];
    const refLine = p.reference
      ? `<p style="margin:12px 0 0;font-size:14px;color:#475569;">Paystack reference: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${escapeHtml(p.reference)}</code></p>`
      : '';
    const body = `
      <p style="margin:0;">Hello <strong>${escapeHtml(p.customerName)}</strong>,</p>
      <p style="margin:14px 0 0;">We received your payment for order <strong>${escapeHtml(p.poNumber)}</strong>.</p>
      <div style="margin:18px 0;padding:14px 16px;background:#ecfdf5;border:1px solid #86efac;border-radius:8px;color:#14532d;">
        <strong>Payment received</strong> — ${formatKes(p.total)}
      </div>
      ${refLine}
      ${rows.length ? `<h3 style="margin:22px 0 8px;font-size:15px;">Materials</h3>${lineItemsTableHtml(rows)}` : ''}
      ${ctaButton(`${emailPublicOrigin()}${dash}`, 'Open dashboard →', accentGreen)}
    `;
    return {
      subject: `Payment received — ${p.poNumber}`,
      html: wrapTransactionalEmail({
        accent: accentGreen,
        title: 'Payment received',
        subtitle: formatKes(p.total),
        bodyHtml: body,
      }),
    };
  },

  builderDeliveryQuotePaid: (p: {
    customerName: string;
    requestId: string;
    reference?: string;
    dashboardPath?: string;
  }) => {
    const dash = (p.dashboardPath?.trim() || '/private-client-dashboard').replace(/\/$/, '');
    const ref = p.reference
      ? `<p style="margin:12px 0 0;font-size:14px;">Reference: <code>${escapeHtml(p.reference)}</code></p>`
      : '';
    const body = `
      <p style="margin:0;">Hello <strong>${escapeHtml(p.customerName)}</strong>,</p>
      <p style="margin:14px 0 0;">Your <strong>delivery quote payment</strong> was received. Providers can proceed with your job.</p>
      <p style="margin:12px 0 0;">Request ID: <code>${escapeHtml(p.requestId)}</code></p>
      ${ref}
      ${ctaButton(`${emailPublicOrigin()}${dash}?tab=deliveries`, 'View deliveries →', accentBlue)}
    `;
    return {
      subject: 'Delivery quote paid',
      html: wrapTransactionalEmail({
        accent: accentBlue,
        title: 'Delivery payment received',
        subtitle: 'Your delivery request is funded',
        bodyHtml: body,
      }),
    };
  },

  builderMonitoringPaid: (p: {
    customerName: string;
    requestId: string;
    reference?: string;
    dashboardPath?: string;
  }) => {
    const dash = (p.dashboardPath?.trim() || '/private-client-dashboard').replace(/\/$/, '');
    const ref = p.reference
      ? `<p style="margin:12px 0 0;font-size:14px;">Reference: <code>${escapeHtml(p.reference)}</code></p>`
      : '';
    const body = `
      <p style="margin:0;">Hello <strong>${escapeHtml(p.customerName)}</strong>,</p>
      <p style="margin:14px 0 0;">Your <strong>site monitoring</strong> package payment was received.</p>
      <p style="margin:12px 0 0;">Request ID: <code>${escapeHtml(p.requestId)}</code></p>
      ${ref}
      ${ctaButton(`${emailPublicOrigin()}${dash}`, 'Dashboard →', accentIndigo)}
    `;
    return {
      subject: 'Monitoring package paid',
      html: wrapTransactionalEmail({
        accent: accentIndigo,
        title: 'Monitoring payment received',
        bodyHtml: body,
      }),
    };
  },

  builderInvoicePaid: (p: { customerName: string; invoiceLabel: string; reference?: string }) => {
    const ref = p.reference
      ? `<p style="margin:12px 0 0;">Reference: <code>${escapeHtml(p.reference)}</code></p>`
      : '';
    const body = `
      <p style="margin:0;">Hello <strong>${escapeHtml(p.customerName)}</strong>,</p>
      <p style="margin:14px 0 0;">Your invoice <strong>${escapeHtml(p.invoiceLabel)}</strong> is marked <strong>paid</strong>.</p>
      ${ref}
      ${ctaButton(`${emailPublicOrigin()}/professional-builder-dashboard`, 'Builder dashboard →', accentBlue)}
    `;
    return {
      subject: `Invoice paid — ${p.invoiceLabel}`,
      html: wrapTransactionalEmail({
        accent: accentGreen,
        title: 'Invoice paid',
        bodyHtml: body,
      }),
    };
  },

  quoteRequest: (details: {
    supplierName: string;
    builderName: string;
    builderCompany?: string;
    materials: Array<{ name: string; quantity: number; unit: string }>;
    deliveryAddress: string;
    projectDescription?: string;
  }) => {
    const rows: LineItemRow[] = details.materials.map((m) => ({
      name: m.name,
      quantity: m.quantity,
      unit: m.unit,
    }));
    const body = `
      <p style="margin:0;">Hello <strong>${escapeHtml(details.supplierName)}</strong>,</p>
      <p style="margin:14px 0 0;">You have a new quote request from <strong>${escapeHtml(details.builderName)}</strong>.</p>
      ${details.builderCompany ? `<p style="margin:8px 0 0;">Company: ${escapeHtml(details.builderCompany)}</p>` : ''}
      <p style="margin:8px 0 0;"><strong>Delivery location:</strong> ${escapeHtml(details.deliveryAddress)}</p>
      ${details.projectDescription ? `<p style="margin:8px 0 0;"><strong>Project:</strong> ${escapeHtml(details.projectDescription)}</p>` : ''}
      <h3 style="margin:20px 0 8px;font-size:15px;">Materials</h3>
      ${lineItemsTableHtml(rows)}
      ${ctaButton(`${emailPublicOrigin()}/supplier-dashboard`, 'Respond in supplier dashboard →', accentBlue)}
    `;
    return {
      subject: `New quote request — ${details.builderName}`,
      html: wrapTransactionalEmail({
        accent: accentBlue,
        title: 'New quote request',
        subtitle: details.builderName,
        bodyHtml: body,
      }),
    };
  },

  deliveryUpdate: (details: {
    customerName: string;
    orderNumber: string;
    status: 'dispatched' | 'in_transit' | 'arriving' | 'delivered';
    driverName?: string;
    driverPhone?: string;
    estimatedTime?: string;
  }) => {
    const statusMessages = {
      dispatched: { emoji: '📦', title: 'Order dispatched', message: 'Your order is on its way.' },
      in_transit: { emoji: '🚚', title: 'In transit', message: 'Your delivery is on the move.' },
      arriving: { emoji: '📍', title: 'Almost there', message: 'Your delivery will arrive soon.' },
      delivered: { emoji: '✅', title: 'Delivered', message: 'Your order has been delivered.' },
    };
    const st = statusMessages[details.status];
    const driver =
      details.driverName || details.driverPhone
        ? `<div style="margin:16px 0;padding:14px;background:#ecfdf5;border-radius:8px;border:1px solid #bbf7d0;">
            <strong>Driver</strong><br/>
            ${details.driverName ? escapeHtml(details.driverName) : ''}
            ${details.driverPhone ? `<br/>📞 ${escapeHtml(details.driverPhone)}` : ''}
          </div>`
        : '';
    const body = `
      <p style="margin:0;">Hello <strong>${escapeHtml(details.customerName)}</strong>,</p>
      <p style="margin:14px 0 0;">${st.message}</p>
      <p style="margin:10px 0 0;"><strong>Order</strong> ${escapeHtml(details.orderNumber)}</p>
      ${details.estimatedTime ? `<p style="margin:8px 0 0;">Estimated: ${escapeHtml(details.estimatedTime)}</p>` : ''}
      ${driver}
      ${ctaButton(`${emailPublicOrigin()}/home`, 'Track order →', accentGreen)}
    `;
    return {
      subject: `${st.emoji} ${st.title} — ${details.orderNumber}`,
      html: wrapTransactionalEmail({
        accent: accentGreen,
        title: `${st.emoji} ${st.title}`,
        subtitle: `Order ${escapeHtml(details.orderNumber)}`,
        bodyHtml: body,
      }),
    };
  },

  passwordReset: (userName: string, resetLink: string) => {
    const body = `
      <p style="margin:0;">Hello <strong>${escapeHtml(userName)}</strong>,</p>
      <p style="margin:14px 0 0;">We received a request to reset your password.</p>
      ${ctaButton(resetLink, 'Reset password →', accentIndigo)}
      <p style="margin:20px 0 0;font-size:13px;color:#64748b;">If you did not request this, you can ignore this email. Link expires in one hour.</p>
      <p style="margin:10px 0 0;word-break:break-all;font-size:12px;color:#6366f1;">${escapeHtml(resetLink)}</p>
    `;
    return {
      subject: 'Reset your password',
      html: wrapTransactionalEmail({
        accent: accentIndigo,
        title: 'Password reset',
        bodyHtml: body,
      }),
    };
  },
};

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export const sendEmailViaEdgeFunction = async (params: SendEmailParams): Promise<{ success: boolean; error?: string }> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    if (origin && token) {
      const response = await fetch(`${origin}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (response.ok) {
        return { success: true };
      }
      if (response.status !== 404) {
        console.warn(
          'sendEmailViaEdgeFunction: /api/send-email failed, trying Supabase Edge send-email:',
          payload.error || response.status
        );
      }
    }

    const { error } = await invokeEdgeFunction('send-email', { body: params }, { hasRecipient: !!params.to });
    if (error) {
      const msg =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message: string }).message)
          : 'send-email failed';
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
