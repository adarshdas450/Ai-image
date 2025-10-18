import React, { useState, useEffect, useRef, useCallback } from 'react';
import AnimatedCloseIcon from './icons/AnimatedCloseIcon';
import RotateIcon from './icons/RotateIcon';
import UndoIcon from './icons/UndoIcon';
import RedoIcon from './icons/RedoIcon';
import AdjustIcon from './icons/AdjustIcon';
import CropIcon from './icons/CropIcon';
import TextIcon from './icons/TextIcon';
import FilterIcon from './icons/FilterIcon';
import FlipHorizontalIcon from './icons/FlipHorizontalIcon';
import FlipVerticalIcon from './icons/FlipVerticalIcon';
import ResizeIcon from './icons/ResizeIcon';


interface ImageEditorProps {
  imageUrl: string;
  onClose: () => void;
  onSave: (newImageUrl: string) => void;
}

type EditorMode = 'adjust' | 'crop' | 'text' | 'filters' | 'resize';
type DragHandle = 'tl' | 'tr' | 'bl' | 'br' | 'body';
type TextAlign = 'left' | 'center' | 'right';
type FilterPreset = 'grayscale' | 'sepia' | 'invert' | 'vintage' | 'none';

interface DragInfo {
  type: DragHandle;
  startX: number;
  startY: number;
  initialBox: { x: number; y: number; width: number; height: number; };
  aspectRatio: number | null;
}

interface TextObject {
  content: string;
  font: string;
  size: number;
  color: string;
  align: TextAlign;
  x: number;
  y: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
}


const ASPECT_RATIOS: { [key: string]: number | null } = {
  'Free': null, '1:1': 1, '16:9': 16 / 9, '9:16': 9 / 16, '4:3': 4 / 3, '3:4': 3 / 4,
};
const FONT_FAMILIES = ['Roboto', 'Orbitron'];
const PRESET_FILTERS: {name: FilterPreset, label: string}[] = [
    { name: 'grayscale', label: 'Grayscale' },
    { name: 'sepia', label: 'Sepia' },
    { name: 'invert', label: 'Invert' },
    { name: 'vintage', label: 'Vintage' },
];

