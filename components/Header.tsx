import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import MenuIcon from './icons/MenuIcon';
import CloseIcon from './icons/CloseIcon';
import { getCreditBalance } from '../services/creditService';
import CreditIcon from './icons/CreditIcon';

interface HeaderProps {
  active: 'generator' | 'history' | 'about' | 'terms';
}

const Header: React.FC<HeaderProps> = ({ active }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    const fetchCredits = async () => {
        const currentCredits = await getCreditBalance();
        setCredits(currentCredits);
    };
    fetchCredits();

    const handleCreditsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      setCredits(customEvent.detail.newBalance);
    };

    window.addEventListener('creditsUpdated', handleCreditsUpdate);

    return () => {
      window.removeEventListener('creditsUpdated', handleCreditsUpdate);
    };
  }, []);
  
  const linkClasses = "px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-cyan-400/20 hover:text-cyan-300";
  const activeLinkClasses = "bg-cyan-500/20 text-cyan-300";
  
  const NavLinks: React.FC<{mobile?: boolean}> = ({ mobile = false }) => {
    const mobileClasses = mobile ? "block text-lg py-3 text-center" : "";
    const getClasses = (page: typeof active) => `${linkClasses} ${mobileClasses} ${active === page ? activeLinkClasses : 'text-gray-300'}`;
    
    return (
      <>
        <a href="#/" className={getClasses('generator')} onClick={() => setIsMenuOpen(false)}>Generator</a>
        <a href="#/history" className={getClasses('history')} onClick={() => setIsMenuOpen(false)}>History</a>
        <a href="#/about" className={getClasses('about')} onClick={() => setIsMenuOpen(false)}>About</a>
        <a href="#/terms" className={getClasses('terms')} onClick={() => setIsMenuOpen(false)}>Terms & Conditions</a>
      </>
    );
  };
  
  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-40 p-4">
        <div className="container mx-auto flex justify-between items-center bg-black/50 backdrop-blur-md p-3 rounded-xl border border-[var(--color-border)] shadow-lg">
          <div className="flex items-center gap-4">
            <Logo />
            {credits !== null && (
              <div className="hidden md:flex items-center gap-2 bg-gray-900/50 border border-cyan-500/20 pl-2 pr-3 py-1 rounded-full credit-display">
                <CreditIcon />
                <span className="font-bold text-cyan-300 font-mono text-lg">{credits}</span>
                <span className="text-xs text-gray-400 -ml-1">Credits</span>
              </div>
            )}
          </div>
          <nav className="hidden md:flex items-center space-x-2">
            <NavLinks />
          </nav>
          <div className="md:hidden flex items-center gap-4">
             {credits !== null && (
                <div className="flex items-center gap-1 bg-gray-900/50 border border-cyan-500/20 pl-2 pr-2 py-1 rounded-full credit-display">
                    <CreditIcon />
                    <span className="font-bold text-cyan-300 font-mono">{credits}</span>
                </div>
             )}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white p-2" aria-label="Open menu">
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>
      
      {/* Mobile Menu Overlay */}
      <div 
        className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-lg transition-opacity duration-300 md:hidden ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMenuOpen(false)}
      >
        <div 
          className="bg-[#0D0D10] absolute top-0 right-0 h-full w-64 p-6 transition-transform duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-8">
            <span className="text-lg font-heading font-bold text-white">MENU</span>
            <button onClick={() => setIsMenuOpen(false)} className="text-white p-2" aria-label="Close menu">
              <CloseIcon />
            </button>
          </div>
          <nav className="flex flex-col space-y-4">
            <NavLinks mobile />
          </nav>
        </div>
      </div>
    </>
  );
};

export default Header;