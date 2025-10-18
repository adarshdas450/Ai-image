

import React, { useState } from 'react';

interface InspirationItem {
  title: string;
  prompt: string;
  author: string;
  shapes?: React.ReactNode;
  imageUrl?: string;
}

interface InspirationFooterProps {
  inspirations: InspirationItem[] | null;
  onPromptClick: (prompt: string) => void;
}

const InspirationFooter: React.FC<InspirationFooterProps> = ({ inspirations, onPromptClick }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!inspirations || inspirations.length === 0) {
    return null; 
  }

  return (
    <div className="w-full max-w-6xl mx-auto my-8 px-4 sm:px-0">
      <div className="panel panel-cut p-6">
        <h2 className="text-center text-2xl font-heading font-bold text-cyan-300/90 mb-1">
          INSPIRATION FROM THE FORGE
        </h2>
        <p className="text-center text-sm text-gray-500 mb-6">Click an image to try the prompt.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {inspirations.map((item, index) => (
            <div
              key={item.title + index}
              className={`relative aspect-square rounded-md p-4 flex flex-col justify-end overflow-hidden cursor-pointer border-2 transition-all duration-300 bg-black/30 group ${selectedIndex === index ? 'border-cyan-400/90 shadow-[0_0_20px_rgba(0,229,255,0.2)]' : 'border-transparent hover:border-gray-700/50'}`}
              onClick={() => {
                onPromptClick(item.prompt);
                setSelectedIndex(index);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              onMouseLeave={() => setSelectedIndex(null)}
            >
              <div className="absolute inset-0 z-0 transition-transform duration-500 group-hover:scale-110">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    item.shapes
                  )}
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-10"></div>

              <div className="relative z-20 transition-all duration-300">
                <h3 className={`font-bold text-xl transition-colors duration-300 ${selectedIndex === index ? 'text-cyan-300' : 'text-white'}`}>{item.title}</h3>
                <div className={`transition-all duration-500 ease-in-out grid ${selectedIndex === index ? 'grid-rows-[1fr] opacity-100 pt-2' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                        <p className="text-sm text-gray-300 mb-2 line-clamp-3">{item.prompt}</p>
                        <p className="text-xs text-gray-500">by {item.author}</p>
                    </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InspirationFooter;
