import { Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { SOCIAL_INSTAGRAM_URL, SOCIAL_TIKTOK_URL } from "@/config/appIdentity";
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

const footerSocialClass =
  "text-gray-400 hover:text-white transition-colors p-1";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 md:items-stretch gap-6 md:gap-8">
          {/* Brand Section */}
          <div className="text-center md:text-left flex flex-col h-full min-h-0 rounded-xl border border-gray-800/60 bg-gray-800/25 p-5 md:p-6">
            <div className="flex items-center justify-center md:justify-start space-x-2 mb-4">
              <Building2 className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-semibold">
                <span className="text-white">Ujenzi</span>
                <span className="text-green-400">Xform</span>
              </h3>
            </div>
            <p className="text-gray-400 max-w-sm mx-auto md:mx-0">
              Connecting Kenya's construction industry, one project at a time.
            </p>
          </div>

          {/* For Builders + For Suppliers: one row, two columns on mobile */}
          <div className="grid grid-cols-2 gap-6 md:contents text-center md:text-left">
            <div className="flex flex-col h-full min-h-0 rounded-xl border border-gray-800/60 bg-gray-800/25 p-5 md:p-6">
              <h4 className="font-semibold mb-4">For Builders</h4>
              <ul className="space-y-2 text-gray-400 flex-1">
                <li className="min-h-[1.375rem] flex items-center justify-center md:justify-start">
                  <Link to="/supplier-marketplace" className="hover:text-white transition-colors leading-snug">Find Materials</Link>
                </li>
                <li className="min-h-[1.375rem] flex items-center justify-center md:justify-start">
                  <Link to="/builders" className="hover:text-white transition-colors leading-snug">Builder Directory</Link>
                </li>
                <li className="min-h-[1.375rem] flex items-center justify-center md:justify-start">
                  <Link to="/tracking" className="hover:text-white transition-colors leading-snug">Track Deliveries</Link>
                </li>
                <li className="min-h-[1.375rem] flex items-center justify-center md:justify-start">
                  <Link to="/builder-registration" className="hover:text-white transition-colors leading-snug">Register as Builder</Link>
                </li>
              </ul>
            </div>

            <div className="flex flex-col h-full min-h-0 rounded-xl border border-gray-800/60 bg-gray-800/25 p-5 md:p-6">
              <h4 className="font-semibold mb-4">For Suppliers</h4>
              <ul className="space-y-2 text-gray-400 flex-1">
                <li className="min-h-[1.375rem] flex items-center justify-center md:justify-start">
                  <Link to="/supplier-registration" className="hover:text-white transition-colors leading-snug">List Products</Link>
                </li>
                <li className="min-h-[1.375rem] flex items-center justify-center md:justify-start">
                  <Link to="/suppliers" className="hover:text-white transition-colors leading-snug">Supplier Portal</Link>
                </li>
                <li className="min-h-[1.375rem] flex items-center justify-center md:justify-start">
                  <Link to="/delivery" className="hover:text-white transition-colors leading-snug">Delivery Services</Link>
                </li>
                <li className="min-h-[1.375rem] flex items-center justify-center md:justify-start">
                  <Link to="/delivery/apply" className="hover:text-white transition-colors leading-snug">Become a Driver</Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Company */}
          <div className="text-center md:text-left flex flex-col h-full min-h-0 rounded-xl border border-gray-800/60 bg-gray-800/25 p-5 md:p-6">
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-gray-400 flex-1">
              <li className="min-h-[1.375rem] flex items-center justify-center md:justify-start">
                <Link to="/about" className="hover:text-white transition-colors leading-snug">About Us</Link>
              </li>
              <li className="min-h-[1.375rem] flex items-center justify-center md:justify-start">
                <Link to="/careers" className="hover:text-white transition-colors leading-snug">
                  Careers <span className="inline-block align-middle leading-none">🔥</span>
                </Link>
              </li>
              <li className="min-h-[1.375rem] flex items-center justify-center md:justify-start">
                <Link to="/feedback" className="hover:text-white transition-colors leading-snug">Help & Feedback</Link>
              </li>
              <li className="min-h-[1.375rem] flex items-center justify-center md:justify-start">
                <Link to="/privacy-policy" className="hover:text-white transition-colors leading-snug">Privacy Policy</Link>
              </li>
              <li className="min-h-[1.375rem] flex items-center justify-center md:justify-start">
                <Link to="/terms-of-service" className="hover:text-white transition-colors leading-snug">Terms of Service</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact — shared row so link columns stay equal height */}
        <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-x-10 gap-y-3 text-gray-400 text-sm">
          <a
            href="mailto:info@ujenzixform.org"
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            <EmailIcon size={16} />
            <span>info@ujenzixform.org</span>
          </a>
          <a
            href="tel:+254700000000"
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            <PhoneIcon size={16} />
            <span>+254 700 000 000</span>
          </a>
        </div>

        {/* Bottom bar: copyright + single social row (outline icons, all breakpoints) */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between md:items-center md:gap-4">
            <div className="text-gray-400 text-center md:text-left text-sm">
              <p>
                &copy; {new Date().getFullYear()} UjenziXform. All rights reserved.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 md:justify-end" aria-label="Social media">
              <a href="https://www.facebook.com/profile.php?id=61588491484665" target="_blank" rel="noopener noreferrer" className={footerSocialClass} title="Facebook">
                <FacebookIcon size={20} />
              </a>
              <a href="https://x.com/UjenziXform" target="_blank" rel="noopener noreferrer" className={footerSocialClass} title="X">
                <TwitterIcon size={20} />
              </a>
              <a href={SOCIAL_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={footerSocialClass} title="Instagram">
                <InstagramIcon size={20} />
              </a>
              <a href={SOCIAL_TIKTOK_URL} target="_blank" rel="noopener noreferrer" className={footerSocialClass} title="TikTok">
                <TikTokIcon size={20} />
              </a>
              <a href="https://www.linkedin.com/company/ujenzixform/?viewAsMember=true" target="_blank" rel="noopener noreferrer" className={footerSocialClass} title="LinkedIn">
                <LinkedInIcon size={20} />
              </a>
              <a href="https://www.youtube.com/@ujenziXform" target="_blank" rel="noopener noreferrer" className={footerSocialClass} title="YouTube">
                <YouTubeIcon size={20} />
              </a>
              <a href="https://wa.me/254712345678" target="_blank" rel="noopener noreferrer" className={footerSocialClass} title="WhatsApp">
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
