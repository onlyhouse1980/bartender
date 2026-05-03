import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type GestureResponderEvent,
  type StyleProp,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';

import { DrinkVisual } from './src/components/DrinkVisual';
import { GlasswareVisual } from './src/components/GlasswareVisual';
import {
  barBasicsModules,
  drinks,
  glasswareGuide,
  lessons,
  type Drink,
  type GlasswareIllustration,
} from './src/data/bartending';
import { cacheRemoteImageAsDataUrl } from './src/lib/imageCache';
import { normalizeDrinkKey, searchWebDrinks, type WebDrinkSearchResult, webResultToDrink } from './src/lib/drinkImport';
import { loadImportedDrinks, saveImportedDrinks } from './src/lib/importedDrinkStorage';
import {
  createEmptyQuizProgress,
  loadQuizProgress,
  saveQuizProgress,
  type QuizDrinkProgress,
  type QuizProgress,
} from './src/lib/quizProgressStorage';
import { loadTipJar, saveTipJar } from './src/lib/tipJarStorage';

const APP_VIEWS = [
  { key: 'library', label: 'Bibliothek' },
  { key: 'basics', label: 'Bar Basics' },
  { key: 'quiz', label: 'Quiz' },
] as const;
const QUIZ_MODES = [
  { key: 'beginner', label: 'Einsteiger' },
  { key: 'service', label: 'Service' },
] as const;
const QUIZ_POOLS = [
  { key: 'all', label: 'Alle Drinks' },
  { key: 'mistakes', label: 'Nur Fehler' },
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
const CORRECT_REVEAL_MS = 1600;
const CHEAT_REVEAL_MS = 3000;

type AppView = (typeof APP_VIEWS)[number]['key'];
type LegalPage = 'impressum' | 'privacy';
type QuizMode = (typeof QUIZ_MODES)[number]['key'];
type QuizPool = (typeof QUIZ_POOLS)[number]['key'];
type QuizGlassOption = (typeof QUIZ_GLASS_OPTIONS)[number];
type QuizStatus =
  | { kind: 'idle' }
  | { kind: 'correct'; message: string }
  | { kind: 'wrong'; message: string; details: string[] }
  | { kind: 'cheat-reveal'; message: string };
type ImagePreview =
  | { kind: 'drink'; drink: Drink; title: string }
  | { kind: 'glass'; illustration: GlasswareIllustration; title: string }
  | { kind: 'remote'; uri: string; title: string };
type ImagePreviewFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};
type ImagePreviewTriggerProps = {
  children: ReactNode;
  onOpen: (frame: ImagePreviewFrame) => void;
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
  stopPropagation?: boolean;
};

function ImagePreviewTrigger({
  children,
  onOpen,
  style,
  pressedStyle,
  stopPropagation = false,
}: ImagePreviewTriggerProps) {
  const triggerRef = useRef<View | null>(null);

  function handlePress(event: GestureResponderEvent) {
    if (stopPropagation) {
      event.stopPropagation();
    }

    triggerRef.current?.measureInWindow((x, y, width, height) => {
      onOpen({
        x,
        y,
        width,
        height,
      });
    });
  }

  return (
    <View ref={triggerRef} collapsable={false}>
      <Pressable onPress={handlePress} style={({ pressed }) => [style, pressed && pressedStyle]}>
        {children}
      </Pressable>
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statTileLabel}>{label}</Text>
      <Text style={styles.statTileValue}>{value}</Text>
    </View>
  );
}

