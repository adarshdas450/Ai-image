import React, { useState, useEffect, useMemo } from 'react';
import { getHistory, deleteImageFromHistory, clearHistoryDB } from '../services/dbService';
import DownloadIcon from './icons/DownloadIcon';
import TrashIcon from './icons/TrashIcon';
import Lightbox from './Lightbox';
import Header from './Header';
import CloseIcon from './icons/CloseIcon';
import CopyIcon from './icons/CopyIcon';

interface StoredImage {
  id: string;
  prompt: string;
  imageBlobs: Blob[];
  createdAt: string;
  quality?: string;
  style?: string;
  imageSize?: string;
  negativePrompt?: string;
}

interface DisplayImage extends Omit<StoredImage, 'imageBlobs'> {
  imageUrls: string[];
  deleting?: boolean;
}

const timeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};


const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<DisplayImage[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];

    const loadHistory = async () => {
      try {
        const storedHistory: StoredImage[] = await getHistory();
        if (active) {
          const displayHistory = storedHistory.map(item => {
            const urls = item.imageBlobs.map(blob => URL.createObjectURL(blob));
            objectUrls.push(...urls);
            const { imageBlobs, ...rest } = item;
            return { ...rest, imageUrls: urls };
          });
          setHistory(displayHistory);
        }
      } catch (error) {
        console.error("Failed to load image history:", error);
        if (active) {
          setError("Could not load your image history. Please try refreshing the page.");
        }
      }
    };

    loadHistory();

    return () => {
      active = false;
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [history, sortOrder]);

  const handleCopyPrompt = (e: React.MouseEvent, id: string, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    }, (err) => {
        console.error('Could not copy text: ', err);
    });
  };

  const handleDelete = (id: string) => {
    setError(null);
    setHistory(prevHistory => prevHistory.map(item => item.id === id ? { ...item, deleting: true } : item));

    setTimeout(async () => {
      try {
        await deleteImageFromHistory(id);
        setHistory(prevHistory => {
          return prevHistory.filter(item => {
            if (item.id === id) {
              item.imageUrls.forEach(url => URL.revokeObjectURL(url));
              return false;
            }
            return true;
          });
        });
      } catch (error) {
         console.error("Failed to delete from DB, reverting UI", error);
         setError("Failed to delete the image from your history. Please try again.");
         setHistory(prevHistory => prevHistory.map(item => item.id === id ? {...item, deleting: false} : item));
      }
    }, 500);
  };

  const handleClearAll = () => {
    setError(null);
    if (window.confirm('Are you sure you want to delete all your generated images? This action cannot be undone.')) {
      setIsClearing(true);
      setTimeout(async () => {
        try {
            await clearHistoryDB();
            history.forEach(item => item.imageUrls.forEach(url => URL.revokeObjectURL(url)));
            setHistory([]);
        } catch (error) {
            console.error("Failed to clear history from DB", error);
            setError("Failed to clear your history. Please try again.");
        } finally {
            setIsClearing(false);
        }
      }, 500);
    }
  };

  return (
    <>
      <Header active="history" />
      <main className="min-h-screen p-4 sm:p-6 lg:p-8 pt-24 sm:pt-28">
        <div className="w-full max-w-7xl mx-auto" data-fade-in>
          <header className="text-center w-full max-w-5xl mx-auto my-8 md:my-16">
            <h1 
                className="text-5xl sm:text-7xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 glitch"
                data-text="Image History"
              >
                Image History
              </h1>
            <p className="text-gray-400 text-lg md:text-xl mt-2">A gallery of your creations.</p>
          </header>
          
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded relative text-center mb-6 max-w-4xl mx-auto" role="alert">
              <span className="block sm:inline">{error}</span>
              <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3" aria-label="Close">
                <CloseIcon />
              </button>
            </div>
          )}
          
          {history.length > 0 && (
              <div className="flex justify-end items-center gap-4 mb-6">
                 <div>
                    <label htmlFor="sort-order" className="sr-only">Sort by date</label>
                    <select
                      id="sort-order"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                      className="select-field"
                    >
                      <option value="newest" className="bg-gray-900">Newest First</option>
                      <option value="oldest" className="bg-gray-900">Oldest First</option>
                    </select>
                  </div>
                  <button
                      onClick={handleClearAll}
                      className="bg-red-600/80 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/40"
                      aria-label="Clear all history"
                  >
                      Clear All
                  </button>
              </div>
          )}

          {sortedHistory.length > 0 ? (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-500 ${isClearing ? 'opacity-0' : 'opacity-100'}`}>
              {sortedHistory.map((item) => (
                <div 
                  key={item.id} 
                  className={`group panel panel-cut flex flex-col transition-all duration-500 hover:border-cyan-500/70 hover:shadow-cyan-500/20 ${item.deleting ? 'opacity-0 scale-90 -z-10' : 'opacity-100 scale-100'}`}
                >
                  <div className="relative w-full p-2 cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                      <div className="flex gap-2">
                          {item.imageUrls.map((url, index) => (
                              <div key={index} className="relative w-1/2 group/image">
                                  <img 
                                    src={url} 
                                    alt={`${item.prompt} - ${index}`} 
                                    className="aspect-square w-full object-cover rounded-md cursor-pointer transition-transform group-hover/image:scale-105"
                                    onClick={(e) => { e.stopPropagation(); setLightboxImageUrl(url); }}
                                  />
                                   <a
                                      href={url} download={`ai-image-${item.id}-${index}.png`} onClick={(e) => e.stopPropagation()}
                                      className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white p-2 rounded-full hover:bg-cyan-500/80 hover:scale-110 transition-all opacity-0 group-hover/image:opacity-100"
                                      aria-label="Download image"
                                  > <DownloadIcon /> </a>
                              </div>
                          ))}
                      </div>
                      <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                          className="absolute top-3 right-3 bg-red-600 bg-opacity-80 text-white p-2 rounded-full hover:bg-opacity-100 hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                          aria-label="Delete image entry"
                      > <TrashIcon /> </button>
                  </div>
                  <div className="p-4 pt-2 flex flex-col flex-grow cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                    <p className="text-gray-300 text-sm mb-2 line-clamp-2 flex-grow">
                      {item.prompt}
                    </p>
                    <p className="text-gray-500 text-xs font-mono self-start">
                      {timeAgo(item.createdAt)}
                    </p>
                  </div>
                  <div className={`transition-all duration-300 ease-in-out grid ${expandedId === item.id ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <div className="p-4 pt-0 border-t border-cyan-500/20 mt-2">
                        <div className="flex justify-between items-center mb-2 pt-3">
                          <h4 className="text-sm font-bold text-cyan-300 uppercase tracking-wider">Full Prompt</h4>
                          <button
                            onClick={(e) => handleCopyPrompt(e, item.id, item.prompt)}
                            className="flex items-center gap-1.5 text-xs bg-gray-700/50 hover:bg-cyan-400/20 text-cyan-200 px-2 py-1 rounded transition-colors"
                          >
                            <CopyIcon />
                            {copiedId === item.id ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <p className="text-gray-400 text-xs bg-black/20 p-2 rounded mb-3">{item.prompt}</p>

                        <h4 className="text-sm font-bold text-cyan-300 mb-2 uppercase tracking-wider">Settings</h4>
                        <div className="text-xs text-gray-400 space-y-1 font-mono">
                          <p><span className="text-gray-500">Quality:</span> {item.quality || 'N/A'}</p>
                          <p><span className="text-gray-500">Style:</span> {item.style || 'N/A'}</p>
                          <p><span className="text-gray-500">Size:</span> {item.imageSize || 'N/A'}</p>
                          {item.negativePrompt && <p><span className="text-gray-500">Negative:</span> {item.negativePrompt}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              {!error && <p className="text-gray-400 text-xl">You haven't generated any images yet.</p>}
              {!error && <a href="#/" className="mt-4 inline-block text-cyan-400 hover:text-cyan-300 transition-colors font-bold tracking-wider">
                Start creating!
              </a>}
            </div>
          )}
        </div>
      </main>
      {lightboxImageUrl && (
        <Lightbox imageUrl={lightboxImageUrl} onClose={() => setLightboxImageUrl(null)} />
      )}
    </>
  );
};

export default HistoryPage;
