import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface ThemeArtProps {
  className?: string;
}

/**
 * Resolves active aesthetic style ('minimal' | 'paper' | 'notion') and dark mode flag
 * regardless of whether stored as themeStyle, themeId, or backgroundStyle.
 */
export function resolveThemeArtStyle(settings: {
  theme?: string;
  appearance?: {
    themeId?: string;
    themeStyle?: string;
    backgroundStyle?: string;
    themeMode?: string;
  };
}): { style: 'minimal' | 'paper' | 'notion'; isDark: boolean } {
  const isDark =
    settings.theme === 'dark' ||
    settings.appearance?.themeMode === 'dark' ||
    (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark');

  const themeId = settings.appearance?.themeId || '';
  const themeStyle = settings.appearance?.themeStyle || settings.appearance?.backgroundStyle || '';

  let style: 'minimal' | 'paper' | 'notion' = 'minimal';
  if (themeStyle === 'paper' || themeId.includes('paper')) {
    style = 'paper';
  } else if (themeStyle === 'notion' || themeId.includes('notion')) {
    style = 'notion';
  }

  return { style, isDark };
}

/**
 * Top-right Dashboard decorative artwork matching the 3 aesthetic themes:
 * - Minimal: Fluid gradient blue waves
 * - Paper Journal: Elegant botanical branch draping down
 * - Notion: Abstract geometric isometric cubes
 */
export const DashboardHeaderArt: React.FC<ThemeArtProps> = ({ className = '' }) => {
  const { settings } = useWorkspace();
  const { style, isDark } = resolveThemeArtStyle(settings);

  return (
    <div
      className={`absolute top-0 right-0 pointer-events-none select-none overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    >
      {style === 'minimal' && !isDark && (
        /* Minimal Light: Multi-layered soft fluid blue waves */
        <svg
          viewBox="0 0 600 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[340px] sm:w-[480px] lg:w-[580px] h-auto object-right-top transition-opacity duration-300"
        >
          <defs>
            <linearGradient id="min-lt-wave-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#7DD3FC" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="min-lt-wave-2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.65" />
              <stop offset="60%" stopColor="#BAE6FD" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="min-lt-wave-3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EFF6FF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#DBEAFE" stopOpacity="0.25" />
            </linearGradient>
          </defs>
          <path
            d="M200 0 C 320 60, 420 20, 600 70 L 600 0 Z"
            fill="url(#min-lt-wave-1)"
          />
          <path
            d="M120 0 C 260 90, 380 40, 600 110 L 600 0 Z"
            fill="url(#min-lt-wave-2)"
          />
          <path
            d="M40 0 C 180 110, 320 70, 600 145 L 600 0 Z"
            fill="url(#min-lt-wave-3)"
          />
        </svg>
      )}

      {style === 'minimal' && isDark && (
        /* Minimal Dark: Deep glowing electric-blue fluid ribbons */
        <svg
          viewBox="0 0 600 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[340px] sm:w-[480px] lg:w-[580px] h-auto object-right-top transition-opacity duration-300"
        >
          <defs>
            <linearGradient id="min-dk-wave-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#2563EB" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="min-dk-wave-2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0F172A" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#1E40AF" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="min-dk-wave-glow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <path
            d="M180 0 C 300 70, 420 30, 600 80 L 600 0 Z"
            fill="url(#min-dk-wave-1)"
          />
          <path
            d="M100 0 C 240 100, 370 50, 600 120 L 600 0 Z"
            fill="url(#min-dk-wave-2)"
          />
          <path
            d="M60 0 C 200 115, 340 75, 600 150 L 600 0 Z"
            fill="none"
            stroke="url(#min-dk-wave-glow)"
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />
        </svg>
      )}

      {style === 'paper' && !isDark && (
        /* Paper Journal Light: Elegant botanical leaves branch draping from top right */
        <svg
          viewBox="0 0 460 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[260px] sm:w-[360px] lg:w-[440px] h-auto object-right-top transition-opacity duration-300"
        >
          <defs>
            <linearGradient id="leaf-grad-sage" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#96A680" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#6A7A54" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="leaf-grad-olive" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A8B793" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#7F8F68" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          {/* Main Arched Stem */}
          <path
            d="M460 10 C 380 30, 290 85, 210 170 C 180 205, 150 230, 110 250"
            stroke="#8A7A66"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.6"
          />
          {/* Secondary Branch */}
          <path
            d="M360 45 C 310 90, 270 120, 220 135"
            stroke="#8A7A66"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.5"
          />
          {/* Branch Tip */}
          <path
            d="M260 120 C 230 160, 200 180, 160 190"
            stroke="#8A7A66"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.4"
          />

          {/* Leaves */}
          <path
            d="M440 20 C 420 5, 385 10, 380 25 C 385 40, 420 35, 440 20 Z"
            fill="url(#leaf-grad-sage)"
          />
          <path
            d="M410 32 C 385 20, 350 30, 345 50 C 355 65, 390 55, 410 32 Z"
            fill="url(#leaf-grad-olive)"
          />
          <path
            d="M370 45 C 340 35, 310 50, 305 70 C 320 85, 350 75, 370 45 Z"
            fill="url(#leaf-grad-sage)"
          />
          <path
            d="M340 70 C 310 60, 280 80, 278 102 C 295 115, 325 100, 340 70 Z"
            fill="url(#leaf-grad-olive)"
          />
          <path
            d="M315 65 C 295 45, 260 55, 252 75 C 265 90, 295 85, 315 65 Z"
            fill="url(#leaf-grad-sage)"
          />
          <path
            d="M285 105 C 255 95, 225 115, 222 138 C 240 150, 270 135, 285 105 Z"
            fill="url(#leaf-grad-olive)"
          />
          <path
            d="M260 95 C 235 80, 205 95, 200 115 C 212 130, 245 120, 260 95 Z"
            fill="url(#leaf-grad-sage)"
          />
          <path
            d="M230 145 C 200 135, 170 158, 168 180 C 185 192, 215 175, 230 145 Z"
            fill="url(#leaf-grad-olive)"
          />
          <path
            d="M210 130 C 185 115, 155 130, 150 150 C 162 165, 195 155, 210 130 Z"
            fill="url(#leaf-grad-sage)"
          />
          <path
            d="M170 185 C 145 175, 120 195, 115 215 C 130 228, 160 210, 170 185 Z"
            fill="url(#leaf-grad-olive)"
          />
          <path
            d="M125 235 C 105 225, 80 240, 75 255 C 90 262, 115 250, 125 235 Z"
            fill="url(#leaf-grad-sage)"
          />
        </svg>
      )}

      {style === 'paper' && isDark && (
        /* Paper Journal Dark: Botanical branch in warm sepia and bronze */
        <svg
          viewBox="0 0 460 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[260px] sm:w-[360px] lg:w-[440px] h-auto object-right-top transition-opacity duration-300"
        >
          <defs>
            <linearGradient id="leaf-grad-bronze" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A87B43" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#755127" stopOpacity="0.65" />
            </linearGradient>
            <linearGradient id="leaf-grad-amber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C49255" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#8A6030" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <path
            d="M460 10 C 380 30, 290 85, 210 170 C 180 205, 150 230, 110 250"
            stroke="#594130"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M360 45 C 310 90, 270 120, 220 135"
            stroke="#594130"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.5"
          />

          <path
            d="M440 20 C 420 5, 385 10, 380 25 C 385 40, 420 35, 440 20 Z"
            fill="url(#leaf-grad-bronze)"
          />
          <path
            d="M410 32 C 385 20, 350 30, 345 50 C 355 65, 390 55, 410 32 Z"
            fill="url(#leaf-grad-amber)"
          />
          <path
            d="M370 45 C 340 35, 310 50, 305 70 C 320 85, 350 75, 370 45 Z"
            fill="url(#leaf-grad-bronze)"
          />
          <path
            d="M340 70 C 310 60, 280 80, 278 102 C 295 115, 325 100, 340 70 Z"
            fill="url(#leaf-grad-amber)"
          />
          <path
            d="M315 65 C 295 45, 260 55, 252 75 C 265 90, 295 85, 315 65 Z"
            fill="url(#leaf-grad-bronze)"
          />
          <path
            d="M285 105 C 255 95, 225 115, 222 138 C 240 150, 270 135, 285 105 Z"
            fill="url(#leaf-grad-amber)"
          />
          <path
            d="M260 95 C 235 80, 205 95, 200 115 C 212 130, 245 120, 260 95 Z"
            fill="url(#leaf-grad-bronze)"
          />
          <path
            d="M230 145 C 200 135, 170 158, 168 180 C 185 192, 215 175, 230 145 Z"
            fill="url(#leaf-grad-amber)"
          />
          <path
            d="M170 185 C 145 175, 120 195, 115 215 C 130 228, 160 210, 170 185 Z"
            fill="url(#leaf-grad-bronze)"
          />
        </svg>
      )}

      {style === 'notion' && !isDark && (
        /* Notion Clean Light: Geometric 3D isometric cubes */
        <svg
          viewBox="0 0 320 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[200px] sm:w-[280px] h-auto object-right-top transition-opacity duration-300 opacity-60"
        >
          {/* Cube 1 (Back left) */}
          <g transform="translate(140, 20)">
            <polygon points="40,0 70,15 40,30 10,15" fill="#E8E8E6" stroke="#D3D3D0" strokeWidth="1" />
            <polygon points="10,15 40,30 40,65 10,50" fill="#DCDCD8" stroke="#D3D3D0" strokeWidth="1" />
            <polygon points="40,30 70,15 70,50 40,65" fill="#CFCFCB" stroke="#D3D3D0" strokeWidth="1" />
          </g>
          {/* Cube 2 (Front right) */}
          <g transform="translate(190, 50)">
            <polygon points="40,0 70,15 40,30 10,15" fill="#F0F0EE" stroke="#D3D3D0" strokeWidth="1" />
            <polygon points="10,15 40,30 40,65 10,50" fill="#E2E2DE" stroke="#D3D3D0" strokeWidth="1" />
            <polygon points="40,30 70,15 70,50 40,65" fill="#D5D5D1" stroke="#D3D3D0" strokeWidth="1" />
          </g>
          {/* Cube 3 (Upper right) */}
          <g transform="translate(240, 15)">
            <polygon points="30,0 50,10 30,20 10,10" fill="#ECECE8" stroke="#D3D3D0" strokeWidth="1" />
            <polygon points="10,10 30,20 30,45 10,35" fill="#DFDFDB" stroke="#D3D3D0" strokeWidth="1" />
            <polygon points="30,20 50,10 50,35 30,45" fill="#D2D2CE" stroke="#D3D3D0" strokeWidth="1" />
          </g>
        </svg>
      )}

      {style === 'notion' && isDark && (
        /* Notion Clean Dark: Geometric 3D isometric cubes in dark charcoal */
        <svg
          viewBox="0 0 320 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[200px] sm:w-[280px] h-auto object-right-top transition-opacity duration-300 opacity-60"
        >
          {/* Cube 1 (Back left) */}
          <g transform="translate(140, 20)">
            <polygon points="40,0 70,15 40,30 10,15" fill="#2E2E2E" stroke="#3D3D3D" strokeWidth="1" />
            <polygon points="10,15 40,30 40,65 10,50" fill="#222222" stroke="#3D3D3D" strokeWidth="1" />
            <polygon points="40,30 70,15 70,50 40,65" fill="#1A1A1A" stroke="#3D3D3D" strokeWidth="1" />
          </g>
          {/* Cube 2 (Front right) */}
          <g transform="translate(190, 50)">
            <polygon points="40,0 70,15 40,30 10,15" fill="#383838" stroke="#484848" strokeWidth="1" />
            <polygon points="10,15 40,30 40,65 10,50" fill="#2A2A2A" stroke="#484848" strokeWidth="1" />
            <polygon points="40,30 70,15 70,50 40,65" fill="#1F1F1F" stroke="#484848" strokeWidth="1" />
          </g>
          {/* Cube 3 (Upper right) */}
          <g transform="translate(240, 15)">
            <polygon points="30,0 50,10 30,20 10,10" fill="#333333" stroke="#444444" strokeWidth="1" />
            <polygon points="10,10 30,20 30,45 10,35" fill="#262626" stroke="#444444" strokeWidth="1" />
            <polygon points="30,20 50,10 50,35 30,45" fill="#1C1C1C" stroke="#444444" strokeWidth="1" />
          </g>
        </svg>
      )}
    </div>
  );
};

/**
 * Bottom-left corner decoration:
 * Delicate botanical sprig for Paper Journal theme
 */
export const DashboardCornerArt: React.FC<ThemeArtProps> = ({ className = '' }) => {
  const { settings } = useWorkspace();
  const { style, isDark } = resolveThemeArtStyle(settings);
  if (style !== 'paper') return null;

  return (
    <div
      className={`pointer-events-none select-none z-0 ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 160 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-24 sm:w-32 h-auto opacity-70 transition-opacity duration-300"
      >
        <path
          d="M0 140 C 20 120, 50 100, 80 90 C 110 80, 140 75, 160 70"
          stroke={isDark ? '#594130' : '#8A7A66'}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path
          d="M40 115 C 30 100, 45 85, 60 90 C 70 95, 65 110, 40 115 Z"
          fill={isDark ? '#A87B43' : '#8FA078'}
          opacity="0.7"
        />
        <path
          d="M80 95 C 75 75, 95 65, 110 75 C 115 85, 105 100, 80 95 Z"
          fill={isDark ? '#8A6030' : '#72835C'}
          opacity="0.7"
        />
        <path
          d="M120 80 C 120 60, 140 55, 150 65 C 155 75, 145 85, 120 80 Z"
          fill={isDark ? '#C49255' : '#A3B38D'}
          opacity="0.65"
        />
      </svg>
    </div>
  );
};

/**
 * 3D isometric cubes illustration in the top-right of the Pages card
 * Dynamically styled to match the active theme:
 * - Minimal: Blue glass cubes
 * - Paper: Khaki/olive (light) or bronze/sepia (dark) cubes
 * - Notion: Monochromatic light gray (light) or charcoal (dark) cubes
 */
export const PagesCardArt: React.FC<ThemeArtProps> = ({ className = '' }) => {
  const { settings } = useWorkspace();
  const { style, isDark } = resolveThemeArtStyle(settings);

  // Palette selection per theme
  let cTop = '#BFDBFE';
  let cLeft = '#93C5FD';
  let cRight = '#60A5FA';
  let cStroke = '#3B82F6';
  let opacity = '0.85';

  if (style === 'minimal') {
    if (isDark) {
      cTop = '#1E40AF';
      cLeft = '#1D4ED8';
      cRight = '#1E3A8A';
      cStroke = '#60A5FA';
      opacity = '0.75';
    } else {
      cTop = '#DBEAFE';
      cLeft = '#BFDBFE';
      cRight = '#93C5FD';
      cStroke = '#60A5FA';
      opacity = '0.9';
    }
  } else if (style === 'paper') {
    if (isDark) {
      cTop = '#8C5D30';
      cLeft = '#704720';
      cRight = '#543415';
      cStroke = '#D97706';
      opacity = '0.8';
    } else {
      cTop = '#C4CFA8';
      cLeft = '#A8B78A';
      cRight = '#8F9E70';
      cStroke = '#768559';
      opacity = '0.85';
    }
  } else if (style === 'notion') {
    if (isDark) {
      cTop = '#3A3A3A';
      cLeft = '#2A2A2A';
      cRight = '#1F1F1F';
      cStroke = '#525252';
      opacity = '0.8';
    } else {
      cTop = '#EAEAE7';
      cLeft = '#DADAD6';
      cRight = '#CBCBC6';
      cStroke = '#B0B0AA';
      opacity = '0.85';
    }
  }

  return (
    <div
      className={`pointer-events-none select-none z-0 ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 90 70"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-14 sm:w-16 h-auto transition-opacity duration-300"
        style={{ opacity }}
      >
        {/* Back Cube */}
        <g transform="translate(30, 2)">
          <polygon points="20,0 36,8 20,16 4,8" fill={cTop} stroke={cStroke} strokeWidth="0.8" opacity="0.9" />
          <polygon points="4,8 20,16 20,34 4,26" fill={cLeft} stroke={cStroke} strokeWidth="0.8" opacity="0.9" />
          <polygon points="20,16 36,8 36,26 20,34" fill={cRight} stroke={cStroke} strokeWidth="0.8" opacity="0.9" />
        </g>
        {/* Front Left Cube */}
        <g transform="translate(6, 18)">
          <polygon points="22,0 40,9 22,18 4,9" fill={cTop} stroke={cStroke} strokeWidth="0.8" />
          <polygon points="4,9 22,18 22,38 4,29" fill={cLeft} stroke={cStroke} strokeWidth="0.8" />
          <polygon points="22,18 40,9 40,29 22,38" fill={cRight} stroke={cStroke} strokeWidth="0.8" />
        </g>
        {/* Front Right Cube */}
        <g transform="translate(42, 24)">
          <polygon points="18,0 32,7 18,14 4,7" fill={cTop} stroke={cStroke} strokeWidth="0.8" opacity="0.95" />
          <polygon points="4,7 18,14 18,30 4,23" fill={cLeft} stroke={cStroke} strokeWidth="0.8" opacity="0.95" />
          <polygon points="18,14 32,7 32,23 18,30" fill={cRight} stroke={cStroke} strokeWidth="0.8" opacity="0.95" />
        </g>
      </svg>
    </div>
  );
};
