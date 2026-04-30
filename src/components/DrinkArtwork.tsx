import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import type { DrinkArtworkSpec } from '../data/bartending';

type DrinkArtworkProps = {
  artwork: DrinkArtworkSpec;
  size?: number;
};

function IceCubes() {
  return (
    <>
      <Rect
        x="55"
        y="72"
        width="14"
        height="14"
        rx="3"
        fill="rgba(255,255,255,0.35)"
        transform="rotate(-12 55 72)"
      />
      <Rect
        x="76"
        y="88"
        width="14"
        height="14"
        rx="3"
        fill="rgba(255,255,255,0.3)"
        transform="rotate(14 76 88)"
      />
      <Rect
        x="86"
        y="62"
        width="12"
        height="12"
        rx="3"
        fill="rgba(255,255,255,0.28)"
        transform="rotate(-10 86 62)"
      />
    </>
  );
}

function Bubbles() {
  return (
    <>
      <Circle cx="65" cy="96" r="3" fill="rgba(255,255,255,0.4)" />
      <Circle cx="93" cy="82" r="2.5" fill="rgba(255,255,255,0.35)" />
      <Circle cx="76" cy="68" r="2" fill="rgba(255,255,255,0.32)" />
      <Circle cx="87" cy="106" r="2.5" fill="rgba(255,255,255,0.28)" />
    </>
  );
}

function Garnish({ garnish }: { garnish?: DrinkArtworkSpec['garnish'] }) {
  switch (garnish) {
    case 'orange':
      return (
        <>
          <Circle cx="112" cy="42" r="12" fill="#F08E2C" />
          <Circle cx="112" cy="42" r="8" fill="#F6C971" />
          <Path d="M104 38 L120 46" stroke="#E56C1F" strokeWidth="1.4" />
          <Path d="M112 30 L112 54" stroke="#E56C1F" strokeWidth="1.4" />
        </>
      );
    case 'lime':
      return (
        <>
          <Circle cx="112" cy="42" r="11" fill="#86C844" />
          <Circle cx="112" cy="42" r="7" fill="#DDF3A0" />
          <Path d="M104 38 L120 46" stroke="#74B53A" strokeWidth="1.4" />
        </>
      );
    case 'mint':
      return (
        <>
          <Ellipse cx="108" cy="42" rx="9" ry="15" fill="#5EAE57" transform="rotate(20 108 42)" />
          <Ellipse cx="118" cy="40" rx="8" ry="14" fill="#79C76F" transform="rotate(-12 118 40)" />
          <Path d="M108 54 L112 28" stroke="#3E7C3D" strokeWidth="1.8" />
        </>
      );
    case 'coffee':
      return (
        <>
          <Ellipse cx="98" cy="44" rx="5" ry="3.2" fill="#5A3528" />
          <Path d="M95 44 C97 40, 101 40, 101 44" stroke="#8F6247" strokeWidth="1" fill="none" />
          <Ellipse cx="108" cy="39" rx="5" ry="3.2" fill="#5A3528" />
          <Path d="M105 39 C107 35, 111 35, 111 39" stroke="#8F6247" strokeWidth="1" fill="none" />
          <Ellipse cx="118" cy="44" rx="5" ry="3.2" fill="#5A3528" />
          <Path d="M115 44 C117 40, 121 40, 121 44" stroke="#8F6247" strokeWidth="1" fill="none" />
        </>
      );
    case 'pineapple':
      return (
        <>
          <Path d="M110 24 L124 44 L102 44 Z" fill="#F5D66E" />
          <Path d="M113 18 L118 26" stroke="#4F8A3D" strokeWidth="3" strokeLinecap="round" />
          <Path d="M118 18 L121 27" stroke="#67A84E" strokeWidth="3" strokeLinecap="round" />
          <Circle cx="122" cy="48" r="6" fill="#B2292D" />
        </>
      );
    case 'cherry':
      return (
        <>
          <Circle cx="116" cy="42" r="7" fill="#B21F32" />
          <Path d="M116 35 C113 22, 119 18, 126 18" stroke="#688B3B" strokeWidth="2" fill="none" />
        </>
      );
    case 'grapefruit':
      return (
        <>
          <Circle cx="112" cy="42" r="12" fill="#F39D90" />
          <Circle cx="112" cy="42" r="8" fill="#FFD5C8" />
          <Path d="M104 38 L120 46" stroke="#E78671" strokeWidth="1.4" />
        </>
      );
    case 'lemon':
      return (
        <>
          <Ellipse cx="112" cy="42" rx="11" ry="8" fill="#F4D769" transform="rotate(-18 112 42)" />
          <Ellipse cx="112" cy="42" rx="7" ry="5" fill="#FFF0B7" transform="rotate(-18 112 42)" />
        </>
      );
    default:
      return null;
  }
}

