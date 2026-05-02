import Svg, {
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import type { GlasswareIllustration } from '../data/bartending';

type GlasswareVisualProps = {
  kind: GlasswareIllustration;
  width?: number;
  height?: number;
};

const PALETTES: Record<GlasswareIllustration, { background: [string, string]; accent: [string, string] }> = {
  highball: {
    background: ['#101A1E', '#18323A'],
    accent: ['#7CB7C4', '#4A7280'],
  },
  rocks: {
    background: ['#11161A', '#2A221D'],
    accent: ['#CCC2B0', '#8C7C60'],
  },
  wine: {
    background: ['#11191D', '#203027'],
    accent: ['#DCE8C1', '#8EA16E'],
  },
  coupe: {
    background: ['#13171B', '#30231D'],
    accent: ['#E7D8A3', '#A68E4B'],
  },
  martini: {
    background: ['#10181D', '#203038'],
    accent: ['#CDE4D8', '#6E9A88'],
  },
  mule: {
    background: ['#151312', '#322018'],
    accent: ['#BE7A4F', '#7C4A2D'],
  },
  hurricane: {
    background: ['#12171A', '#2A251B'],
    accent: ['#E3C983', '#A88840'],
  },
};

export function GlasswareVisual({
  kind,
  width = 184,
  height = 146,
}: GlasswareVisualProps) {
  const palette = PALETTES[kind];
  const panelGradientId = `${kind}-panel-gradient`;
  const glassFillId = `${kind}-glass-fill`;
  const accentId = `${kind}-accent-fill`;

  return (
    <Svg width={width} height={height} viewBox="0 0 184 146">
      <Defs>
        <SvgLinearGradient id={panelGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={palette.background[0]} />
          <Stop offset="100%" stopColor={palette.background[1]} />
        </SvgLinearGradient>
        <SvgLinearGradient id={glassFillId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.38)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
        </SvgLinearGradient>
        <SvgLinearGradient id={accentId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={palette.accent[0]} />
          <Stop offset="100%" stopColor={palette.accent[1]} />
        </SvgLinearGradient>
      </Defs>

      <Rect x="1.5" y="1.5" width="181" height="143" rx="24" fill={`url(#${panelGradientId})`} />
      <Rect
        x="1.5"
        y="1.5"
        width="181"
        height="143"
        rx="24"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1.5"
      />
      <Ellipse cx="92" cy="123" rx="44" ry="8" fill="rgba(0,0,0,0.3)" />

      <GlassShape kind={kind} glassFillId={glassFillId} accentId={accentId} />
    </Svg>
  );
}

function GlassShape({
  kind,
  glassFillId,
  accentId,
}: {
  kind: GlasswareIllustration;
  glassFillId: string;
  accentId: string;
}) {
  switch (kind) {
    case 'highball':
      return (
        <>
          <Path
            d="M62 18 H122 C127 18 131 22 131 27 V108 C131 119 124 126 113 126 H71 C60 126 53 119 53 108 V27 C53 22 57 18 62 18 Z"
            fill={`url(#${glassFillId})`}
            stroke="rgba(255,255,255,0.86)"
            strokeWidth="3"
          />
          <Rect x="62" y="31" width="60" height="80" rx="16" fill={`url(#${accentId})`} opacity="0.5" />
          <Rect x="69" y="28" width="12" height="86" rx="6" fill="rgba(255,255,255,0.28)" />
          <Ellipse cx="92" cy="20" rx="39" ry="7" fill="rgba(255,255,255,0.5)" />
        </>
      );
    case 'rocks':
      return (
        <>
          <Path
            d="M52 42 C56 28 72 20 92 20 C112 20 128 28 132 42 L124 113 C122 121 115 126 92 126 C69 126 62 121 60 113 Z"
            fill={`url(#${glassFillId})`}
            stroke="rgba(255,255,255,0.84)"
            strokeWidth="3"
          />
          <Path
            d="M60 60 C64 52 75 47 92 47 C109 47 120 52 124 60 L120 112 C119 117 113 120 92 120 C71 120 65 117 64 112 Z"
            fill={`url(#${accentId})`}
            opacity="0.55"
          />
          <Path d="M68 33 L78 116" stroke="rgba(255,255,255,0.22)" strokeWidth="5" strokeLinecap="round" />
          <Path d="M92 30 L100 118" stroke="rgba(255,255,255,0.14)" strokeWidth="4" strokeLinecap="round" />
        </>
      );
    case 'wine':
      return (
        <>
          <Path
            d="M61 20 C48 33 47 58 54 80 C61 100 74 110 92 110 C110 110 123 100 130 80 C137 58 136 33 123 20 Z"
            fill={`url(#${glassFillId})`}
            stroke="rgba(255,255,255,0.86)"
            strokeWidth="3"
          />
          <Path
            d="M66 37 C59 47 60 64 65 78 C70 90 79 98 92 98 C105 98 114 90 119 78 C124 64 125 47 118 37 Z"
            fill={`url(#${accentId})`}
            opacity="0.52"
          />
          <Rect x="88.5" y="110" width="7" height="18" rx="3.5" fill="rgba(255,255,255,0.7)" />
          <Rect x="71" y="128" width="42" height="6" rx="3" fill="rgba(255,255,255,0.55)" />
          <Path d="M73 28 C70 56 74 78 81 95" stroke="rgba(255,255,255,0.28)" strokeWidth="5" strokeLinecap="round" />
        </>
      );
    case 'coupe':
      return (
        <>
          <Path
            d="M50 46 C58 28 126 28 134 46 C130 64 116 77 92 82 C68 77 54 64 50 46 Z"
            fill={`url(#${glassFillId})`}
            stroke="rgba(255,255,255,0.86)"
            strokeWidth="3"
          />
          <Path
            d="M58 49 C64 39 120 39 126 49 C122 60 111 69 92 73 C73 69 62 60 58 49 Z"
            fill={`url(#${accentId})`}
            opacity="0.48"
          />
          <Rect x="88.5" y="82" width="7" height="32" rx="3.5" fill="rgba(255,255,255,0.7)" />
          <Rect x="70" y="114" width="44" height="6" rx="3" fill="rgba(255,255,255,0.55)" />
          <Path d="M69 44 L75 69" stroke="rgba(255,255,255,0.28)" strokeWidth="5" strokeLinecap="round" />
        </>
      );
    case 'martini':
      return (
        <>
          <Path
            d="M48 24 H136 C132 32 125 41 116 50 L96 74 C94 77 90 77 88 74 L68 50 C59 41 52 32 48 24 Z"
            fill={`url(#${glassFillId})`}
            stroke="rgba(255,255,255,0.86)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <Path
            d="M60 32 H124 C120 38 114 44 107 51 L95 65 C93 67 91 67 89 65 L77 51 C70 44 64 38 60 32 Z"
            fill={`url(#${accentId})`}
            opacity="0.46"
          />
          <Rect x="88.5" y="75" width="7" height="38" rx="3.5" fill="rgba(255,255,255,0.72)" />
          <Rect x="68" y="113" width="48" height="6" rx="3" fill="rgba(255,255,255,0.56)" />
          <Path d="M73 30 L89 64" stroke="rgba(255,255,255,0.26)" strokeWidth="4.5" strokeLinecap="round" />
        </>
      );
    case 'mule':
      return (
        <>
          <Rect
            x="54"
            y="26"
            width="74"
            height="96"
            rx="16"
            fill={`url(#${accentId})`}
            stroke="#E7C1A4"
            strokeWidth="3"
          />
          <Rect
            x="60"
            y="34"
            width="62"
            height="80"
            rx="13"
            fill="rgba(255,243,228,0.2)"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="2"
          />
          <Path
            d="M128 51 C145 51 152 59 152 73 C152 87 145 95 128 95"
            stroke="#E7C1A4"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          <Path d="M71 38 L78 111" stroke="rgba(255,255,255,0.24)" strokeWidth="5" strokeLinecap="round" />
          <Path d="M95 38 L100 111" stroke="rgba(255,255,255,0.18)" strokeWidth="4" strokeLinecap="round" />
        </>
      );
    case 'hurricane':
      return (
        <>
          <Path
            d="M74 18 C56 24 51 43 56 59 C60 71 69 80 71 94 C73 107 70 115 66 121 H118 C114 115 111 107 113 94 C115 80 124 71 128 59 C133 43 128 24 110 18 C101 15 83 15 74 18 Z"
            fill={`url(#${glassFillId})`}
            stroke="rgba(255,255,255,0.86)"
            strokeWidth="3"
          />
          <Path
            d="M78 32 C65 37 62 48 66 59 C70 69 77 75 79 87 C81 97 79 105 76 112 H108 C105 105 103 97 105 87 C107 75 114 69 118 59 C122 48 119 37 106 32 C99 29 85 29 78 32 Z"
            fill={`url(#${accentId})`}
            opacity="0.52"
          />
          <Rect x="88.5" y="121" width="7" height="10" rx="3.5" fill="rgba(255,255,255,0.68)" />
          <Rect x="68" y="131" width="48" height="6" rx="3" fill="rgba(255,255,255,0.55)" />
          <Path d="M84 27 C75 55 82 88 89 105" stroke="rgba(255,255,255,0.22)" strokeWidth="5" strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
}
