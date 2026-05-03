import { Image, StyleSheet, type ImageResizeMode, type ImageSourcePropType } from 'react-native';

import type { Drink } from '../data/bartending';
import { DrinkArtwork } from './DrinkArtwork';

type DrinkVisualProps = {
  drink: Drink;
  size?: number;
  resizeMode?: ImageResizeMode;
};

const LOCAL_DRINK_IMAGES: Record<NonNullable<Drink['imageAsset']>, ImageSourcePropType> = {
  hugo: require('../../assets/hugo.jpg'),
};

export function DrinkVisual({ drink, size = 124, resizeMode = 'cover' }: DrinkVisualProps) {
  if (drink.imageAsset) {
    return (
      <Image
        source={LOCAL_DRINK_IMAGES[drink.imageAsset]}
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
