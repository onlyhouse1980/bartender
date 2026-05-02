import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DrinkVisual } from './src/components/DrinkVisual';
import { GlasswareVisual } from './src/components/GlasswareVisual';
import { drinks, glasswareGuide, type Drink } from './src/data/bartending';
import {
  normalizeDrinkKey,
  searchWebDrinks,
  type WebDrinkSearchResult,
  webResultToDrink,
} from './src/lib/drinkImport';
import { loadImportedDrinks, saveImportedDrinks } from './src/lib/importedDrinkStorage';
import { loadTipJar, saveTipJar } from './src/lib/tipJarStorage';

const APP_VIEWS = [
  { key: 'library', label: 'Bibliothek' },
  { key: 'quiz', label: 'Quiz' },
] as const;
const QUIZ_GLASS_OPTIONS = [
  'Coupe',
  'Highball-Glas',
  'Hurricane-Glas',
  'Martiniglas',
  'Mule-Becher',
  'Rocks-Glas',
  'Weinglas',
] as const;
const CORRECT_TIP_REWARD = 5;
const WRONG_TIP_PENALTY = 3;
const CHEAT_REVEAL_MS = 3000;

type AppView = (typeof APP_VIEWS)[number]['key'];
type QuizGlassOption = (typeof QUIZ_GLASS_OPTIONS)[number];
type QuizStatus =
  | { kind: 'idle' }
  | { kind: 'correct'; message: string }
  | { kind: 'wrong'; message: string }
  | { kind: 'cheat-reveal'; message: string };