export default function App() {
  const scrollViewRef = useRef<ScrollView | null>(null);
  const librarySectionOffsetRef = useRef(0);
  const quizSectionOffsetRef = useRef(0);
  const previewAnimation = useRef(new Animated.Value(0)).current;
  const quizPoolDrinksRef = useRef<Drink[]>([]);
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();

  const [activeView, setActiveView] = useState<AppView>('library');
  const [selectedCategory, setSelectedCategory] = useState('Alle');
  const [expandedDrinkId, setExpandedDrinkId] = useState<string | null>(drinks[0]?.id ?? null);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [activeLegalPage, setActiveLegalPage] = useState<LegalPage | null>(null);
  const [importedDrinks, setImportedDrinks] = useState<Drink[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WebDrinkSearchResult[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [importingDrinkId, setImportingDrinkId] = useState<string | null>(null);
  const [tipJar, setTipJar] = useState(0);
  const [quizProgress, setQuizProgress] = useState<QuizProgress>(createEmptyQuizProgress());
  const [quizMode, setQuizMode] = useState<QuizMode>('beginner');
  const [quizPool, setQuizPool] = useState<QuizPool>('all');
  const [currentDrinkId, setCurrentDrinkId] = useState<string | null>(null);
  const [selectedGlass, setSelectedGlass] = useState<QuizGlassOption | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [selectedGarnish, setSelectedGarnish] = useState<string | null>(null);
  const [selectedBuildSteps, setSelectedBuildSteps] = useState<string[]>([]);
  const [buildStepOptions, setBuildStepOptions] = useState<string[]>([]);
  const [ingredientSearchQuery, setIngredientSearchQuery] = useState('');
  const [quizStatus, setQuizStatus] = useState<QuizStatus>({ kind: 'idle' });
  const [isImagePreviewVisible, setIsImagePreviewVisible] = useState(false);
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const [imagePreviewOriginFrame, setImagePreviewOriginFrame] = useState<ImagePreviewFrame | null>(null);
  const cheatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setImportedDrinks(loadImportedDrinks());
    setTipJar(loadTipJar());
    setQuizProgress(loadQuizProgress());
  }, []);

  useEffect(() => {
    return () => {
      clearCheatTimer();
    };
  }, []);

  const allDrinks = [...importedDrinks, ...drinks];
  const categories = ['Alle', ...new Set(allDrinks.map((drink) => drink.category))];
  const normalizedLibraryQuery = normalizeQuizLabel(librarySearchQuery);
  const visibleDrinks = allDrinks.filter((drink) => {
    const categoryMatches = selectedCategory === 'Alle' || drink.category === selectedCategory;
    const searchMatches = !normalizedLibraryQuery || matchesLibraryQuery(drink, normalizedLibraryQuery);
    return categoryMatches && searchMatches;
  });

  const unresolvedMistakeDrinks = useMemo(
    () =>
      allDrinks
        .map((drink) => ({
          drink,
          stats: getDrinkProgress(quizProgress, drink.id),
        }))
        .filter(({ stats }) => hasOpenMistake(stats))
        .sort((left, right) => {
          const leftGap = left.stats.wrong - left.stats.correct;
          const rightGap = right.stats.wrong - right.stats.correct;
          return rightGap - leftGap;
        }),
    [allDrinks, quizProgress]
  );
  const quizPoolDrinks =
    quizPool === 'mistakes' ? unresolvedMistakeDrinks.map((entry) => entry.drink) : allDrinks;
  quizPoolDrinksRef.current = quizPoolDrinks;

  const ingredientBank = buildIngredientBank(allDrinks, quizMode);
  const garnishBank = buildGarnishBank(allDrinks);
  const normalizedIngredientQuery = normalizeQuizLabel(ingredientSearchQuery);
  const filteredIngredientBank = ingredientBank.filter((ingredient) => {
    if (!normalizedIngredientQuery) {
      return true;
    }

    return normalizeQuizLabel(ingredient).includes(normalizedIngredientQuery);
  });

  const currentDrink =
    quizPoolDrinks.find((drink) => drink.id === currentDrinkId) ??
    (quizPoolDrinks.length ? quizPoolDrinks[0] : null);
  const acceptedQuizGlasses = currentDrink ? getAcceptedQuizGlasses(currentDrink.glass) : [];
  const expectedIngredientLabels = currentDrink ? getExpectedIngredientLabels(currentDrink, quizMode) : [];
  const selectedIngredientsSummary = selectedIngredients.join(' • ');
  const quizLocked = quizStatus.kind === 'correct' || quizStatus.kind === 'cheat-reveal';
  const serviceMode = quizMode === 'service';
  const hasIngredientSelection =
    expectedIngredientLabels.length === 0 ? true : selectedIngredients.length > 0;
  const canSubmit =
    !!currentDrink &&
    !quizLocked &&
    !!selectedGlass &&
    hasIngredientSelection &&
    (!serviceMode || (!!selectedGarnish && selectedBuildSteps.length > 0));
  const previewVisualSize = Math.min(viewportWidth - 28, viewportHeight - 220, 680);
  const previewTargetFrame = {
    x: (viewportWidth - previewVisualSize) / 2,
    y: Math.max(108, (viewportHeight - previewVisualSize) / 2 + 12),
    width: previewVisualSize,
    height: previewVisualSize,
  };
  const previewSourceFrame = resolvePreviewFrame(
    imagePreviewOriginFrame,
    viewportWidth,
    viewportHeight,
    previewTargetFrame
  );
  const previewTranslateX = previewAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [
      previewSourceFrame.x +
        previewSourceFrame.width / 2 -
        (previewTargetFrame.x + previewTargetFrame.width / 2),
      0,
    ],
  });
  const previewTranslateY = previewAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [
      previewSourceFrame.y +
        previewSourceFrame.height / 2 -
        (previewTargetFrame.y + previewTargetFrame.height / 2),
      0,
    ],
  });
  const previewScaleX = previewAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [previewSourceFrame.width / previewTargetFrame.width, 1],
  });
  const previewScaleY = previewAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [previewSourceFrame.height / previewTargetFrame.height, 1],
  });
  const previewBackdropOpacity = previewAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const previewHeaderOpacity = previewAnimation.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0, 0, 1],
  });
  const previewHeaderTranslateY = previewAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-16, 0],
  });
  const serveButtonLabel =
    quizStatus.kind === 'correct'
      ? 'Richtig serviert'
      : quizStatus.kind === 'wrong'
        ? 'Nochmal servieren'
        : quizStatus.kind === 'cheat-reveal'
          ? 'Lösung läuft...'
          : 'Serve It!';

  useEffect(() => {
    if (!quizPoolDrinks.length) {
      setCurrentDrinkId(null);
      return;
    }

    if (!currentDrinkId || !quizPoolDrinks.some((drink) => drink.id === currentDrinkId)) {
      setCurrentDrinkId(pickRandomDrinkId(quizPoolDrinks, null));
    }
  }, [currentDrinkId, quizPoolDrinks]);

  useEffect(() => {
    if (!currentDrink) {
      setBuildStepOptions([]);
      return;
    }

    setBuildStepOptions(shuffleArray(currentDrink.method));
  }, [currentDrink?.id]);

  useEffect(() => {
    clearCheatTimer();
    setQuizStatus({ kind: 'idle' });
    resetRoundSelections();
  }, [quizMode, quizPool]);

  function clearCheatTimer() {
    if (cheatTimerRef.current) {
      clearTimeout(cheatTimerRef.current);
      cheatTimerRef.current = null;
    }
  }

  function persistTipJar(nextAmount: number) {
    setTipJar(nextAmount);
    saveTipJar(nextAmount);
  }

  function persistQuizProgress(nextProgress: QuizProgress) {
    setQuizProgress(nextProgress);
    saveQuizProgress(nextProgress);
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
    setLibrarySearchQuery('');
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
    setSelectedGarnish(null);
    setSelectedBuildSteps([]);
    setIngredientSearchQuery('');
  }

  function scrollToQuizTop() {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, quizSectionOffsetRef.current - 12),
        animated: true,
      });
    });
  }

  function moveToNextDrink(excludedId: string | null, scrollToTop = false) {
    const activePool = quizPoolDrinksRef.current;
    setCurrentDrinkId(pickRandomDrinkId(activePool, excludedId));
    resetRoundSelections();

    if (scrollToTop) {
      scrollToQuizTop();
    }
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

  function chooseGarnish(garnish: string) {
    if (quizLocked) {
      return;
    }

    clearPositiveFeedback();
    setSelectedGarnish((current) => (current === garnish ? null : garnish));
  }

  function toggleBuildStep(step: string) {
    if (quizLocked) {
      return;
    }

    clearPositiveFeedback();
    setSelectedBuildSteps((current) =>
      current.includes(step) ? current.filter((entry) => entry !== step) : [...current, step]
    );
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
          `${results.length} Web-Treffer gefunden. Importierte Drinks und Bilder werden lokal gespeichert.`
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

  async function handleImport(result: WebDrinkSearchResult) {
    const existingDrink = findExistingDrink(result.name, result.sourceId);
    if (existingDrink) {
      focusDrink(existingDrink);
      setSearchError(null);
      setSearchMessage(`"${existingDrink.name}" ist bereits in deiner Bibliothek.`);
      return;
    }

    setImportingDrinkId(result.sourceId);

    try {
      const cachedImageDataUrl = result.imageUrl
        ? await cacheRemoteImageAsDataUrl(result.imageUrl)
        : undefined;
      const importedDrink = webResultToDrink(result, { cachedImageDataUrl });
      const nextImportedDrinks = [importedDrink, ...importedDrinks];

      setImportedDrinks(nextImportedDrinks);
      saveImportedDrinks(nextImportedDrinks);
      setActiveView('library');
      setLibrarySearchQuery('');
      setSelectedCategory('Alle');
      setExpandedDrinkId(importedDrink.id);
      setSearchError(null);
      setSearchMessage(
        `"${importedDrink.name}" wurde importiert, lokal gespeichert und ist offline weiter nutzbar.`
      );
    } finally {
      setImportingDrinkId(null);
    }
  }

  function handleServeIt() {
    if (!currentDrink || !selectedGlass) {
      return;
    }

    clearCheatTimer();

    const isGlassCorrect = acceptedQuizGlasses.includes(selectedGlass);
    const isIngredientCorrect = ingredientListsMatch(expectedIngredientLabels, selectedIngredients);
    const isGarnishCorrect = serviceMode
      ? normalizeQuizLabel(currentDrink.garnish) === normalizeQuizLabel(selectedGarnish ?? '')
      : true;
    const isBuildOrderCorrect = serviceMode
      ? stepListsMatch(currentDrink.method, selectedBuildSteps)
      : true;
    const isCorrect =
      isGlassCorrect && isIngredientCorrect && isGarnishCorrect && isBuildOrderCorrect;
    const nextProgress = recordQuizAttempt(quizProgress, currentDrink.id, isCorrect);

    persistQuizProgress(nextProgress);

    if (isCorrect) {
      persistTipJar(tipJar + CORRECT_TIP_REWARD);
      setQuizStatus({
        kind: 'correct',
        message:
          quizMode === 'service'
            ? `Sauberer Service-Run. ${formatEuro(CORRECT_TIP_REWARD)} wandern ins Trinkgeldglas.`
            : `Perfekt serviert. ${formatEuro(CORRECT_TIP_REWARD)} wandern ins Trinkgeldglas.`,
      });

      cheatTimerRef.current = setTimeout(() => {
        setQuizStatus({ kind: 'idle' });
        moveToNextDrink(currentDrink.id, true);
      }, CORRECT_REVEAL_MS);
      return;
    }

    const details: string[] = [];
    if (!isGlassCorrect) {
      details.push('Das Glas stimmt noch nicht.');
    }
    if (!isIngredientCorrect) {
      details.push(
        serviceMode
          ? 'Rezept oder Mengen stimmen noch nicht exakt.'
          : 'Die Zutatenauswahl stimmt noch nicht.'
      );
    }
    if (serviceMode && !isGarnishCorrect) {
      details.push('Die Garnitur passt noch nicht.');
    }
    if (serviceMode && !isBuildOrderCorrect) {
      details.push('Die Reihenfolge der Arbeitsschritte ist noch nicht korrekt.');
    }

    persistTipJar(Math.max(0, tipJar - WRONG_TIP_PENALTY));
    setQuizStatus({
      kind: 'wrong',
      message: `Nicht korrekt. ${formatEuro(WRONG_TIP_PENALTY)} werden aus dem Trinkgeldglas abgezogen. Passe deine Auswahl an und versuche es erneut.`,
      details,
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

  function handleEmailPress() {
    void Linking.openURL('mailto:onlyhouse@gmail.com').catch(() => {
      // Ignore missing mail client errors.
    });
  }

  function openLegalPage(page: LegalPage) {
    setActiveLegalPage(page);
  }

  function closeLegalPage() {
    setActiveLegalPage(null);
  }

  function animateImagePreview(toValue: 0 | 1, onComplete?: () => void) {
    previewAnimation.stopAnimation();
    Animated.timing(previewAnimation, {
      toValue,
      duration: toValue === 1 ? 280 : 220,
      easing: toValue === 1 ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onComplete?.();
      }
    });
  }

  function showImagePreview(preview: ImagePreview, originFrame: ImagePreviewFrame) {
    setImagePreview(preview);
    setImagePreviewOriginFrame(originFrame);
    setIsImagePreviewVisible(true);
    previewAnimation.setValue(0);

    requestAnimationFrame(() => {
      animateImagePreview(1);
    });
  }

  function openDrinkPreview(drink: Drink, originFrame: ImagePreviewFrame) {
    showImagePreview(
      {
        kind: 'drink',
        drink,
        title: drink.name,
      },
      originFrame
    );
  }

  function openGlassPreview(
    illustration: GlasswareIllustration,
    title: string,
    originFrame: ImagePreviewFrame
  ) {
    showImagePreview(
      {
        kind: 'glass',
        illustration,
        title,
      },
      originFrame
    );
  }

  function openRemoteImagePreview(uri: string, title: string, originFrame: ImagePreviewFrame) {
    showImagePreview(
      {
        kind: 'remote',
        uri,
        title,
      },
      originFrame
    );
  }

  function closeImagePreview() {
    if (!isImagePreviewVisible) {
      return;
    }

    animateImagePreview(0, () => {
      setIsImagePreviewVisible(false);
      setImagePreview(null);
      setImagePreviewOriginFrame(null);
    });
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
          <Text style={styles.heroSubtitle}>
            Drinks trainieren, Service festigen und Rezepte auch im Bar-Alltag schnell finden.
          </Text>
        </LinearGradient>

        <View style={styles.viewSwitch}>
          {APP_VIEWS.map((view) => {
            const active = activeView === view.key;

            return (
              <Pressable
                key={view.key}
                onPress={() => {
                  setActiveLegalPage(null);
                  setActiveView(view.key);
                }}
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

        {activeLegalPage ? (
          <View style={styles.section}>
            <View style={styles.legalPageHeader}>
              <Pressable
                onPress={closeLegalPage}
                style={({ pressed }) => [
                  styles.legalBackButton,
                  pressed && styles.legalBackButtonPressed,
                ]}
              >
                <Text style={styles.legalBackButtonText}>Zurück</Text>
              </Pressable>
              <Text style={styles.legalPageKicker}>Rechtliches</Text>
            </View>

            {activeLegalPage === 'impressum' ? (
              <View style={styles.legalCard}>
                <Text style={styles.legalTitle}>Impressum</Text>
                <Text style={styles.legalIntro}>Angaben gemaess § 5 DDG</Text>

                <View style={styles.legalBlock}>
                  <Text style={styles.legalLabel}>Diensteanbieter</Text>
                  <Text style={styles.legalValue}>Ryan Nyberg</Text>
                </View>

                <View style={styles.legalBlock}>
                  <Text style={styles.legalLabel}>E-Mail</Text>
                  <Pressable
                    onPress={handleEmailPress}
                    style={({ pressed }) => [styles.legalLinkWrap, pressed && styles.legalLinkPressed]}
                  >
                    <Text style={styles.legalLink}>onlyhouse@gmail.com</Text>
                  </Pressable>
                </View>

                <View style={styles.legalBlock}>
                  <Text style={styles.legalLabel}>Anschrift</Text>
                  <Text style={styles.legalValue}>
                    Leipziger Str. 222{'\n'}
                    01139 Dresden, Germany
                  </Text>
                </View>

                <View style={styles.legalBlock}>
                  <Text style={styles.legalLabel}>Verantwortlich fuer den Inhalt</Text>
                  <Text style={styles.legalValue}>Ryan Nyberg</Text>
                  <Text style={styles.legalSubtle}>
                    Leipziger Str. 222{'\n'}
                    01139 Dresden, Germany
                  </Text>
                </View>

                <Text style={styles.legalNotice}>
                  Weitere Pflichtangaben wie Registereintrag, Umsatzsteuer-ID oder berufsrechtliche
                  Angaben sind nur erforderlich, wenn sie auf dein Angebot zutreffen.
                </Text>
              </View>
            ) : (
              <View style={styles.legalCard}>
                <Text style={styles.legalTitle}>Datenschutz</Text>
                <Text style={styles.legalIntro}>Kurzfassung fuer diese App</Text>

                <View style={styles.legalBlock}>
                  <Text style={styles.legalLabel}>Lokale Speicherung</Text>
                  <Text style={styles.legalValue}>
                    Importierte Drinks, lokal zwischengespeicherte Bilder, dein Quizfortschritt und
                    das Trinkgeldglas werden nur auf diesem Geraet im Browser gespeichert.
                  </Text>
                </View>

                <View style={styles.legalBlock}>
                  <Text style={styles.legalLabel}>Websuche</Text>
                  <Text style={styles.legalValue}>
                    Wenn du nach einem Drink suchst, wird dein Suchbegriff an TheCocktailDB gesendet.
                    Dabei koennen Rezeptdaten und Vorschaubilder von dort geladen werden.
                  </Text>
                </View>

                <View style={styles.legalBlock}>
                  <Text style={styles.legalLabel}>Offline-Nutzung</Text>
                  <Text style={styles.legalValue}>
                    Bereits exportierte App-Dateien, importierte Rezepte und viele bereits geladene
                    Bilder werden fuer eine spaetere Offline-Nutzung im Browsercache gespeichert.
                  </Text>
                </View>

                <View style={styles.legalBlock}>
                  <Text style={styles.legalLabel}>Kontakt</Text>
                  <Text style={styles.legalValue}>
                    Wenn du per E-Mail Kontakt aufnimmst, sendest du deine Angaben freiwillig an die
                    im Impressum genannte Adresse.
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : activeView === 'library' ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Glaswaren-Spickzettel</Text>
              <Text style={styles.sectionIntro}>
                Wenn sich das Glas ändert, ändert sich auch der Drink. Tippe auf ein Bild, um es
                groß zu sehen.
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.glasswareRow}
              >
                {glasswareGuide.map((item) => (
                  <View key={item.name} style={styles.glassCard}>
                    <ImagePreviewTrigger
                      onOpen={(originFrame) =>
                        openGlassPreview(item.illustration, item.name, originFrame)
                      }
                      style={[styles.imagePreviewButton, styles.glassVisualWrap]}
                      pressedStyle={styles.imagePreviewButtonPressed}
                    >
                      <GlasswareVisual kind={item.illustration} />
                    </ImagePreviewTrigger>
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

                <Text style={styles.searchSource}>
                  Quelle: TheCocktailDB · Bilder und importierte Rezepte werden lokal gecached
                </Text>

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
                      const isImporting = importingDrinkId === result.sourceId;

                      return (
                        <View key={result.sourceId} style={styles.searchResultCard}>
                          {result.imageUrl ? (
                            <ImagePreviewTrigger
                              onOpen={(originFrame) =>
                                openRemoteImagePreview(result.imageUrl!, result.name, originFrame)
                              }
                              style={styles.imagePreviewButton}
                              pressedStyle={styles.imagePreviewButtonPressed}
                            >
                              <Image source={{ uri: result.imageUrl }} style={styles.searchResultImage} />
                            </ImagePreviewTrigger>
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

                                void handleImport(result);
                              }}
                              disabled={isImporting}
                              style={({ pressed }) => [
                                styles.searchActionButton,
                                existingDrink && styles.searchActionButtonMuted,
                                isImporting && styles.searchActionButtonDisabled,
                                pressed && !isImporting && styles.searchActionButtonPressed,
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
                                  : isImporting
                                    ? 'Wird gespeichert...'
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
                Suche nach Drinknamen, Zutaten, Spirituosen oder Glasarten und tippe auf eine Karte
                für Rezept, Zubereitung und Servicehinweise.
              </Text>

              <View style={styles.searchPanel}>
                <TextInput
                  value={librarySearchQuery}
                  onChangeText={setLibrarySearchQuery}
                  placeholder="Bibliothek durchsuchen: Name, Zutat, Spirituose, Glas"
                  placeholderTextColor="#7F9590"
                  style={styles.searchInput}
                  autoCapitalize="words"
                  autoCorrect={false}
                  keyboardAppearance="dark"
                />
                <Text style={styles.searchMessage}>
                  {visibleDrinks.length} Treffer{normalizedLibraryQuery ? ' für deine Suche' : ''}.
                </Text>
              </View>

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
                      style={({ pressed }) => [
                        styles.filterChip,
                        active && styles.filterChipActive,
                        pressed && styles.filterChipPressed,
                      ]}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {category}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.drinkList}>
                {visibleDrinks.length ? (
                  visibleDrinks.map((drink) => {
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
                          <ImagePreviewTrigger
                            onOpen={(originFrame) => openDrinkPreview(drink, originFrame)}
                            style={[styles.imagePreviewButton, styles.drinkVisualButton]}
                            pressedStyle={styles.imagePreviewButtonPressed}
                            stopPropagation
                          >
                            <DrinkVisual drink={drink} />
                          </ImagePreviewTrigger>
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
                  })
                ) : (
                  <View style={styles.emptyStateCard}>
                    <Text style={styles.emptyStateTitle}>Keine Drinks gefunden</Text>
                    <Text style={styles.emptyStateBody}>
                      Prüfe die Suche oder wechsle die Kategorie. Es wird nach Name, Zutaten,
                      Spirituosen, Technik, Glas und Garnitur gefiltert.
                    </Text>
                  </View>
                )}
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
        ) : activeView === 'basics' ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bar Basics</Text>
              <Text style={styles.sectionIntro}>
                Kurzmodule für den Start an einer deutschen Bar: Station, Eis, Hygiene, Tempo und
                Service.
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.lessonRow}
              >
                {lessons.map((lesson) => (
                  <View key={lesson.title} style={styles.lessonCard}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    <Text style={styles.lessonBody}>{lesson.body}</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.basicsList}>
                {barBasicsModules.map((module) => (
                  <View key={module.title} style={styles.basicsCard}>
                    <Text style={styles.basicsTitle}>{module.title}</Text>
                    <Text style={styles.basicsSummary}>{module.summary}</Text>
                    <View style={styles.basicsChecklist}>
                      {module.checklist.map((item) => (
                        <View key={`${module.title}-${item}`} style={styles.basicsChecklistRow}>
                          <Text style={styles.basicsChecklistBullet}>•</Text>
                          <Text style={styles.basicsChecklistText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            <View
              style={styles.section}
              onLayout={(event) => {
                quizSectionOffsetRef.current = event.nativeEvent.layout.y;
              }}
            >
              <Text style={styles.sectionTitle}>Quiz</Text>
              <Text style={styles.sectionIntro}>
                Baue zufällige Drinks aus dem Kopf. Im Service-Modus musst du zusätzlich Mengen,
                Garnitur und Reihenfolge sauber treffen.
              </Text>

              <View style={styles.tipJarCard}>
                <View>
                  <Text style={styles.tipJarLabel}>Trinkgeldglas</Text>
                  <Text style={styles.tipJarValue}>{formatEuro(tipJar)}</Text>
                </View>
                <Text style={styles.tipJarMeta}>{quizPoolDrinks.length} Drinks im aktiven Pool</Text>
              </View>

              <View style={styles.quizCard}>
                <Text style={styles.quizCardTitle}>Trainingsmodus</Text>
                <View style={styles.quizModeRow}>
                  {QUIZ_MODES.map((mode) => {
                    const active = quizMode === mode.key;

                    return (
                      <Pressable
                        key={mode.key}
                        onPress={() => setQuizMode(mode.key)}
                        style={({ pressed }) => [
                          styles.quizModeChip,
                          active && styles.quizModeChipActive,
                          pressed && styles.quizModeChipPressed,
                        ]}
                      >
                        <Text style={[styles.quizModeChipText, active && styles.quizModeChipTextActive]}>
                          {mode.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.quizSelectionText}>
                  {quizMode === 'beginner'
                    ? 'Einsteiger prüft Glas und Zutaten.'
                    : 'Service prüft Glas, exakte Rezeptpositionen, Garnitur und Reihenfolge.'}
                </Text>

                <Text style={styles.quizCardTitle}>Pool</Text>
                <View style={styles.quizModeRow}>
                  {QUIZ_POOLS.map((pool) => {
                    const active = quizPool === pool.key;

                    return (
                      <Pressable
                        key={pool.key}
                        onPress={() => setQuizPool(pool.key)}
                        style={({ pressed }) => [
                          styles.quizModeChip,
                          active && styles.quizModeChipActive,
                          pressed && styles.quizModeChipPressed,
                        ]}
                      >
                        <Text style={[styles.quizModeChipText, active && styles.quizModeChipTextActive]}>
                          {pool.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.quizSelectionText}>
                  {quizPool === 'mistakes'
                    ? 'Fehlerfokus zeigt Drinks, bei denen falsche Antworten noch nicht aufgeholt wurden.'
                    : 'Alle Drinks aus Bibliothek und Web-Importen können vorkommen.'}
                </Text>
              </View>

              <View style={styles.quizCard}>
                <Text style={styles.quizCardTitle}>Fortschritt</Text>
                <View style={styles.statRow}>
                  <StatTile label="Versuche" value={String(quizProgress.totalAttempts)} />
                  <StatTile
                    label="Trefferquote"
                    value={formatPercent(quizProgress.correctAnswers, quizProgress.totalAttempts)}
                  />
                </View>
                <View style={styles.statRow}>
                  <StatTile label="Streak" value={String(quizProgress.currentStreak)} />
                  <StatTile label="Best" value={String(quizProgress.bestStreak)} />
                </View>

                <Text style={styles.quizStepLabel}>Nur meine Fehler üben</Text>
                {unresolvedMistakeDrinks.length ? (
                  <View style={styles.mistakeList}>
                    {unresolvedMistakeDrinks.slice(0, 4).map(({ drink, stats }) => (
                      <View key={`mistake-${drink.id}`} style={styles.mistakeRow}>
                        <Text style={styles.mistakeDrinkName}>{drink.name}</Text>
                        <Text style={styles.mistakeMeta}>
                          {stats.wrong} falsch · {stats.correct} richtig
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyIngredientState}>
                    Noch keine offenen Fehler. Dein Fehler-Pool ist gerade leer.
                  </Text>
                )}
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
                      {serviceMode
                        ? 'Service-Modus: Glas, genaue Rezeptpositionen, Garnitur und Reihenfolge treffen.'
                        : 'Einsteiger-Modus: Welches Glas passt und welche Zutaten brauchst du?'}
                    </Text>
                  </View>

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
                    <Text style={styles.quizCardTitle}>
                      2. {serviceMode ? 'Rezept inklusive Mengen bauen' : 'Zutaten zusammenstellen'}
                    </Text>
                    <TextInput
                      value={ingredientSearchQuery}
                      onChangeText={handleIngredientSearchChange}
                      placeholder={
                        serviceMode
                          ? 'Rezeptposition oder Menge suchen'
                          : 'Zutat suchen'
                      }
                      placeholderTextColor="#7F9590"
                      style={[styles.searchInput, quizLocked && styles.quizInputDisabled]}
                      editable={!quizLocked}
                      autoCapitalize="words"
                      autoCorrect={false}
                      keyboardAppearance="dark"
                    />

                    <Text style={styles.quizSelectionCount}>
                      {selectedIngredients.length}{' '}
                      {serviceMode ? 'Rezeptpositionen' : 'Zutaten'} ausgewählt
                    </Text>
                    <Text style={styles.quizSelectionText}>
                      {selectedIngredientsSummary || 'Noch keine Auswahl getroffen.'}
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
                          Keine Rezeptpositionen für diese Suche gefunden.
                        </Text>
                      )}
                    </View>
                  </View>

                  {serviceMode ? (
                    <>
                      <View style={styles.quizCard}>
                        <Text style={styles.quizCardTitle}>3. Die richtige Garnitur wählen</Text>
                        <View style={styles.ingredientBank}>
                          {garnishBank.map((garnish) => {
                            const active = selectedGarnish === garnish;

                            return (
                              <Pressable
                                key={garnish}
                                onPress={() => chooseGarnish(garnish)}
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
                                  {garnish}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                        <Text style={styles.quizSelectionText}>
                          {selectedGarnish ? `Gewählt: ${selectedGarnish}` : 'Noch keine Garnitur gewählt.'}
                        </Text>
                      </View>

                      <View style={styles.quizCard}>
                        <View style={styles.buildOrderHeader}>
                          <Text style={styles.quizCardTitle}>4. Reihenfolge aufbauen</Text>
                          <Pressable
                            onPress={() => setSelectedBuildSteps([])}
                            disabled={quizLocked || !selectedBuildSteps.length}
                            style={({ pressed }) => [
                              styles.inlineResetButton,
                              (quizLocked || !selectedBuildSteps.length) && styles.inlineResetButtonDisabled,
                              pressed &&
                                !quizLocked &&
                                !!selectedBuildSteps.length &&
                                styles.inlineResetButtonPressed,
                            ]}
                          >
                            <Text style={styles.inlineResetButtonText}>Zurücksetzen</Text>
                          </Pressable>
                        </View>

                        <Text style={styles.quizSelectionCount}>
                          {selectedBuildSteps.length} von {currentDrink.method.length} Schritten gesetzt
                        </Text>

                        {selectedBuildSteps.length ? (
                          <View style={styles.buildSequenceList}>
                            {selectedBuildSteps.map((step, index) => (
                              <Pressable
                                key={`selected-step-${step}`}
                                onPress={() => toggleBuildStep(step)}
                                disabled={quizLocked}
                                style={({ pressed }) => [
                                  styles.buildSequenceCard,
                                  quizLocked && styles.quizChipDisabled,
                                  pressed && !quizLocked && styles.quizIngredientChipPressed,
                                ]}
                              >
                                <Text style={styles.methodIndex}>{index + 1}</Text>
                                <Text style={styles.buildSequenceText}>{step}</Text>
                              </Pressable>
                            ))}
                          </View>
                        ) : (
                          <Text style={styles.quizSelectionText}>
                            Noch keine Reihenfolge gesetzt. Tippe unten die Schritte in der Reihenfolge an,
                            in der du den Drink bauen würdest.
                          </Text>
                        )}

                        <View style={styles.buildOptionsList}>
                          {buildStepOptions.map((step) => {
                            const active = selectedBuildSteps.includes(step);

                            return (
                              <Pressable
                                key={`step-option-${step}`}
                                onPress={() => toggleBuildStep(step)}
                                disabled={quizLocked}
                                style={({ pressed }) => [
                                  styles.buildOptionChip,
                                  active && styles.buildOptionChipActive,
                                  quizLocked && styles.quizChipDisabled,
                                  pressed && !quizLocked && styles.quizIngredientChipPressed,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.buildOptionChipText,
                                    active && styles.buildOptionChipTextActive,
                                  ]}
                                >
                                  {step}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={styles.hintCard}>
                      <Text style={styles.hintTitle}>Nächster Schritt</Text>
                      <Text style={styles.hintBody}>
                        Im Service-Modus kommen exakte Mengen, Garnitur und Reihenfolge dazu. Wenn der
                        Einsteiger-Modus sitzt, schalte dort um.
                      </Text>
                    </View>
                  )}

                  <View style={styles.quizActionRow}>
                    <Pressable
                      onPress={handleServeIt}
                      disabled={!canSubmit}
                      style={({ pressed }) => [
                        styles.serveButton,
                        quizStatus.kind === 'correct' && styles.serveButtonSuccess,
                        quizStatus.kind === 'wrong' && styles.serveButtonError,
                        quizStatus.kind === 'cheat-reveal' && styles.serveButtonInfo,
                        !canSubmit && styles.serveButtonDisabled,
                        pressed && canSubmit && styles.serveButtonPressed,
                      ]}
                    >
                      <Text style={styles.serveButtonText}>{serveButtonLabel}</Text>
                    </Pressable>

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

                        {quizStatus.kind === 'wrong' && quizStatus.details.length ? (
                          <View style={styles.feedbackList}>
                            {quizStatus.details.map((detail) => (
                              <Text key={detail} style={styles.feedbackListItem}>
                                • {detail}
                              </Text>
                            ))}
                          </View>
                        ) : null}

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
                            {serviceMode ? (
                              <>
                                <Text style={styles.answerRevealTitle}>Richtige Garnitur</Text>
                                <Text style={styles.answerRevealBody}>{currentDrink.garnish}</Text>
                                <Text style={styles.answerRevealTitle}>Richtige Reihenfolge</Text>
                                <View style={styles.answerRevealList}>
                                  {currentDrink.method.map((step, index) => (
                                    <View key={`${currentDrink.id}-step-answer-${index + 1}`} style={styles.answerRevealRow}>
                                      <Text style={styles.answerRevealAmount}>{index + 1}</Text>
                                      <Text style={styles.answerRevealText}>{step}</Text>
                                    </View>
                                  ))}
                                </View>
                              </>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </>
              ) : (
                <View style={styles.quizCard}>
                  <Text style={styles.emptyStateTitle}>
                    {quizPool === 'mistakes'
                      ? 'Dein Fehler-Pool ist leer'
                      : 'Quiz wird vorbereitet'}
                  </Text>
                  <Text style={styles.emptyStateBody}>
                    {quizPool === 'mistakes'
                      ? 'Sobald es offene Fehl-Drinks gibt, kannst du sie hier gezielt nachtrainieren. Bis dahin nutze den Pool "Alle Drinks".'
                      : 'Sobald Drinks geladen sind, erscheint hier der nächste Trainings-Drink.'}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {!activeLegalPage ? (
          <View style={styles.legalFooterLinks}>
            <Pressable
              onPress={() => openLegalPage('impressum')}
              style={({ pressed }) => [styles.legalFooterLinkWrap, pressed && styles.legalLinkPressed]}
            >
              <Text style={styles.legalFooterLink}>Impressum</Text>
            </Pressable>
            <Text style={styles.legalFooterDivider}>·</Text>
            <Pressable
              onPress={() => openLegalPage('privacy')}
              style={({ pressed }) => [styles.legalFooterLinkWrap, pressed && styles.legalLinkPressed]}
            >
              <Text style={styles.legalFooterLink}>Datenschutz</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={isImagePreviewVisible}
        animationType="none"
        transparent
        statusBarTranslucent
        onRequestClose={closeImagePreview}
      >
        <View style={styles.previewOverlay}>
          <Animated.View
            pointerEvents="none"
            style={[styles.previewBackdropShade, { opacity: previewBackdropOpacity }]}
          />
          <Pressable style={styles.previewBackdrop} onPress={closeImagePreview} />
          <SafeAreaView pointerEvents="box-none" style={styles.previewSafeArea}>
            <Animated.View
              style={[
                styles.previewHeader,
                {
                  opacity: previewHeaderOpacity,
                  transform: [{ translateY: previewHeaderTranslateY }],
                },
              ]}
            >
              <View style={styles.previewHeaderBody}>
                <Text style={styles.previewTitle} numberOfLines={2}>
                  {imagePreview?.title}
                </Text>
                <Pressable
                  onPress={closeImagePreview}
                  style={({ pressed }) => [
                    styles.previewCloseButton,
                    pressed && styles.previewCloseButtonPressed,
                  ]}
                >
                  <Text style={styles.previewCloseButtonText}>Schliessen</Text>
                </Pressable>
              </View>
            </Animated.View>

            {imagePreview ? (
              <Animated.View
                style={[
                  styles.previewAnimatedFrame,
                  {
                    left: previewTargetFrame.x,
                    top: previewTargetFrame.y,
                    width: previewTargetFrame.width,
                    height: previewTargetFrame.height,
                    transform: [
                      { translateX: previewTranslateX },
                      { translateY: previewTranslateY },
                      { scaleX: previewScaleX },
                      { scaleY: previewScaleY },
                    ],
                  },
                ]}
              >
                {imagePreview.kind === 'glass' ? (
                  <GlasswareVisual
                    kind={imagePreview.illustration}
                    width={previewVisualSize}
                    height={previewVisualSize}
                  />
                ) : null}

                {imagePreview.kind === 'drink' ? (
                  <DrinkVisual
                    drink={imagePreview.drink}
                    size={previewVisualSize}
                    resizeMode="contain"
                  />
                ) : null}

                {imagePreview.kind === 'remote' ? (
                  <Image source={{ uri: imagePreview.uri }} style={styles.previewImage} resizeMode="contain" />
                ) : null}
              </Animated.View>
            ) : null}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function resolvePreviewFrame(
  frame: ImagePreviewFrame | null,
  viewportWidth: number,
  viewportHeight: number,
  targetFrame: ImagePreviewFrame
) {
  if (
    frame &&
    Number.isFinite(frame.x) &&
    Number.isFinite(frame.y) &&
    frame.width > 0 &&
    frame.height > 0
  ) {
    return frame;
  }

  const fallbackSize = Math.min(140, targetFrame.width * 0.34);

  return {
    x: viewportWidth / 2 - fallbackSize / 2,
    y: viewportHeight / 2 - fallbackSize / 2,
    width: fallbackSize,
    height: fallbackSize,
  };
}

function buildIngredientBank(drinkPool: Drink[], mode: QuizMode) {
  const seen = new Set<string>();
  const ingredients: string[] = [];

  for (const drink of drinkPool) {
    const labels = getExpectedIngredientLabels(drink, mode);

    for (const label of labels) {
      const normalized = normalizeQuizLabel(label);
      if (!normalized || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      ingredients.push(label);
    }
  }

  return ingredients.sort((left, right) => left.localeCompare(right, 'de'));
}

function buildGarnishBank(drinkPool: Drink[]) {
  const seen = new Set<string>();
  const garnishes: string[] = [];

  for (const drink of drinkPool) {
    const normalized = normalizeQuizLabel(drink.garnish);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    garnishes.push(drink.garnish);
  }

  return garnishes.sort((left, right) => left.localeCompare(right, 'de'));
}

function getExpectedIngredientLabels(drink: Drink, mode: QuizMode) {
  if (mode === 'service') {
    return drink.ingredients.map((ingredient) => formatIngredientLabel(ingredient.amount, ingredient.item));
  }

  return drink.ingredients.map((ingredient) => ingredient.item);
}

function formatIngredientLabel(amount: string, item: string) {
  return amount ? `${amount} ${item}` : item;
}

function buildQuizPool(drinkPool: Drink[], pool: QuizPool, progress: QuizProgress) {
  if (pool === 'all') {
    return drinkPool;
  }

  return drinkPool.filter((drink) => hasOpenMistake(getDrinkProgress(progress, drink.id)));
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

function stepListsMatch(expectedSteps: string[], selectedSteps: string[]) {
  if (expectedSteps.length !== selectedSteps.length) {
    return false;
  }

  return expectedSteps.every(
    (step, index) => normalizeQuizLabel(step) === normalizeQuizLabel(selectedSteps[index] ?? '')
  );
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

function matchesLibraryQuery(drink: Drink, query: string) {
  const haystack = [
    drink.name,
    drink.category,
    drink.glass,
    drink.garnish,
    drink.summary,
    drink.technique,
    drink.difficulty,
    ...drink.ingredients.map((ingredient) => `${ingredient.amount} ${ingredient.item}`),
  ]
    .join(' ')
    .trim();

  return normalizeQuizLabel(haystack).includes(query);
}

function shuffleArray<T>(items: readonly T[]) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function recordQuizAttempt(progress: QuizProgress, drinkId: string, correct: boolean): QuizProgress {
  const currentDrinkProgress = progress.byDrink[drinkId] ?? { attempts: 0, correct: 0, wrong: 0 };
  const nextDrinkProgress: QuizDrinkProgress = {
    attempts: currentDrinkProgress.attempts + 1,
    correct: currentDrinkProgress.correct + (correct ? 1 : 0),
    wrong: currentDrinkProgress.wrong + (correct ? 0 : 1),
  };

  const nextCurrentStreak = correct ? progress.currentStreak + 1 : 0;

  return {
    totalAttempts: progress.totalAttempts + 1,
    correctAnswers: progress.correctAnswers + (correct ? 1 : 0),
    wrongAnswers: progress.wrongAnswers + (correct ? 0 : 1),
    currentStreak: nextCurrentStreak,
    bestStreak: Math.max(progress.bestStreak, nextCurrentStreak),
    byDrink: {
      ...progress.byDrink,
      [drinkId]: nextDrinkProgress,
    },
  };
}

function getDrinkProgress(progress: QuizProgress, drinkId: string): QuizDrinkProgress {
  return progress.byDrink[drinkId] ?? { attempts: 0, correct: 0, wrong: 0 };
}

function hasOpenMistake(stats: QuizDrinkProgress) {
  return stats.wrong > stats.correct;
}

function formatPercent(numerator: number, denominator: number) {
  if (!denominator) {
    return '0 %';
  }

  const percentage = Math.round((numerator / denominator) * 100);
  return `${percentage} %`;
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
    paddingVertical: 24,
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
  heroSubtitle: {
    marginTop: 10,
    color: '#D6E0DD',
    fontSize: 15,
    lineHeight: 22,
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
  imagePreviewButton: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  imagePreviewButtonPressed: {
    opacity: 0.9,
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
  lessonRow: {
    paddingTop: 16,
    paddingRight: 18,
    gap: 12,
  },
  lessonCard: {
    width: 230,
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#102327',
    borderWidth: 1,
    borderColor: '#234147',
  },
  lessonTitle: {
    color: '#F2E7D6',
    fontSize: 17,
    fontWeight: '700',
  },
  lessonBody: {
    marginTop: 10,
    color: '#C9D4D1',
    fontSize: 14,
    lineHeight: 21,
  },
  basicsList: {
    marginTop: 16,
    gap: 14,
  },
  basicsCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: '#101A1E',
    borderWidth: 1,
    borderColor: '#23373F',
  },
  basicsTitle: {
    color: '#F5E9D8',
    fontSize: 18,
    fontWeight: '700',
  },
  basicsSummary: {
    marginTop: 8,
    color: '#C8D3CF',
    fontSize: 14,
    lineHeight: 22,
  },
  basicsChecklist: {
    marginTop: 12,
    gap: 9,
  },
  basicsChecklistRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  basicsChecklistBullet: {
    color: '#78D0C1',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  basicsChecklistText: {
    flex: 1,
    color: '#D6DFDC',
    fontSize: 14,
    lineHeight: 21,
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
  searchActionButtonDisabled: {
    opacity: 0.7,
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
  filterChipPressed: {
    opacity: 0.92,
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
  drinkVisualButton: {
    borderRadius: 28,
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
  emptyStateCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#101A1E',
    borderWidth: 1,
    borderColor: '#23373F',
  },
  emptyStateTitle: {
    color: '#F4EBDE',
    fontSize: 20,
    fontWeight: '700',
  },
  emptyStateBody: {
    marginTop: 8,
    color: '#C5D0CD',
    fontSize: 14,
    lineHeight: 22,
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
    maxWidth: 140,
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
  hintCard: {
    marginTop: 16,
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#122126',
    borderWidth: 1,
    borderColor: '#2A434A',
  },
  hintTitle: {
    color: '#F3E9DA',
    fontSize: 17,
    fontWeight: '700',
  },
  hintBody: {
    marginTop: 8,
    color: '#CCD6D2',
    fontSize: 14,
    lineHeight: 21,
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
  quizCardTitle: {
    color: '#F0E6D8',
    fontSize: 19,
    fontWeight: '700',
  },
  quizModeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quizModeChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#132025',
    borderWidth: 1,
    borderColor: '#284048',
  },
  quizModeChipActive: {
    backgroundColor: '#276C62',
    borderColor: '#2F8B7E',
  },
  quizModeChipPressed: {
    opacity: 0.94,
  },
  quizModeChipText: {
    color: '#B7C3C0',
    fontSize: 14,
    fontWeight: '600',
  },
  quizModeChipTextActive: {
    color: '#F4EEE4',
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statTile: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#0D1619',
    borderWidth: 1,
    borderColor: '#2A4048',
  },
  statTileLabel: {
    color: '#92A7A1',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statTileValue: {
    marginTop: 6,
    color: '#F5E9D8',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
  },
  mistakeList: {
    gap: 10,
  },
  mistakeRow: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#0D1619',
    borderWidth: 1,
    borderColor: '#253A42',
  },
  mistakeDrinkName: {
    color: '#F2E7D7',
    fontSize: 15,
    fontWeight: '700',
  },
  mistakeMeta: {
    marginTop: 4,
    color: '#AAB9B5',
    fontSize: 13,
    lineHeight: 19,
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
    color: '#C7D2CF',
    fontSize: 14,
    fontWeight: '600',
  },
  quizGlassChipTextActive: {
    color: '#F4EEE4',
  },
  quizSelectionCount: {
    color: '#E4B277',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  quizSelectionText: {
    color: '#C7D1CE',
    fontSize: 14,
    lineHeight: 21,
  },
  quizInputDisabled: {
    opacity: 0.7,
  },
  selectedIngredientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedIngredientChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#275A53',
  },
  selectedIngredientChipText: {
    color: '#F5EFE5',
    fontSize: 13,
    fontWeight: '700',
  },
  ingredientBank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ingredientChip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#132025',
    borderWidth: 1,
    borderColor: '#294048',
  },
  ingredientChipActive: {
    backgroundColor: '#276C62',
    borderColor: '#2F8B7E',
  },
  ingredientChipText: {
    color: '#D2DBD8',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  ingredientChipTextActive: {
    color: '#F4EEE4',
  },
  quizIngredientChipPressed: {
    opacity: 0.92,
  },
  quizChipDisabled: {
    opacity: 0.55,
  },
  buildOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  inlineResetButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#15262B',
    borderWidth: 1,
    borderColor: '#2B434A',
  },
  inlineResetButtonDisabled: {
    opacity: 0.5,
  },
  inlineResetButtonPressed: {
    opacity: 0.92,
  },
  inlineResetButtonText: {
    color: '#DDE6E3',
    fontSize: 12,
    fontWeight: '700',
  },
  buildSequenceList: {
    gap: 10,
  },
  buildSequenceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#0D1619',
    borderWidth: 1,
    borderColor: '#294048',
  },
  buildSequenceText: {
    flex: 1,
    color: '#D2DBD8',
    fontSize: 14,
    lineHeight: 21,
  },
  buildOptionsList: {
    gap: 10,
  },
  buildOptionChip: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#132025',
    borderWidth: 1,
    borderColor: '#294048',
  },
  buildOptionChipActive: {
    backgroundColor: '#276C62',
    borderColor: '#2F8B7E',
  },
  buildOptionChipText: {
    color: '#D2DBD8',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  buildOptionChipTextActive: {
    color: '#F4EEE4',
  },
  emptyIngredientState: {
    color: '#AAB7B4',
    fontSize: 14,
    lineHeight: 21,
  },
  quizActionRow: {
    marginTop: 16,
    gap: 16,
  },
  serveButton: {
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#2A675E',
  },
  serveButtonSuccess: {
    backgroundColor: '#2A7A5C',
  },
  serveButtonError: {
    backgroundColor: '#8C433A',
  },
  serveButtonInfo: {
    backgroundColor: '#2D4952',
  },
  serveButtonDisabled: {
    opacity: 0.55,
  },
  serveButtonPressed: {
    opacity: 0.94,
  },
  serveButtonText: {
    color: '#FFF7EB',
    fontSize: 16,
    fontWeight: '700',
  },
  feedbackCard: {
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
  feedbackList: {
    gap: 6,
  },
  feedbackListItem: {
    color: '#F0D6C8',
    fontSize: 14,
    lineHeight: 20,
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
  legalCard: {
    marginTop: 28,
    borderRadius: 26,
    padding: 20,
    backgroundColor: '#0F191D',
    borderWidth: 1,
    borderColor: '#23373F',
    gap: 14,
  },
  legalPageHeader: {
    marginTop: 4,
    gap: 10,
  },
  legalPageKicker: {
    color: '#AFC1BC',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  legalBackButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#132025',
    borderWidth: 1,
    borderColor: '#294048',
  },
  legalBackButtonPressed: {
    opacity: 0.9,
  },
  legalBackButtonText: {
    color: '#E8F0EE',
    fontSize: 13,
    fontWeight: '700',
  },
  legalTitle: {
    color: '#F4EBDE',
    fontSize: 22,
    fontWeight: '700',
  },
  legalIntro: {
    color: '#AFC1BC',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  legalBlock: {
    gap: 4,
  },
  legalLabel: {
    color: '#E0A86E',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  legalValue: {
    color: '#D5DFDC',
    fontSize: 15,
    lineHeight: 22,
  },
  legalSubtle: {
    color: '#93A5A1',
    fontSize: 13,
    lineHeight: 19,
  },
  legalLinkWrap: {
    alignSelf: 'flex-start',
  },
  legalLinkPressed: {
    opacity: 0.82,
  },
  legalLink: {
    color: '#7ACDBE',
    fontSize: 15,
    lineHeight: 22,
    textDecorationLine: 'underline',
  },
  legalNotice: {
    color: '#93A5A1',
    fontSize: 13,
    lineHeight: 20,
  },
  legalFooterLinks: {
    marginTop: 30,
    marginHorizontal: 18,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  legalFooterLinkWrap: {
    alignSelf: 'center',
  },
  legalFooterLink: {
    color: '#9BCFC6',
    fontSize: 14,
    lineHeight: 20,
    textDecorationLine: 'underline',
  },
  legalFooterDivider: {
    color: '#637975',
    fontSize: 16,
    lineHeight: 20,
  },
  previewOverlay: {
    flex: 1,
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  previewBackdropShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 10, 0.92)',
  },
  previewSafeArea: {
    flex: 1,
  },
  previewHeader: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  previewHeaderBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  previewTitle: {
    flex: 1,
    color: '#F5E9D8',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Georgia', default: undefined }),
  },
  previewCloseButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#132025',
    borderWidth: 1,
    borderColor: '#2D4249',
  },
  previewCloseButtonPressed: {
    opacity: 0.9,
  },
  previewCloseButtonText: {
    color: '#E8F0EE',
    fontSize: 13,
    fontWeight: '700',
  },
  previewAnimatedFrame: {
    position: 'absolute',
    borderRadius: 30,
    backgroundColor: '#091114',
    borderWidth: 1,
    borderColor: '#24373F',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0F191D',
  },
});
