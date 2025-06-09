
import React, { useState } from 'react';
import Navigation from '@/components/Navigation';
import LandingPage from '@/components/LandingPage';
import AuthModal from '@/components/AuthModal';
import ChatInterface from '@/components/ChatInterface';

const Index = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLoginClick = () => {
    setAuthModalTab('login');
    setIsAuthModalOpen(true);
  };

  const handleSignupClick = () => {
    setAuthModalTab('signup');
    setIsAuthModalOpen(true);
  };

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (isAuthenticated) {
    return <ChatInterface onLogout={handleLogout} />;
  }

  return (
    <>
      <Navigation onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
      <LandingPage onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authModalTab}
        onAuthenticated={handleAuthenticated}
      />
    </>
  );
};

export default Index;
