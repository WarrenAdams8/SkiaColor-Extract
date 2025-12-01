import React, { useState } from 'react';
import { Palette, PaletteColor } from '../types';

interface Props {
  palette: Palette;
}

const ColorCard: React.FC<{ 
  color: PaletteColor | null; 
  label: string; 
  size?: 'large' | 'small' 
}> = ({ color, label, size = 'small' }) => {
  const [copied, setCopied] = useState(false);

  if (!color) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(color.hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Determine text color for contrast
  const textColor = color.hsl.l > 0.5 ? 'text-zinc-900' : 'text-white';

  return (
    <div 
      className={`relative group cursor-pointer overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
        size === 'large' ? 'col-span-2 row-span-2 aspect-square md:aspect-auto' : 'aspect-square'
      }`}
      style={{ backgroundColor: color.hex }}
      onClick={handleCopy}
    >
      <div className={`absolute inset-0 flex flex-col justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/10`}>
         <div className="flex justify-between items-start">
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white/20 backdrop-blur-md ${textColor}`}>
              {label}
            </span>
         </div>
         <div className="flex flex-col items-end">
             <span className={`text-lg font-mono font-bold ${textColor}`}>
               {color.hex}
             </span>
             <span className={`text-xs ${textColor} opacity-80`}>
                {copied ? 'Copied!' : 'Click to copy'}
             </span>
         </div>
      </div>
      
      {/* Persistent Label for mobile/when not hovering */}
      <div className={`absolute bottom-0 left-0 right-0 p-3 flex justify-between items-center md:hidden`}>
         <span className={`text-xs font-bold ${textColor}`}>{label}</span>
         <span className={`text-xs font-mono ${textColor}`}>{color.hex}</span>
      </div>
    </div>
  );
};

export const PaletteDisplay: React.FC<Props> = ({ palette }) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Extracted Palette</h2>
        <div className="text-sm text-zinc-500">Based on {palette.allColors.length} quantized clusters</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-fr">
        {/* Dominant - Large Card */}
        <ColorCard color={palette.dominant} label="Dominant" size="large" />
        
        {/* Vibrant */}
        <ColorCard color={palette.vibrant} label="Vibrant" />
        
        {/* Others */}
        <ColorCard color={palette.darkVibrant} label="Dark Vibrant" />
        <ColorCard color={palette.lightVibrant} label="Light Vibrant" />
        <ColorCard color={palette.muted} label="Muted" />
      </div>

      {/* Full Breakdown Strip */}
      <div className="mt-8">
        <h3 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-widest">Full Spectrum</h3>
        <div className="flex h-16 w-full rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
          {palette.allColors.map((c, i) => (
            <div
              key={i}
              className="h-full flex-grow group relative hover:flex-grow-[2] transition-all duration-300 ease-out cursor-pointer"
              style={{ backgroundColor: c.hex }}
              title={`${c.hex} - ${(c.population).toLocaleString()} pixels`}
              onClick={() => navigator.clipboard.writeText(c.hex)}
            >
               <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white/90 opacity-0 group-hover:opacity-100 font-mono bg-black/50 px-1 rounded">
                {c.hex}
               </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
