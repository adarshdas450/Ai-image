import React, { useState, useEffect, useRef, useCallback } from 'react';
import CloseIcon from './icons/CloseIcon';
import RotateIcon from './icons/RotateIcon';
import UndoIcon from './icons/UndoIcon';
import RedoIcon from './icons/RedoIcon';
import AdjustIcon from './icons/AdjustIcon';
import CropIcon from './icons/CropIcon';
import TextIcon from './icons/TextIcon';
import FilterIcon from './icons/FilterIcon';


interface ImageEditorProps {
  imageUrl: string;
  onClose: () => void;
  onSave: (newImageUrl: string) => void;
}

type EditorMode = 'adjust' | 'crop' | 'text' | 'filters';
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
  const [text, setText] = useState('Hello World');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textSize, setTextSize] = useState(48);
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0]);
  const [textAlign, setTextAlign] = useState<TextAlign>('center');
  const [enableTextShadow, setEnableTextShadow] = useState(false);
  const [textShadowColor, setTextShadowColor] = useState('#000000');
  const [textShadowOffsetX, setTextShadowOffsetX] = useState(2);
  const [textShadowOffsetY, setTextShadowOffsetY] = useState(2);
  const [textShadowBlur, setTextShadowBlur] = useState(4);
  const [enableTextStroke, setEnableTextStroke] = useState(false);
  const [textStrokeColor, setTextStrokeColor] = useState('#000000');
  const [textStrokeWidth, setTextStrokeWidth] = useState(2);

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
    ctx.restore();

  }, [transform, previewFilters, mode, previewFilter]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;
      
      tempCanvas.width = img.naturalWidth;
      tempCanvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      setHistory([data]);
      setHistoryIndex(0);
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
  }, [transform, previewFilters, previewFilter, drawCanvas]);

  const addHistoryState = useCallback((data: ImageData) => {
    setHistory(currentHistory => {
        const newHistory = currentHistory.slice(0, historyIndex + 1);
        newHistory.push(data);
        return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handleUndo = () => historyIndex > 0 && setHistoryIndex(historyIndex - 1);
  const handleRedo = () => historyIndex < history.length - 1 && setHistoryIndex(historyIndex + 1);

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
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(rotatedCanvas, 0, 0);
        }
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
  
  const handleAddText = () => {
    applyOperationAndSave((ctx, canvas) => {
        ctx.font = `${textSize}px '${fontFamily}', sans-serif`;
        ctx.fillStyle = textColor;
        ctx.textAlign = textAlign;
        ctx.textBaseline = 'middle';
        if (enableTextShadow) {
            ctx.shadowColor = textShadowColor;
            ctx.shadowOffsetX = textShadowOffsetX;
            ctx.shadowOffsetY = textShadowOffsetY;
            ctx.shadowBlur = textShadowBlur;
        }
        let xPos;
        switch(textAlign) {
            case 'left': xPos = 20; break;
            case 'right': xPos = canvas.width - 20; break;
            default: xPos = canvas.width / 2;
        }

        if(enableTextStroke) {
            ctx.strokeStyle = textStrokeColor;
            ctx.lineWidth = textStrokeWidth;
            ctx.strokeText(text, xPos, canvas.height / 2);
        }
        ctx.fillText(text, xPos, canvas.height / 2);
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    });
  };

  // EVENT HANDLERS
  const handleSave = () => {
    if (isCropping) return;
    const canvas = offscreenCanvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL('image/png'));
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (transform.scale > 1 && e.button === 0) {
      e.preventDefault();
      setIsPanning(true);
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPoint.current.x;
      const dy = e.clientY - lastPanPoint.current.y;
      setTransform(t => ({ ...t, pan: { x: t.pan.x + dx, y: t.pan.y + dy } }));
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
    }
  };
  
  const handleMouseUp = () => setIsPanning(false);

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
    
    const newPanX = mouseX - worldX * clampedScale;
    const newPanY = mouseY - worldY * clampedScale;

    setTransform({ scale: clampedScale, pan: { x: newPanX, y: newPanY } });
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
      const { initialBox, type, aspectRatio } = dragInfo;
      let { x, y, width, height } = { ...initialBox };
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

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="relative panel panel-cut p-4 w-full max-w-6xl max-h-[90vh] flex flex-col lg:flex-row gap-4 animate-zoom-in shadow-2xl shadow-cyan-500/10" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-4 -right-4 bg-red-600 text-white p-2 rounded-full hover:bg-red-500 transition-transform hover:scale-110 shadow-lg shadow-red-500/30 z-20" aria-label="Close image editor">
          <CloseIcon />
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
          <canvas ref={canvasRef} className={`max-w-full max-h-full ${isPanning ? 'cursor-grabbing' : (transform.scale > 1 ? 'cursor-grab' : 'cursor-default')}`} />
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
          
          <div className="grid grid-cols-4 gap-2 my-4">
            <ToolButton label="Adjust" icon={<AdjustIcon />} active={mode==='adjust'} onClick={() => setMode('adjust')} />
            <ToolButton label="Filters" icon={<FilterIcon />} active={mode==='filters'} onClick={() => setMode('filters')} />
            <ToolButton label="Crop" icon={<CropIcon />} active={mode==='crop'} onClick={() => setMode('crop')} />
            <ToolButton label="Text" icon={<TextIcon />} active={mode==='text'} onClick={() => setMode('text')} />
          </div>

          <div className="flex-grow space-y-4 overflow-y-auto pr-2">
            {mode === 'adjust' && (
              <div className="space-y-3 animate-fade-in-fast">
                <FilterSlider label="Brightness" value={previewFilters.brightness} onChange={e => setPreviewFilters(p => ({...p, brightness: +e.target.value}))} />
                <FilterSlider label="Contrast" value={previewFilters.contrast} onChange={e => setPreviewFilters(p => ({...p, contrast: +e.target.value}))} />
                <FilterSlider label="Saturation" value={previewFilters.saturate} onChange={e => setPreviewFilters(p => ({...p, saturate: +e.target.value}))} />
                <FilterSlider label="Hue" value={previewFilters.hue} min={-180} max={180} onChange={e => setPreviewFilters(p => ({...p, hue: +e.target.value}))} />
                <div className="flex gap-2"><button onClick={() => setPreviewFilters(appliedFilters)} className="w-full btn-secondary">Reset</button><button onClick={handleApplyAdjustments} className="w-full btn-primary">Apply</button></div>
                <button onClick={handleRotate} className="w-full btn-secondary flex items-center justify-center gap-2"><RotateIcon /> Rotate 90°</button>
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
            {mode === 'text' && (
              <div className="space-y-3 animate-fade-in-fast">
                <div><label className="text-sm text-gray-400 mb-1 block">Text</label><input type="text" value={text} onChange={e => setText(e.target.value)} className="w-full input-field" /></div>
                <div><label className="text-sm text-gray-400 mb-1 block">Font</label><select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full select-field">{FONT_FAMILIES.map(font => <option key={font} value={font}>{font}</option>)}</select></div>
                <div><label className="text-sm text-gray-400 mb-1 block">Alignment</label><div className="grid grid-cols-3 gap-1 bg-gray-900/50 p-1 rounded-md">{(['left', 'center', 'right'] as TextAlign[]).map(align => <button key={align} onClick={() => setTextAlign(align)} className={`p-1 rounded transition-colors text-xs uppercase ${textAlign === align ? 'bg-cyan-500/30 text-cyan-200' : 'hover:bg-cyan-500/10'}`}>{align}</button>)}</div></div>
                <div className="flex items-end gap-4">
                  <div className="flex-grow"><FilterSlider label="Size" value={textSize} min={8} max={256} onChange={e => setTextSize(+e.target.value)} /></div>
                  <div><input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-12 h-10 p-1 bg-transparent border-none rounded-md" /></div>
                </div>
                <div className="border-t border-[var(--color-border)] my-2"></div>
                <div><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={enableTextStroke} onChange={e => setEnableTextStroke(e.target.checked)} className="form-checkbox" /><span className="text-sm text-gray-400">Enable Outline</span></label></div>
                {enableTextStroke && (<div className="space-y-3 animate-fade-in-fast pl-2 border-l-2 border-cyan-500/20 ml-2">
                    <div className="flex items-end gap-4"><div className="flex-grow"><FilterSlider label="Width" value={textStrokeWidth} min={1} max={20} onChange={e => setTextStrokeWidth(+e.target.value)} /></div><div><input type="color" value={textStrokeColor} onChange={e => setTextStrokeColor(e.target.value)} className="w-12 h-10 p-1 bg-transparent border-none rounded-md" /></div></div>
                </div>)}
                <div className="border-t border-[var(--color-border)] my-2"></div>
                <div><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={enableTextShadow} onChange={e => setEnableTextShadow(e.target.checked)} className="form-checkbox" /><span className="text-sm text-gray-400">Enable Shadow</span></label></div>
                {enableTextShadow && (<div className="space-y-3 animate-fade-in-fast pl-2 border-l-2 border-cyan-500/20 ml-2">
                    <div className="flex items-center gap-4"><div className="flex-grow"><FilterSlider label="Offset X" min={-20} max={20} value={textShadowOffsetX} onChange={e => setTextShadowOffsetX(+e.target.value)} /></div><div className="flex-grow"><FilterSlider label="Offset Y" min={-20} max={20} value={textShadowOffsetY} onChange={e => setTextShadowOffsetY(+e.target.value)} /></div></div>
                    <div className="flex items-end gap-4"><div className="flex-grow"><FilterSlider label="Blur" min={0} max={40} value={textShadowBlur} onChange={e => setTextShadowBlur(+e.target.value)} /></div><div><input type="color" value={textShadowColor} onChange={e => setTextShadowColor(e.target.value)} className="w-12 h-10 p-1 bg-transparent border-none rounded-md" /></div></div>
                </div>)}
                <button onClick={handleAddText} className="w-full btn-primary">Add Text</button>
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
