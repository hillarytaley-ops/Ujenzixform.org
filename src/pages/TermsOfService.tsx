import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Shield, Users, AlertTriangle, Scale, Mail } from "lucide-react";

const TermsOfService = () => {
  const lastUpdated = "April 18, 2026";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-4 bg-white/10 text-white border-white/20">
            <FileText className="h-3 w-3 mr-1" />
            Legal Document
          </Badge>
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Please read these terms carefully before using UjenziXform's construction marketplace platform.
          </p>
          <p className="text-sm text-gray-400 mt-4">Last Updated: {lastUpdated}</p>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Agreement to Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <p>
              By accessing or using UjenziXform ("the Platform"), you agree to be bound by these Terms of Service 
              and all applicable laws and regulations. If you do not agree with any of these terms, you are 
              prohibited from using or accessing this platform.
            </p>
            <p>
              UjenziXform is a construction marketplace platform operated in Kenya, connecting builders, 
              suppliers, and delivery providers across all 47 counties.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              User Accounts & Responsibilities
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-4">
            <h4 className="font-semibold">Account Registration</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide accurate, complete, and current information during registration</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You must be at least 18 years old to create an account</li>
              <li>One person or business may only maintain one account</li>
            </ul>

            <h4 className="font-semibold mt-6">User Types</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Builders:</strong> Construction professionals seeking materials and services</li>
              <li><strong>Suppliers:</strong> Businesses providing construction materials</li>
              <li><strong>Delivery Providers:</strong> Transportation services for material delivery</li>
              <li><strong>Private Clients:</strong> Individuals purchasing materials for personal projects</li>
            </ul>

            <h4 className="font-semibold mt-6">Your Responsibilities</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintain accurate business information and credentials</li>
              <li>Comply with all applicable Kenyan laws and regulations</li>
              <li>Conduct business transactions honestly and in good faith</li>
              <li>Respond to communications and orders in a timely manner</li>
              <li>Report any suspicious activity or security concerns</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Platform Services
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-4">
            <h4 className="font-semibold">Services Provided</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Marketplace for construction materials</li>
              <li>Builder and supplier directory</li>
              <li>Delivery coordination and GPS tracking</li>
              <li>QR code material verification</li>
              <li>Site monitoring services</li>
              <li>Payment processing via M-Pesa and other methods</li>
            </ul>

            <h4 className="font-semibold mt-6">Service Limitations</h4>
            <p>
              UjenziXform acts as a marketplace facilitator. We do not:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Guarantee the quality of materials sold by third-party suppliers</li>
              <li>Take responsibility for delivery delays caused by external factors</li>
              <li>Provide warranties on products sold through the platform</li>
              <li>Guarantee continuous, uninterrupted access to the platform</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Prohibited Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <p>Users are prohibited from:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Providing false or misleading information</li>
              <li>Selling counterfeit or substandard materials</li>
              <li>Engaging in fraudulent transactions</li>
              <li>Attempting to circumvent platform security measures</li>
              <li>Harassing or threatening other users</li>
              <li>Using the platform for any illegal activities</li>
              <li>Scraping or collecting user data without authorization</li>
              <li>Manipulating reviews or ratings</li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              Violation of these terms may result in immediate account suspension or termination.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Payments & Transactions</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-4">
            <h4 className="font-semibold">Payment Methods</h4>
            <p>
              UjenziXform supports various payment methods including M-Pesa, Airtel Money, bank transfers, 
              and other approved payment services. All transactions are processed in Kenyan Shillings (KES).
            </p>

            <h4 className="font-semibold mt-6">Transaction Fees</h4>
            <p>
              UjenziXform charges a <strong>0.5% service fee</strong> on the total price of each item, or on
              the price per unit of measure where pricing is per unit. This fee applies in addition to any
              other platform or payment charges that may be shown at checkout or in your account. Fee
              structures are displayed before you confirm a transaction where applicable. Suppliers and
              delivery providers agree to applicable commission and fee terms upon registration and use of
              the platform.
            </p>

            <h4 className="font-semibold mt-6">Refunds & Disputes</h4>
            <p>
              Refund policies are determined by individual suppliers. UjenziXform provides dispute resolution 
              assistance but is not liable for refund decisions made by suppliers.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <p>
              The UjenziXform platform, including its logo, design, text, graphics, and software, is protected 
              by copyright and trademark laws. Users may not reproduce, distribute, or create derivative 
              works without express written permission.
            </p>
            <p className="mt-4">
              Content uploaded by users remains their property, but by uploading, you grant UjenziXform a 
              non-exclusive license to use, display, and distribute such content on the platform.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <p>
              To the maximum extent permitted by Kenyan law, UjenziXform shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages resulting from your use of the platform.
            </p>
            <p className="mt-4">
              Our total liability for any claims arising from these terms shall not exceed the amount 
              paid by you to UjenziXform in the twelve (12) months preceding the claim.
            </p>
            <p className="mt-4">
              During delivery while goods are <strong>in transit</strong>, UjenziXform is not liable for
              loss or damage arising from <strong>theft</strong> or a <strong>major accident</strong>. Risk
              during physical carriage is between the parties arranging and performing the delivery (for
              example, the supplier, the delivery provider, and the recipient), subject to any separate
              agreement or insurance those parties may have.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Governing Law</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <p>
              These Terms of Service shall be governed by and construed in accordance with the laws of 
              the Republic of Kenya. Any disputes arising from these terms shall be resolved in the 
              courts of Kenya.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <p>
              UjenziXform reserves the right to modify these terms at any time. Users will be notified of 
              significant changes via email or platform notification. Continued use of the platform 
              after changes constitutes acceptance of the modified terms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <p>For questions about these Terms of Service, please contact us:</p>
            <ul className="list-none pl-0 space-y-2 mt-4">
              <li><strong>Email:</strong> legal@UjenziXform.co.ke</li>
              <li><strong>Phone:</strong> +254-700-UjenziXform</li>
              <li><strong>Address:</strong> Nairobi, Kenya</li>
            </ul>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;








