import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import NextImage from 'next/image';
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
  type DrinkArtworkSpec,
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
const CUSTOM_DRINK_TECHNIQUES: Drink['technique'][] = ['Aufbauen', 'Shaken', 'Rühren', 'Blenden'];
const CUSTOM_DRINK_INITIAL_FORM = {
  name: '',
  category: 'Eigene Drinks',
  ingredientsText: '',
  glass: '',
  ice: 'Eiswürfel',
  technique: 'Shaken' as Drink['technique'],
  garnish: '',
  methodText: '',
  imageDataUrl: '',
  imageName: '',
};
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
type CustomDrinkFormState = typeof CUSTOM_DRINK_INITIAL_FORM;

type PreviewTriggerNode = {
  measureInWindow?: (
    callback: (x: number, y: number, width: number, height: number) => void
  ) => void;
  getBoundingClientRect?: () => {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

function createFallbackPreviewFrame(): ImagePreviewFrame {
  if (typeof window === 'undefined') {
    return {
      x: 24,
      y: 120,
      width: 160,
      height: 160,
    };
  }

  const size = Math.min(Math.max(window.innerWidth * 0.32, 132), 180);

  return {
    x: (window.innerWidth - size) / 2,
    y: Math.max(108, window.innerHeight * 0.24),
    width: size,
    height: size,
  };
}

function toPreviewFrame(candidate: {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}): ImagePreviewFrame | null {
  const width = candidate.width ?? 0;
  const height = candidate.height ?? 0;

  if (width <= 0 || height <= 0) {
    return null;
  }

  return {
    x: candidate.x ?? candidate.left ?? 0,
    y: candidate.y ?? candidate.top ?? 0,
    width,
    height,
  };
}

function ImagePreviewTrigger({
  children,
  onOpen,
  style,
  pressedStyle,
  stopPropagation = false,
}: ImagePreviewTriggerProps) {
  const triggerRef = useRef<PreviewTriggerNode | null>(null);

  function handlePress(event: GestureResponderEvent) {
    if (stopPropagation) {
      event.stopPropagation();
    }

    const triggerNode = triggerRef.current;

    if (triggerNode?.measureInWindow) {
      triggerNode.measureInWindow((x, y, width, height) => {
        onOpen(toPreviewFrame({ x, y, width, height }) ?? createFallbackPreviewFrame());
      });
      return;
    }

    const domFrame =
      typeof triggerNode?.getBoundingClientRect === 'function'
        ? toPreviewFrame(triggerNode.getBoundingClientRect())
        : null;

    onOpen(domFrame ?? createFallbackPreviewFrame());
  }

  return (
    <View ref={triggerRef as never} collapsable={false}>
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

function AdvertiseCard(props: {
  onPress: () => void;
  compact?: boolean;
  narrow?: boolean;
  width?: number;
}) {
  void props;
  return null;
}

export default function App() {
  const scrollViewRef = useRef<ScrollView | null>(null);
  const librarySectionOffsetRef = useRef(0);
  const quizSectionOffsetRef = useRef(0);
  const previewAnimation = useRef(new Animated.Value(0)).current;
  const quizPoolDrinksRef = useRef<Drink[]>([]);
  const webFrameRef = useRef<HTMLElement | null>(null);
  const customImageInputRef = useRef<HTMLInputElement | null>(null);
  const pendingOriginRef = useRef<ImagePreviewFrame | null>(null);
  const targetFrameForAnimRef = useRef<ImagePreviewFrame>({ x: 0, y: 0, width: 0, height: 0 });
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();

  const [activeView, setActiveView] = useState<AppView>('library');
  const [selectedCategory, setSelectedCategory] = useState('Alle');
  const [expandedDrinkId, setExpandedDrinkId] = useState<string | null>(drinks[0]?.id ?? null);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [activeLegalPage, setActiveLegalPage] = useState<LegalPage | null>(null);
  const [importedDrinks, setImportedDrinks] = useState<Drink[]>([]);
  const [showCustomDrinkForm, setShowCustomDrinkForm] = useState(false);
  const [customDrinkForm, setCustomDrinkForm] = useState<CustomDrinkFormState>(
    CUSTOM_DRINK_INITIAL_FORM
  );
  const [customDrinkMessage, setCustomDrinkMessage] = useState<string | null>(null);
  const [customDrinkError, setCustomDrinkError] = useState<string | null>(null);
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
  const previewDismissEnabledRef = useRef(false);
  const previewDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setImportedDrinks(loadImportedDrinks());
    setTipJar(loadTipJar());
    setQuizProgress(loadQuizProgress());
  }, []);

  useEffect(() => {
    return () => {
      clearCheatTimer();
      clearPreviewDismissTimer();
    };
  }, []);

  const allDrinks = useMemo(() => [...importedDrinks, ...drinks], [importedDrinks]);
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
  const rightRailAdWidth = 0;
  const narrowAdLayout = false;
  const useDesktopAdRail = false;
  const useMobileAdLayout = false;
  const stackedAdWidth = 0;
  const showMidPageAds = false;
  const contentViewportWidth = viewportWidth;
  const libraryWideGrid = contentViewportWidth >= 960;
  const libraryTopSplitLayout = false;
  const libraryTopMainWidth = Math.max(320, contentViewportWidth - 36);
  const glassGridColumns = libraryWideGrid
    ? Math.max(2, Math.min(5, Math.floor((libraryTopMainWidth + 12) / 192)))
    : 0;
  const glassGridCardWidth = libraryWideGrid
    ? Math.floor((libraryTopMainWidth - (glassGridColumns - 1) * 12) / glassGridColumns)
    : 220;
  const previewTargetFrame = {
    x: (viewportWidth - previewVisualSize) / 2,
    y: Math.max(108, (viewportHeight - previewVisualSize) / 2 + 12),
    width: previewVisualSize,
    height: previewVisualSize,
  };
  targetFrameForAnimRef.current = previewTargetFrame;
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
  }, [currentDrink]);

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

  function clearPreviewDismissTimer() {
    if (previewDismissTimerRef.current) {
      clearTimeout(previewDismissTimerRef.current);
      previewDismissTimerRef.current = null;
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

  function updateCustomDrinkForm<K extends keyof CustomDrinkFormState>(
    key: K,
    value: CustomDrinkFormState[K]
  ) {
    setCustomDrinkForm((current) => ({ ...current, [key]: value }));
    setCustomDrinkError(null);
    setCustomDrinkMessage(null);
  }

  function handleCustomImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setCustomDrinkError('Bitte waehle eine Bilddatei aus.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setCustomDrinkForm((current) => ({
        ...current,
        imageDataUrl: result,
        imageName: file.name,
      }));
      setCustomDrinkError(null);
      setCustomDrinkMessage(null);
    };
    reader.onerror = () => {
      setCustomDrinkError('Das Bild konnte nicht gelesen werden.');
    };
    reader.readAsDataURL(file);
  }

  function clearCustomImage() {
    setCustomDrinkForm((current) => ({ ...current, imageDataUrl: '', imageName: '' }));
    if (customImageInputRef.current) {
      customImageInputRef.current.value = '';
    }
  }

  function handleAddCustomDrink() {
    const customDrink = createCustomDrink(customDrinkForm, allDrinks);

    if (!customDrink) {
      setCustomDrinkError('Name, Glas und mindestens eine Zutat sind erforderlich.');
      setCustomDrinkMessage(null);
      return;
    }

    const existingDrink = findExistingDrink(customDrink.name);
    if (existingDrink) {
      focusDrink(existingDrink);
      setCustomDrinkError(null);
      setCustomDrinkMessage(`"${existingDrink.name}" ist bereits in deiner Bibliothek.`);
      return;
    }

    const nextImportedDrinks = [customDrink, ...importedDrinks];
    setImportedDrinks(nextImportedDrinks);
    saveImportedDrinks(nextImportedDrinks);
    setCustomDrinkForm(CUSTOM_DRINK_INITIAL_FORM);
    setShowCustomDrinkForm(false);
    setActiveView('library');
    setLibrarySearchQuery('');
    setSelectedCategory(customDrink.category);
    setExpandedDrinkId(customDrink.id);
    setCustomDrinkError(null);
    setCustomDrinkMessage(`"${customDrink.name}" wurde lokal gespeichert.`);

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, librarySectionOffsetRef.current - 12),
        animated: true,
      });
    });
  }

  function handleRemoveSavedDrink(drink: Drink, event: GestureResponderEvent) {
    event.stopPropagation();
    const nextImportedDrinks = importedDrinks.filter((entry) => entry.id !== drink.id);

    setImportedDrinks(nextImportedDrinks);
    saveImportedDrinks(nextImportedDrinks);
    setExpandedDrinkId((current) => (current === drink.id ? null : current));
    setSelectedCategory('Alle');
    setCustomDrinkMessage(`"${drink.name}" wurde aus der lokalen Bibliothek entfernt.`);
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

  function handleWebFrameRef(el: HTMLElement | null) {
    webFrameRef.current = el;
    if (!el || !pendingOriginRef.current) return;
    const origin = pendingOriginRef.current;
    pendingOriginRef.current = null;
    const target = targetFrameForAnimRef.current;
    const sx = origin.width / target.width;
    const sy = origin.height / target.height;
    const dx = (origin.x + origin.width / 2) - (target.x + target.width / 2);
    const dy = (origin.y + origin.height / 2) - (target.y + target.height / 2);
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)';
        el.style.transform = '';
      });
    });
  }

  function animateImagePreview(toValue: 0 | 1, onComplete?: () => void) {
    previewAnimation.stopAnimation();
    Animated.timing(previewAnimation, {
      toValue,
      duration: toValue === 1 ? 320 : 240,
      easing: toValue === 1 ? Easing.out(Easing.back(1.4)) : Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        onComplete?.();
      }
    });
  }

  function showImagePreview(preview: ImagePreview, originFrame: ImagePreviewFrame) {
    clearPreviewDismissTimer();
    previewDismissEnabledRef.current = false;
    setImagePreview(preview);
    setImagePreviewOriginFrame(originFrame);
    setIsImagePreviewVisible(true);
    previewAnimation.setValue(0);

    if (Platform.OS === 'web') {
      pendingOriginRef.current = originFrame;
    }

    requestAnimationFrame(() => {
      animateImagePreview(1);
    });

    previewDismissTimerRef.current = setTimeout(() => {
      previewDismissEnabledRef.current = true;
      previewDismissTimerRef.current = null;
    }, 180);
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

  function closeImagePreview(force = false) {
    if (!isImagePreviewVisible) {
      return;
    }

    if (!force && !previewDismissEnabledRef.current) {
      return;
    }

    clearPreviewDismissTimer();
    previewDismissEnabledRef.current = false;

    if (Platform.OS === 'web') {
      const el = webFrameRef.current;
      const origin = imagePreviewOriginFrame;
      const target = targetFrameForAnimRef.current;
      if (!force && el && origin) {
        const sx = origin.width / target.width;
        const sy = origin.height / target.height;
        const dx = (origin.x + origin.width / 2) - (target.x + target.width / 2);
        const dy = (origin.y + origin.height / 2) - (target.y + target.height / 2);
        el.style.transition = 'transform 260ms cubic-bezier(0.55, 0, 1, 0.45)';
        el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      }
      animateImagePreview(0, () => {
        setIsImagePreviewVisible(false);
        setImagePreview(null);
        setImagePreviewOriginFrame(null);
      });
      return;
    }

    animateImagePreview(0, () => {
      setIsImagePreviewVisible(false);
      setImagePreview(null);
      setImagePreviewOriginFrame(null);
    });
  }

  const previewOverlayContent =
    isImagePreviewVisible && imagePreview ? (
      <View style={styles.previewOverlay}>
        <Animated.View
          style={[styles.previewBackdropShade, { opacity: previewBackdropOpacity }]}
        />
        <Pressable style={styles.previewBackdrop} onPress={() => closeImagePreview()} />
        <SafeAreaView style={styles.previewSafeArea}>
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
                {imagePreview.title}
              </Text>
              <Pressable
                onPress={() => closeImagePreview(true)}
                style={({ pressed }) => [
                  styles.previewCloseButton,
                  pressed && styles.previewCloseButtonPressed,
                ]}
              >
                <Text style={styles.previewCloseButtonText}>Schliessen</Text>
              </Pressable>
            </View>
          </Animated.View>

          {Platform.OS === 'web' ? (
            <View
              ref={(el: unknown) => handleWebFrameRef(el as HTMLElement | null)}
              style={[
                styles.previewAnimatedFrame,
                {
                  left: previewTargetFrame.x,
                  top: previewTargetFrame.y,
                  width: previewTargetFrame.width,
                  height: previewTargetFrame.height,
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
                <DrinkVisual drink={imagePreview.drink} size={previewVisualSize} resizeMode="contain" />
              ) : null}
              {imagePreview.kind === 'remote' ? (
                <NextImage
                  src={imagePreview.uri}
                  alt={imagePreview.title}
                  width={previewVisualSize}
                  height={previewVisualSize}
                  sizes={`${previewVisualSize}px`}
                  style={{ width: previewVisualSize, height: previewVisualSize, objectFit: 'contain', display: 'block' }}
                />
              ) : null}
            </View>
          ) : (
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
                <DrinkVisual drink={imagePreview.drink} size={previewVisualSize} resizeMode="contain" />
              ) : null}
              {imagePreview.kind === 'remote' ? (
                <Image
                  alt={imagePreview.title}
                  source={{ uri: imagePreview.uri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              ) : null}
            </Animated.View>
          )}
        </SafeAreaView>
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.pageShell, useDesktopAdRail && styles.pageShellWithRail]}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.pageMain}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>BarStart DE</Text>
          <Text style={styles.heroSubtitle}>
            Drinks trainieren, Service festigen und Rezepte auch im Bar-Alltag schnell finden.
          </Text>
        </View>

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

        {!activeLegalPage && !useDesktopAdRail && (useMobileAdLayout || activeView !== 'library') ? (
          <View style={styles.adSectionWrap}>
            <AdvertiseCard
              onPress={handleEmailPress}
              width={useMobileAdLayout ? stackedAdWidth : rightRailAdWidth}
              narrow={narrowAdLayout}
            />
          </View>
        ) : null}

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
              <View
                style={[
                  styles.libraryTopRow,
                  libraryTopSplitLayout && styles.libraryTopRowSplit,
                ]}
              >
                <View style={styles.libraryTopMain}>
                  <Text style={styles.sectionTitle}>Glaswaren-Spickzettel</Text>
                  <Text style={styles.sectionIntro}>
                    Wenn sich das Glas ändert, ändert sich auch der Drink. Tippe auf ein Bild, um
                    es groß zu sehen.
                  </Text>

                  {libraryWideGrid ? (
                    <View style={styles.glasswareGrid}>
                      {glasswareGuide.map((item) => (
                        <View
                          key={item.name}
                          style={[styles.glassCard, { width: glassGridCardWidth }]}
                        >
                          <ImagePreviewTrigger
                            onOpen={(originFrame) =>
                              openGlassPreview(item.illustration, item.name, originFrame)
                            }
                            style={[styles.imagePreviewButton, styles.glassVisualWrap]}
                            pressedStyle={styles.imagePreviewButtonPressed}
                          >
                            <GlasswareVisual kind={item.illustration} loading="eager" />
                          </ImagePreviewTrigger>
                          <Text style={styles.glassCardTitle}>{item.name}</Text>
                          <Text style={styles.glassCardBody}>{item.use}</Text>
                          <View style={styles.glassCardSection}>
                            <Text style={styles.glassCardSectionTitle}>✓ Konsistenz-Checks:</Text>
                            {item.consistencyChecks.map((check, index) => (
                              <Text key={index} style={styles.glassCardListItem}>• {check}</Text>
                            ))}
                          </View>
                          <View style={styles.glassCardSection}>
                            <Text style={styles.glassCardSectionTitle}>⚠ Häufige Fehler:</Text>
                            {item.pitfalls.map((pitfall, index) => (
                              <Text key={index} style={styles.glassCardListItem}>• {pitfall}</Text>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
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
                            <GlasswareVisual kind={item.illustration} loading="eager" />
                          </ImagePreviewTrigger>
                          <Text style={styles.glassCardTitle}>{item.name}</Text>
                          <Text style={styles.glassCardBody}>{item.use}</Text>
                          <View style={styles.glassCardSection}>
                            <Text style={styles.glassCardSectionTitle}>✓ Konsistenz-Checks:</Text>
                            {item.consistencyChecks.map((check, index) => (
                              <Text key={index} style={styles.glassCardListItem}>• {check}</Text>
                            ))}
                          </View>
                          <View style={styles.glassCardSection}>
                            <Text style={styles.glassCardSectionTitle}>⚠ Häufige Fehler:</Text>
                            {item.pitfalls.map((pitfall, index) => (
                              <Text key={index} style={styles.glassCardListItem}>• {pitfall}</Text>
                            ))}
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>

                {showMidPageAds ? (
                  <View
                    style={[
                      styles.libraryTopRail,
                      libraryTopSplitLayout && styles.libraryTopRailSplit,
                      libraryTopSplitLayout && { width: rightRailAdWidth },
                    ]}
                  >
                    <AdvertiseCard
                      onPress={handleEmailPress}
                      width={rightRailAdWidth}
                      narrow={narrowAdLayout}
                    />
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.customDrinkHeader}>
                <View style={styles.customDrinkHeaderText}>
                  <Text style={styles.sectionTitle}>Eigene Drinks</Text>
                  <Text style={styles.sectionIntro}>
                    Lege Barstandards, Hausdrinks oder Trainingsrezepte direkt in deiner lokalen
                    Bibliothek an.
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setShowCustomDrinkForm((current) => !current);
                    setCustomDrinkError(null);
                    setCustomDrinkMessage(null);
                  }}
                  style={({ pressed }) => [
                    styles.customDrinkToggleButton,
                    showCustomDrinkForm && styles.customDrinkToggleButtonActive,
                    pressed && styles.customDrinkToggleButtonPressed,
                  ]}
                >
                  <Text style={styles.customDrinkToggleButtonText}>
                    {showCustomDrinkForm ? 'Formular schliessen' : 'Drink hinzufuegen'}
                  </Text>
                </Pressable>
              </View>

              {showCustomDrinkForm ? (
                <View style={styles.customDrinkForm}>
                  <View style={styles.customFormGrid}>
                    <View style={styles.customFormField}>
                      <Text style={styles.customFormLabel}>Name</Text>
                      <TextInput
                        value={customDrinkForm.name}
                        onChangeText={(value) => updateCustomDrinkForm('name', value)}
                        placeholder="Zum Beispiel: Haus Mule"
                        placeholderTextColor="#8070A0"
                        style={styles.searchInput}
                        autoCapitalize="words"
                        autoCorrect={false}
                        keyboardAppearance="dark"
                      />
                    </View>

                    <View style={styles.customFormField}>
                      <Text style={styles.customFormLabel}>Kategorie</Text>
                      <TextInput
                        value={customDrinkForm.category}
                        onChangeText={(value) => updateCustomDrinkForm('category', value)}
                        placeholder="Eigene Drinks"
                        placeholderTextColor="#8070A0"
                        style={styles.searchInput}
                        autoCapitalize="sentences"
                        autoCorrect={false}
                        keyboardAppearance="dark"
                      />
                    </View>
                  </View>

                  <View style={styles.customFormGrid}>
                    <View style={styles.customFormField}>
                      <Text style={styles.customFormLabel}>Glas</Text>
                      <TextInput
                        value={customDrinkForm.glass}
                        onChangeText={(value) => updateCustomDrinkForm('glass', value)}
                        placeholder="Rocks-Glas, Coupe, Highball..."
                        placeholderTextColor="#8070A0"
                        style={styles.searchInput}
                        autoCapitalize="words"
                        autoCorrect={false}
                        keyboardAppearance="dark"
                      />
                    </View>

                    <View style={styles.customFormField}>
                      <Text style={styles.customFormLabel}>Eis</Text>
                      <TextInput
                        value={customDrinkForm.ice}
                        onChangeText={(value) => updateCustomDrinkForm('ice', value)}
                        placeholder="Eiswürfel, Crushed Ice, ohne Eis..."
                        placeholderTextColor="#8070A0"
                        style={styles.searchInput}
                        autoCapitalize="sentences"
                        autoCorrect={false}
                        keyboardAppearance="dark"
                      />
                    </View>
                  </View>

                  <View style={styles.customFormField}>
                    <Text style={styles.customFormLabel}>Technik</Text>
                    <View style={styles.quizModeRow}>
                      {CUSTOM_DRINK_TECHNIQUES.map((technique) => {
                        const active = customDrinkForm.technique === technique;

                        return (
                          <Pressable
                            key={technique}
                            onPress={() => updateCustomDrinkForm('technique', technique)}
                            style={({ pressed }) => [
                              styles.quizModeChip,
                              active && styles.quizModeChipActive,
                              pressed && styles.quizModeChipPressed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.quizModeChipText,
                                active && styles.quizModeChipTextActive,
                              ]}
                            >
                              {technique}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.customFormField}>
                    <Text style={styles.customFormLabel}>Zutaten</Text>
                    <TextInput
                      value={customDrinkForm.ingredientsText}
                      onChangeText={(value) => updateCustomDrinkForm('ingredientsText', value)}
                      placeholder={'6 cl Gin\n12 cl Tonic Water\n1 Spalte Limette'}
                      placeholderTextColor="#8070A0"
                      style={[styles.searchInput, styles.customTextArea]}
                      multiline
                      autoCapitalize="sentences"
                      autoCorrect={false}
                      keyboardAppearance="dark"
                    />
                  </View>

                  <View style={styles.customFormField}>
                    <Text style={styles.customFormLabel}>Garnitur</Text>
                    <TextInput
                      value={customDrinkForm.garnish}
                      onChangeText={(value) => updateCustomDrinkForm('garnish', value)}
                      placeholder="Optional, zum Beispiel: Limettenspalte"
                      placeholderTextColor="#8070A0"
                      style={styles.searchInput}
                      autoCapitalize="sentences"
                      autoCorrect={false}
                      keyboardAppearance="dark"
                    />
                  </View>

                  <View style={styles.customFormField}>
                    <Text style={styles.customFormLabel}>Zubereitung</Text>
                    <TextInput
                      value={customDrinkForm.methodText}
                      onChangeText={(value) => updateCustomDrinkForm('methodText', value)}
                      placeholder={'Optional: ein Arbeitsschritt pro Zeile'}
                      placeholderTextColor="#8070A0"
                      style={[styles.searchInput, styles.customTextArea]}
                      multiline
                      autoCapitalize="sentences"
                      autoCorrect={false}
                      keyboardAppearance="dark"
                    />
                  </View>

                  <View style={styles.customImageRow}>
                    <View style={styles.customImagePreview}>
                      {customDrinkForm.imageDataUrl ? (
                        Platform.OS === 'web' ? (
                          <NextImage
                            unoptimized
                            src={customDrinkForm.imageDataUrl}
                            alt=""
                            width={108}
                            height={108}
                            sizes="108px"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        ) : (
                          <Image
                            alt=""
                            source={{ uri: customDrinkForm.imageDataUrl }}
                            style={styles.customImagePreviewImage}
                          />
                        )
                      ) : (
                        <Text style={styles.customImagePreviewText}>Kein Bild</Text>
                      )}
                    </View>
                    <View style={styles.customImageActions}>
                      {Platform.OS === 'web' ? (
                        <input
                          ref={customImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleCustomImageChange}
                          style={{ display: 'none' }}
                        />
                      ) : null}
                      <Pressable
                        onPress={() => customImageInputRef.current?.click()}
                        style={({ pressed }) => [
                          styles.searchActionButton,
                          pressed && styles.searchActionButtonPressed,
                        ]}
                      >
                        <Text style={styles.searchActionButtonText}>Bild auswaehlen</Text>
                      </Pressable>
                      {customDrinkForm.imageName ? (
                        <Text style={styles.customImageName}>{customDrinkForm.imageName}</Text>
                      ) : null}
                      {customDrinkForm.imageDataUrl ? (
                        <Pressable
                          onPress={clearCustomImage}
                          style={({ pressed }) => [
                            styles.inlineResetButton,
                            pressed && styles.inlineResetButtonPressed,
                          ]}
                        >
                          <Text style={styles.inlineResetButtonText}>Bild entfernen</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>

                  {customDrinkError ? <Text style={styles.searchError}>{customDrinkError}</Text> : null}
                  {customDrinkMessage && !customDrinkError ? (
                    <Text style={styles.searchMessage}>{customDrinkMessage}</Text>
                  ) : null}

                  <Pressable
                    onPress={handleAddCustomDrink}
                    style={({ pressed }) => [
                      styles.searchButton,
                      pressed && styles.searchButtonPressed,
                    ]}
                  >
                    <Text style={styles.searchButtonText}>In Bibliothek speichern</Text>
                  </Pressable>
                </View>
              ) : customDrinkMessage ? (
                <Text style={styles.customDrinkSavedMessage}>{customDrinkMessage}</Text>
              ) : null}
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
                  placeholderTextColor="#8070A0"
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
                  <ActivityIndicator color="#00E5FF" style={styles.searchSpinner} />
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
                              {Platform.OS === 'web' ? (
                                <NextImage
                                  src={result.imageUrl}
                                  alt={result.name}
                                  width={92}
                                  height={92}
                                  sizes="92px"
                                  style={{
                                    width: 92,
                                    height: 92,
                                    borderRadius: 20,
                                    objectFit: 'cover',
                                    display: 'block',
                                    backgroundColor: '#1A0F2A',
                                  }}
                                />
                              ) : (
                                <Image
                                  alt={result.name}
                                  source={{ uri: result.imageUrl }}
                                  style={styles.searchResultImage}
                                />
                              )}
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

            {showMidPageAds ? (
              <View style={styles.adInlineWrap}>
                <AdvertiseCard
                  onPress={handleEmailPress}
                  width={rightRailAdWidth}
                  narrow={narrowAdLayout}
                />
              </View>
            ) : null}

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
                  placeholderTextColor="#8070A0"
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
                              {drink.source === 'custom' ? (
                                <View style={styles.sourceBadge}>
                                  <Text style={styles.sourceBadgeText}>Eigen</Text>
                                </View>
                              ) : null}
                              {drink.source === 'web-import' || drink.source === 'custom' ? (
                                <Pressable
                                  onPress={(event) => handleRemoveSavedDrink(drink, event)}
                                  style={({ pressed }) => [
                                    styles.removeDrinkButton,
                                    pressed && styles.removeDrinkButtonPressed,
                                  ]}
                                >
                                  <Text style={styles.removeDrinkButtonText}>Entfernen</Text>
                                </Pressable>
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

              {showMidPageAds ? (
                <View style={styles.adInlineWrap}>
                  <AdvertiseCard
                    onPress={handleEmailPress}
                    width={rightRailAdWidth}
                    narrow={narrowAdLayout}
                  />
                </View>
              ) : null}

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

              {showMidPageAds ? (
                <View style={styles.adInlineWrap}>
                  <AdvertiseCard
                    onPress={handleEmailPress}
                    width={rightRailAdWidth}
                    narrow={narrowAdLayout}
                  />
                </View>
              ) : null}

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
                      placeholderTextColor="#8070A0"
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
          <>
            {!useDesktopAdRail ? (
              <View style={styles.footerAdWrap}>
                <AdvertiseCard
                  onPress={handleEmailPress}
                  compact
                  width={useMobileAdLayout ? stackedAdWidth : rightRailAdWidth}
                  narrow={narrowAdLayout}
                />
              </View>
            ) : null}
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
          </>
        ) : null}
        </ScrollView>

        {useDesktopAdRail ? (
          <View style={[styles.desktopAdRail, { width: rightRailAdWidth }]}>
            <View style={styles.desktopAdRailStack}>
              <AdvertiseCard
                onPress={handleEmailPress}
                width={rightRailAdWidth}
                narrow={narrowAdLayout}
              />
              <AdvertiseCard
                onPress={handleEmailPress}
                compact
                width={rightRailAdWidth}
                narrow={narrowAdLayout}
              />
              <AdvertiseCard
                onPress={handleEmailPress}
                compact
                width={rightRailAdWidth}
                narrow={narrowAdLayout}
              />
            </View>
          </View>
        ) : null}
      </View>

      {Platform.OS === 'web'
        ? previewOverlayContent && typeof document !== 'undefined'
          ? createPortal(previewOverlayContent, document.body)
          : null
        : (
            <Modal
              visible={isImagePreviewVisible}
              animationType="none"
              transparent
              statusBarTranslucent
              onRequestClose={() => closeImagePreview(true)}
            >
              {previewOverlayContent}
            </Modal>
          )}
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

function createCustomDrink(form: CustomDrinkFormState, existingDrinks: Drink[]): Drink | null {
  const name = form.name.trim();
  const glass = form.glass.trim();
  const ingredients = parseCustomIngredients(form.ingredientsText);

  if (!name || !glass || !ingredients.length) {
    return null;
  }

  const category = form.category.trim() || 'Eigene Drinks';
  const ice = form.ice.trim() || 'Nach Barstandard';
  const method = parseCustomMethod(form.methodText, form.technique, glass, ice);
  const garnish = form.garnish.trim() || 'Keine Garnitur angegeben';

  return {
    id: createCustomDrinkId(name, existingDrinks),
    source: 'custom',
    name,
    category,
    technique: form.technique,
    difficulty: ingredients.length >= 5 || method.length >= 4 ? 'Mittel' : 'Leicht',
    glass,
    garnish,
    summary: `Eigener Drink fuer die lokale Bibliothek. Eis: ${ice}. Technik: ${form.technique}.`,
    germanNote:
      'Lokal angelegter Drink. Rezept, Glas, Eis und Bild bleiben auf diesem Geraet gespeichert.',
    proTip: `Beim Service ${ice.toLowerCase()} einplanen und den Hausstandard fuer ${glass} einhalten.`,
    ingredients,
    method,
    artwork: inferCustomArtwork(form, ingredients),
    cachedImageDataUrl: form.imageDataUrl || undefined,
  };
}

function parseCustomIngredients(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separated = line.match(/^(.+?)\s+(?:-|–|—|\|)\s+(.+)$/);
      if (separated) {
        return { amount: separated[1].trim(), item: separated[2].trim() };
      }

      const measured = line.match(
        /^((?:\d|[,.\/])+[\w\s,.\/]*?\s(?:cl|ml|oz|dash|dashes|barloeffel|barlöffel|tsp|tbsp|scheibe|spalte|zweig|wuerfel|würfel|stueck|stück))\s+(.+)$/i
      );
      if (measured) {
        return { amount: measured[1].trim(), item: measured[2].trim() };
      }

      return { amount: '', item: line };
    })
    .filter((ingredient) => ingredient.item);
}

function parseCustomMethod(
  value: string,
  technique: Drink['technique'],
  glass: string,
  ice: string
) {
  const explicitSteps = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (explicitSteps.length) {
    return explicitSteps;
  }

  if (technique === 'Shaken') {
    return [
      `Zutaten mit ${ice} in den Shaker geben.`,
      'Kräftig kalt shaken.',
      `In ein ${glass} abseihen und servieren.`,
    ];
  }

  if (technique === 'Rühren') {
    return [
      `Zutaten mit ${ice} im Rührglas kalt rühren.`,
      `In ein ${glass} abseihen und servieren.`,
    ];
  }

  if (technique === 'Blenden') {
    return [`Zutaten mit ${ice} blenden.`, `In ein ${glass} geben und servieren.`];
  }

  return [`${glass} mit ${ice} vorbereiten.`, 'Zutaten im Glas aufbauen und kurz anheben.'];
}

function createCustomDrinkId(name: string, existingDrinks: Drink[]) {
  const baseId = `custom-${normalizeDrinkKey(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'drink'}`;
  const usedIds = new Set(existingDrinks.map((drink) => drink.id));

  if (!usedIds.has(baseId)) {
    return baseId;
  }

  let index = 2;
  while (usedIds.has(`${baseId}-${index}`)) {
    index += 1;
  }

  return `${baseId}-${index}`;
}

function inferCustomArtwork(
  form: CustomDrinkFormState,
  ingredients: Array<{ amount: string; item: string }>
): DrinkArtworkSpec {
  const haystack = `${form.name} ${form.glass} ${form.ice} ${form.garnish} ${ingredients
    .map((ingredient) => ingredient.item)
    .join(' ')}`.toLowerCase();
  const glassStyle = inferCustomGlassStyle(form.glass);

  const garnish = haystack.includes('mint') || haystack.includes('minze')
    ? 'mint'
    : haystack.includes('orange')
      ? 'orange'
      : haystack.includes('lime') || haystack.includes('limette')
        ? 'lime'
        : haystack.includes('lemon') || haystack.includes('zitrone')
          ? 'lemon'
          : undefined;

  return {
    background: haystack.includes('kaffee') || haystack.includes('coffee')
      ? ['#1D1716', '#6C4C39']
      : ['#162C3A', '#7B4B62'],
    liquid: haystack.includes('cranberry') || haystack.includes('grenadine')
      ? ['#E35B78', '#9D163D']
      : ['#F1C96A', '#C77731'],
    glassStyle,
    garnish,
    bubbles:
      haystack.includes('soda') ||
      haystack.includes('tonic') ||
      haystack.includes('prosecco') ||
      haystack.includes('champagner'),
    ice: !haystack.includes('ohne eis'),
    straw: glassStyle === 'highball' || glassStyle === 'wine' || glassStyle === 'hurricane',
  };
}

function inferCustomGlassStyle(glass: string): DrinkArtworkSpec['glassStyle'] {
  const normalized = normalizeQuizLabel(glass);

  if (normalized.includes('martini')) return 'martini';
  if (normalized.includes('coupe') || normalized.includes('sour')) return 'coupe';
  if (normalized.includes('wine') || normalized.includes('wein')) return 'wine';
  if (normalized.includes('mule') || normalized.includes('becher') || normalized.includes('mug')) return 'mug';
  if (normalized.includes('hurricane')) return 'hurricane';
  if (normalized.includes('rocks') || normalized.includes('tumbler') || normalized.includes('old fashioned')) {
    return 'rocks';
  }

  return 'highball';
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
    backgroundColor: '#08000F',
  },
  pageShell: {
    flex: 1,
  },
  pageShellWithRail: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  pageMain: {
    flex: 1,
    minWidth: 0,
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
    backgroundColor: '#0D0A1A',
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(135deg, #0D0A1A 0%, #3D0066 55%, #220033 100%)' as never,
        boxShadow: '0px 14px 40px rgba(61, 0, 102, 0.7), 0px 0px 80px rgba(204, 0, 85, 0.12)' as never,
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.32,
        shadowRadius: 18,
        elevation: 10,
      },
    }),
  },
  heroTitle: {
    color: '#F5F0FF',
    fontSize: 37,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontFamily: Platform.select({ ios: 'Georgia', default: undefined }),
    ...Platform.select({
      web: {
        textShadow: '0 0 30px rgba(204, 0, 85, 0.4)' as never,
      },
      default: {},
    }),
  },
  heroSubtitle: {
    marginTop: 10,
    color: '#C8BADA',
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
  adSectionWrap: {
    marginTop: 5,
    marginBottom: 5,
    paddingHorizontal: 18,
  },
  adInlineWrap: {
    marginTop: 5,
    marginBottom: 5,
  },
  adCard: {
    borderRadius: 26,
    backgroundColor: '#1A0050',
    borderWidth: 0,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0px 10px 24px rgba(15, 0, 45, 0.28)' as never,
      },
      default: {
        shadowColor: '#150028',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 24,
        elevation: 5,
      },
    }),
  },
  adCardCompact: {
    borderRadius: 22,
  },
  adCardNarrow: {
    maxWidth: '100%',
  },
  adCardPressed: {
    opacity: 0.94,
  },
  adImage: {
    width: '100%',
    aspectRatio: 1.5,
  },
  adImageCompact: {
    aspectRatio: 1.5,
  },
  adDisclosureBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(8, 0, 20, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  adDisclosureBadgeCompact: {
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  adDisclosureText: {
    color: '#F5F0FF',
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  adCardInner: {
    padding: 14,
  },
  adDashedFrame: {
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#9B5EFF',
    paddingHorizontal: 22,
    paddingVertical: 18,
    backgroundColor: '#FAF5FF',
  },
  adDashedFrameNarrow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  adContentRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 18,
    flexWrap: 'wrap',
  },
  adContentRowNarrow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'nowrap',
  },
  adLeftColumn: {
    flex: 1,
    minWidth: 220,
    maxWidth: 500,
  },
  adLeftColumnNarrow: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  adHeadline: {
    color: '#1A0033',
    fontSize: 54,
    lineHeight: 50,
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  adHeadlineCompact: {
    fontSize: 28,
    lineHeight: 27,
  },
  adDividerRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    maxWidth: 380,
  },
  adDividerRowNarrow: {
    marginTop: 8,
    gap: 8,
    maxWidth: 180,
  },
  adDividerLine: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#9933FF',
    opacity: 0.86,
  },
  adDividerStar: {
    color: '#7722CC',
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '800',
  },
  adMessage: {
    marginTop: 20,
    color: '#2D0066',
    fontSize: 24,
    lineHeight: 34,
    fontWeight: '500',
    maxWidth: 420,
  },
  adMessageCompact: {
    fontSize: 14,
    lineHeight: 19,
  },
  adButton: {
    marginTop: 20,
    alignSelf: 'flex-start',
    minHeight: 68,
    borderRadius: 22,
    paddingHorizontal: 22,
    backgroundColor: '#7700CC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 16px rgba(120, 0, 200, 0.22)' as never,
      },
      default: {
        shadowColor: '#9933FF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
        elevation: 4,
      },
    }),
  },
  adButtonCompact: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  adButtonNarrow: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  adButtonIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '700',
  },
  adButtonIconNarrow: {
    fontSize: 16,
    lineHeight: 16,
  },
  adButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  adButtonTextCompact: {
    fontSize: 13,
    lineHeight: 15,
  },
  adRightColumn: {
    width: 330,
    alignItems: 'flex-end',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 260,
  },
  adRightColumnCompact: {
    width: 250,
    minHeight: 210,
  },
  adRightColumnNarrow: {
    width: 110,
    minHeight: 110,
    alignItems: 'flex-end',
  },
  adBrowserCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#9966FF',
    backgroundColor: '#FFFFFF',
    padding: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 18px rgba(153, 100, 255, 0.14)' as never,
      },
      default: {
        shadowColor: '#9966FF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
        elevation: 3,
      },
    }),
  },
  adBrowserCardNarrow: {
    padding: 8,
    borderRadius: 14,
  },
  adBrowserTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adBrowserTopRowNarrow: {
    gap: 4,
  },
  adBrowserTabActive: {
    width: 94,
    height: 28,
    borderRadius: 5,
    backgroundColor: '#9966FF',
  },
  adBrowserTabActiveNarrow: {
    width: 30,
    height: 10,
    borderRadius: 3,
  },
  adBrowserTab: {
    flex: 1,
    height: 24,
    borderRadius: 5,
    backgroundColor: '#EAE0FF',
  },
  adBrowserTabNarrow: {
    height: 8,
    borderRadius: 3,
  },
  adBrowserTabSmall: {
    width: 80,
    height: 24,
    borderRadius: 5,
    backgroundColor: '#EAE0FF',
  },
  adBrowserTabSmallNarrow: {
    width: 24,
    height: 8,
    borderRadius: 3,
  },
  adBrowserHero: {
    marginTop: 24,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#9966FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 12,
  },
  adBrowserHeroNarrow: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  adBrowserHeroText: {
    color: '#BB88FF',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  adBrowserHeroTextNarrow: {
    fontSize: 15,
    lineHeight: 16,
  },
  adBrowserBottomRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  adBrowserBottomRowNarrow: {
    marginTop: 8,
    gap: 6,
  },
  adBrowserTile: {
    width: 72,
    height: 58,
    borderRadius: 8,
    backgroundColor: '#E8D8FF',
  },
  adBrowserTileNarrow: {
    width: 26,
    height: 22,
    borderRadius: 5,
  },
  adBrowserTextStack: {
    flex: 1,
    gap: 10,
    paddingTop: 2,
  },
  adBrowserTextStackNarrow: {
    gap: 4,
    paddingTop: 0,
  },
  adBrowserLineLong: {
    height: 14,
    borderRadius: 999,
    backgroundColor: '#E8D8FF',
    width: '92%',
  },
  adBrowserLineMedium: {
    height: 14,
    borderRadius: 999,
    backgroundColor: '#E8D8FF',
    width: '86%',
  },
  adBrowserLineShort: {
    height: 14,
    borderRadius: 999,
    backgroundColor: '#E8D8FF',
    width: '70%',
  },
  adBrowserLineNarrow: {
    height: 5,
  },
  adBrowserLineShortNarrow: {
    height: 5,
    width: '58%',
  },
  adBrowserFooterStack: {
    marginTop: 18,
    gap: 10,
  },
  adBrowserFooterStackNarrow: {
    marginTop: 8,
    gap: 4,
  },
  adBrowserLineFull: {
    height: 14,
    borderRadius: 999,
    backgroundColor: '#E8D8FF',
    width: '100%',
  },
  adBrowserSparkTop: {
    position: 'absolute',
    right: -8,
    top: 6,
    gap: 8,
    alignItems: 'flex-end',
  },
  adBrowserSparkTopNarrow: {
    right: -5,
    top: 2,
    gap: 4,
  },
  adBrowserSparkBottom: {
    position: 'absolute',
    right: 4,
    bottom: 8,
    gap: 8,
    alignItems: 'flex-end',
  },
  adBrowserSparkBottomNarrow: {
    right: 1,
    bottom: 3,
    gap: 4,
  },
  adBrowserSparkShort: {
    width: 8,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#7722CC',
    transform: [{ rotate: '0deg' }],
  },
  adBrowserSparkShortNarrow: {
    width: 5,
    height: 18,
  },
  adBrowserSparkLong: {
    width: 8,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#7722CC',
    transform: [{ rotate: '30deg' }],
  },
  adBrowserSparkLongNarrow: {
    width: 5,
    height: 24,
  },
  adBrowserSparkMedium: {
    width: 8,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#7722CC',
    transform: [{ rotate: '68deg' }],
  },
  adBrowserSparkMediumNarrow: {
    width: 5,
    height: 16,
  },
  viewSwitchChip: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    backgroundColor: '#160C28',
    borderWidth: 1,
    borderColor: '#341F55',
  },
  viewSwitchChipActive: {
    backgroundColor: '#CC0055',
    borderColor: '#E6006B',
    ...Platform.select({
      web: { boxShadow: '0 0 14px rgba(204, 0, 85, 0.55)' as never },
      default: {},
    }),
  },
  viewSwitchChipPressed: {
    opacity: 0.94,
  },
  viewSwitchText: {
    color: '#B8A9CC',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  viewSwitchTextActive: {
    color: '#FFFFFF',
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 18,
  },
  libraryTopRow: {
    gap: 16,
  },
  libraryTopRowSplit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  libraryTopMain: {
    flex: 1,
    minWidth: 0,
  },
  libraryTopRail: {
    marginTop: 16,
    alignSelf: 'flex-end',
    width: '100%',
  },
  libraryTopRailSplit: {
    marginTop: 0,
    flexShrink: 0,
  },
  sectionTitle: {
    color: '#F5F0FF',
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontFamily: Platform.select({ ios: 'Georgia', default: undefined }),
  },
  sectionIntro: {
    color: '#A898BC',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  glasswareRow: {
    paddingTop: 16,
    paddingRight: 18,
    gap: 12,
  },
  glasswareGrid: {
    paddingTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  glassCard: {
    width: 220,
    borderRadius: 22,
    padding: 18,
    backgroundColor: '#100D1F',
    borderWidth: 1,
    borderColor: '#2D1A4A',
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
    color: '#FFB800',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  glassCardBody: {
    color: '#B8A9CC',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  glassCardSection: {
    marginBottom: 12,
  },
  glassCardSectionTitle: {
    color: '#FFB800',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  glassCardListItem: {
    color: '#C5B8DA',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 2,
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
    backgroundColor: '#120A20',
    borderWidth: 1,
    borderColor: '#2D1A4A',
  },
  lessonTitle: {
    color: '#F2E7D6',
    fontSize: 17,
    fontWeight: '700',
  },
  lessonBody: {
    marginTop: 10,
    color: '#C5B8DA',
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
    backgroundColor: '#100D1F',
    borderWidth: 1,
    borderColor: '#2D1A4A',
  },
  basicsTitle: {
    color: '#F5F0FF',
    fontSize: 18,
    fontWeight: '700',
  },
  basicsSummary: {
    marginTop: 8,
    color: '#C5B8DA',
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
    color: '#00F0FF',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  basicsChecklistText: {
    flex: 1,
    color: '#C8BADA',
    fontSize: 14,
    lineHeight: 21,
  },
  searchPanel: {
    marginTop: 16,
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#100D1F',
    borderWidth: 1,
    borderColor: '#2D1A4A',
    gap: 12,
  },
  customDrinkHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
  },
  customDrinkHeaderText: {
    flex: 1,
    minWidth: 260,
  },
  customDrinkToggleButton: {
    borderRadius: 18,
    backgroundColor: '#6600BB',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#8B3EFF',
  },
  customDrinkToggleButtonActive: {
    backgroundColor: '#160C28',
    borderColor: '#341F55',
  },
  customDrinkToggleButtonPressed: {
    opacity: 0.92,
  },
  customDrinkToggleButtonText: {
    color: '#F5F0FF',
    fontSize: 14,
    fontWeight: '700',
  },
  customDrinkForm: {
    marginTop: 16,
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#100D1F',
    borderWidth: 1,
    borderColor: '#2D1A4A',
    gap: 14,
  },
  customFormGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  customFormField: {
    flex: 1,
    minWidth: 240,
    gap: 8,
  },
  customFormLabel: {
    color: '#FFB300',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  customTextArea: {
    minHeight: 116,
    textAlignVertical: 'top',
  },
  customImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  customImagePreview: {
    width: 108,
    height: 108,
    borderRadius: 22,
    backgroundColor: '#0A0816',
    borderWidth: 1,
    borderColor: '#341F55',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  customImagePreviewImage: {
    width: '100%',
    height: '100%',
  },
  customImagePreviewText: {
    color: '#9080AC',
    fontSize: 12,
    fontWeight: '700',
  },
  customImageActions: {
    flex: 1,
    minWidth: 220,
    alignItems: 'flex-start',
    gap: 10,
  },
  customImageName: {
    color: '#C8BADA',
    fontSize: 13,
    lineHeight: 19,
  },
  customDrinkSavedMessage: {
    marginTop: 12,
    color: '#00F0FF',
    fontSize: 14,
    lineHeight: 20,
  },
  searchInput: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#341F55',
    backgroundColor: '#0A0816',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#EDE8FF',
    fontSize: 16,
  },
  searchButton: {
    borderRadius: 18,
    backgroundColor: '#CC0055',
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
    color: '#8870AC',
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
    color: '#00F0FF',
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
    backgroundColor: '#0B091C',
    borderWidth: 1,
    borderColor: '#2A1842',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  searchResultImage: {
    width: 92,
    height: 92,
    borderRadius: 20,
    backgroundColor: '#1A0F2A',
  },
  searchResultPlaceholder: {
    width: 92,
    height: 92,
    borderRadius: 20,
    backgroundColor: '#15091F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultPlaceholderText: {
    color: '#9080AC',
    fontSize: 12,
    fontWeight: '700',
  },
  searchResultBody: {
    flex: 1,
  },
  searchResultTitle: {
    color: '#F5F0FF',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Georgia', default: undefined }),
  },
  searchResultMeta: {
    color: '#9080AC',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  searchResultPreview: {
    color: '#C5B8DA',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  searchResultLabel: {
    color: '#FFB300',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: 10,
  },
  searchResultIngredients: {
    color: '#C8BADA',
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
    backgroundColor: '#6600BB',
  },
  searchActionButtonMuted: {
    backgroundColor: '#1A0F2A',
  },
  searchActionButtonDisabled: {
    opacity: 0.7,
  },
  searchActionButtonPressed: {
    opacity: 0.92,
  },
  searchActionButtonText: {
    color: '#F5F0FF',
    fontSize: 13,
    fontWeight: '700',
  },
  searchActionButtonTextMuted: {
    color: '#9080AC',
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
    backgroundColor: '#160C28',
    borderWidth: 1,
    borderColor: '#341F55',
  },
  filterChipActive: {
    backgroundColor: '#CC0055',
    borderColor: '#E6006B',
    ...Platform.select({
      web: { boxShadow: '0 0 12px rgba(204, 0, 85, 0.5)' as never },
      default: {},
    }),
  },
  filterChipPressed: {
    opacity: 0.92,
  },
  filterChipText: {
    color: '#B8A9CC',
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
    backgroundColor: '#100D1F',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2D1A4A',
    ...Platform.select({
      web: {
        boxShadow: '0px 10px 28px rgba(30, 0, 60, 0.45)' as never,
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
        elevation: 4,
      },
    }),
  },
  drinkCardExpanded: {
    borderColor: '#5A2090',
    ...Platform.select({
      web: { boxShadow: '0px 10px 28px rgba(90, 32, 144, 0.35), 0 0 0 1px #5A2090' as never },
      default: {},
    }),
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
    backgroundColor: '#7700AA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  primaryBadgeText: {
    color: '#F0E8FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  secondaryBadge: {
    backgroundColor: '#1A0F2A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  secondaryBadgeText: {
    color: '#FFB300',
    fontSize: 12,
    fontWeight: '700',
  },
  sourceBadge: {
    backgroundColor: '#1A0F2A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sourceBadgeText: {
    color: '#FFB300',
    fontSize: 12,
    fontWeight: '700',
  },
  removeDrinkButton: {
    backgroundColor: '#1A0F2A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3A2458',
  },
  removeDrinkButtonPressed: {
    opacity: 0.82,
  },
  removeDrinkButtonText: {
    color: '#D6C8EE',
    fontSize: 12,
    fontWeight: '700',
  },
  drinkName: {
    marginTop: 10,
    color: '#F5F0FF',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Georgia', default: undefined }),
  },
  drinkMeta: {
    color: '#9080AC',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  drinkSummary: {
    color: '#C5B8DA',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  inlineDetail: {
    marginTop: 12,
  },
  inlineLabel: {
    color: '#FFB300',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  inlineValue: {
    color: '#EDE8FF',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  tapHint: {
    marginTop: 14,
    color: '#9080AC',
    fontSize: 13,
    fontWeight: '600',
  },
  expandedArea: {
    marginTop: 18,
    gap: 16,
  },
  detailBlock: {
    backgroundColor: '#0A0816',
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  detailTitle: {
    color: '#00E5FF',
    fontSize: 17,
    fontWeight: '700',
    ...Platform.select({
      web: { textShadow: '0 0 12px rgba(0, 229, 255, 0.6)' as never },
      default: {},
    }),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailAmount: {
    width: 64,
    color: '#FFA500',
    fontSize: 14,
    fontWeight: '700',
  },
  detailText: {
    flex: 1,
    color: '#C8BADA',
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
    backgroundColor: '#2A1A42',
    color: '#FFB300',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 24,
  },
  tipPanel: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#0F0C1E',
    borderWidth: 1,
    borderColor: '#2D1A4A',
  },
  tipTitle: {
    color: '#FFA500',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  tipBody: {
    color: '#C5B8DA',
    fontSize: 14,
    lineHeight: 21,
  },
  emptyStateCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#100D1F',
    borderWidth: 1,
    borderColor: '#2D1A4A',
  },
  emptyStateTitle: {
    color: '#F5F0FF',
    fontSize: 20,
    fontWeight: '700',
  },
  emptyStateBody: {
    marginTop: 8,
    color: '#C5B8DA',
    fontSize: 14,
    lineHeight: 22,
  },
  footerCard: {
    marginTop: 28,
    marginHorizontal: 18,
    borderRadius: 26,
    padding: 20,
    backgroundColor: '#120A20',
  },
  footerTitle: {
    color: '#F5F0FF',
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 8,
  },
  footerBody: {
    color: '#C5B8DA',
    fontSize: 15,
    lineHeight: 22,
  },
  tipJarCard: {
    marginTop: 18,
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#120A20',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  tipJarLabel: {
    color: '#A898BC',
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
    color: '#A898BC',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 140,
    textAlign: 'right',
  },
  quizCard: {
    marginTop: 16,
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#100D1F',
    borderWidth: 1,
    borderColor: '#2D1A4A',
    gap: 12,
  },
  hintCard: {
    marginTop: 16,
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#140B22',
    borderWidth: 1,
    borderColor: '#2F1A50',
  },
  hintTitle: {
    color: '#EDE8FF',
    fontSize: 17,
    fontWeight: '700',
  },
  hintBody: {
    marginTop: 8,
    color: '#C5B8DA',
    fontSize: 14,
    lineHeight: 21,
  },
  quizStepLabel: {
    color: '#FFB300',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  quizDrinkName: {
    color: '#F5F0FF',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Georgia', default: undefined }),
  },
  quizDrinkMeta: {
    color: '#9080AC',
    fontSize: 14,
    lineHeight: 20,
  },
  quizDrinkPrompt: {
    color: '#C5B8DA',
    fontSize: 15,
    lineHeight: 22,
  },
  quizCardTitle: {
    color: '#EDE8FF',
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
    backgroundColor: '#160C28',
    borderWidth: 1,
    borderColor: '#341F55',
  },
  quizModeChipActive: {
    backgroundColor: '#CC0055',
    borderColor: '#E6006B',
  },
  quizModeChipPressed: {
    opacity: 0.94,
  },
  quizModeChipText: {
    color: '#B8A9CC',
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
    backgroundColor: '#0B091A',
    borderWidth: 1,
    borderColor: '#2F1A50',
  },
  statTileLabel: {
    color: '#9080AC',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statTileValue: {
    marginTop: 6,
    color: '#F5F0FF',
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
    backgroundColor: '#0B091A',
    borderWidth: 1,
    borderColor: '#2A1842',
  },
  mistakeDrinkName: {
    color: '#EDE8FF',
    fontSize: 15,
    fontWeight: '700',
  },
  mistakeMeta: {
    marginTop: 4,
    color: '#A898BC',
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
    backgroundColor: '#160C28',
    borderWidth: 1,
    borderColor: '#341F55',
  },
  quizGlassChipActive: {
    backgroundColor: '#CC0055',
    borderColor: '#E6006B',
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
    color: '#FFB300',
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
    backgroundColor: '#8B0038',
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
    backgroundColor: '#160C28',
    borderWidth: 1,
    borderColor: '#341F55',
  },
  ingredientChipActive: {
    backgroundColor: '#CC0055',
    borderColor: '#E6006B',
  },
  ingredientChipText: {
    color: '#C8BADA',
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
    backgroundColor: '#160C28',
    borderWidth: 1,
    borderColor: '#341F55',
  },
  inlineResetButtonDisabled: {
    opacity: 0.5,
  },
  inlineResetButtonPressed: {
    opacity: 0.92,
  },
  inlineResetButtonText: {
    color: '#E0D5F5',
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
    backgroundColor: '#0B091A',
    borderWidth: 1,
    borderColor: '#341F55',
  },
  buildSequenceText: {
    flex: 1,
    color: '#C8BADA',
    fontSize: 14,
    lineHeight: 21,
  },
  buildOptionsList: {
    gap: 10,
  },
  buildOptionChip: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#160C28',
    borderWidth: 1,
    borderColor: '#341F55',
  },
  buildOptionChipActive: {
    backgroundColor: '#CC0055',
    borderColor: '#E6006B',
  },
  buildOptionChipText: {
    color: '#C8BADA',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  buildOptionChipTextActive: {
    color: '#F4EEE4',
  },
  emptyIngredientState: {
    color: '#A898BC',
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
    backgroundColor: '#CC0055',
    ...Platform.select({
      web: { boxShadow: '0 0 22px rgba(204, 0, 85, 0.5)' as never },
      default: {},
    }),
  },
  serveButtonSuccess: {
    backgroundColor: '#00AA44',
  },
  serveButtonError: {
    backgroundColor: '#881A1A',
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
    color: '#F5F0FF',
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
    backgroundColor: '#0A1800',
    borderColor: '#006644',
  },
  feedbackCardWarning: {
    backgroundColor: '#1A0808',
    borderColor: '#6B0000',
  },
  feedbackCardInfo: {
    backgroundColor: '#0A0820',
    borderColor: '#2A1A55',
  },
  feedbackTitle: {
    color: '#F5F0FF',
    fontSize: 17,
    fontWeight: '700',
  },
  feedbackBody: {
    color: '#C5B8DA',
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
    backgroundColor: '#6600BB',
  },
  cheatButtonPressed: {
    opacity: 0.92,
  },
  cheatButtonText: {
    color: '#F5F0FF',
    fontSize: 13,
    fontWeight: '700',
  },
  answerReveal: {
    marginTop: 4,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#0B091A',
    borderWidth: 1,
    borderColor: '#2F1A50',
    gap: 8,
  },
  answerRevealTitle: {
    color: '#00E5FF',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  answerRevealBody: {
    color: '#C8BADA',
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
    color: '#FFA500',
    fontSize: 13,
    fontWeight: '700',
  },
  answerRevealText: {
    flex: 1,
    color: '#C8BADA',
    fontSize: 14,
    lineHeight: 21,
  },
  legalCard: {
    marginTop: 28,
    borderRadius: 26,
    padding: 20,
    backgroundColor: '#100D1F',
    borderWidth: 1,
    borderColor: '#2D1A4A',
    gap: 14,
  },
  legalPageHeader: {
    marginTop: 4,
    gap: 10,
  },
  legalPageKicker: {
    color: '#A898BC',
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
    backgroundColor: '#160C28',
    borderWidth: 1,
    borderColor: '#341F55',
  },
  legalBackButtonPressed: {
    opacity: 0.9,
  },
  legalBackButtonText: {
    color: '#E0D5F5',
    fontSize: 13,
    fontWeight: '700',
  },
  legalTitle: {
    color: '#F5F0FF',
    fontSize: 22,
    fontWeight: '700',
  },
  legalIntro: {
    color: '#A898BC',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  legalBlock: {
    gap: 4,
  },
  legalLabel: {
    color: '#FFA500',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  legalValue: {
    color: '#C8BADA',
    fontSize: 15,
    lineHeight: 22,
  },
  legalSubtle: {
    color: '#9080AC',
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
    color: '#00E5FF',
    fontSize: 15,
    lineHeight: 22,
    textDecorationLine: 'underline',
  },
  legalNotice: {
    color: '#9080AC',
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
  footerAdWrap: {
    marginTop: 5,
    marginBottom: 5,
    marginHorizontal: 18,
  },
  desktopAdRail: {
    paddingTop: 14,
    paddingRight: 18,
    paddingLeft: 6,
    paddingBottom: 18,
    flexShrink: 0,
  },
  desktopAdRailStack: {
    gap: 10,
  },
  legalFooterLinkWrap: {
    alignSelf: 'center',
  },
  legalFooterLink: {
    color: '#00C8E0',
    fontSize: 14,
    lineHeight: 20,
    textDecorationLine: 'underline',
  },
  legalFooterDivider: {
    color: '#5A4A7A',
    fontSize: 16,
    lineHeight: 20,
  },
  previewOverlay: {
    flex: 1,
    ...Platform.select({
      web: {
        position: 'fixed' as never,
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 9999,
      },
      default: null,
    }),
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  previewBackdropShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 0, 15, 0.92)',
    pointerEvents: 'none',
  },
  previewSafeArea: {
    flex: 1,
    pointerEvents: 'box-none',
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
    color: '#F5F0FF',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Georgia', default: undefined }),
  },
  previewCloseButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#160C28',
    borderWidth: 1,
    borderColor: '#3A2060',
  },
  previewCloseButtonPressed: {
    opacity: 0.9,
  },
  previewCloseButtonText: {
    color: '#E0D5F5',
    fontSize: 13,
    fontWeight: '700',
  },
  previewAnimatedFrame: {
    position: 'absolute',
    borderRadius: 30,
    backgroundColor: '#070412',
    borderWidth: 1,
    borderColor: '#2D1A4A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0px 18px 32px rgba(0, 0, 0, 0.22)' as never,
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.22,
        shadowRadius: 32,
        elevation: 8,
      },
    }),
  },
  previewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#100D1F',
  },
});
