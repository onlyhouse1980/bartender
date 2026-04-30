import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DrinkArtwork } from './src/components/DrinkArtwork';
import { categoryLabels, drinks, glasswareGuide, lessons } from './src/data/bartending';

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedDrinkId, setExpandedDrinkId] = useState<string | null>(drinks[0]?.id ?? null);

  const visibleDrinks =
    selectedCategory === 'All'
      ? drinks
      : drinks.filter((drink) => drink.category === selectedCategory);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#173B38', '#8C4B31']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Beginner bartender trainer</Text>
          </View>
          <Text style={styles.heroTitle}>BarStart DE</Text>
          <Text style={styles.heroSubtitle}>
            Learn the drinks guests order most often in Germany, with metric recipes, glassware,
            garnish, and service cues built for iPhone-friendly practice.
          </Text>

          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{drinks.length}</Text>
              <Text style={styles.heroStatLabel}>Core cocktails</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>cl</Text>
              <Text style={styles.heroStatLabel}>Metric recipes</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>7</Text>
              <Text style={styles.heroStatLabel}>Glass styles</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start Here</Text>
          <Text style={styles.sectionIntro}>
            These are the habits that will save you from most beginner mistakes behind the bar.
          </Text>
          <View style={styles.lessonGrid}>
            {lessons.map((lesson) => (
              <View key={lesson.title} style={styles.lessonCard}>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.lessonBody}>{lesson.body}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Glassware Cheat Sheet</Text>
          <Text style={styles.sectionIntro}>
            When a recipe changes glass, the drink changes with it. Use the intended glass first,
            then adapt only when service demands it.
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.glasswareRow}
          >
            {glasswareGuide.map((item) => (
              <View key={item.name} style={styles.glassCard}>
                <Text style={styles.glassCardTitle}>{item.name}</Text>
                <Text style={styles.glassCardBody}>{item.use}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cocktail Library</Text>
          <Text style={styles.sectionIntro}>
            Tap a card to open the full recipe, method, serving glass, garnish, and a bar-floor tip.
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {categoryLabels.map((category) => {
              const active = category === selectedCategory;

              return (
                <Pressable
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.drinkList}>
            {visibleDrinks.map((drink) => {
              const expanded = drink.id === expandedDrinkId;

              return (
                <Pressable
                  key={drink.id}
                  onPress={() => setExpandedDrinkId(expanded ? null : drink.id)}
                  style={({ pressed }) => [
                    styles.drinkCard,
                    expanded && styles.drinkCardExpanded,
                    pressed && styles.drinkCardPressed,
                  ]}
                >
                  <View style={styles.drinkCardHeader}>
                    <DrinkArtwork artwork={drink.artwork} />
                    <View style={styles.drinkCardBody}>
                      <View style={styles.drinkBadgeRow}>
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>{drink.technique}</Text>
                        </View>
                        <View style={styles.secondaryBadge}>
                          <Text style={styles.secondaryBadgeText}>{drink.difficulty}</Text>
                        </View>
                      </View>

                      <Text style={styles.drinkName}>{drink.name}</Text>
                      <Text style={styles.drinkMeta}>
                        {drink.category} · Serve in a {drink.glass}
                      </Text>
                      <Text style={styles.drinkSummary}>{drink.summary}</Text>

                      <View style={styles.inlineDetail}>
                        <Text style={styles.inlineLabel}>Garnish</Text>
                        <Text style={styles.inlineValue}>{drink.garnish}</Text>
                      </View>
                    </View>
                  </View>

                  {expanded ? (
                    <View style={styles.expandedArea}>
                      <View style={styles.detailBlock}>
                        <Text style={styles.detailTitle}>Recipe</Text>
                        {drink.ingredients.map((ingredient) => (
                          <View key={`${drink.id}-${ingredient.amount}-${ingredient.item}`} style={styles.detailRow}>
                            <Text style={styles.detailAmount}>{ingredient.amount}</Text>
                            <Text style={styles.detailText}>{ingredient.item}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.detailBlock}>
                        <Text style={styles.detailTitle}>Method</Text>
                        {drink.method.map((step, index) => (
                          <View key={`${drink.id}-step-${index + 1}`} style={styles.methodRow}>
                            <Text style={styles.methodIndex}>{index + 1}</Text>
                            <Text style={styles.detailText}>{step}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.tipPanel}>
                        <Text style={styles.tipTitle}>German bar note</Text>
                        <Text style={styles.tipBody}>{drink.germanNote}</Text>
                      </View>

                      <View style={styles.tipPanel}>
                        <Text style={styles.tipTitle}>Beginner focus</Text>
                        <Text style={styles.tipBody}>{drink.proTip}</Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.tapHint}>Tap for recipe and steps</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>Service reminder</Text>
          <Text style={styles.footerBody}>
            Consistency beats speed when you start. Measure every pour, keep glassware cold and
            clean, and always follow local age and service rules.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F1E6',
  },
  content: {
    paddingBottom: 36,
  },
  hero: {
    marginHorizontal: 18,
    marginTop: 14,
    paddingHorizontal: 22,
    paddingVertical: 26,
    borderRadius: 28,
    shadowColor: '#0F221E',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 16,
  },
  heroBadgeText: {
    color: '#F9F4E8',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFF8EE',
    fontSize: 37,
    lineHeight: 42,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Georgia', default: undefined }),
  },
  heroSubtitle: {
    color: 'rgba(255,248,238,0.88)',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
    maxWidth: 620,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    flexWrap: 'wrap',
  },
  heroStatCard: {
    minWidth: 96,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroStatValue: {
    color: '#FFF7EC',
    fontSize: 22,
    fontWeight: '700',
  },
  heroStatLabel: {
    color: 'rgba(255,247,236,0.78)',
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 18,
  },
  sectionTitle: {
    color: '#27170F',
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Georgia', default: undefined }),
  },
  sectionIntro: {
    color: '#624B3E',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  lessonGrid: {
    marginTop: 16,
    gap: 14,
  },
  lessonCard: {
    backgroundColor: '#FFF9F1',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5D6C4',
    shadowColor: '#6E5344',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  lessonTitle: {
    color: '#1E4B45',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 8,
  },
  lessonBody: {
    color: '#5C453A',
    fontSize: 15,
    lineHeight: 23,
  },
  glasswareRow: {
    paddingTop: 16,
    paddingRight: 18,
    gap: 12,
  },
  glassCard: {
    width: 220,
    borderRadius: 22,
    padding: 18,
    backgroundColor: '#FBF4E7',
    borderWidth: 1,
    borderColor: '#E7D8C5',
  },
  glassCardTitle: {
    color: '#8A4929',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  glassCardBody: {
    color: '#5C453A',
    fontSize: 14,
    lineHeight: 22,
  },
  filterRow: {
    paddingTop: 16,
    paddingRight: 18,
    gap: 10,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#F1E4D1',
    borderWidth: 1,
    borderColor: '#E4D3BC',
  },
  filterChipActive: {
    backgroundColor: '#1E4B45',
    borderColor: '#1E4B45',
  },
  filterChipText: {
    color: '#5D4538',
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFF7EB',
  },
  drinkList: {
    marginTop: 18,
    gap: 16,
  },
  drinkCard: {
    backgroundColor: '#FFFBF5',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9DCC9',
    shadowColor: '#6E5242',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  drinkCardExpanded: {
    borderColor: '#D5B999',
  },
  drinkCardPressed: {
    opacity: 0.95,
  },
  drinkCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  drinkCardBody: {
    flex: 1,
  },
  drinkBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  primaryBadge: {
    backgroundColor: '#184A45',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  primaryBadgeText: {
    color: '#F9F2E6',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  secondaryBadge: {
    backgroundColor: '#F1E2CF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  secondaryBadgeText: {
    color: '#73482F',
    fontSize: 12,
    fontWeight: '700',
  },
  drinkName: {
    marginTop: 10,
    color: '#25160F',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Georgia', default: undefined }),
  },
  drinkMeta: {
    color: '#845B49',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  drinkSummary: {
    color: '#5E4539',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  inlineDetail: {
    marginTop: 12,
  },
  inlineLabel: {
    color: '#A5653B',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  inlineValue: {
    color: '#3B2A22',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  tapHint: {
    marginTop: 14,
    color: '#8A654F',
    fontSize: 13,
    fontWeight: '600',
  },
  expandedArea: {
    marginTop: 18,
    gap: 16,
  },
  detailBlock: {
    backgroundColor: '#F9F2E7',
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  detailTitle: {
    color: '#1E4B45',
    fontSize: 17,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailAmount: {
    width: 64,
    color: '#8A4A2A',
    fontSize: 14,
    fontWeight: '700',
  },
  detailText: {
    flex: 1,
    color: '#553E34',
    fontSize: 14,
    lineHeight: 21,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  methodIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    overflow: 'hidden',
    backgroundColor: '#E7D5BD',
    color: '#6B422E',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 24,
  },
  tipPanel: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#FFF8ED',
    borderWidth: 1,
    borderColor: '#E7D8C5',
  },
  tipTitle: {
    color: '#A15D35',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  tipBody: {
    color: '#563F34',
    fontSize: 14,
    lineHeight: 21,
  },
  footerCard: {
    marginTop: 28,
    marginHorizontal: 18,
    borderRadius: 26,
    padding: 20,
    backgroundColor: '#173B38',
  },
  footerTitle: {
    color: '#F5ECDD',
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 8,
  },
  footerBody: {
    color: '#E9DAC7',
    fontSize: 15,
    lineHeight: 22,
  },
});
