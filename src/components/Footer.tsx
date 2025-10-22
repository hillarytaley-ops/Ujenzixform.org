
import { Building2 } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Building2 className="h-6 w-6" />
              <h3 className="text-lg font-semibold">
                <span className="text-white">Ujenzi</span>
                <span className="text-green-400">Pro</span>
              </h3>
            </div>
            <p className="text-gray-400">
              Connecting Kenya's construction industry, one project at a time.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">For Builders</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/suppliers?tab=materials" className="hover:text-white">Find Materials</Link></li>
              <li>Request Quotes</li>
              <li>Compare Prices</li>
              <li>Read Reviews</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">For Suppliers</h4>
            <ul className="space-y-2 text-gray-400">
              <li>List Products</li>
              <li>Reach Customers</li>
              <li>Manage Orders</li>
              <li>Grow Business</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-gray-400">
              <li>Help Center</li>
              <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
              <li>Terms of Service</li>
              <li>Privacy Policy</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 UjenziPro. All rights reserved. Made with ❤️ in Kenya.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
