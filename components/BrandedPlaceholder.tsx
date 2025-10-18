
import React from 'react';
import Logo from './Logo';

const BrandedPlaceholder: React.FC = () => {
  return (
    <footer className="w-full max-w-6xl mx-auto my-8 px-4 sm:px-0" data-fade-in>
      <div className="panel panel-cut p-8 flex flex-col items-center justify-center text-center">
          <Logo />
          <p className="text-gray-400 mt-4 text-sm max-w-md">
              Images forged with generative AI. Explore the frontiers of digital art and bring your wildest concepts to life.
          </p>
          <p className="text-gray-500 mt-4 text-xs max-w-md border-t border-[var(--color-border)] pt-4">
              Please note: The free tier of the API has a daily limit on image generations. If you encounter quota errors, please try again the next day.
          </p>
      </div>
    </footer>
  );
};

export default BrandedPlaceholder;
