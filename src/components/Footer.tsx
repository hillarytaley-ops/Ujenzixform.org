import { Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  FacebookIcon,
  TwitterIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  WhatsAppIcon,
  YouTubeIcon,
  EmailIcon,
  PhoneIcon
} from './SocialMediaIcons';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Building2 className="h-6 w-6" />
              <h3 className="text-lg font-semibold">
                <span className="text-white">Ujenzi</span>
                <span className="text-green-400">Xform</span>
              </h3>
            </div>
            <p className="text-gray-400 mb-4">
              Connecting Kenya's construction industry, one project at a time.
            </p>
            
            {/* Social Media Icons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <a
                href="https://www.facebook.com/profile.php?id=61588491484665"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 rounded-lg hover:bg-[#1877F2] transition-all duration-300 hover:scale-110"
                title="Facebook"
              >
                <FacebookIcon size={18} className="text-white" />
              </a>
              <a
                href="https://twitter.com/ujenzixform"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 rounded-lg hover:bg-black transition-all duration-300 hover:scale-110"
                title="Twitter/X"
              >
                <TwitterIcon size={18} className="text-white" />
              </a>
              <a
                href="https://instagram.com/ujenzixform"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 rounded-lg hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-600 transition-all duration-300 hover:scale-110"
                title="Instagram"
              >
                <InstagramIcon size={18} className="text-white" />
              </a>
              <a
                href="https://tiktok.com/@ujenzixform"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 rounded-lg hover:bg-black transition-all duration-300 hover:scale-110"
                title="TikTok"
              >
                <TikTokIcon size={18} className="text-white" />
              </a>
              <a
                href="https://www.linkedin.com/company/ujenzixform/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 rounded-lg hover:bg-[#0A66C2] transition-all duration-300 hover:scale-110"
                title="LinkedIn"
              >
                <LinkedInIcon size={18} className="text-white" />
              </a>
              <a
                href="https://www.youtube.com/@ujenziXform"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 rounded-lg hover:bg-[#FF0000] transition-all duration-300 hover:scale-110"
                title="YouTube"
              >
                <YouTubeIcon size={18} className="text-white" />
              </a>
              <a
                href="https://wa.me/254712345678"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-gray-800 rounded-lg hover:bg-[#25D366] transition-all duration-300 hover:scale-110"
                title="WhatsApp"
              >
                <WhatsAppIcon size={18} className="text-white" />
              </a>
            </div>
          </div>

          {/* For Builders */}
          <div>
            <h4 className="font-semibold mb-4">For Builders</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/supplier-marketplace" className="hover:text-white transition-colors">Find Materials</Link></li>
              <li><Link to="/builders" className="hover:text-white transition-colors">Builder Directory</Link></li>
              <li><Link to="/tracking" className="hover:text-white transition-colors">Track Deliveries</Link></li>
              <li><Link to="/builder-registration" className="hover:text-white transition-colors">Register as Builder</Link></li>
            </ul>
          </div>

          {/* For Suppliers */}
          <div>
            <h4 className="font-semibold mb-4">For Suppliers</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/supplier-registration" className="hover:text-white transition-colors">List Products</Link></li>
              <li><Link to="/suppliers" className="hover:text-white transition-colors">Supplier Portal</Link></li>
              <li><Link to="/delivery" className="hover:text-white transition-colors">Delivery Services</Link></li>
              <li><Link to="/delivery/apply" className="hover:text-white transition-colors">Become a Driver</Link></li>
            </ul>
          </div>

          {/* Company & Support */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/careers" className="hover:text-white transition-colors">Careers 🔥</Link></li>
              <li><Link to="/feedback" className="hover:text-white transition-colors">Help & Feedback</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
            
            {/* Contact Info */}
            <div className="mt-4 space-y-2">
              <a 
                href="mailto:info@ujenzixform.org" 
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <EmailIcon size={16} />
                <span>info@ujenzixform.org</span>
              </a>
              <a 
                href="tel:+254700000000" 
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <PhoneIcon size={16} />
                <span>+254 700 000 000</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-center md:text-left">
              &copy; {new Date().getFullYear()} UjenziXform. All rights reserved. Made with ❤️ in Kenya 🇰🇪
            </p>
            
            {/* Bottom Social Icons - Mobile Only */}
            <div className="flex gap-3 md:hidden">
              <a href="https://www.facebook.com/profile.php?id=61588491484665" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <FacebookIcon size={20} />
              </a>
              <a href="https://twitter.com/mradipro" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <TwitterIcon size={20} />
              </a>
              <a href="https://instagram.com/mradipro" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <InstagramIcon size={20} />
              </a>
              <a href="https://wa.me/254712345678" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <WhatsAppIcon size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
