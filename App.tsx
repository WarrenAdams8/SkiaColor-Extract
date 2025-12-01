import React, { useState, useEffect, useCallback } from 'react';
import { Palette, ProcessingState } from './types';
import { skiaService } from './services/skiaService';
import { PaletteDisplay } from './components/PaletteDisplay';
import {
  PhotoIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  CommandLineIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1000&auto=format&fit=crop", // Colorful abstract
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop", // Liquid oil
  "https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=1000&auto=format&fit=crop", // Nature
];

export default function App() {
  const [imageUrl, setImageUrl] = useState<string>(SAMPLE_IMAGES[0]);
  const [inputUrl, setInputUrl] = useState<string>(SAMPLE_IMAGES[0]);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [state, setState] = useState<ProcessingState>({ status: 'idle' });

  // Initialize Skia on mount
  useEffect(() => {
    setState({ status: 'loading_skia', message: 'Initializing Skia Engine...' });
    skiaService.init()
      .then(() => {
        setState({ status: 'idle' });
        // Auto-process the default image once loaded
        handleExtract(SAMPLE_IMAGES[0]);
      })
      .catch((err) => {
        setState({ status: 'error', message: 'Failed to load Skia (CanvasKit). ' + err.message });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExtract = useCallback(async (url: string) => {
    if (!url) return;
    
    // Reset state
    setPalette(null);
    setImageUrl(url);
    setState({ status: 'processing' });

    try {
      // Small delay to allow UI to update to 'processing' state before heavy lifting
      await new Promise(r => setTimeout(r, 100));
      
      const startTime = performance.now();
      const result = await skiaService.processImage(url);
      const endTime = performance.now();
      
      setPalette(result);
      setState({ status: 'success', duration: endTime - startTime });
    } catch (error: any) {
      console.error(error);
      let msg = error.message;
      if (msg.includes("Failed to fetch")) {
        msg = "CORS Error: Unable to access image data. Try an image from Unsplash or Imgur, or use a CORS proxy.";
      }
      setState({ status: 'error', message: msg });
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExtract(inputUrl);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 p-6 md:p-12 font-sans selection:bg-rose-500/30">
      <div className="max-w-6xl mx-auto flex flex-col min-h-[calc(100vh-6rem)]">
        
        {/* Header */}
        <header className="mb-12 text-center md:text-left flex flex-col md:flex-row gap-6 items-center justify-between">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
               <div className="p-2 bg-gradient-to-tr from-indigo-500 to-rose-500 rounded-xl shadow-lg shadow-rose-500/20">
                  <SparklesIcon className="w-6 h-6 text-white" />
               </div>
               <h1 className="text-4xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
                Skia<span className="text-white">Color</span>
              </h1>
            </div>
            <p className="text-zinc-400 max-w-md mx-auto md:mx-0">
              High-performance color extraction using <span className="text-indigo-400 font-mono">canvaskit-wasm</span> and K-Means clustering.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800">
             <CommandLineIcon className="w-4 h-4" />
             <span>Engine: Google Skia (WASM)</span>
          </div>
        </header>

        {/* Main Interface */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 flex-grow">
          
          {/* Left Column: Input & Preview */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Input Form */}
            <div className="bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all shadow-xl">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="url"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="Paste image URL here..."
                  className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none w-full"
                />
                <button 
                  type="submit"
                  disabled={state.status === 'processing' || state.status === 'loading_skia'}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {state.status === 'processing' ? (
                     <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : 'Extract'}
                </button>
              </form>
            </div>

            {/* Quick Samples */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {SAMPLE_IMAGES.map((url, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInputUrl(url);
                    handleExtract(url);
                  }}
                  className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    imageUrl === url ? 'border-indigo-500 scale-105' : 'border-transparent hover:border-zinc-700'
                  }`}
                >
                  <img src={url} alt={`Sample ${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Main Preview Image */}
            <div className="relative w-full aspect-[4/3] bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl">
              {imageUrl ? (
                <>
                  {/* Background Blur for nicer fill */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 scale-110"
                    style={{ backgroundImage: `url(${imageUrl})` }}
                  />
                  <img 
                    src={imageUrl} 
                    alt="Target" 
                    className="absolute inset-0 w-full h-full object-contain p-4 transition-opacity duration-500"
                    crossOrigin="anonymous"
                  />
                  
                  {state.status === 'processing' && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                       <ArrowPathIcon className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
                       <span className="text-zinc-300 font-medium animate-pulse">Processing Pixels...</span>
                    </div>
                  )}

                  {state.status === 'loading_skia' && (
                     <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
                        <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-500 animate-progress origin-left w-full"></div>
                        </div>
                        <span className="mt-4 text-xs text-zinc-400 font-mono">LOADING WASM ENGINE</span>
                     </div>
                  )}
                </>
              ) : (
                 <div className="flex items-center justify-center h-full text-zinc-700">
                    <PhotoIcon className="w-16 h-16" />
                 </div>
              )}
            </div>

            {/* Error Message */}
            {state.status === 'error' && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 items-start text-red-200 text-sm">
                <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 text-red-400" />
                <p>{state.message}</p>
              </div>
            )}
            
            {/* Note about CORS */}
            <p className="text-xs text-zinc-600 px-2">
              Note: Images must support CORS. If extraction fails, try an image hosted on Unsplash or similar.
            </p>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-7">
            {palette ? (
              <PaletteDisplay palette={palette} />
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-zinc-700 border-2 border-dashed border-zinc-800 rounded-3xl p-12 text-center">
                 <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
                    <SparklesIcon className="w-10 h-10 opacity-20" />
                 </div>
                 <h3 className="text-xl font-medium text-zinc-500 mb-2">No Palette Generated</h3>
                 <p className="text-zinc-600 max-w-xs">Select an image to analyze its pixel data using the Skia engine.</p>
              </div>
            )}
          </div>

        </main>

        {/* Footer / Stats */}
        <footer className="mt-8 pt-6 border-t border-zinc-900/50 flex flex-col md:flex-row justify-between items-center text-zinc-600 text-xs font-mono">
           <div className="mb-2 md:mb-0">
             CanvasKit v0.39.1 &bull; K-Means Clustering (k=8)
           </div>
           
           {state.duration !== undefined && state.status === 'success' && (
             <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">
               <ClockIcon className="w-3.5 h-3.5 text-indigo-400" />
               <span>Operation time:</span>
               <span className={`${state.duration < 100 ? 'text-emerald-400' : state.duration < 500 ? 'text-amber-400' : 'text-rose-400'} font-bold`}>
                 {state.duration.toFixed(2)}ms
               </span>
             </div>
           )}
        </footer>
      </div>
    </div>
  );
}