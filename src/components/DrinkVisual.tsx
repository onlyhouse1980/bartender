import { Image, StyleSheet } from 'react-native';

import type { Drink } from '../data/bartending';
import { DrinkArtwork } from './DrinkArtwork';

type DrinkVisualProps = {
  drink: Drink;
  size?: number;
};

export function DrinkVisual({ drink, size = 124 }: DrinkVisualProps) {
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
