import { Image, type ImageSourcePropType } from 'react-native';

import type { GlasswareIllustration } from '../data/bartending';

type GlasswareVisualProps = {
  kind: GlasswareIllustration;
  width?: number;
  height?: number;
};

const GLASSWARE_IMAGES: Record<GlasswareIllustration, ImageSourcePropType> = {
  coupe: require('../../assets/glassware/coupe-glass.png'),
  highball: require('../../assets/glassware/high-ball.png'),
  hurricane: require('../../assets/glassware/hurricane-glass.png'),
  martini: require('../../assets/glassware/martini-glass.png'),
  mule: require('../../assets/glassware/mule-becher.png'),
  rocks: require('../../assets/glassware/rocks-glass.png'),
  wine: require('../../assets/glassware/wine-glass.png'),
};

export function GlasswareVisual({
  kind,
  width = 184,
  height = 184,
}: GlasswareVisualProps) {
  return (
    <Image
      source={GLASSWARE_IMAGES[kind]}
      style={{
        width,
        height,
        borderRadius: 18,
      }}
      resizeMode="contain"
    />
  );
}