function HighballGlass({ artwork }: { artwork: DrinkArtworkSpec }) {
  return (
    <>
      <Rect
        x="45"
        y="24"
        width="50"
        height="112"
        rx="15"
        fill="rgba(255,255,255,0.14)"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="3"
      />
      <Rect x="50" y="49" width="40" height="80" rx="10" fill="url(#liquidGradient)" />
      {artwork.ice ? <IceCubes /> : null}
      {artwork.bubbles ? <Bubbles /> : null}
      {artwork.straw ? (
        <Path
          d="M96 22 L110 84"
          stroke="#F9F3E1"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.9"
        />
      ) : null}
    </>
  );
}

function RocksGlass({ artwork }: { artwork: DrinkArtworkSpec }) {
  return (
    <>
      <Path
        d="M44 54 C46 42, 58 34, 80 34 C102 34, 114 42, 116 54 L108 128 C107 136, 100 140, 80 140 C60 140, 53 136, 52 128 Z"
        fill="rgba(255,255,255,0.14)"
        stroke="rgba(255,255,255,0.52)"
        strokeWidth="3"
      />
      <Path
        d="M52 82 C56 74, 65 70, 80 70 C95 70, 104 74, 108 82 L104 128 C103 132, 98 135, 80 135 C62 135, 57 132, 56 128 Z"
        fill="url(#liquidGradient)"
      />
      {artwork.ice ? <IceCubes /> : null}
      {artwork.straw ? (
        <Path
          d="M98 26 L108 74"
          stroke="#F7F0DC"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.92"
        />
      ) : null}
    </>
  );
}

function WineGlass({ artwork }: { artwork: DrinkArtworkSpec }) {
  return (
    <>
      <Path
        d="M52 26 C44 40, 44 66, 50 85 C56 102, 68 112, 80 112 C92 112, 104 102, 110 85 C116 66, 116 40, 108 26 Z"
        fill="rgba(255,255,255,0.14)"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="3"
      />
      <Path
        d="M58 40 C54 50, 54 68, 58 81 C62 92, 70 100, 80 100 C90 100, 98 92, 102 81 C106 68, 106 50, 102 40 Z"
        fill="url(#liquidGradient)"
      />
      <Rect x="77" y="112" width="6" height="20" rx="3" fill="rgba(255,255,255,0.48)" />
      <Rect x="61" y="132" width="38" height="7" rx="4" fill="rgba(255,255,255,0.42)" />
      {artwork.ice ? <IceCubes /> : null}
      {artwork.bubbles ? <Bubbles /> : null}
      {artwork.straw ? (
        <Path
          d="M97 18 L108 84"
          stroke="#F8F2DE"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.88"
        />
      ) : null}
    </>
  );
}

function MugGlass({ artwork }: { artwork: DrinkArtworkSpec }) {
  return (
    <>
      <Rect
        x="45"
        y="34"
        width="52"
        height="96"
        rx="12"
        fill="rgba(255,255,255,0.14)"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="3"
      />
      <Path
        d="M97 54 C108 54, 116 60, 116 72 C116 84, 108 90, 97 90"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="6"
        fill="none"
      />
      <Rect x="50" y="56" width="42" height="69" rx="10" fill="url(#liquidGradient)" />
      {artwork.ice ? <IceCubes /> : null}
      {artwork.bubbles ? <Bubbles /> : null}
    </>
  );
}

