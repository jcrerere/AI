import React, { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  src: string;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}

const ImageLightbox: React.FC<Props> = ({ src, title, subtitle, onClose }) => {
  const [showCloseHint, setShowCloseHint] = useState(false);

  return (
    <div className="fixed inset-0 z-[160] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8" onClick={onClose}>
      <div className="relative w-full max-w-3xl" onClick={event => event.stopPropagation()}>
        <div className="relative overflow-hidden rounded-[24px] border border-cyan-500/30 bg-black shadow-[0_0_50px_rgba(6,182,212,0.18)]">
          <img src={src} alt={title || 'image'} className="w-full max-h-[82vh] object-contain bg-black" />

          <div
            className="absolute top-0 right-0 h-20 w-20 flex items-start justify-end p-3"
            onMouseEnter={() => setShowCloseHint(true)}
            onMouseLeave={() => setShowCloseHint(false)}
            onTouchStart={event => {
              event.stopPropagation();
              setShowCloseHint(true);
            }}
            onTouchEnd={event => {
              event.stopPropagation();
              onClose();
            }}
          >
            <div
              className={`rounded-full border border-white/15 bg-black/65 p-2 text-white transition-all ${
                showCloseHint ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
              }`}
            >
              <X className="w-5 h-5" />
            </div>
          </div>

          {(title || subtitle) && (
            <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/60 px-4 py-3 backdrop-blur-sm">
              {title && <div className="text-base font-bold text-white">{title}</div>}
              {subtitle && <div className="mt-1 text-xs text-slate-300">{subtitle}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageLightbox;
