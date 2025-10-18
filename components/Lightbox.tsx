import React, { useEffect } from 'react';
import AnimatedCloseIcon from './icons/AnimatedCloseIcon';
import DownloadIcon from './icons/DownloadIcon';

interface LightboxProps {
  imageUrl: string;
  onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ imageUrl, onClose }) => {
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscKey);

    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <div
        className="relative panel panel-cut p-4 max-w-4xl max-h-[90vh] flex flex-col items-center animate-zoom-in shadow-2xl shadow-cyan-500/10"
        onClick={(e) => e.stopPropagation()} 
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-20 transition-transform duration-200 ease-in-out hover:scale-110"
          aria-label="Close image viewer"
        >
          <AnimatedCloseIcon />
        </button>
        <img
          src={imageUrl}
          alt="Enlarged view"
          className="max-w-full max-h-[calc(90vh-100px)] object-contain rounded"
        />
        <a
          href={imageUrl}
          download={`ai-image-${Date.now()}.png`}
          className="mt-4 inline-flex items-center gap-2 btn-primary"
        >
          <DownloadIcon />
          <span>Download</span>
        </a>
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoom-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-zoom-in { animation: zoom-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default Lightbox;