function CoupeGlass({ artwork }: { artwork: DrinkArtworkSpec }) {
  return (
    <>
      <Path
        d="M44 49 C52 29, 108 29, 116 49 C112 66, 102 80, 80 84 C58 80, 48 66, 44 49 Z"
        fill="rgba(255,255,255,0.14)"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="3"
      />
      <Path
        d="M52 52 C58 39, 102 39, 108 52 C103 64, 95 74, 80 77 C65 74, 57 64, 52 52 Z"
        fill="url(#liquidGradient)"
      />
      <Rect x="77" y="84" width="6" height="32" rx="3" fill="rgba(255,255,255,0.48)" />
      <Rect x="60" y="116" width="40" height="7" rx="4" fill="rgba(255,255,255,0.42)" />
      {artwork.foam ? <Ellipse cx="80" cy="52" rx="27" ry="7" fill="rgba(252, 246, 231, 0.78)" /> : null}
      {artwork.saltRim ? (
        <Path
          d="M50 45 C58 38, 102 38, 110 45"
          stroke="#F4F0E4"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="2 4"
        />
      ) : null}
    </>
  );
}

function MartiniGlass({ artwork }: { artwork: DrinkArtworkSpec }) {
  return (
    <>
      <Path
        d="M44 36 H116 L86 78 H74 Z"
        fill="rgba(255,255,255,0.14)"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="3"
      />
      <Path d="M52 42 H108 L84 70 H76 Z" fill="url(#liquidGradient)" />
      <Rect x="77" y="78" width="6" height="34" rx="3" fill="rgba(255,255,255,0.48)" />
      <Rect x="60" y="112" width="40" height="7" rx="4" fill="rgba(255,255,255,0.42)" />
      {artwork.foam ? <Ellipse cx="80" cy="46" rx="22" ry="4" fill="rgba(252, 246, 231, 0.65)" /> : null}
    </>
  );
}

function HurricaneGlass({ artwork }: { artwork: DrinkArtworkSpec }) {
  return (
    <>
      <Path
        d="M64 20 C48 30, 48 54, 54 74 C58 88, 58 102, 68 116 L68 128 H92 V116 C102 102, 102 88, 106 74 C112 54, 112 30, 96 20 Z"
        fill="rgba(255,255,255,0.14)"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="3"
      />
      <Path
        d="M67 42 C58 50, 58 68, 62 82 C66 94, 66 104, 74 116 H86 C94 104, 94 94, 98 82 C102 68, 102 50, 93 42 Z"
        fill="url(#liquidGradient)"
      />
      <Rect x="77" y="128" width="6" height="12" rx="3" fill="rgba(255,255,255,0.46)" />
      <Rect x="60" y="140" width="40" height="7" rx="4" fill="rgba(255,255,255,0.4)" />
      {artwork.straw ? (
        <Path
          d="M98 18 L110 90"
          stroke="#F8F0D8"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.9"
        />
      ) : null}
    </>
  );
}

function GlassByStyle({ artwork }: { artwork: DrinkArtworkSpec }) {
  switch (artwork.glassStyle) {
    case 'rocks':
      return <RocksGlass artwork={artwork} />;
    case 'coupe':
      return <CoupeGlass artwork={artwork} />;
    case 'martini':
      return <MartiniGlass artwork={artwork} />;
    case 'wine':
      return <WineGlass artwork={artwork} />;
    case 'mug':
      return <MugGlass artwork={artwork} />;
    case 'hurricane':
      return <HurricaneGlass artwork={artwork} />;
    default:
      return <HighballGlass artwork={artwork} />;
  }
}

export function DrinkArtwork({ artwork, size = 124 }: DrinkArtworkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <LinearGradient id="backgroundGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={artwork.background[0]} />
          <Stop offset="100%" stopColor={artwork.background[1]} />
        </LinearGradient>
        <LinearGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={artwork.liquid[0]} />
          <Stop offset="100%" stopColor={artwork.liquid[1]} />
        </LinearGradient>
      </Defs>

      <Rect x="4" y="4" width="152" height="152" rx="30" fill="url(#backgroundGradient)" />
      <Circle cx="130" cy="26" r="18" fill="rgba(255,255,255,0.08)" />
      <Circle cx="28" cy="132" r="22" fill="rgba(255,255,255,0.07)" />
      <GlassByStyle artwork={artwork} />
      <Garnish garnish={artwork.garnish} />
    </Svg>
  );
}
