import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Eye, Lock, Database, UserCheck, Globe, Mail, AlertCircle } from "lucide-react";

const PrivacyPolicy = () => {
  const lastUpdated = "December 3, 2025";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-4 bg-white/10 text-white border-white/20">
            <Shield className="h-3 w-3 mr-1" />
            Your Privacy Matters
          </Badge>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Learn how MradiPro collects, uses, and protects your personal information in compliance 
            with the Kenya Data Protection Act 2019.
          </p>
          <p className="text-sm text-gray-400 mt-4">Last Updated: {lastUpdated}</p>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        {/* Compliance Badge */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8 flex items-start gap-3">
          <Shield className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-800">Kenya DPA 2019 Compliant</h3>
            <p className="text-sm text-green-700">
              MradiPro is fully compliant with the Kenya Data Protection Act 2019 and follows 
              international best practices for data protection.
            </p>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-4">
            <h4 className="font-semibold">Personal Information</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, phone number, password</li>
              <li><strong>Business Information:</strong> Company name, KRA PIN, business registration details</li>
              <li><strong>Location Data:</strong> Delivery addresses, GPS coordinates for tracking</li>
              <li><strong>Payment Information:</strong> M-Pesa number, bank account details (encrypted)</li>
              <li><strong>Identity Verification:</strong> National ID or passport for verified accounts</li>
            </ul>

            <h4 className="font-semibold mt-6">Automatically Collected Information</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Device information (type, operating system, browser)</li>
              <li>IP address and approximate location</li>
              <li>Usage data (pages visited, features used, time spent)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-4">
            <h4 className="font-semibold">Primary Uses</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and improve our marketplace services</li>
              <li>Process transactions and payments</li>
              <li>Facilitate communication between users</li>
              <li>Enable delivery tracking and GPS navigation</li>
              <li>Verify user identities and prevent fraud</li>
              <li>Send important service notifications</li>
            </ul>

            <h4 className="font-semibold mt-6">Secondary Uses (with consent)</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Marketing communications and promotions</li>
              <li>Platform improvement and analytics</li>
              <li>Personalized recommendations</li>
              <li>Research and development</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Information Sharing
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-4">
            <h4 className="font-semibold">We Share Information With:</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Other Users:</strong> Business profiles visible to potential partners (limited info)</li>
              <li><strong>Service Providers:</strong> Payment processors, delivery partners, cloud services</li>
              <li><strong>Legal Authorities:</strong> When required by Kenyan law or court order</li>
              <li><strong>Business Partners:</strong> With your explicit consent only</li>
            </ul>

            <h4 className="font-semibold mt-6">We Never:</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Sell your personal data to third parties</li>
              <li>Share your financial information without authorization</li>
              <li>Disclose your identity to other users without consent</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Data Security
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-4">
            <h4 className="font-semibold">Security Measures</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Encryption:</strong> AES-256 encryption for sensitive data at rest and in transit</li>
              <li><strong>Access Control:</strong> Role-based access with multi-factor authentication</li>
              <li><strong>Monitoring:</strong> 24/7 security monitoring and threat detection</li>
              <li><strong>Auditing:</strong> Regular security audits and penetration testing</li>
              <li><strong>Compliance:</strong> ISO 27001 aligned security practices</li>
            </ul>

            <h4 className="font-semibold mt-6">Data Breach Response</h4>
            <p>
              In the event of a data breach, we will notify affected users and the Office of the 
              Data Protection Commissioner within 72 hours as required by the Kenya DPA 2019.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Your Rights Under Kenya DPA 2019
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-4">
            <p>As a data subject, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Erasure:</strong> Request deletion of your data (subject to legal requirements)</li>
              <li><strong>Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Objection:</strong> Object to processing of your data</li>
              <li><strong>Restriction:</strong> Request limited processing of your data</li>
              <li><strong>Withdraw Consent:</strong> Withdraw previously given consent</li>
            </ul>

            <p className="mt-4">
              To exercise these rights, contact our Data Protection Officer at{" "}
              <a href="mailto:privacy@mradipro.co.ke" className="text-primary hover:underline">
                privacy@mradipro.co.ke
              </a>
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Cookies & Tracking</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-4">
            <h4 className="font-semibold">Types of Cookies We Use</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Essential:</strong> Required for platform functionality</li>
              <li><strong>Performance:</strong> Help us understand how users interact with the platform</li>
              <li><strong>Functional:</strong> Remember your preferences and settings</li>
              <li><strong>Marketing:</strong> Used for targeted advertising (optional)</li>
            </ul>

            <h4 className="font-semibold mt-6">Managing Cookies</h4>
            <p>
              You can manage cookie preferences through your browser settings. Note that disabling 
              essential cookies may affect platform functionality.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Data Retention</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <p>We retain your data for the following periods:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li><strong>Account Data:</strong> Duration of account + 7 years (tax compliance)</li>
              <li><strong>Transaction Records:</strong> 7 years (legal requirement)</li>
              <li><strong>Communication Logs:</strong> 2 years</li>
              <li><strong>Analytics Data:</strong> 26 months (anonymized)</li>
              <li><strong>Marketing Preferences:</strong> Until consent is withdrawn</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <p>
              MradiPro is not intended for users under 18 years of age. We do not knowingly collect 
              personal information from children. If we discover that a child has provided us with 
              personal information, we will delete it immediately.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Policy Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <p>
              We may update this Privacy Policy periodically. Significant changes will be communicated 
              via email or platform notification. The "Last Updated" date at the top indicates when 
              the policy was last revised.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Contact Us
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <p>For privacy-related inquiries or to exercise your data rights:</p>
            <ul className="list-none pl-0 space-y-2 mt-4">
              <li><strong>Data Protection Officer:</strong> privacy@mradipro.co.ke</li>
              <li><strong>General Inquiries:</strong> support@mradipro.co.ke</li>
              <li><strong>Phone:</strong> +254-700-MRADIPRO</li>
              <li><strong>Address:</strong> Nairobi, Kenya</li>
            </ul>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Office of the Data Protection Commissioner</strong><br />
                For complaints about data handling, you may contact the ODPC at{" "}
                <a href="https://www.odpc.go.ke" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  www.odpc.go.ke
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;








