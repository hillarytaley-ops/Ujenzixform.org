import React from 'react';
import { Shield, CheckCircle, Award, Lock, Globe, Smartphone } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const TrustBadges: React.FC = () => {
  const badges = [
    {
      icon: Shield,
      title: 'SSL Secured',
      description: '256-bit encryption',
      color: 'text-green-600'
    },
    {
      icon: CheckCircle,
      title: 'KEBS Verified',
      description: 'Quality assured',
      color: 'text-blue-600'
    },
    {
      icon: Award,
      title: 'ISO Certified',
      description: 'International standards',
      color: 'text-purple-600'
    },
    {
      icon: Lock,
      title: 'Data Protected',
      description: 'GDPR compliant',
      color: 'text-red-600'
    },
    {
      icon: Smartphone,
      title: 'M-Pesa Secure',
      description: 'Safaricom verified',
      color: 'text-kenyan-green'
    },
    {
      icon: Globe,
      title: '99.9% Uptime',
      description: 'Always available',
      color: 'text-construction-orange'
    }
  ];

  const partners = [
    { name: 'Safaricom', logo: '🇰🇪', description: 'M-Pesa Integration' },
    { name: 'KEBS', logo: '✓', description: 'Quality Standards' },
    { name: 'NCA', logo: '🏗️', description: 'Construction Authority' },
    { name: 'KRA', logo: '📋', description: 'Tax Compliance' },
    { name: 'CBK', logo: '🏦', description: 'Banking Partner' },
    { name: 'NEMA', logo: '🌿', description: 'Environmental Compliance' }
  ];

  return (
    <AnimatedSection animation="fadeInUp">
      <div className="bg-white rounded-lg shadow-lg p-6 border">
        {/* Trust Badges */}
        <div className="text-center mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Trusted & Secure Platform</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {badges.map((badge, index) => (
              <div 
                key={index} 
                className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 group"
              >
                <badge.icon className={`h-8 w-8 ${badge.color} mb-2 group-hover:scale-110 transition-transform duration-200`} />
                <div className="text-xs font-medium text-gray-700">{badge.title}</div>
                <div className="text-xs text-gray-500">{badge.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Partner Logos */}
        <div className="border-t pt-6">
          <div className="text-center mb-4">
            <h4 className="text-sm font-medium text-gray-600">Trusted by Kenyan Institutions</h4>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {partners.map((partner, index) => (
              <div 
                key={index}
                className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 group"
              >
                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform duration-200">
                  {partner.logo}
                </div>
                <div className="text-xs font-medium text-gray-700">{partner.name}</div>
                <div className="text-xs text-gray-500 text-center">{partner.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Statement */}
        <div className="mt-6 pt-4 border-t text-center">
          <p className="text-xs text-gray-500">
            Your data is protected with bank-level security. We never share your information without consent.
          </p>
        </div>
      </div>
    </AnimatedSection>
  );
};

export default TrustBadges;


















