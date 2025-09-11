import React from 'react';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import FeatureCards from '../components/FeatureCards';
import SocialProof from '../components/SocialProof';
import Footer from '../components/Footer';

const LandingPage = () => {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <Header />
      
      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <HeroSection />
        
        {/* Programming Language Features */}
        <FeatureCards />
        
        {/* Social Proof & Testimonials */}
        <SocialProof />
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;