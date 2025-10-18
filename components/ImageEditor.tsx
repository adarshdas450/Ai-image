
import React, { useState, useEffect, useRef } from 'react';
import CloseIcon from './icons/CloseIcon';
import RotateIcon from './icons/RotateIcon';

interface ImageEditorProps {
  imageUrl: string;
  onClose: () => void;
  onSave: (newImageUrl: string) => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, onClose, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [rotation, setRotation] = useState(0);
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturate: 100,
  });

  const drawImage = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    const container = containerRef.current;
    if (!canvas || !image || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { naturalWidth: iw, naturalHeight: ih } = image;
    
    // Set canvas logical dimensions based on rotation
    const rad = (rotation % 360) * Math.PI / 180;
    const absCos = Math.abs(Math.cos(rad));
    const absSin = Math.abs(Math.sin(rad));
    const newWidth = iw * absCos + ih * absSin;
    const newHeight = iw * absSin + ih * absCos;
    
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Apply filters
    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%)`;

    // Translate and rotate from center
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);

    // Draw image centered
    ctx.drawImage(image, -iw / 2, -ih / 2);
    
    // Reset transform for next draw and other operations
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Scale canvas element to fit container
    const hRatio = container.clientWidth / canvas.width;
    const vRatio = container.clientHeight / canvas.height;
    const ratio = Math.min(hRatio, vRatio);
    canvas.style.width = canvas.width * ratio + 'px';
    canvas.style.height = canvas.height * ratio + 'px';
  };

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Important for canvas saving
    img.src = imageUrl;
    img.onload = () => {
      imageRef.current = img;
      drawImage();
    };
  }, [imageUrl]);

  useEffect(() => {
    drawImage();
  }, [rotation, filters]);

  useEffect(() => {
    window.addEventListener('resize', drawImage);
    return () => window.removeEventListener('resize', drawImage);
  }, [rotation, filters]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: parseInt(value, 10) }));
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  const FilterSlider: React.FC<{name: keyof typeof filters, label: string}> = ({name, label}) => (
    <div className="flex flex-col">
      <label htmlFor={name} className="text-sm text-gray-400 mb-1 capitalize">{label}</label>
      <input
        type="range"
        id={name}
        name={name}
        min="0"
        max="200"
        value={filters[name]}
        onChange={handleFilterChange}
        className="w-full"
      />
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative panel panel-cut p-4 w-full max-w-6xl max-h-[90vh] flex flex-col lg:flex-row gap-4 animate-zoom-in shadow-2xl shadow-cyan-500/10"
        onClick={(e) => e.stopPropagation()} 
      >
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 bg-red-600 text-white p-2 rounded-full hover:bg-red-500 transition-transform hover:scale-110 shadow-lg shadow-red-500/30 z-20"
          aria-label="Close image editor"
        >
          <CloseIcon />
        </button>

        <div ref={containerRef} className="flex-grow flex items-center justify-center bg-black/20 rounded-lg p-2 overflow-hidden h-64 lg:h-auto">
          <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
        </div>

        <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
          <h3 className="text-xl font-heading font-bold text-cyan-300">Edit Image</h3>
          <div className="space-y-3">
            <FilterSlider name="brightness" label="Brightness" />
            <FilterSlider name="contrast" label="Contrast" />
            <FilterSlider name="saturate" label="Saturation" />
          </div>
          <button onClick={handleRotate} className="w-full btn-secondary flex items-center justify-center gap-2">
            <RotateIcon /> Rotate 90°
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="w-full btn-secondary">Cancel</button>
            <button onClick={handleSave} className="w-full btn-primary">Save Changes</button>
          </div>
        </div>
      </div>
       <style>{`
        /* Minimal button style for editor */
        .btn-secondary {
          padding: 10px 18px;
          background-color: var(--color-surface);
          color: var(--color-text);
          border: 1px solid var(--color-border);
          border-radius: 4px;
          font-weight: bold;
          transition: all 0.2s ease;
        }
        .btn-secondary:hover {
          background-color: var(--color-primary);
          color: var(--color-bg);
          border-color: var(--color-primary);
        }
       @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
       @keyframes zoom-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
       .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
       .animate-zoom-in { animation: zoom-in 0.3s ease-out forwards; }
       
       /* Range slider styling */
        input[type=range] {
            -webkit-appearance: none;
            width: 100%;
            background: transparent;
        }
        input[type=range]:focus {
            outline: none;
        }
        input[type=range]::-webkit-slider-runnable-track {
            width: 100%;
            height: 4px;
            cursor: pointer;
            background: var(--color-border);
            border-radius: 2px;
        }
        input[type=range]::-webkit-slider-thumb {
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: var(--color-primary);
            cursor: pointer;
            -webkit-appearance: none;
            margin-top: -6px;
            border: 2px solid var(--color-bg);
        }
        input[type=range]::-moz-range-track {
            width: 100%;
            height: 4px;
            cursor: pointer;
            background: var(--color-border);
            border-radius: 2px;
        }
        input[type=range]::-moz-range-thumb {
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: var(--color-primary);
            cursor: pointer;
            border: 2px solid var(--color-bg);
        }

      `}</style>
    </div>
  );
};

export default ImageEditor;
