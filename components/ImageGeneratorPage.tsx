
import React, { useState, useEffect } from 'react';
import { generateImage, upscaleImage } from '../services/geminiService';
import { addImageToHistory, getRandomHistoryItems } from '../services/dbService';
import { getFriendlyErrorMessage } from '../services/errorService';
import Spinner from './Spinner';
import DownloadIcon from './icons/DownloadIcon';
import Lightbox from './Lightbox';
import Header from './Header';
import InspirationFooter from './InspirationFooter';
import UpscaleIcon from './icons/UpscaleIcon';
import BrandedPlaceholder from './BrandedPlaceholder';

const suggestedPrompts = [
  'A synthwave style sunset over a retro-futuristic city',
  'A majestic lion with a crown of stars, cosmic background',
  'An enchanted forest library with glowing books',
];

const styleOptions = [
  '(Default)',
  'Abstract',
  'Anime',
  'Art Deco',
  'Cyberpunk',
  'Fantasy',
  'Impressionism',
  'Photorealistic',
  'Pixel Art',
  'Sci-Fi',
  'Surrealism',
  'Watercolour',
  'Custom'
];

const SAVED_SETTINGS_KEY = 'ai-image-forge-draft';

const staticInspirations = [
  {
    title: 'Lunar Diner',
    prompt: 'A retro-futuristic diner on a moon colony, with robots serving milkshakes, vintage sci-fi',
    author: 'LunarDiner',
    shapes: (
        <>
            <div className="absolute top-[20%] left-[25%] w-16 h-16 bg-red-800/30 rounded-md -rotate-12"></div>
            <div className="absolute bottom-[10%] right-[10%] w-12 h-12 bg-red-800/20 rounded-full"></div>
        </>
    )
  },
  {
    title: 'Crystal Cave',
    prompt: 'A glowing crystal cave, filled with giant luminous mushrooms and sparkling geodes, fantasy concept art',
    author: 'CrystalCave',
    shapes: (
        <>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-purple-500/20 rotate-45"></div>
            <div className="absolute bottom-[15%] left-[20%] w-10 h-10 bg-purple-500/10 rotate-[30deg]"></div>
            <div className="absolute top-[10%] right-[20%] w-8 h-8 bg-purple-500/30 rotate-12"></div>
        </>
    )
  },
  {
    title: 'Obsidian Dragon',
    prompt: 'An obsidian dragon perched on a volcanic peak, molten lava flowing below, dramatic sky, epic fantasy',
    author: 'ObsidianDragon',
    shapes: (
        <>
            <div className="absolute top-[20%] right-[25%] w-16 h-16 bg-teal-500/20 -rotate-[25deg]"></div>
            <div className="absolute bottom-[30%] left-[10%] w-12 h-12 bg-teal-500/10 rotate-12"></div>
            <div className="absolute bottom-[10%] right-[20%] w-8 h-8 bg-teal-500/30 rotate-[5deg]"></div>
        </>
    )
  },
  {
    title: 'Storyboard Scene',
    prompt: 'A storyboard scene of a detective discovering a hidden clue in a neon-lit alley, dynamic comic book art style, cinematic lighting',
    author: 'Whisk by Google Labs',
    shapes: (
        <>
            <div className="absolute top-[15%] left-[15%] w-20 h-12 bg-yellow-500/20 border-2 border-yellow-500/30"></div>
            <div className="absolute bottom-[20%] right-[20%] w-16 h-10 bg-yellow-500/10 border-2 border-yellow-500/20 rotate-12"></div>
        </>
    )
  },
];