const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, onClose, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [mode, setMode] = useState<EditorMode>('adjust');

  // Viewport state
  const [transform, setTransform] = useState({ scale: 1, pan: { x: 0, y: 0 } });
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });

  // Adjust states
  const initialFilters = { brightness: 100, contrast: 100, saturate: 100, hue: 0 };
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [previewFilters, setPreviewFilters] = useState(initialFilters);

  // Filter states
  const [previewFilter, setPreviewFilter] = useState<FilterPreset>('none');

  // Crop states
  const [isCropping, setIsCropping] = useState(false);
  const [cropBox, setCropBox] = useState({ x: 50, y: 50, width: 250, height: 150 });
  const [aspectRatioKey, setAspectRatioKey] = useState('Free');
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [showCropGuides, setShowCropGuides] = useState(true);

  // Text states
  const [activeText, setActiveText] = useState<TextObject | null>(null);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const dragTextOffset = useRef({ x: 0, y: 0 });
  
  // Resize states
  const [resizeWidth, setResizeWidth] = useState(0);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const originalAspectRatio = useRef(1);

  const getClampedPan = useCallback((pan: { x: number; y: number; }, scale: number) => {
    const canvas = canvasRef.current;
    const offscreenCanvas = offscreenCanvasRef.current;
    if (!canvas || !offscreenCanvas) return pan;

    const displayedWidth = offscreenCanvas.width * scale;
    const displayedHeight = offscreenCanvas.height * scale;

    const minPanX = canvas.width - displayedWidth;
    const maxPanX = 0;
    const minPanY = canvas.height - displayedHeight;
    const maxPanY = 0;
    
    // If image is smaller than canvas, center it. Otherwise, clamp it.
    const clampedX = displayedWidth > canvas.width 
        ? Math.max(minPanX, Math.min(maxPanX, pan.x)) 
        : (canvas.width - displayedWidth) / 2;
    const clampedY = displayedHeight > canvas.height 
        ? Math.max(minPanY, Math.min(maxPanY, pan.y)) 
        : (canvas.height - displayedHeight) / 2;
    
    return { x: clampedX, y: clampedY };
  }, []);

  const getFilterString = (filter: FilterPreset): string => {
    switch (filter) {
      case 'grayscale': return 'grayscale(100%)';
      case 'sepia': return 'sepia(100%)';
      case 'invert': return 'invert(100%)';
      case 'vintage': return 'sepia(60%) contrast(75%) brightness(120%) saturate(120%)';
      default: return 'none';
    }
  };
  
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const offscreenCanvas = offscreenCanvasRef.current;
    if (!canvas || !offscreenCanvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#101827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(transform.pan.x, transform.pan.y);
    ctx.scale(transform.scale, transform.scale);
    
    let filterStyle = 'none';
    if(mode === 'adjust') {
        filterStyle = `brightness(${previewFilters.brightness}%) contrast(${previewFilters.contrast}%) saturate(${previewFilters.saturate}%) hue-rotate(${previewFilters.hue}deg)`;
    } else if (mode === 'filters' && previewFilter !== 'none') {
        filterStyle = getFilterString(previewFilter);
    }
    
    ctx.filter = filterStyle;
    ctx.drawImage(offscreenCanvas, 0, 0);
    ctx.filter = 'none'; // reset filter
    
    // Draw live text overlay if in text mode
    if (mode === 'text' && activeText) {
        ctx.font = `${activeText.size}px '${activeText.font}', sans-serif`;
        ctx.fillStyle = activeText.color;
        ctx.textAlign = activeText.align;
        ctx.textBaseline = 'middle';
        
        if (activeText.shadowEnabled) {
            ctx.shadowColor = activeText.shadowColor;
            ctx.shadowOffsetX = activeText.shadowOffsetX;
            ctx.shadowOffsetY = activeText.shadowOffsetY;
            ctx.shadowBlur = activeText.shadowBlur;
        }

        if(activeText.strokeEnabled) {
            ctx.strokeStyle = activeText.strokeColor;
            ctx.lineWidth = activeText.strokeWidth;
            ctx.strokeText(activeText.content, activeText.x, activeText.y);
        }
        ctx.fillText(activeText.content, activeText.x, activeText.y);
        
        // Reset shadow for subsequent draws
        ctx.shadowColor = 'transparent'; 
        ctx.shadowBlur = 0; 
        ctx.shadowOffsetX = 0; 
        ctx.shadowOffsetY = 0;
    }

    ctx.restore();

  }, [transform, previewFilters, mode, previewFilter, activeText]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      const container = containerRef.current;
      if (!container) return;

      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;
      
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;
      
      tempCanvas.width = imgWidth;
      tempCanvas.height = imgHeight;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      setHistory([data]);
      setHistoryIndex(0);

      // Calculate initial transform to fit image in container
      if (imgWidth > 0 && imgHeight > 0) {
        const scaleX = containerWidth / imgWidth;
        const scaleY = containerHeight / imgHeight;
        const initialScale = Math.min(scaleX, scaleY);
  
        const displayedWidth = imgWidth * initialScale;
        const displayedHeight = imgHeight * initialScale;
        
        const initialPanX = (containerWidth - displayedWidth) / 2;
        const initialPanY = (containerHeight - displayedHeight) / 2;
  
        setTransform({
            scale: initialScale,
            pan: { x: initialPanX, y: initialPanY }
        });
      }
    };
  }, [imageUrl]);
  
  useEffect(() => {
    const currentState = history[historyIndex];
    if (currentState) {
        if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement('canvas');
        }
        offscreenCanvasRef.current.width = currentState.width;
        offscreenCanvasRef.current.height = currentState.height;
        offscreenCanvasRef.current.getContext('2d')?.putImageData(currentState, 0, 0);
        drawCanvas();
    }
  }, [history, historyIndex, drawCanvas]);

  useEffect(() => {
    const handleResize = () => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if(canvas && container) {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            drawCanvas();
        }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawCanvas]);

  useEffect(() => {
    drawCanvas();
  }, [transform, previewFilters, previewFilter, activeText, drawCanvas]);

  const addHistoryState = useCallback((data: ImageData) => {
    setHistory(currentHistory => {
        const newHistory = currentHistory.slice(0, historyIndex + 1);
        newHistory.push(data);
        return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handleUndo = () => historyIndex > 0 && setHistoryIndex(historyIndex - 1);
  const handleRedo = () => historyIndex < history.length - 1 && setHistoryIndex(historyIndex - 1);

  const applyOperationAndSave = useCallback((operation: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void) => {
    const currentImageData = history[historyIndex];
    if (!currentImageData) return;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if(!tempCtx) return;
    tempCanvas.width = currentImageData.width;
    tempCanvas.height = currentImageData.height;
    tempCtx.putImageData(currentImageData, 0, 0);
    operation(tempCtx, tempCanvas);
    const newData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    addHistoryState(newData);
  }, [history, historyIndex, addHistoryState]);

  const switchMode = (newMode: EditorMode) => {
    if (newMode === 'text' && !activeText) {
        const canvas = offscreenCanvasRef.current;
        setActiveText({
            content: 'Hello World',
            font: FONT_FAMILIES[0],
            size: 48,
            color: '#FFFFFF',
            align: 'center',
            x: canvas ? canvas.width / 2 : 200,
            y: canvas ? canvas.height / 2 : 150,
            shadowEnabled: false,
            shadowColor: '#000000',
            shadowOffsetX: 2,
            shadowOffsetY: 2,
            shadowBlur: 4,
            strokeEnabled: false,
            strokeColor: '#000000',
            strokeWidth: 2,
        });
    }
    if (newMode === 'resize') {
        const offscreenCanvas = offscreenCanvasRef.current;
        if (offscreenCanvas) {
            setResizeWidth(offscreenCanvas.width);
            setResizeHeight(offscreenCanvas.height);
            originalAspectRatio.current = offscreenCanvas.width / offscreenCanvas.height;
        }
    }
    setMode(newMode);
  };

  // TOOL LOGIC
  const handleApplyAdjustments = () => {
    applyOperationAndSave((ctx, canvas) => {
      ctx.filter = `brightness(${previewFilters.brightness}%) contrast(${previewFilters.contrast}%) saturate(${previewFilters.saturate}%) hue-rotate(${previewFilters.hue}deg)`;
      ctx.drawImage(canvas, 0, 0);
    });
    setAppliedFilters(previewFilters);
  };
  
  const handleApplyFilter = () => {
    if(previewFilter === 'none') return;
    applyOperationAndSave((ctx, canvas) => {
      ctx.filter = getFilterString(previewFilter);
      ctx.drawImage(canvas, 0, 0);
    });
    setPreviewFilter('none');
  };

  const handleRotate = () => {
    applyOperationAndSave((ctx, canvas) => {
        const { width, height } = canvas;
        const rotatedCanvas = document.createElement('canvas');
        rotatedCanvas.width = height;
        rotatedCanvas.height = width;
        const rotatedCtx = rotatedCanvas.getContext('2d');
        if (rotatedCtx) {
          rotatedCtx.translate(height / 2, width / 2);
          rotatedCtx.rotate(90 * Math.PI / 180);
          rotatedCtx.drawImage(canvas, -width / 2, -height / 2);
          canvas.width = height;
          canvas.height = width;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(rotatedCanvas, 0, 0);
        }
    });
  };
  
  const handleFlipHorizontal = () => {
    applyOperationAndSave((ctx, canvas) => {
        const { width, height } = canvas;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
            tempCtx.drawImage(canvas, 0, 0);
            ctx.clearRect(0, 0, width, height);
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(tempCanvas, -width, 0);
            ctx.restore();
        }
    });
  };

  const handleFlipVertical = () => {
      applyOperationAndSave((ctx, canvas) => {
          const { width, height } = canvas;
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = width;
          tempCanvas.height = height;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
              tempCtx.drawImage(canvas, 0, 0);
              ctx.clearRect(0, 0, width, height);
              ctx.save();
              ctx.scale(1, -1);
              ctx.drawImage(tempCanvas, 0, -height);
              ctx.restore();
          }
      });
  };
  
  const handleApplyResize = () => {
    if (resizeWidth <= 0 || resizeHeight <= 0) return;
    applyOperationAndSave((ctx, canvas) => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCanvas.getContext('2d')?.drawImage(canvas, 0, 0);

        canvas.width = resizeWidth;
        canvas.height = resizeHeight;
        ctx.clearRect(0, 0, resizeWidth, resizeHeight);
        ctx.drawImage(tempCanvas, 0, 0, resizeWidth, resizeHeight);
    });
  };

  const handleCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imgWidth = offscreenCanvasRef.current?.width || 1;
    const imgHeight = offscreenCanvasRef.current?.height || 1;
    const canvasRect = canvas.getBoundingClientRect();
    const displayedImgWidth = imgWidth * transform.scale;
    const displayedImgHeight = imgHeight * transform.scale;
    const viewX = (canvasRect.width - displayedImgWidth) / 2 + transform.pan.x;
    const viewY = (canvasRect.height - displayedImgHeight) / 2 + transform.pan.y;

    const sx = (cropBox.x - viewX) / transform.scale;
    const sy = (cropBox.y - viewY) / transform.scale;
    const sWidth = cropBox.width / transform.scale;
    const sHeight = cropBox.height / transform.scale;

    if (sWidth <= 0 || sHeight <= 0) {
      setIsCropping(false);
      return;
    }

    applyOperationAndSave((ctx) => {
      const croppedImageData = ctx.getImageData(sx, sy, sWidth, sHeight);
      ctx.canvas.width = sWidth;
      ctx.canvas.height = sHeight;
      ctx.putImageData(croppedImageData, 0, 0);
    });
    setIsCropping(false);
  };
  
  const handleApplyText = () => {
    if (!activeText) return;
    const textToApply = { ...activeText };
    applyOperationAndSave((ctx) => {
        ctx.font = `${textToApply.size}px '${textToApply.font}', sans-serif`;
        ctx.fillStyle = textToApply.color;
        ctx.textAlign = textToApply.align;
        ctx.textBaseline = 'middle';
        if (textToApply.shadowEnabled) {
            ctx.shadowColor = textToApply.shadowColor;
            ctx.shadowOffsetX = textToApply.shadowOffsetX;
            ctx.shadowOffsetY = textToApply.shadowOffsetY;
            ctx.shadowBlur = textToApply.shadowBlur;
        }

        if(textToApply.strokeEnabled) {
            ctx.strokeStyle = textToApply.strokeColor;
            ctx.lineWidth = textToApply.strokeWidth;
            ctx.strokeText(textToApply.content, textToApply.x, textToApply.y);
        }
        ctx.fillText(textToApply.content, textToApply.x, textToApply.y);
    });
    setActiveText(prev => prev ? {
        ...prev,
        content: "New Text",
        x: offscreenCanvasRef.current?.width ? offscreenCanvasRef.current.width / 2 : 200,
        y: offscreenCanvasRef.current?.height ? offscreenCanvasRef.current.height / 2 : 150,
    } : null);
  };

  // EVENT HANDLERS
  const handleSave = () => {
    if (isCropping) return;
    const canvas = offscreenCanvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL('image/png'));
    }
  };
  
  const handleResizeWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value, 10) || 0;
    setResizeWidth(newWidth);
    if (keepAspectRatio && originalAspectRatio.current) {
        setResizeHeight(newWidth / originalAspectRatio.current);
    }
  };

  const handleResizeHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newHeight = parseInt(e.target.value, 10) || 0;
      setResizeHeight(newHeight);
      if (keepAspectRatio && originalAspectRatio.current) {
          setResizeWidth(newHeight * originalAspectRatio.current);
      }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const screenToWorld = (x: number, y: number) => ({
      x: (x - transform.pan.x) / transform.scale,
      y: (y - transform.pan.y) / transform.scale,
    });
    
    const worldPoint = screenToWorld(mouseX, mouseY);

    if (mode === 'text' && activeText) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.font = `${activeText.size}px '${activeText.font}', sans-serif`;
        const textMetrics = ctx.measureText(activeText.content);
        const textWidth = textMetrics.width;
        const textHeight = activeText.size;
        
        let boxX = activeText.x;
        if (activeText.align === 'center') boxX -= textWidth / 2;
        if (activeText.align === 'right') boxX -= textWidth;
        const boxY = activeText.y - textHeight / 2;

        if (worldPoint.x >= boxX && worldPoint.x <= boxX + textWidth &&
            worldPoint.y >= boxY && worldPoint.y <= boxY + textHeight) {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingText(true);
            dragTextOffset.current = {
                x: worldPoint.x - activeText.x,
                y: worldPoint.y - activeText.y
            };
            return;
        }
    }
    
    const offscreenCanvas = offscreenCanvasRef.current;
    if (!offscreenCanvas) return;

    const displayedWidth = offscreenCanvas.width * transform.scale;
    const displayedHeight = offscreenCanvas.height * transform.scale;

    // Check if the image content is larger than the canvas in at least one dimension
    const canPan = displayedWidth > canvas.width || displayedHeight > canvas.height;

    if (canPan) {
      e.preventDefault();
      setIsPanning(true);
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingText && activeText) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX - transform.pan.x) / transform.scale;
        const worldY = (mouseY - transform.pan.y) / transform.scale;
        
        setActiveText({
            ...activeText,
            x: worldX - dragTextOffset.current.x,
            y: worldY - dragTextOffset.current.y,
        });
    } else if (isPanning) {
      const dx = e.clientX - lastPanPoint.current.x;
      const dy = e.clientY - lastPanPoint.current.y;
      setTransform(t => {
          const newPan = { x: t.pan.x + dx, y: t.pan.y + dy };
          return { scale: t.scale, pan: getClampedPan(newPan, t.scale) };
      });
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
    }
  };
  
  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingText(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if(!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = 1.1;
    const newScale = e.deltaY < 0 ? transform.scale * zoomFactor : transform.scale / zoomFactor;
    const clampedScale = Math.max(0.1, Math.min(newScale, 10));

    const worldX = (mouseX - transform.pan.x) / transform.scale;
    const worldY = (mouseY - transform.pan.y) / transform.scale;
    
    const newPan = { x: mouseX - worldX * clampedScale, y: mouseY - worldY * clampedScale };

    setTransform({ scale: clampedScale, pan: getClampedPan(newPan, clampedScale) });
  };
  
  const handleCropMouseDown = (e: React.MouseEvent<HTMLDivElement>, type: DragHandle) => {
      e.preventDefault(); e.stopPropagation();
      setDragInfo({
          type,
          startX: e.clientX,
          startY: e.clientY,
          initialBox: cropBox,
          aspectRatio: ASPECT_RATIOS[aspectRatioKey],
      });
  };
  
  useEffect(() => {
    const handleCropMouseMove = (e: MouseEvent) => {
      if (!dragInfo || !containerRef.current) return;
      const initialBox = dragInfo.initialBox;
      const type = dragInfo.type;
      const aspectRatio = dragInfo.aspectRatio;
      let x = initialBox.x;
      let y = initialBox.y;
      let width = initialBox.width;
      let height = initialBox.height;
      const dx = e.clientX - dragInfo.startX;
      const dy = e.clientY - dragInfo.startY;
      const parentRect = containerRef.current.getBoundingClientRect();

      if (type === 'body') { x += dx; y += dy; } 
      else {
        if (type.includes('l')) { width -= dx; x += dx; }
        if (type.includes('r')) { width += dx; }
        if (type.includes('t')) { height -= dy; y += dy; }
        if (type.includes('b')) { height += dy; }
        if (aspectRatio) {
          if (type.includes('l') || type.includes('r')) height = width / aspectRatio;
          else width = height * aspectRatio;
        }
      }
      if (x < 0) { width += x; x = 0; }
      if (y < 0) { height += y; y = 0; }
      if (x + width > parentRect.width) { width = parentRect.width - x; }
      if (y + height > parentRect.height) { height = parentRect.height - y; }
      setCropBox({ x, y, width, height });
    };
    const handleCropMouseUp = () => setDragInfo(null);
    window.addEventListener('mousemove', handleCropMouseMove);
    window.addEventListener('mouseup', handleCropMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleCropMouseMove);
        window.removeEventListener('mouseup', handleCropMouseUp);
    };
  }, [dragInfo]);

  // UI Components
  const ToolButton: React.FC<{label: string, icon: React.ReactNode, active: boolean, onClick: () => void}> = ({label, icon, active, onClick}) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center p-2 gap-1 rounded-md w-full transition-colors ${active ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-cyan-400/10'}`}>
        {icon}
        <span className="text-xs">{label}</span>
    </button>
  );

  let canPan = false;
  if (canvasRef.current && offscreenCanvasRef.current) {
      const displayedWidth = offscreenCanvasRef.current.width * transform.scale;
      const displayedHeight = offscreenCanvasRef.current.height * transform.scale;
      canPan = displayedWidth > canvasRef.current.width || displayedHeight > canvasRef.current.height;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="relative panel panel-cut p-4 w-full max-w-6xl max-h-[90vh] flex flex-col lg:flex-row gap-4 animate-zoom-in shadow-2xl shadow-cyan-500/10" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-2 right-2 z-20 transition-transform duration-200 ease-in-out hover:scale-110" aria-label="Close image editor">
          <AnimatedCloseIcon />
        </button>

        <div 
            ref={containerRef} 
            className="flex-grow flex items-center justify-center bg-black/20 rounded-lg overflow-hidden h-64 lg:h-auto relative select-none"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
          <canvas ref={canvasRef} className={`max-w-full max-h-full ${isPanning ? 'cursor-grabbing' : (canPan ? 'cursor-grab' : (isDraggingText ? 'cursor-move' : 'cursor-default'))}`} />
           {isCropping && (
              <div
                className="absolute border-2 border-dashed border-cyan-400 pointer-events-none"
                style={{ left: `${cropBox.x}px`, top: `${cropBox.y}px`, width: `${cropBox.width}px`, height: `${cropBox.height}px` }}
              >
                  {showCropGuides && <>
                      <div className="absolute top-0 left-1/3 w-px h-full bg-cyan-400/50"></div>
                      <div className="absolute top-0 left-2/3 w-px h-full bg-cyan-400/50"></div>
                      <div className="absolute top-1/3 left-0 w-full h-px bg-cyan-400/50"></div>
                      <div className="absolute top-2/3 left-0 w-full h-px bg-cyan-400/50"></div>
                  </>}
                  <div onMouseDown={(e) => handleCropMouseDown(e, 'body')} className="absolute inset-0 cursor-move pointer-events-auto" />
                  {(['tl', 'tr', 'bl', 'br'] as DragHandle[]).map(handle => (
                      <div key={handle} onMouseDown={(e) => handleCropMouseDown(e, handle)} className={`absolute w-3 h-3 bg-cyan-400 border border-black/50 pointer-events-auto ${handle.includes('t') ? '-top-1.5' : '-bottom-1.5'} ${handle.includes('l') ? '-left-1.5' : '-right-1.5'} ${handle === 'tl' || handle === 'br' ? 'cursor-nwse-resize' : 'cursor-nesw-resize'}`} />
                  ))}
              </div>
            )}
        </div>

        <div className="w-full lg:w-72 flex-shrink-0 flex flex-col">
          <h3 className="text-xl font-heading font-bold text-cyan-300 text-center lg:text-left">Edit Image</h3>
          
          <div className="grid grid-cols-5 gap-2 my-4">
            <ToolButton label="Adjust" icon={<AdjustIcon />} active={mode==='adjust'} onClick={() => switchMode('adjust')} />
            <ToolButton label="Filters" icon={<FilterIcon />} active={mode==='filters'} onClick={() => switchMode('filters')} />
            <ToolButton label="Crop" icon={<CropIcon />} active={mode==='crop'} onClick={() => switchMode('crop')} />
            <ToolButton label="Resize" icon={<ResizeIcon />} active={mode==='resize'} onClick={() => switchMode('resize')} />
            <ToolButton label="Text" icon={<TextIcon />} active={mode==='text'} onClick={() => switchMode('text')} />
          </div>

          <div className="flex-grow space-y-4 overflow-y-auto pr-2">
            {mode === 'adjust' && (
              <div className="space-y-3 animate-fade-in-fast">
                <FilterSlider label="Brightness" value={previewFilters.brightness} onChange={e => setPreviewFilters(p => ({...p, brightness: +e.target.value}))} />
                <FilterSlider label="Contrast" value={previewFilters.contrast} onChange={e => setPreviewFilters(p => ({...p, contrast: +e.target.value}))} />
                <FilterSlider label="Saturation" value={previewFilters.saturate} onChange={e => setPreviewFilters(p => ({...p, saturate: +e.target.value}))} />
                <FilterSlider label="Hue" value={previewFilters.hue} min={-180} max={180} onChange={e => setPreviewFilters(p => ({...p, hue: +e.target.value}))} />
                <div className="flex gap-2"><button onClick={() => setPreviewFilters(appliedFilters)} className="w-full btn-secondary">Reset</button><button onClick={handleApplyAdjustments} className="w-full btn-primary">Apply</button></div>
                <div className="pt-3 border-t border-[var(--color-border)]">
                    <h4 className="text-sm font-bold text-cyan-200/80 mb-2 uppercase tracking-wider">Transform</h4>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={handleRotate} className="btn-secondary flex flex-col items-center justify-center p-2 text-xs h-16"><RotateIcon /> Rotate 90°</button>
                        <button onClick={handleFlipHorizontal} className="btn-secondary flex flex-col items-center justify-center p-2 text-xs h-16"><FlipHorizontalIcon /> H-Flip</button>
                        <button onClick={handleFlipVertical} className="btn-secondary flex flex-col items-center justify-center p-2 text-xs h-16"><FlipVerticalIcon /> V-Flip</button>
                    </div>
                </div>
              </div>
            )}
            {mode === 'filters' && (
              <div className="space-y-3 animate-fade-in-fast">
                <div className="grid grid-cols-2 gap-2">
                    {PRESET_FILTERS.map(f => <button key={f.name} onClick={() => setPreviewFilter(f.name)} className={`p-2 text-sm rounded transition-colors ${previewFilter === f.name ? 'bg-cyan-500/30 text-cyan-200' : 'bg-gray-800/60 hover:bg-cyan-500/10'}`}>{f.label}</button>)}
                </div>
                <div className="flex gap-2"><button onClick={() => setPreviewFilter('none')} className="w-full btn-secondary">Reset</button><button onClick={handleApplyFilter} disabled={previewFilter==='none'} className="w-full btn-primary">Apply</button></div>
              </div>
            )}
            {mode === 'crop' && (
              <div className="space-y-3 animate-fade-in-fast">
                 <button onClick={() => setIsCropping(!isCropping)} className="w-full btn-secondary">{isCropping ? 'Cancel Crop' : 'Activate Crop'}</button>
                 {isCropping && ( <>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showCropGuides} onChange={e => setShowCropGuides(e.target.checked)} className="form-checkbox" /><span className="text-sm text-gray-400">Show Guides</span></label>
                    <div><label className="text-sm text-gray-400 mb-1 block">Aspect Ratio</label>
                        <div className="grid grid-cols-3 gap-1"><button onClick={() => setAspectRatioKey('1:1')} className="btn-aspect">1:1</button><button onClick={() => setAspectRatioKey('16:9')} className="btn-aspect">16:9</button><button onClick={() => setAspectRatioKey('9:16')} className="btn-aspect">9:16</button></div>
                        <select value={aspectRatioKey} onChange={(e) => setAspectRatioKey(e.target.value)} className="w-full select-field mt-2">{Object.keys(ASPECT_RATIOS).map(key => <option key={key} value={key}>{key}</option>)}</select>
                    </div>
                    <button onClick={handleCrop} className="w-full btn-primary">Apply Crop</button>
                 </> )}
              </div>
            )}
            {mode === 'resize' && (
              <div className="space-y-4 animate-fade-in-fast">
                  <div>
                      <div className="flex gap-2 items-center">
                          <div className="flex-1">
                              <label htmlFor="resizeWidth" className="text-sm text-gray-400 mb-1 block">Width</label>
                              <input id="resizeWidth" type="number" value={Math.round(resizeWidth)} onChange={handleResizeWidthChange} className="w-full input-field" />
                          </div>
                          <div className="flex-1">
                              <label htmlFor="resizeHeight" className="text-sm text-gray-400 mb-1 block">Height</label>
                              <input id="resizeHeight" type="number" value={Math.round(resizeHeight)} onChange={handleResizeHeightChange} className="w-full input-field" />
                          </div>
                      </div>
                  </div>
                  <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={keepAspectRatio} onChange={e => setKeepAspectRatio(e.target.checked)} className="form-checkbox" />
                          <span className="text-sm text-gray-400">Lock aspect ratio</span>
                      </label>
                  </div>
                  <button onClick={handleApplyResize} className="w-full btn-primary">Apply Resize</button>
              </div>
            )}
            {mode === 'text' && activeText && (
              <div className="space-y-3 animate-fade-in-fast">
                <div><label className="text-sm text-gray-400 mb-1 block">Text</label><input type="text" value={activeText.content} onChange={e => setActiveText(t => t ? {...t, content: e.target.value} : null)} className="w-full input-field" /></div>
                <div><label className="text-sm text-gray-400 mb-1 block">Font</label><select value={activeText.font} onChange={e => setActiveText(t => t ? {...t, font: e.target.value} : null)} className="w-full select-field">{FONT_FAMILIES.map(font => <option key={font} value={font}>{font}</option>)}</select></div>
                <div><label className="text-sm text-gray-400 mb-1 block">Alignment</label><div className="grid grid-cols-3 gap-1 bg-gray-900/50 p-1 rounded-md">{(['left', 'center', 'right'] as TextAlign[]).map(align => <button key={align} onClick={() => setActiveText(t => t ? {...t, align} : null)} className={`p-1 rounded transition-colors text-xs uppercase ${activeText.align === align ? 'bg-cyan-500/30 text-cyan-200' : 'hover:bg-cyan-500/10'}`}>{align}</button>)}</div></div>
                <div className="flex items-end gap-4">
                  <div className="flex-grow"><FilterSlider label="Size" value={activeText.size} min={8} max={256} onChange={e => setActiveText(t => t ? {...t, size: +e.target.value} : null)} /></div>
                  <div><input type="color" value={activeText.color} onChange={e => setActiveText(t => t ? {...t, color: e.target.value} : null)} className="w-12 h-10 p-1 bg-transparent border-none rounded-md" /></div>
                </div>
                <div className="border-t border-[var(--color-border)] my-2"></div>
                <div><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={activeText.strokeEnabled} onChange={e => setActiveText(t => t ? {...t, strokeEnabled: e.target.checked} : null)} className="form-checkbox" /><span className="text-sm text-gray-400">Enable Outline</span></label></div>
                {activeText.strokeEnabled && (<div className="space-y-3 animate-fade-in-fast pl-2 border-l-2 border-cyan-500/20 ml-2">
                    <div className="flex items-end gap-4"><div className="flex-grow"><FilterSlider label="Width" value={activeText.strokeWidth} min={1} max={20} onChange={e => setActiveText(t => t ? {...t, strokeWidth: +e.target.value} : null)} /></div><div><input type="color" value={activeText.strokeColor} onChange={e => setActiveText(t => t ? {...t, strokeColor: e.target.value} : null)} className="w-12 h-10 p-1 bg-transparent border-none rounded-md" /></div></div>
                </div>)}
                <div className="border-t border-[var(--color-border)] my-2"></div>
                <div><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={activeText.shadowEnabled} onChange={e => setActiveText(t => t ? {...t, shadowEnabled: e.target.checked} : null)} className="form-checkbox" /><span className="text-sm text-gray-400">Enable Shadow</span></label></div>
                {activeText.shadowEnabled && (<div className="space-y-3 animate-fade-in-fast pl-2 border-l-2 border-cyan-500/20 ml-2">
                    <div className="flex items-center gap-4"><div className="flex-grow"><FilterSlider label="Offset X" min={-20} max={20} value={activeText.shadowOffsetX} onChange={e => setActiveText(t => t ? {...t, shadowOffsetX: +e.target.value} : null)} /></div><div className="flex-grow"><FilterSlider label="Offset Y" min={-20} max={20} value={activeText.shadowOffsetY} onChange={e => setActiveText(t => t ? {...t, shadowOffsetY: +e.target.value} : null)} /></div></div>
                    <div className="flex items-end gap-4"><div className="flex-grow"><FilterSlider label="Blur" min={0} max={40} value={activeText.shadowBlur} onChange={e => setActiveText(t => t ? {...t, shadowBlur: +e.target.value} : null)} /></div><div><input type="color" value={activeText.shadowColor} onChange={e => setActiveText(t => t ? {...t, shadowColor: e.target.value} : null)} className="w-12 h-10 p-1 bg-transparent border-none rounded-md" /></div></div>
                </div>)}
                <button onClick={handleApplyText} className="w-full btn-primary">Apply Text</button>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <div className="flex items-center justify-center gap-4 mb-4">
                 <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 rounded-full bg-gray-700/50 hover:bg-cyan-400/20 disabled:opacity-50 disabled:cursor-not-allowed"><UndoIcon /></button>
                 <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-full bg-gray-700/50 hover:bg-cyan-400/20 disabled:opacity-50 disabled:cursor-not-allowed"><RedoIcon /></button>
              </div>
              <div className="flex gap-2"><button onClick={onClose} className="w-full btn-secondary">Cancel</button><button onClick={handleSave} disabled={isCropping} className="w-full btn-primary">Save Changes</button></div>
          </div>
        </div>
      </div>
      <style>{`
       @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
       @keyframes zoom-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
       @keyframes fade-in-fast { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
       .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
       .animate-zoom-in { animation: zoom-in 0.3s ease-out forwards; }
       .animate-fade-in-fast { animation: fade-in-fast 0.3s ease-out forwards; }
       input[type=range] { -webkit-appearance: none; width: 100%; background: transparent; }
       input[type=range]:focus { outline: none; }
       input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: var(--color-border); border-radius: 2px; }
       input[type=range]::-webkit-slider-thumb { height: 16px; width: 16px; border-radius: 50%; background: var(--color-primary); cursor: pointer; -webkit-appearance: none; margin-top: -6px; border: 2px solid var(--color-bg); }
       input[type=range]::-moz-range-track { width: 100%; height: 4px; cursor: pointer; background: var(--color-border); border-radius: 2px; }
       input[type=range]::-moz-range-thumb { height: 16px; width: 16px; border-radius: 50%; background: var(--color-primary); cursor: pointer; border: 2px solid var(--color-bg); }
       .form-checkbox { appearance: none; background-color: var(--color-surface); border: 2px solid var(--color-border); padding: 0; color-adjust: exact; display: inline-block; vertical-align: middle; background-origin: border-box; user-select: none; flex-shrink: 0; height: 1.25rem; width: 1.25rem; border-radius: 4px; color: var(--color-primary); }
       .form-checkbox:checked { background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e"); border-color: transparent; background-color: currentColor; background-size: 100% 100%; background-position: center; background-repeat: no-repeat; }
       .btn-secondary { padding: 8px 16px; background-color: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; font-weight: bold; transition: all 0.2s ease; cursor: pointer; }
       .btn-secondary:hover:not(:disabled) { background-color: var(--color-primary); color: var(--color-bg); border-color: var(--color-primary); }
       .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
       .btn-aspect { padding: 6px; font-size: 0.75rem; background-color: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; font-weight: bold; transition: all 0.2s ease; cursor: pointer; }
       .btn-aspect:hover { background-color: rgba(0, 229, 255, 0.2); }
      `}</style>
    </div>
  );
};

const FilterSlider: React.FC<{label: string, value: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, min?: number, max?: number}> = ({ label, value, onChange, min=0, max=200 }) => (
    <div className="flex flex-col">
      <div className="flex justify-between items-center"><label className="text-sm text-gray-400 capitalize">{label}</label><span className="text-xs font-mono text-gray-500">{value}</span></div>
      <input type="range" min={min} max={max} value={value} onChange={onChange} className="w-full" />
    </div>
);

export default ImageEditor;