import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const MonitoringTest = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-construction">
      <Navigation />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-4">Monitoring Test Page</h1>
          <p>This is a test page to verify basic functionality.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MonitoringTest;













