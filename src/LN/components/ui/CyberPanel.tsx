
import React, { ReactNode, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CyberPanelProps {
  children: ReactNode;
  className?: string;
  title?: string;
  variant?: 'default' | 'danger' | 'hologram' | 'gold';
  noPadding?: boolean;
  allowExpand?: boolean; 
  collapsible?: boolean; 
  defaultCollapsed?: boolean;
}

const CyberPanel: React.FC<CyberPanelProps> = ({ 
  children, 
  className = '', 
  title, 
  variant = 'default',
  noPadding = false,
  collapsible = false,
  defaultCollapsed = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Slaanesh Aesthetic: Elegant, Dark, Glowing, Curved
  // No more "Tech/Chip" hard edges.
  
  let containerStyle = '';
  let headerStyle = '';
  let titleColor = '';
  
  // Base elegant glassmorphism
  const baseClasses = "relative backdrop-blur-md shadow-lg transition-all duration-300 overflow-hidden";
  
  if (variant === 'danger') {
    // Red/Violent
    containerStyle = 'bg-red-950/20 border border-red-900/60 shadow-[0_0_15px_rgba(220,38,38,0.15)] rounded-xl';
    headerStyle = 'border-b border-red-900/30 bg-gradient-to-r from-red-950/40 to-transparent';
    titleColor = 'text-red-400';
  } else if (variant === 'gold') {
    // Luxurious/Royal
    containerStyle = 'bg-[#1a1005]/80 border border-amber-600/40 shadow-[0_0_15px_rgba(217,119,6,0.15)] rounded-xl';
    headerStyle = 'border-b border-amber-600/30 bg-gradient-to-r from-amber-950/40 to-transparent';
    titleColor = 'text-amber-400';
  } else {
    // Default Slaanesh Purple (The "Normal" style)
    // Deep purple bg, elegant thin pink/purple border
    containerStyle = 'bg-[#0a050a]/80 border border-fuchsia-900/50 shadow-[0_0_20px_rgba(192,38,211,0.1)] rounded-2xl';
    headerStyle = 'border-b border-fuchsia-900/30 bg-gradient-to-r from-fuchsia-950/30 via-purple-900/10 to-transparent';
    titleColor = 'text-fuchsia-400';
  }

  const finalClasses = `${baseClasses} ${containerStyle} ${isCollapsed ? 'h-auto' : className}`;

  return (
    <div className={finalClasses}>
        {/* Decorative inner glow (top highlight) - Organic feel */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50"></div>

        {title && (
            <div 
              className={`px-4 py-3 flex items-center justify-between shrink-0 select-none ${headerStyle} ${collapsible ? 'cursor-pointer hover:bg-white/5' : ''}`}
              onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
            >
                {/* Elegant serif-like or sharp sans title */}
                <h3 className={`uppercase font-bold tracking-[0.15em] text-xs ${titleColor} flex items-center gap-2 drop-shadow-sm`}>
                    {title}
                </h3>
                
                {collapsible && (
                     <div className={`transition-transform duration-300 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}>
                         <ChevronDown className={`w-3 h-3 ${titleColor} opacity-70`} />
                     </div>
                )}
            </div>
        )}
        
        {/* Body Content */}
        {!isCollapsed && (
            <div className={`flex-1 overflow-auto scrollbar-hidden ${noPadding ? '' : 'p-4'} animate-in fade-in duration-300`}>
                {children}
            </div>
        )}
    </div>
  );
};

export default CyberPanel;
