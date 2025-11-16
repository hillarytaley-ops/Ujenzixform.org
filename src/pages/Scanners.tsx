import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { DispatchScanner } from '@/components/qr/DispatchScanner';
import { ReceivingScanner } from '@/components/qr/ReceivingScanner';
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";


const Scanners = () => {
  useEffect(() => {}, []);
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="py-8">
        <div className="container mx-auto px-4">
          <ErrorBoundary fallback={
            <div className="max-w-xl mx-auto p-6 border rounded-lg bg-muted">
              <div className="text-center space-y-3">
                <h2 className="text-xl font-semibold">Scanner failed to render</h2>
                <p className="text-muted-foreground">Refresh the page and start the camera manually.</p>
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" onClick={() => window.location.reload()}>Refresh</Button>
                </div>
              </div>
            </div>
          }>
            <div className="space-y-6">
              <h1 className="text-2xl font-semibold text-center">Material Scanners</h1>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DispatchScanner />
                <ReceivingScanner />
              </div>
            </div>
          </ErrorBoundary>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Scanners;