const ImageGeneratorPage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [quality, setQuality] = useState('Standard');
  const [style, setStyle] = useState('(Default)');
  const [customStyle, setCustomStyle] = useState('');
  const [imageSize, setImageSize] = useState('16:9');
  const [generatedImageUrls, setGeneratedImageUrls] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historySaveError, setHistorySaveError] = useState<string | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [upscaledImageUrl, setUpscaledImageUrl] = useState<string | null>(null);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaleError, setUpscaleError] = useState<string | null>(null);
  const [inspirationItems, setInspirationItems] = useState<any[] | null>(null);

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(SAVED_SETTINGS_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setPrompt(parsed.prompt || '');
        setNegativePrompt(parsed.negativePrompt || '');
        setQuality(parsed.quality || 'Standard');
        setStyle(parsed.style || '(Default)');
        setCustomStyle(parsed.customStyle || '');
        setImageSize(parsed.imageSize || '16:9');
      }
    } catch (e) {
      console.error("Failed to load saved settings from localStorage", e);
    }
  }, []);

  useEffect(() => {
    const settingsToSave = {
      prompt,
      negativePrompt,
      quality,
      style,
      customStyle,
      imageSize,
    };

    const handler = setTimeout(() => {
      localStorage.setItem(SAVED_SETTINGS_KEY, JSON.stringify(settingsToSave));
    }, 1500);

    return () => clearTimeout(handler);
  }, [prompt, negativePrompt, quality, style, customStyle, imageSize]);

  useEffect(() => {
    let objectUrls: string[] = [];

    const loadInspirations = async () => {
        try {
            const historyItems = await getRandomHistoryItems(4);
            if (historyItems.length > 0) {
                const dynamicInspirations = historyItems.map(item => {
                    const url = URL.createObjectURL(item.imageBlobs[0]);
                    objectUrls.push(url);
                    return {
                        title: item.prompt.split(' ').slice(0, 3).join(' ') + '...',
                        prompt: item.prompt,
                        imageUrl: url,
                        author: 'From Your History',
                    };
                });
                setInspirationItems(dynamicInspirations);
            } else {
                setInspirationItems(staticInspirations);
            }
        } catch (e) {
            console.error("Failed to load inspiration items from history", e);
            setInspirationItems(staticInspirations);
        }
    };

    loadInspirations();

    return () => {
        objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handleGenerateImage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImageUrls(null);
    setHistorySaveError(null);
    setUpscaledImageUrl(null);
    setUpscaleError(null);

    try {
      const finalStyle = style === 'Custom' ? customStyle : (style !== '(Default)' ? style : '');
      const enhancedPrompt = [finalStyle, quality === 'High' ? 'High quality' : '', prompt].filter(Boolean).join(', ');
      
      const imageUrls = await generateImage(enhancedPrompt, imageSize, negativePrompt);
      setGeneratedImageUrls(imageUrls);

      const newImageRecord = {
        id: `img-${Date.now()}`,
        prompt: prompt,
        imageUrls: imageUrls,
        createdAt: new Date().toISOString(),
        quality: quality,
        style: finalStyle || 'Default',
        imageSize: imageSize,
        negativePrompt: negativePrompt,
      };
      
      try {
        await addImageToHistory(newImageRecord);
      } catch (storageError) {
        console.error("Failed to save image to history:", storageError);
        setHistorySaveError("Image generated successfully, but failed to save to your history.");
      }

    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUpscaleImage = async (imageUrl: string) => {
    setIsUpscaling(true);
    setUpscaleError(null);
    setUpscaledImageUrl(null);

    try {
        const upscaledUrl = await upscaleImage(imageUrl);
        setUpscaledImageUrl(upscaledUrl);
    } catch(err) {
        setUpscaleError(getFriendlyErrorMessage(err));
    } finally {
        setIsUpscaling(false);
    }
  };

  const handleInspirationClick = (inspirationPrompt: string) => {
    setPrompt(inspirationPrompt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const LabeledSelect: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: string[], fullWidth?: boolean}> = ({label, value, onChange, options, fullWidth}) => (
    <div className={fullWidth ? 'w-full' : ''}>
      <label htmlFor={label.toLowerCase().replace(/ /g, '')} className="block text-sm font-bold text-cyan-200/80 mb-2 uppercase tracking-wider">{label}</label>
      <select
        id={label.toLowerCase().replace(/ /g, '')}
        value={value}
        onChange={onChange}
        disabled={isLoading || isUpscaling}
        className="w-full select-field"
      >
        {options.map(option => <option key={option} value={option} className="bg-gray-900">{option}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <Header active="generator" />
      <main className="min-h-screen flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 pt-24 sm:pt-28">
        
        {/* HERO SECTION */}
        <section className="text-center w-full max-w-5xl mx-auto mt-36 md:mt-40 mb-8 md:mb-16" data-fade-in>
          <h1 
            className="text-5xl sm:text-7xl lg:text-8xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-2 glitch"
            data-text="AI IMAGE FORGE"
          >
            AI IMAGE FORGE
          </h1>
          <p className="text-gray-400 text-lg md:text-xl">Bring your imagination to life.</p>
        </section>

        <div className="w-full max-w-6xl flex flex-col items-center" data-fade-in>
          
          {/* THE FORGE */}
          <form onSubmit={handleGenerateImage} className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* Main Prompt Area */}
            <div className="lg:col-span-2 space-y-6">
              <div className="panel panel-cut p-4 md:p-6">
                <label htmlFor="prompt" className="block text-sm font-bold text-cyan-200/80 mb-2 uppercase tracking-wider">Your Prompt</label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A futuristic cityscape at sunset, cinematic lighting..."
                  disabled={isLoading || isUpscaling}
                  rows={4}
                  className="w-full p-4 text-white bg-transparent border-2 border-transparent rounded-lg focus:outline-none focus:bg-gray-900/50 transition-all duration-300 disabled:opacity-50 text-lg resize-none"
                />
                <div className={`transition-all duration-300 overflow-hidden ${!prompt ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="flex flex-wrap justify-start gap-2 mt-2">
                    <span className="text-xs text-gray-400 mr-2">Try:</span>
                      {suggestedPrompts.map((p) => (
                          <button 
                              key={p} type="button" onClick={() => setPrompt(p)} disabled={isLoading || isUpscaling}
                              className="px-3 py-1 bg-gray-800/50 border border-cyan-500/20 text-gray-300 rounded-full text-xs hover:bg-cyan-400/20 hover:text-cyan-200 transition-colors disabled:opacity-50"
                          > {p} </button>
                      ))}
                  </div>
                </div>
              </div>

              <div className="panel panel-cut p-4 md:p-6">
                 <label htmlFor="negativeprompt" className="block text-sm font-bold text-cyan-200/80 mb-2 uppercase tracking-wider">Negative Prompt (what to avoid)</label>
                 <input
                  id="negativeprompt" type="text" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="e.g., blurry, text, watermark, extra limbs"
                  disabled={isLoading || isUpscaling}
                  className="w-full input-field"
                />
              </div>
            </div>

            {/* Settings Panel */}
            <div className="panel panel-cut p-4 md:p-6 flex flex-col justify-between">
              <h2 className="text-lg font-bold text-cyan-200/80 mb-4 uppercase tracking-wider">Settings</h2>
              <div className="space-y-4 flex-grow">
                 <LabeledSelect label="Quality" value={quality} onChange={e => setQuality(e.target.value)} options={['Standard', 'High']} />
                 <LabeledSelect label="Artistic Style" value={style} onChange={e => setStyle(e.target.value)} options={styleOptions} />
                 {style === 'Custom' && (
                   <div className="w-full animate-fade-in-fast">
                     <label htmlFor="customstyle" className="sr-only">Custom Style</label>
                     <input id="customstyle" type="text" value={customStyle} onChange={(e) => setCustomStyle(e.target.value)}
                       placeholder="Enter your custom style" disabled={isLoading || isUpscaling}
                       className="w-full input-field border-fuchsia-500/30 focus:border-fuchsia-400 focus:shadow-[0_0_10px_rgba(212,40,255,0.5)]"
                     />
                   </div>
                 )}
                 <LabeledSelect label="Image Size" value={imageSize} onChange={e => setImageSize(e.target.value)} options={['16:9', '9:16', '1:1', '4:3', '3:4']} />
              </div>
               <button type="submit" disabled={isLoading || isUpscaling} className="w-full btn-primary mt-6">
                  {isLoading ? 'Forging...' : 'Generate'}
                </button>
            </div>
          </form>
          
          {/* RESULTS AREA */}
          {isLoading || error || generatedImageUrls ? (
            <div className="w-full h-auto min-h-[400px] panel panel-cut flex items-center justify-center p-4 relative overflow-hidden results-bg">
              {isLoading ? (
                <div className="text-center z-10">
                  <Spinner />
                  <p className="text-gray-400 mt-4">Calibrating photons...</p>
                </div>
              ) : error ? (
                <div className="text-center text-red-400 p-4 z-10 max-w-lg">
                  <p className="font-bold text-lg mb-2 uppercase tracking-wider">Generation Failed</p>
                  <p className="text-red-300">{error}</p>
                </div>
              ) : generatedImageUrls ? (
                <div className="w-full h-full flex flex-col sm:flex-row gap-4 z-10">
                  {generatedImageUrls.map((url, index) => (
                    <div key={index} className="relative group w-full sm:w-1/2 h-full">
                      <img 
                        src={url} alt={`${prompt} - Variation ${index + 1}`} 
                        className="w-full h-full object-contain rounded-lg cursor-pointer transition-transform duration-300 group-hover:scale-105 border-2 border-fuchsia-500/20 group-hover:border-fuchsia-500/70"
                        onClick={() => setLightboxImageUrl(url)}
                      />
                      <div className="absolute bottom-4 right-4 flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpscaleImage(url); }}
                            disabled={isLoading || isUpscaling}
                            className="bg-black bg-opacity-60 text-white p-3 rounded-full hover:bg-fuchsia-500/80 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 disabled:cursor-not-allowed disabled:bg-gray-600/80"
                            aria-label="Upscale image"
                            title="Upscale image"
                          >
                            <UpscaleIcon />
                          </button>
                          <a
                            href={url} download={`ai-image-${Date.now()}-${index + 1}.png`} onClick={(e) => e.stopPropagation()}
                            className="bg-black bg-opacity-60 text-white p-3 rounded-full hover:bg-cyan-500/80 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                            aria-label="Download image"
                            title="Download image"
                          >
                            <DownloadIcon />
                          </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
           ) : (
            inspirationItems && <InspirationFooter inspirations={inspirationItems} onPromptClick={handleInspirationClick} />
           )}
          
          {/* UPSCALE RESULTS AREA */}
          {(isUpscaling || upscaledImageUrl || upscaleError) && (
            <div className="w-full mt-8" data-fade-in>
                <h2 className="text-2xl font-heading font-bold text-center mb-4 text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">Upscaled Image</h2>
                <div className="w-full h-auto min-h-[400px] panel panel-cut flex items-center justify-center p-4 relative overflow-hidden results-bg">
                {isUpscaling ? (
                    <div className="text-center z-10">
                        <Spinner />
                        <p className="text-gray-400 mt-4">Enhancing reality matrix... this can take a moment.</p>
                    </div>
                ) : upscaleError ? (
                    <div className="text-center text-red-400 p-4 z-10 max-w-lg">
                        <p className="font-bold text-lg mb-2 uppercase tracking-wider">Upscale Failed</p>
                        <p className="text-red-300">{upscaleError}</p>
                    </div>
                ) : upscaledImageUrl && (
                    <div className="relative group w-full h-full flex justify-center z-10">
                        <img 
                            src={upscaledImageUrl} alt="Upscaled result" 
                            className="w-auto h-full max-w-full max-h-[60vh] object-contain rounded-lg cursor-pointer transition-transform duration-300 group-hover:scale-105 border-2 border-cyan-500/20 group-hover:border-cyan-500/70"
                            onClick={() => setLightboxImageUrl(upscaledImageUrl)}
                        />
                        <a
                            href={upscaledImageUrl} download={`ai-image-upscaled-${Date.now()}.png`} onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white p-3 rounded-full hover:bg-cyan-500/80 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                            aria-label="Download upscaled image"
                            title="Download upscaled image"
                        >
                            <DownloadIcon />
                        </a>
                    </div>
                )}
                </div>
            </div>
           )}

          {historySaveError && (
            <div className="w-full max-w-3xl mt-4 bg-yellow-900/50 border border-yellow-500 text-yellow-300 px-4 py-3 rounded text-center" role="alert">
              {historySaveError}
            </div>
          )}
        </div>
        <BrandedPlaceholder />
      </main>
      {lightboxImageUrl && (
        <Lightbox imageUrl={lightboxImageUrl} onClose={() => setLightboxImageUrl(null)} />
      )}
       <style>{`
        @keyframes fade-in-fast {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-fast { animation: fade-in-fast 0.3s ease-out forwards; }
      `}</style>
    </>
  );
};

export default ImageGeneratorPage;
