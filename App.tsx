import React, { useState, useEffect } from 'react';
import ImageGeneratorPage from './components/ImageGeneratorPage';
import HistoryPage from './components/HistoryPage';
import AboutPage from './components/AboutPage';
import TermsPage from './components/TermsPage';

const App: React.FC = () => {
  // Simple hash-based routing
  const [route, setRoute] = useState(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || '#/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const renderPage = () => {
    switch (route) {
      case '#/history':
        return <HistoryPage />;
      case '#/about':
        return <AboutPage />;
      case '#/terms':
        return <TermsPage />;
      default:
        return <ImageGeneratorPage />;
    }
  };

  return (
    <div className="bg-[#0D0D10] text-gray-200 min-h-screen font-sans animated-bg">
      {renderPage()}
    </div>
  );
};

export default App;