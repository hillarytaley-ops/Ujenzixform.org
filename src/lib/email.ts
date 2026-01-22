/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                      ║
 * ║   📧 EMAIL SERVICE - Resend Integration for UjenziXform                                ║
 * ║                                                                                      ║
 * ║   CREATED: January 22, 2026                                                          ║
 * ║   FEATURES:                                                                          ║
 * ║   1. Order confirmation emails                                                       ║
 * ║   2. Quote notifications                                                             ║
 * ║   3. Delivery updates                                                                ║
 * ║   4. Welcome emails                                                                  ║
 * ║                                                                                      ║
 * ║   SETUP:                                                                             ║
 * ║   1. Sign up at https://resend.com                                                   ║
 * ║   2. Verify your domain (ujenzixform.org)                                             ║
 * ║   3. Get API key and add to Supabase Edge Functions                                  ║
 * ║                                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

// Email templates for different notifications
export const emailTemplates = {
  // Welcome email for new users
  welcome: (userName: string, role: string) => ({
    subject: `Welcome to UjenziXform - Kenya's Construction Marketplace`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏗️ Welcome to UjenziXform!</h1>
            </div>
            <div class="content">
              <h2>Karibu, ${userName}!</h2>
              <p>Thank you for joining UjenziXform - Kenya's premier construction materials marketplace.</p>
              <p>As a <strong>${role}</strong>, you now have access to:</p>
              <ul>
                ${role === 'supplier' ? `
                  <li>✅ List your products to thousands of builders</li>
                  <li>✅ Manage orders and quotes</li>
                  <li>✅ Track deliveries in real-time</li>
                  <li>✅ Grow your construction business</li>
                ` : role === 'professional_builder' ? `
                  <li>✅ Request quotes from multiple suppliers</li>
                  <li>✅ Compare prices instantly</li>
                  <li>✅ Track all your projects</li>
                  <li>✅ Manage your construction team</li>
                ` : `
                  <li>✅ Browse quality building materials</li>
                  <li>✅ Compare prices from verified suppliers</li>
                  <li>✅ Track your orders in real-time</li>
                  <li>✅ Secure payment with M-Pesa</li>
                `}
              </ul>
              <a href="https://ujenzixform.org/home" class="button">Get Started →</a>
              <p>Need help? Our support team is available 24/7 via live chat.</p>
            </div>
            <div class="footer">
              <p>UjenziXform - Building Kenya, One Project at a Time</p>
              <p>© 2026 UjenziXform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  // Order confirmation email
  orderConfirmation: (orderDetails: {
    orderNumber: string;
    customerName: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    deliveryAddress: string;
    estimatedDelivery: string;
  }) => ({
    subject: `Order Confirmed - ${orderDetails.orderNumber} | UjenziXform`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-box { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; }
            .item-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
            .total-row { display: flex; justify-content: space-between; padding: 15px 0; font-weight: bold; font-size: 18px; color: #16a34a; }
            .button { display: inline-block; background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Order Confirmed!</h1>
              <p>Order #${orderDetails.orderNumber}</p>
            </div>
            <div class="content">
              <h2>Asante, ${orderDetails.customerName}!</h2>
              <p>Your order has been confirmed and is being processed.</p>
              
              <div class="order-box">
                <h3>Order Details</h3>
                ${orderDetails.items.map(item => `
                  <div class="item-row">
                    <span>${item.name} x${item.quantity}</span>
                    <span>KES ${item.price.toLocaleString()}</span>
                  </div>
                `).join('')}
                <div class="total-row">
                  <span>Total</span>
                  <span>KES ${orderDetails.total.toLocaleString()}</span>
                </div>
              </div>

              <div class="order-box">
                <h3>📍 Delivery Address</h3>
                <p>${orderDetails.deliveryAddress}</p>
                <p><strong>Estimated Delivery:</strong> ${orderDetails.estimatedDelivery}</p>
              </div>

              <a href="https://ujenzixform.org/tracking" class="button">Track Your Order →</a>
            </div>
            <div class="footer">
              <p>Questions? Reply to this email or use our live chat.</p>
              <p>© 2026 UjenziXform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  // Quote request notification (for suppliers)
  quoteRequest: (details: {
    supplierName: string;
    builderName: string;
    builderCompany?: string;
    materials: Array<{ name: string; quantity: number; unit: string }>;
    deliveryAddress: string;
    projectDescription?: string;
  }) => ({
    subject: `New Quote Request from ${details.builderName} | UjenziXform`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .quote-box { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; }
            .material-row { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .urgent { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 New Quote Request</h1>
            </div>
            <div class="content">
              <h2>Hello, ${details.supplierName}!</h2>
              <p>You have received a new quote request.</p>
              
              <div class="urgent">
                ⚡ <strong>Respond quickly!</strong> Builders often choose the first supplier to respond.
              </div>

              <div class="quote-box">
                <h3>👤 Builder Details</h3>
                <p><strong>Name:</strong> ${details.builderName}</p>
                ${details.builderCompany ? `<p><strong>Company:</strong> ${details.builderCompany}</p>` : ''}
                <p><strong>Delivery Location:</strong> ${details.deliveryAddress}</p>
                ${details.projectDescription ? `<p><strong>Project:</strong> ${details.projectDescription}</p>` : ''}
              </div>

              <div class="quote-box">
                <h3>🧱 Materials Requested</h3>
                ${details.materials.map(m => `
                  <div class="material-row">
                    <strong>${m.name}</strong><br>
                    Quantity: ${m.quantity} ${m.unit}
                  </div>
                `).join('')}
              </div>

              <a href="https://ujenzixform.org/supplier-dashboard" class="button">Respond to Quote →</a>
            </div>
            <div class="footer">
              <p>© 2026 UjenziXform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  // Delivery update notification
  deliveryUpdate: (details: {
    customerName: string;
    orderNumber: string;
    status: 'dispatched' | 'in_transit' | 'arriving' | 'delivered';
    driverName?: string;
    driverPhone?: string;
    estimatedTime?: string;
  }) => {
    const statusMessages = {
      dispatched: { emoji: '📦', title: 'Order Dispatched!', message: 'Your order is on its way!' },
      in_transit: { emoji: '🚚', title: 'In Transit', message: 'Your delivery is on the move.' },
      arriving: { emoji: '📍', title: 'Almost There!', message: 'Your delivery will arrive soon.' },
      delivered: { emoji: '✅', title: 'Delivered!', message: 'Your order has been delivered.' }
    };
    
    const statusInfo = statusMessages[details.status];
    
    return {
      subject: `${statusInfo.emoji} ${statusInfo.title} - Order ${details.orderNumber} | UjenziXform`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .status-box { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; text-align: center; }
              .status-emoji { font-size: 48px; }
              .driver-box { background: #ecfdf5; border-radius: 8px; padding: 15px; margin: 15px 0; }
              .button { display: inline-block; background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${statusInfo.emoji} ${statusInfo.title}</h1>
                <p>Order #${details.orderNumber}</p>
              </div>
              <div class="content">
                <h2>Hello, ${details.customerName}!</h2>
                <p>${statusInfo.message}</p>
                
                <div class="status-box">
                  <div class="status-emoji">${statusInfo.emoji}</div>
                  <h3>${statusInfo.title}</h3>
                  ${details.estimatedTime ? `<p>Estimated arrival: <strong>${details.estimatedTime}</strong></p>` : ''}
                </div>

                ${details.driverName ? `
                  <div class="driver-box">
                    <h4>🚗 Your Driver</h4>
                    <p><strong>${details.driverName}</strong></p>
                    ${details.driverPhone ? `<p>📞 ${details.driverPhone}</p>` : ''}
                  </div>
                ` : ''}

                <a href="https://ujenzixform.org/tracking" class="button">Track Live →</a>
              </div>
              <div class="footer">
                <p>© 2026 UjenziXform. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `
    };
  },

  // Password reset email
  passwordReset: (userName: string, resetLink: string) => ({
    subject: `Reset Your Password | UjenziXform`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset</h1>
            </div>
            <div class="content">
              <h2>Hello, ${userName}!</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              
              <a href="${resetLink}" class="button">Reset Password →</a>
              
              <div class="warning">
                ⚠️ This link expires in 1 hour. If you didn't request this, please ignore this email.
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #6366f1;">${resetLink}</p>
            </div>
            <div class="footer">
              <p>© 2026 UjenziXform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  })
};

// Type definitions for email sending
export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// This will be called from Supabase Edge Function
export const sendEmailViaEdgeFunction = async (params: SendEmailParams): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

