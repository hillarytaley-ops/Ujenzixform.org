import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'sw';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Translation dictionary
const translations = {
  en: {
    // Navigation
    'nav.builders': 'Builders',
    'nav.suppliers': 'Suppliers',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.signIn': 'Sign In',
    'nav.signOut': 'Sign Out',
    
    // Builders Page
    'builders.title': 'Professional Builders Directory',
    'builders.subtitle': 'Find certified construction professionals across Kenya',
    'builders.search.placeholder': 'Search builders, companies, or specialties...',
    'builders.filter.counties': 'All Counties',
    'builders.filter.specialties': 'All Specialties',
    'builders.filter.budget': 'Any Budget',
    'builders.filter.availability': 'Any Availability',
    'builders.filter.rating': 'Any Rating',
    'builders.register': 'Register as Builder',
    'builders.dashboard': 'Builder Dashboard',
    'builders.publicDirectory': 'View Public Directory',
    'builders.adminView': 'Admin View',
    'builders.loading': 'Loading builders directory...',
    'builders.noResults': 'No builders found matching your criteria. Try adjusting your filters.',
    'builders.showing': 'Showing',
    'builders.of': 'of',
    'builders.professionals': 'professional builders',
    
    // Builder Card
    'builder.rating': 'Rating',
    'builder.projects': 'Projects',
    'builder.experience': 'years experience',
    'builder.contact': 'Contact',
    'builder.viewProfile': 'View Profile',
    'builder.available': 'Available',
    'builder.busy': 'Busy',
    'builder.languages': 'Languages',
    'builder.specialties': 'Specialties',
    
    // Reviews
    'reviews.title': 'Reviews & Ratings',
    'reviews.write': 'Write a Review',
    'reviews.noReviews': 'No Reviews Yet',
    'reviews.beFirst': 'Be the first to share your experience',
    'reviews.writeFirst': 'Write First Review',
    'reviews.helpful': 'Helpful',
    'reviews.verified': 'Verified',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.tryAgain': 'Try Again',
    'common.cancel': 'Cancel',
    'common.submit': 'Submit',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    
    // Stats
    'stats.certifiedBuilders': 'Certified Builders',
    'stats.completedProjects': 'Completed Projects',
    'stats.countiesServed': 'Counties Served',
    'stats.professionalSupport': 'Professional Support',
  },
  sw: {
    // Navigation
    'nav.builders': 'Wajenzi',
    'nav.suppliers': 'Wasambazaji',
    'nav.about': 'Kuhusu',
    'nav.contact': 'Wasiliana',
    'nav.signIn': 'Ingia',
    'nav.signOut': 'Toka',
    
    // Builders Page
    'builders.title': 'Orodha ya Wajenzi wa Kitaaluma',
    'builders.subtitle': 'Pata wajenzi wa kitaaluma walioidhinishwa kote Kenya',
    'builders.search.placeholder': 'Tafuta wajenzi, makampuni, au utaalamu...',
    'builders.filter.counties': 'Kaunti Zote',
    'builders.filter.specialties': 'Utaalamu Wote',
    'builders.filter.budget': 'Bajeti Yoyote',
    'builders.filter.availability': 'Upatikanaji Wowote',
    'builders.filter.rating': 'Ukadiriaji Wowote',
    'builders.register': 'Jisajili kama Mjenzi',
    'builders.dashboard': 'Dashibodi ya Mjenzi',
    'builders.publicDirectory': 'Ona Orodha ya Umma',
    'builders.adminView': 'Mwongozo wa Msimamizi',
    'builders.loading': 'Inapakia orodha ya wajenzi...',
    'builders.noResults': 'Hakuna wajenzi waliopatikana kwa vigezo vyako. Jaribu kubadilisha vichujio vyako.',
    'builders.showing': 'Inaonyesha',
    'builders.of': 'kati ya',
    'builders.professionals': 'wajenzi wa kitaaluma',
    
    // Builder Card
    'builder.rating': 'Ukadiriaji',
    'builder.projects': 'Miradi',
    'builder.experience': 'miaka ya uzoefu',
    'builder.contact': 'Wasiliana',
    'builder.viewProfile': 'Ona Wasifu',
    'builder.available': 'Anapatikana',
    'builder.busy': 'Ameshughulika',
    'builder.languages': 'Lugha',
    'builder.specialties': 'Utaalamu',
    
    // Reviews
    'reviews.title': 'Mapitio na Ukadiriaji',
    'reviews.write': 'Andika Upitaji',
    'reviews.noReviews': 'Hakuna Mapitio Bado',
    'reviews.beFirst': 'Kuwa wa kwanza kushiriki uzoefu wako',
    'reviews.writeFirst': 'Andika Upitaji wa Kwanza',
    'reviews.helpful': 'Inasaidia',
    'reviews.verified': 'Imethibitishwa',
    
    // Common
    'common.loading': 'Inapakia...',
    'common.error': 'Kuna tatizo',
    'common.tryAgain': 'Jaribu Tena',
    'common.cancel': 'Ghairi',
    'common.submit': 'Wasilisha',
    'common.save': 'Hifadhi',
    'common.edit': 'Hariri',
    'common.delete': 'Futa',
    'common.close': 'Funga',
    'common.back': 'Rudi',
    'common.next': 'Ifuatayo',
    'common.previous': 'Iliyotangulia',
    
    // Stats
    'stats.certifiedBuilders': 'Wajenzi Walioidhinishwa',
    'stats.completedProjects': 'Miradi Iliyokamilika',
    'stats.countiesServed': 'Kaunti Zinazotumikiwa',
    'stats.professionalSupport': 'Msaada wa Kitaaluma',
  }
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('ujenzipro-language') as Language;
    return stored || 'en';
  });

  const handleSetLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem('ujenzipro-language', newLanguage);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};














