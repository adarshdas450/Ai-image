import React, { useState, useEffect } from 'react';

const DynamicPlaceholder: React.FC = () => {
  const [visibleItems, setVisibleItems] = useState<number>(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setVisibleItems(1), 100),
      setTimeout(() => setVisibleItems(2), 300),
      setTimeout(() => setVisibleItems(3), 500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const placeholderItems = [1, 2, 3];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center z-10 p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-4">
        {placeholderItems.map((item, index) => (
          <div
            key={item}
            style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}
            className={`aspect-square bg-cyan-500/5 relative overflow-hidden transition-all duration-500 ${visibleItems > index ? 'opacity-100 scale-100' : 'opacity-0 scale-90'} ${item === 3 ? 'hidden sm:block' : ''}`}
          >
            <div className="absolute inset-0 animate-shimmer"></div>
          </div>
        ))}
      </div>
      <p className="text-gray-500">The forge is ready...</p>
      <p className="text-xs text-gray-600 mt-1">Your generated images will materialize here.</p>
    </div>
  );
};

export default DynamicPlaceholder;
