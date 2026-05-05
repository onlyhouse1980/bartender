import { Image, Platform, StyleSheet, type ImageResizeMode } from 'react-native';

import type { Drink } from '../data/bartending';
import { DrinkArtwork } from './DrinkArtwork';

type DrinkVisualProps = {
  drink: Drink;
  size?: number;
  resizeMode?: ImageResizeMode;
};

const LOCAL_DRINK_IMAGES: Record<NonNullable<Drink['imageAsset']>, string> = {
  hugo: '/hugo.jpg',
};

function toObjectFit(resizeMode: ImageResizeMode): React.CSSProperties['objectFit'] {
  switch (resizeMode) {
    case 'contain':
      return 'contain';
    case 'stretch':
      return 'fill';
    case 'center':
      return 'scale-down';
    case 'repeat':
      return 'contain';
    case 'cover':
    default:
      return 'cover';
  }
}

export function DrinkVisual({ drink, size = 124, resizeMode = 'cover' }: DrinkVisualProps) {
  if (drink.imageAsset) {
    if (Platform.OS === 'web') {
      return (
        <img
          src={LOCAL_DRINK_IMAGES[drink.imageAsset]}
          alt=""
          style={{
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.23),
            objectFit: toObjectFit(resizeMode),
            display: 'block',
            backgroundColor: '#E7D8C5',
          }}
        />
      );
    }

    return (
      <Image
        source={{ uri: LOCAL_DRINK_IMAGES[drink.imageAsset] }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.23),
          },
        ]}
        resizeMode={resizeMode}
      />
    );
  }

  if (drink.cachedImageDataUrl) {
    if (Platform.OS === 'web') {
      return (
        <img
          src={drink.cachedImageDataUrl}
          alt=""
          style={{
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.23),
            objectFit: toObjectFit(resizeMode),
            display: 'block',
            backgroundColor: '#E7D8C5',
          }}
        />
      );
    }

    return (
      <Image
        source={{ uri: drink.cachedImageDataUrl }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.23),
          },
        ]}
        resizeMode={resizeMode}
      />
    );
  }

  if (drink.imageUrl) {
    if (Platform.OS === 'web') {
      return (
        <img
          src={drink.imageUrl}
          alt=""
          style={{
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.23),
            objectFit: toObjectFit(resizeMode),
            display: 'block',
            backgroundColor: '#E7D8C5',
          }}
        />
      );
    }

    return (
      <Image
        source={{ uri: drink.imageUrl }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.23),
          },
        ]}
        resizeMode={resizeMode}
      />
    );
  }

  return <DrinkArtwork artwork={drink.artwork} size={size} />;
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#E7D8C5',
  },
});