export default function App() {
  const scrollViewRef = useRef<ScrollView | null>(null);
  const librarySectionOffsetRef = useRef(0);
  const [activeView, setActiveView] = useState<AppView>('library');
  const [selectedCategory, setSelectedCategory] = useState('Alle');
  const [expandedDrinkId, setExpandedDrinkId] = useState<string | null>(drinks[0]?.id ?? null);
  const [importedDrinks, setImportedDrinks] = useState<Drink[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WebDrinkSearchResult[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [tipJar, setTipJar] = useState(0);
  const [currentDrinkId, setCurrentDrinkId] = useState<string | null>(null);
  const [selectedGlass, setSelectedGlass] = useState<QuizGlassOption | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [ingredientSearchQuery, setIngredientSearchQuery] = useState('');
  const [quizStatus, setQuizStatus] = useState<QuizStatus>({ kind: 'idle' });
  const cheatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setImportedDrinks(loadImportedDrinks());
    setTipJar(loadTipJar());
  }, []);

  useEffect(() => {
    return () => {
      clearCheatTimer();
    };
  }, []);

  const allDrinks = [...importedDrinks, ...drinks];
  const categories = ['Alle', ...new Set(allDrinks.map((drink) => drink.category))];
  const visibleDrinks =
    selectedCategory === 'Alle'
      ? allDrinks
      : allDrinks.filter((drink) => drink.category === selectedCategory);
  const ingredientBank = buildIngredientBank(allDrinks);
  const normalizedIngredientQuery = normalizeQuizLabel(ingredientSearchQuery);
  const filteredIngredientBank = ingredientBank.filter((ingredient) => {
    if (!normalizedIngredientQuery) {
      return true;
    }

    return normalizeQuizLabel(ingredient).includes(normalizedIngredientQuery);
  });
  const currentDrink =
    allDrinks.find((drink) => drink.id === currentDrinkId) ?? (allDrinks.length ? allDrinks[0] : null);
  const acceptedQuizGlasses = currentDrink ? getAcceptedQuizGlasses(currentDrink.glass) : [];
  const selectedIngredientsSummary = selectedIngredients.join(' • ');
  const quizLocked = quizStatus.kind === 'wrong' || quizStatus.kind === 'cheat-reveal';
  const canSubmit =
    !!currentDrink &&
    !quizLocked &&
    !!selectedGlass &&
    (selectedIngredients.length > 0 || currentDrink.ingredients.length === 0);

  useEffect(() => {
    if (!allDrinks.length) {
      setCurrentDrinkId(null);
      return;
    }

    const hasCurrentDrink =
      typeof currentDrinkId === 'string' && allDrinks.some((drink) => drink.id === currentDrinkId);

    if (!hasCurrentDrink) {
      setCurrentDrinkId(pickRandomDrinkId(allDrinks, null));
    }
  }, [allDrinks, currentDrinkId]);

  function clearCheatTimer() {
    if (cheatTimerRef.current) {
      clearTimeout(cheatTimerRef.current);
      cheatTimerRef.current = null;
    }
  }

  function updateTipJar(nextAmount: number) {
    setTipJar(nextAmount);
    saveTipJar(nextAmount);
  }

  function findExistingDrink(name: string, sourceId?: string) {
    const normalizedName = normalizeDrinkKey(name);

    return allDrinks.find(
      (drink) =>
        (sourceId && drink.sourceId === sourceId) || normalizeDrinkKey(drink.name) === normalizedName
    );
  }

  function focusDrink(drink: Drink) {
    setActiveView('library');
    setSelectedCategory(drink.category);
    setExpandedDrinkId(drink.id);

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, librarySectionOffsetRef.current - 12),
        animated: true,
      });
    });
  }

  function resetRoundSelections() {
    setSelectedGlass(null);
    setSelectedIngredients([]);
    setIngredientSearchQuery('');
  }

  function moveToNextDrink(excludedId: string | null) {
    setCurrentDrinkId(pickRandomDrinkId(allDrinks, excludedId));
    resetRoundSelections();
  }

  function clearPositiveFeedback() {
    if (quizStatus.kind === 'correct') {
      setQuizStatus({ kind: 'idle' });
    }
  }

  function toggleIngredient(ingredient: string) {
    if (quizLocked) {
      return;
    }

    clearPositiveFeedback();
    setSelectedIngredients((current) =>
      current.includes(ingredient)
        ? current.filter((entry) => entry !== ingredient)
        : [...current, ingredient]
    );
  }

  function chooseGlass(option: QuizGlassOption) {
    if (quizLocked) {
      return;
    }

    clearPositiveFeedback();
    setSelectedGlass(option);
  }

  function handleIngredientSearchChange(value: string) {
    if (quizLocked) {
      return;
    }

    clearPositiveFeedback();
    setIngredientSearchQuery(value);
  }

  async function handleSearch() {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      setSearchError('Bitte gib einen Drinknamen ein.');
      setSearchMessage(null);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchMessage(null);

    const existingDrink = findExistingDrink(trimmedQuery);
    if (existingDrink) {
      focusDrink(existingDrink);
      setSearchResults([]);
      setSearchMessage(`"${existingDrink.name}" ist bereits in deiner Bibliothek. Springe dorthin.`);
      setIsSearching(false);
      return;
    }

    try {
      const results = await searchWebDrinks(trimmedQuery);
      setSearchResults(results);

      if (!results.length) {
        setSearchMessage(`Kein Web-Treffer für "${trimmedQuery}" gefunden.`);
      } else {
        setSearchMessage(
          `${results.length} Web-Treffer gefunden. Wähle den passenden Drink zum Import.`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Websuche fehlgeschlagen.';
      setSearchResults([]);
      setSearchError(message);
    } finally {
      setIsSearching(false);
    }
  }

  function handleImport(result: WebDrinkSearchResult) {
    const existingDrink = findExistingDrink(result.name, result.sourceId);
    if (existingDrink) {
      focusDrink(existingDrink);
      setSearchError(null);
      setSearchMessage(`"${existingDrink.name}" ist bereits in deiner Bibliothek.`);
      return;
    }

    const importedDrink = webResultToDrink(result);
    const nextImportedDrinks = [importedDrink, ...importedDrinks];

    setImportedDrinks(nextImportedDrinks);
    saveImportedDrinks(nextImportedDrinks);
    setActiveView('library');
    setSelectedCategory('Alle');
    setExpandedDrinkId(importedDrink.id);
    setSearchError(null);
    setSearchMessage(`"${importedDrink.name}" wurde importiert und lokal gespeichert.`);
  }

  function handleServeIt() {
    if (!currentDrink || !selectedGlass) {
      return;
    }

    clearCheatTimer();

    const isGlassCorrect = acceptedQuizGlasses.includes(selectedGlass);
    const isIngredientCorrect = ingredientListsMatch(
      currentDrink.ingredients.map((ingredient) => ingredient.item),
      selectedIngredients
    );

    if (isGlassCorrect && isIngredientCorrect) {
      updateTipJar(tipJar + CORRECT_TIP_REWARD);
      setQuizStatus({
        kind: 'correct',
        message: `Perfekt serviert. ${formatEuro(CORRECT_TIP_REWARD)} wandern ins Trinkgeldglas.`,
      });
      moveToNextDrink(currentDrink.id);
      return;
    }

    updateTipJar(Math.max(0, tipJar - WRONG_TIP_PENALTY));
    setQuizStatus({
      kind: 'wrong',
      message: `Nicht korrekt. ${formatEuro(WRONG_TIP_PENALTY)} werden aus dem Trinkgeldglas abgezogen.`,
    });
  }

  function handleCheat() {
    if (!currentDrink) {
      return;
    }

    clearCheatTimer();
    setQuizStatus({
      kind: 'cheat-reveal',
      message: 'Cheat aktiv. Lösung ansehen, dann startet automatisch der nächste Drink.',
    });

    cheatTimerRef.current = setTimeout(() => {
      setQuizStatus({ kind: 'idle' });
      moveToNextDrink(currentDrink.id);
    }, CHEAT_REVEAL_MS);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#0A1517', '#41251F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroTitle}>BarStart DE</Text>
        </LinearGradient>

        <View style={styles.viewSwitch}>
          {APP_VIEWS.map((view) => {
            const active = activeView === view.key;

            return (
              <Pressable
                key={view.key}
                onPress={() => setActiveView(view.key)}
                style={({ pressed }) => [
                  styles.viewSwitchChip,
                  active && styles.viewSwitchChipActive,
                  pressed && styles.viewSwitchChipPressed,
                ]}
              >
                <Text style={[styles.viewSwitchText, active && styles.viewSwitchTextActive]}>
                  {view.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {activeView === 'library' ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Glaswaren-Spickzettel</Text>
              <Text style={styles.sectionIntro}>
                Wenn sich das Glas ändert, ändert sich auch der Drink. Nutze zuerst das vorgesehene
                Glas und weiche nur ab, wenn der Service es verlangt.
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.glasswareRow}
              >
                {glasswareGuide.map((item) => (
                  <View key={item.name} style={styles.glassCard}>
                    <View style={styles.glassVisualWrap}>
                      <GlasswareVisual kind={item.illustration} />
                    </View>
                    <Text style={styles.glassCardTitle}>{item.name}</Text>
                    <Text style={styles.glassCardBody}>{item.use}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Drinks aus dem Web importieren</Text>
              <Text style={styles.sectionIntro}>
                Fehlt ein Cocktail noch in der App, suche ihn online und importiere Zutaten,
                Anleitung, Glas und Bild direkt in deine Bibliothek.
              </Text>

              <View style={styles.searchPanel}>
                <TextInput
                  value={searchQuery}
                  onChangeText={(value) => {
                    setSearchQuery(value);
                    if (searchError) {
                      setSearchError(null);
                    }
                  }}
                  onSubmitEditing={() => {
                    void handleSearch();
                  }}
                  placeholder="Zum Beispiel: Paper Plane"
                  placeholderTextColor="#7F9590"
                  style={styles.searchInput}
                  returnKeyType="search"
                  autoCapitalize="words"
                  autoCorrect={false}
                  keyboardAppearance="dark"
                />

                <Pressable
                  onPress={() => {
                    void handleSearch();
                  }}
                  disabled={isSearching}
                  style={({ pressed }) => [
                    styles.searchButton,
                    isSearching && styles.searchButtonDisabled,
                    pressed && !isSearching && styles.searchButtonPressed,
                  ]}
                >
                  <Text style={styles.searchButtonText}>
                    {isSearching ? 'Suche läuft...' : 'Im Web suchen'}
                  </Text>
                </Pressable>

                <Text style={styles.searchSource}>Quelle: TheCocktailDB</Text>

                {searchError ? <Text style={styles.searchError}>{searchError}</Text> : null}
                {searchMessage && !searchError ? (
                  <Text style={styles.searchMessage}>{searchMessage}</Text>
                ) : null}
                {isSearching ? (
                  <ActivityIndicator color="#62C9B7" style={styles.searchSpinner} />
                ) : null}

                {searchResults.length ? (
                  <View style={styles.searchResults}>
                    {searchResults.map((result) => {
                      const existingDrink = findExistingDrink(result.name, result.sourceId);
                      const ingredientPreview = result.ingredients
                        .slice(0, 4)
                        .map((ingredient) =>
                          ingredient.amount
                            ? `${ingredient.amount} ${ingredient.item}`
                            : ingredient.item
                        )
                        .join(' • ');

                      return (
                        <View key={result.sourceId} style={styles.searchResultCard}>
                          {result.imageUrl ? (
                            <Image source={{ uri: result.imageUrl }} style={styles.searchResultImage} />
                          ) : (
                            <View style={styles.searchResultPlaceholder}>
                              <Text style={styles.searchResultPlaceholderText}>Kein Bild</Text>
                            </View>
                          )}

                          <View style={styles.searchResultBody}>
                            <Text style={styles.searchResultTitle}>{result.name}</Text>
                            <Text style={styles.searchResultMeta}>
                              {result.category} · Glas: {result.glass}
                            </Text>
                            <Text style={styles.searchResultPreview}>{result.instructions}</Text>

                            <Text style={styles.searchResultLabel}>Zutaten</Text>
                            <Text style={styles.searchResultIngredients}>
                              {ingredientPreview || 'Keine Zutaten in der Webquelle gefunden.'}
                            </Text>

                            <Pressable
                              onPress={() => {
                                if (existingDrink) {
                                  focusDrink(existingDrink);
                                  return;
                                }

                                handleImport(result);
                              }}
                              style={({ pressed }) => [
                                styles.searchActionButton,
                                existingDrink && styles.searchActionButtonMuted,
                                pressed && styles.searchActionButtonPressed,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.searchActionButtonText,
                                  existingDrink && styles.searchActionButtonTextMuted,
                                ]}
                              >
                                {existingDrink
                                  ? 'Bereits vorhanden öffnen'
                                  : 'In Bibliothek importieren'}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            </View>

            <View
              style={styles.section}
              onLayout={(event) => {
                librarySectionOffsetRef.current = event.nativeEvent.layout.y;
              }}
            >
              <Text style={styles.sectionTitle}>Cocktail-Bibliothek</Text>
              <Text style={styles.sectionIntro}>
                Tippe auf eine Karte, um Rezept, Zubereitung, Glas, Garnitur und einen
                Praxis-Hinweis zu sehen.
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {categories.map((category) => {
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
                        <DrinkVisual drink={drink} />
                        <View style={styles.drinkCardBody}>
                          <View style={styles.drinkBadgeRow}>
                            <View style={styles.primaryBadge}>
                              <Text style={styles.primaryBadgeText}>{drink.technique}</Text>
                            </View>
                            <View style={styles.secondaryBadge}>
                              <Text style={styles.secondaryBadgeText}>{drink.difficulty}</Text>
                            </View>
                            {drink.source === 'web-import' ? (
                              <View style={styles.sourceBadge}>
                                <Text style={styles.sourceBadgeText}>Web</Text>
                              </View>
                            ) : null}
                          </View>

                          <Text style={styles.drinkName}>{drink.name}</Text>
                          <Text style={styles.drinkMeta}>
                            {drink.category} · Glas: {drink.glass}
                          </Text>
                          <Text style={styles.drinkSummary}>{drink.summary}</Text>

                          <View style={styles.inlineDetail}>
                            <Text style={styles.inlineLabel}>Garnitur</Text>
                            <Text style={styles.inlineValue}>{drink.garnish}</Text>
                          </View>
                        </View>
                      </View>

                      {expanded ? (
                        <View style={styles.expandedArea}>
                          <View style={styles.detailBlock}>
                            <Text style={styles.detailTitle}>Rezept</Text>
                            {drink.ingredients.map((ingredient) => (
                              <View
                                key={`${drink.id}-${ingredient.amount}-${ingredient.item}`}
                                style={styles.detailRow}
                              >
                                <Text style={styles.detailAmount}>{ingredient.amount || '—'}</Text>
                                <Text style={styles.detailText}>{ingredient.item}</Text>
                              </View>
                            ))}
                          </View>

                          <View style={styles.detailBlock}>
                            <Text style={styles.detailTitle}>Zubereitung</Text>
                            {drink.method.map((step, index) => (
                              <View key={`${drink.id}-step-${index + 1}`} style={styles.methodRow}>
                                <Text style={styles.methodIndex}>{index + 1}</Text>
                                <Text style={styles.detailText}>{step}</Text>
                              </View>
                            ))}
                          </View>

                          <View style={styles.tipPanel}>
                            <Text style={styles.tipTitle}>Barhinweis</Text>
                            <Text style={styles.tipBody}>{drink.germanNote}</Text>
                          </View>

                          <View style={styles.tipPanel}>
                            <Text style={styles.tipTitle}>Worauf du achten solltest</Text>
                            <Text style={styles.tipBody}>{drink.proTip}</Text>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.tapHint}>Tippe für Rezept und Schritte</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.footerCard}>
              <Text style={styles.footerTitle}>Service-Erinnerung</Text>
              <Text style={styles.footerBody}>
                Konstanz ist am Anfang wichtiger als Tempo. Miss jeden Pour sauber ab, halte die
                Gläser kalt und sauber und beachte immer die lokalen Alters- und Serviceregeln.
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quiz</Text>
              <Text style={styles.sectionIntro}>
                Baue den angezeigten Drink aus dem Kopf: Glas wählen, Zutaten zusammenstellen und
                dann mit `Serve It!` abgeben.
              </Text>

              <View style={styles.tipJarCard}>
                <View>
                  <Text style={styles.tipJarLabel}>Trinkgeldglas</Text>
                  <Text style={styles.tipJarValue}>{formatEuro(tipJar)}</Text>
                </View>
                <Text style={styles.tipJarMeta}>{allDrinks.length} Drinks im Quiz-Pool</Text>
              </View>

              {currentDrink ? (
                <>
                  <View style={styles.quizCard}>
                    <Text style={styles.quizStepLabel}>Zufälliger Drink</Text>
                    <Text style={styles.quizDrinkName}>{currentDrink.name}</Text>
                    <Text style={styles.quizDrinkMeta}>
                      {currentDrink.category} · Technik: {currentDrink.technique}
                    </Text>
                    <Text style={styles.quizDrinkPrompt}>
                      Welches Glas passt und welche Zutaten brauchst du?
                    </Text>
                  </View>

                  {quizStatus.kind !== 'idle' ? (
                    <View
                      style={[
                        styles.feedbackCard,
                        quizStatus.kind === 'correct' && styles.feedbackCardSuccess,
                        quizStatus.kind === 'wrong' && styles.feedbackCardWarning,
                        quizStatus.kind === 'cheat-reveal' && styles.feedbackCardInfo,
                      ]}
                    >
                      <Text style={styles.feedbackTitle}>
                        {quizStatus.kind === 'correct'
                          ? 'Richtig'
                          : quizStatus.kind === 'wrong'
                            ? 'Noch nicht'
                            : 'Cheat'}
                      </Text>
                      <Text style={styles.feedbackBody}>{quizStatus.message}</Text>

                      {quizStatus.kind === 'wrong' ? (
                        <Pressable
                          onPress={handleCheat}
                          style={({ pressed }) => [
                            styles.cheatButton,
                            pressed && styles.cheatButtonPressed,
                          ]}
                        >
                          <Text style={styles.cheatButtonText}>Cheat</Text>
                        </Pressable>
                      ) : null}

                      {quizStatus.kind === 'cheat-reveal' ? (
                        <View style={styles.answerReveal}>
                          <Text style={styles.answerRevealTitle}>Richtiges Glas</Text>
                          <Text style={styles.answerRevealBody}>
                            {acceptedQuizGlasses.join(' oder ')}
                          </Text>
                          <Text style={styles.answerRevealTitle}>Richtige Zutaten</Text>
                          <View style={styles.answerRevealList}>
                            {currentDrink.ingredients.map((ingredient) => (
                              <View
                                key={`${currentDrink.id}-answer-${ingredient.amount}-${ingredient.item}`}
                                style={styles.answerRevealRow}
                              >
                                <Text style={styles.answerRevealAmount}>
                                  {ingredient.amount || '—'}
                                </Text>
                                <Text style={styles.answerRevealText}>{ingredient.item}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.quizCard}>
                    <Text style={styles.quizCardTitle}>1. Das richtige Glas wählen</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.quizGlassRow}
                    >
                      {QUIZ_GLASS_OPTIONS.map((option) => {
                        const active = selectedGlass === option;

                        return (
                          <Pressable
                            key={option}
                            onPress={() => chooseGlass(option)}
                            disabled={quizLocked}
                            style={({ pressed }) => [
                              styles.quizGlassChip,
                              active && styles.quizGlassChipActive,
                              quizLocked && styles.quizChipDisabled,
                              pressed && !quizLocked && styles.quizGlassChipPressed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.quizGlassChipText,
                                active && styles.quizGlassChipTextActive,
                              ]}
                            >
                              {option}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    <Text style={styles.quizSelectionText}>
                      {selectedGlass ? `Gewählt: ${selectedGlass}` : 'Noch kein Glas ausgewählt.'}
                    </Text>
                  </View>

                  <View style={styles.quizCard}>
                    <Text style={styles.quizCardTitle}>2. Zutaten zusammenstellen</Text>
                    <TextInput
                      value={ingredientSearchQuery}
                      onChangeText={handleIngredientSearchChange}
                      placeholder="Zutat suchen"
                      placeholderTextColor="#7F9590"
                      style={[styles.searchInput, quizLocked && styles.quizInputDisabled]}
                      editable={!quizLocked}
                      autoCapitalize="words"
                      autoCorrect={false}
                      keyboardAppearance="dark"
                    />

                    <Text style={styles.quizSelectionCount}>
                      {selectedIngredients.length} Zutaten ausgewählt
                    </Text>
                    <Text style={styles.quizSelectionText}>
                      {selectedIngredientsSummary || 'Noch keine Zutaten ausgewählt.'}
                    </Text>

                    {selectedIngredients.length ? (
                      <View style={styles.selectedIngredientRow}>
                        {selectedIngredients.map((ingredient) => (
                          <Pressable
                            key={`selected-${ingredient}`}
                            onPress={() => toggleIngredient(ingredient)}
                            disabled={quizLocked}
                            style={({ pressed }) => [
                              styles.selectedIngredientChip,
                              quizLocked && styles.quizChipDisabled,
                              pressed && !quizLocked && styles.quizIngredientChipPressed,
                            ]}
                          >
                            <Text style={styles.selectedIngredientChipText}>{ingredient}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}

                    <View style={styles.ingredientBank}>
                      {filteredIngredientBank.length ? (
                        filteredIngredientBank.map((ingredient) => {
                          const active = selectedIngredients.includes(ingredient);

                          return (
                            <Pressable
                              key={ingredient}
                              onPress={() => toggleIngredient(ingredient)}
                              disabled={quizLocked}
                              style={({ pressed }) => [
                                styles.ingredientChip,
                                active && styles.ingredientChipActive,
                                quizLocked && styles.quizChipDisabled,
                                pressed && !quizLocked && styles.quizIngredientChipPressed,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.ingredientChipText,
                                  active && styles.ingredientChipTextActive,
                                ]}
                              >
                                {ingredient}
                              </Text>
                            </Pressable>
                          );
                        })
                      ) : (
                        <Text style={styles.emptyIngredientState}>
                          Keine Zutaten für diese Suche gefunden.
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.quizActionRow}>
                    <Pressable
                      onPress={handleServeIt}
                      disabled={!canSubmit}
                      style={({ pressed }) => [
                        styles.serveButton,
                        !canSubmit && styles.serveButtonDisabled,
                        pressed && canSubmit && styles.serveButtonPressed,
                      ]}
                    >
                      <Text style={styles.serveButtonText}>Serve It!</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <View style={styles.quizCard}>
                  <Text style={styles.emptyIngredientState}>Quiz wird vorbereitet.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function buildIngredientBank(drinkPool: Drink[]) {
  const seen = new Set<string>();
  const ingredients: string[] = [];

  for (const drink of drinkPool) {
    for (const ingredient of drink.ingredients) {
      const normalized = normalizeQuizLabel(ingredient.item);
      if (!normalized || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      ingredients.push(ingredient.item);
    }
  }

  return ingredients.sort((left, right) => left.localeCompare(right, 'de'));
}

function pickRandomDrinkId(drinkPool: Drink[], excludedId: string | null) {
  if (!drinkPool.length) {
    return null;
  }

  const eligibleDrinks =
    excludedId && drinkPool.length > 1
      ? drinkPool.filter((drink) => drink.id !== excludedId)
      : drinkPool;
  const randomIndex = Math.floor(Math.random() * eligibleDrinks.length);

  return eligibleDrinks[randomIndex]?.id ?? drinkPool[0]?.id ?? null;
}

function ingredientListsMatch(expectedIngredients: string[], selectedIngredients: string[]) {
  const expected = new Set(expectedIngredients.map((ingredient) => normalizeQuizLabel(ingredient)));
  const selected = new Set(selectedIngredients.map((ingredient) => normalizeQuizLabel(ingredient)));

  if (expected.size !== selected.size) {
    return false;
  }

  for (const ingredient of expected) {
    if (!selected.has(ingredient)) {
      return false;
    }
  }

  return true;
}

function getAcceptedQuizGlasses(glassLabel: string) {
  const rawParts = glassLabel
    .split(/\s+oder\s+|\/|,|;/i)
    .map((part) => part.trim())
    .filter(Boolean);
  const parts = rawParts.length ? rawParts : [glassLabel];
  const seen = new Set<QuizGlassOption>();
  const accepted: QuizGlassOption[] = [];

  for (const part of parts) {
    const canonicalGlass = canonicalizeQuizGlass(part);
    if (!seen.has(canonicalGlass)) {
      seen.add(canonicalGlass);
      accepted.push(canonicalGlass);
    }
  }

  return accepted;
}

function canonicalizeQuizGlass(glassLabel: string): QuizGlassOption {
  const normalized = normalizeQuizLabel(glassLabel).replace(/-/g, ' ');

  if (normalized.includes('martini') || normalized.includes('cocktail')) {
    return 'Martiniglas';
  }

  if (normalized.includes('coupe') || normalized.includes('sour')) {
    return 'Coupe';
  }

  if (
    normalized.includes('wine') ||
    normalized.includes('weinglas') ||
    normalized.includes('goblet') ||
    normalized.includes('champagner') ||
    normalized.includes('flute')
  ) {
    return 'Weinglas';
  }

  if (
    normalized.includes('mule') ||
    normalized.includes('becher') ||
    normalized.includes('mug') ||
    normalized.includes('kupfer')
  ) {
    return 'Mule-Becher';
  }

  if (normalized.includes('hurricane')) {
    return 'Hurricane-Glas';
  }

  if (
    normalized.includes('rocks') ||
    normalized.includes('old fashioned') ||
    normalized.includes('tumbler') ||
    normalized.includes('whiskey')
  ) {
    return 'Rocks-Glas';
  }

  return 'Highball-Glas';
}

function normalizeQuizLabel(value: string) {
  return normalizeDrinkKey(value).replace(/\s+/g, ' ');
}

function formatEuro(amount: number) {
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} €`;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1315',
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 10,
  },
  heroTitle: {
    color: '#FFF8EE',
    fontSize: 37,
    lineHeight: 42,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Georgia', default: undefined }),
  },
  viewSwitch: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 18,
    marginTop: 16,
  },
  viewSwitchChip: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    backgroundColor: '#132025',
    borderWidth: 1,
    borderColor: '#284048',
  },
  viewSwitchChipActive: {
    backgroundColor: '#276C62',
    borderColor: '#2F8B7E',
  },
  viewSwitchChipPressed: {
    opacity: 0.94,
  },
  viewSwitchText: {
    color: '#B7C3C0',
    fontSize: 14,
    fontWeight: '700',
  },
  viewSwitchTextActive: {
    color: '#F4EEE4',
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 18,
  },
  sectionTitle: {
    color: '#F5E9D8',
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Georgia', default: undefined }),
  },
  sectionIntro: {
    color: '#AAB7B4',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
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
    backgroundColor: '#101A1E',
    borderWidth: 1,
    borderColor: '#23373F',
  },
  glassVisualWrap: {
    marginBottom: 14,
    alignItems: 'center',
  },
  glassCardTitle: {
    color: '#E8BF87',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  glassCardBody: {
    color: '#B7C3C0',
    fontSize: 14,
    lineHeight: 22,
  },
  searchPanel: {
    marginTop: 16,
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#101A1E',
    borderWidth: 1,
    borderColor: '#23373F',
    gap: 12,
  },
  searchInput: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2B4048',
    backgroundColor: '#0C1518',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#F3ECE0',
    fontSize: 16,
  },
  searchButton: {
    borderRadius: 18,
    backgroundColor: '#276C62',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.7,
  },
  searchButtonPressed: {
    opacity: 0.92,
  },
  searchButtonText: {
    color: '#F5EFE5',
    fontSize: 15,
    fontWeight: '700',
  },
  searchSource: {
    color: '#90A49F',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  searchError: {
    color: '#F08A78',
    fontSize: 14,
    lineHeight: 20,
  },
  searchMessage: {
    color: '#78D0C1',
    fontSize: 14,
    lineHeight: 20,
  },
  searchSpinner: {
    marginTop: 2,
  },
  searchResults: {
    gap: 14,
    marginTop: 2,
  },
  searchResultCard: {
    borderRadius: 22,
    padding: 14,
    backgroundColor: '#0E171A',
    borderWidth: 1,
    borderColor: '#22353C',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  searchResultImage: {
    width: 92,
    height: 92,
    borderRadius: 20,
    backgroundColor: '#1A252A',
  },
  searchResultPlaceholder: {
    width: 92,
    height: 92,
    borderRadius: 20,
    backgroundColor: '#182227',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultPlaceholderText: {
    color: '#A0AEAB',
    fontSize: 12,
    fontWeight: '700',
  },
  searchResultBody: {
    flex: 1,
  },
  searchResultTitle: {
    color: '#F4EBDE',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Georgia', default: undefined }),
  },
  searchResultMeta: {
    color: '#95A9A4',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  searchResultPreview: {
    color: '#C5D0CD',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  searchResultLabel: {
    color: '#E4B277',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: 10,
  },
  searchResultIngredients: {
    color: '#D2DBD8',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  searchActionButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#7C4C30',
  },
  searchActionButtonMuted: {
    backgroundColor: '#1A272C',
  },
  searchActionButtonPressed: {
    opacity: 0.92,
  },
  searchActionButtonText: {
    color: '#FFF5E9',
    fontSize: 13,
    fontWeight: '700',
  },
  searchActionButtonTextMuted: {
    color: '#9BAAA6',
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
    backgroundColor: '#132025',
    borderWidth: 1,
    borderColor: '#284048',
  },
  filterChipActive: {
    backgroundColor: '#276C62',
    borderColor: '#2F8B7E',
  },
  filterChipText: {
    color: '#B7C3C0',
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#F4EEE4',
  },
  drinkList: {
    marginTop: 18,
    gap: 16,
  },
  drinkCard: {
    backgroundColor: '#0F191D',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: '#23373F',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 4,
  },
  drinkCardExpanded: {
    borderColor: '#3B5961',
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
    backgroundColor: '#245C54',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  primaryBadgeText: {
    color: '#EEF7F3',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  secondaryBadge: {
    backgroundColor: '#1B272C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  secondaryBadgeText: {
    color: '#E1B37B',
    fontSize: 12,
    fontWeight: '700',
  },
  sourceBadge: {
    backgroundColor: '#241C19',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sourceBadgeText: {
    color: '#E0B17A',
    fontSize: 12,
    fontWeight: '700',
  },
  drinkName: {
    marginTop: 10,
    color: '#F5E9D8',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Georgia', default: undefined }),
  },
  drinkMeta: {
    color: '#94A8A4',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  drinkSummary: {
    color: '#C4D0CC',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  inlineDetail: {
    marginTop: 12,
  },
  inlineLabel: {
    color: '#DEAB70',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  inlineValue: {
    color: '#F0E7DA',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  tapHint: {
    marginTop: 14,
    color: '#93A5A1',
    fontSize: 13,
    fontWeight: '600',
  },
  expandedArea: {
    marginTop: 18,
    gap: 16,
  },
  detailBlock: {
    backgroundColor: '#0C1518',
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  detailTitle: {
    color: '#74C8B9',
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
    color: '#E1A86B',
    fontSize: 14,
    fontWeight: '700',
  },
  detailText: {
    flex: 1,
    color: '#D1DAD7',
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
    backgroundColor: '#23353C',
    color: '#E3B57E',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 24,
  },
  tipPanel: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#111B1F',
    borderWidth: 1,
    borderColor: '#24373F',
  },
  tipTitle: {
    color: '#E0A86E',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  tipBody: {
    color: '#CDD6D3',
    fontSize: 14,
    lineHeight: 21,
  },
  footerCard: {
    marginTop: 28,
    marginHorizontal: 18,
    borderRadius: 26,
    padding: 20,
    backgroundColor: '#102327',
  },
  footerTitle: {
    color: '#F4EBDE',
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 8,
  },
  footerBody: {
    color: '#C8D3CF',
    fontSize: 15,
    lineHeight: 22,
  },
  tipJarCard: {
    marginTop: 18,
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#102327',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  tipJarLabel: {
    color: '#AFC1BC',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  tipJarValue: {
    color: '#F7EAD8',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '700',
    marginTop: 6,
    fontFamily: Platform.select({ ios: 'Georgia', default: undefined }),
  },
  tipJarMeta: {
    color: '#AFC1BC',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 120,
    textAlign: 'right',
  },
  quizCard: {
    marginTop: 16,
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#101A1E',
    borderWidth: 1,
    borderColor: '#23373F',
    gap: 12,
  },
  quizStepLabel: {
    color: '#DEAB70',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  quizDrinkName: {
    color: '#F5E9D8',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Georgia', default: undefined }),
  },
  quizDrinkMeta: {
    color: '#94A8A4',
    fontSize: 14,
    lineHeight: 20,
  },
  quizDrinkPrompt: {
    color: '#C5D1CD',
    fontSize: 15,
    lineHeight: 22,
  },
  feedbackCard: {
    marginTop: 16,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    gap: 10,
  },
  feedbackCardSuccess: {
    backgroundColor: '#10251F',
    borderColor: '#2D6657',
  },
  feedbackCardWarning: {
    backgroundColor: '#281B18',
    borderColor: '#724638',
  },
  feedbackCardInfo: {
    backgroundColor: '#142025',
    borderColor: '#324C55',
  },
  feedbackTitle: {
    color: '#F4EBDD',
    fontSize: 17,
    fontWeight: '700',
  },
  feedbackBody: {
    color: '#CDD6D3',
    fontSize: 14,
    lineHeight: 21,
  },
  cheatButton: {
    alignSelf: 'flex-start',
    marginTop: 2,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#7C4C30',
  },
  cheatButtonPressed: {
    opacity: 0.92,
  },
  cheatButtonText: {
    color: '#FFF5E9',
    fontSize: 13,
    fontWeight: '700',
  },
  answerReveal: {
    marginTop: 4,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#0D1619',
    borderWidth: 1,
    borderColor: '#2A4048',
    gap: 8,
  },
  answerRevealTitle: {
    color: '#7ACDBE',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  answerRevealBody: {
    color: '#D3DCDA',
    fontSize: 14,
    lineHeight: 21,
  },
  answerRevealList: {
    gap: 8,
  },
  answerRevealRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  answerRevealAmount: {
    width: 68,
    color: '#E1A86B',
    fontSize: 13,
    fontWeight: '700',
  },
  answerRevealText: {
    flex: 1,
    color: '#D3DCDA',
    fontSize: 14,
    lineHeight: 21,
  },
  quizCardTitle: {
    color: '#F0E6D8',
    fontSize: 19,
    fontWeight: '700',
  },
  quizGlassRow: {
    paddingRight: 18,
    gap: 10,
  },
  quizGlassChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#132025',
    borderWidth: 1,
    borderColor: '#284048',
  },
  quizGlassChipActive: {
    backgroundColor: '#276C62',
    borderColor: '#2F8B7E',
  },
  quizGlassChipPressed: {
    opacity: 0.94,
  },
  quizGlassChipText: {
    color: '#B7C3C0',
    fontSize: 14,
    fontWeight: '700',
  },
  quizGlassChipTextActive: {
    color: '#F4EEE4',
  },
  quizChipDisabled: {
    opacity: 0.6,
  },
  quizSelectionCount: {
    color: '#E1A86B',
    fontSize: 13,
    fontWeight: '700',
  },
  quizSelectionText: {
    color: '#C4D0CC',
    fontSize: 14,
    lineHeight: 20,
  },
  selectedIngredientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectedIngredientChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#276C62',
    borderWidth: 1,
    borderColor: '#2F8B7E',
  },
  selectedIngredientChipText: {
    color: '#F4EEE4',
    fontSize: 13,
    fontWeight: '700',
  },
  ingredientBank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ingredientChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#132025',
    borderWidth: 1,
    borderColor: '#284048',
  },
  ingredientChipActive: {
    backgroundColor: '#7C4C30',
    borderColor: '#8E5A39',
  },
  ingredientChipText: {
    color: '#B7C3C0',
    fontSize: 13,
    fontWeight: '700',
  },
  ingredientChipTextActive: {
    color: '#FFF5E9',
  },
  quizIngredientChipPressed: {
    opacity: 0.92,
  },
  quizInputDisabled: {
    opacity: 0.7,
  },
  emptyIngredientState: {
    color: '#93A5A1',
    fontSize: 14,
    lineHeight: 20,
  },
  quizActionRow: {
    marginTop: 18,
  },
  serveButton: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#276C62',
  },
  serveButtonDisabled: {
    opacity: 0.45,
  },
  serveButtonPressed: {
    opacity: 0.92,
  },
  serveButtonText: {
    color: '#F4EEE4',
    fontSize: 17,
    fontWeight: '700',
  },
});
