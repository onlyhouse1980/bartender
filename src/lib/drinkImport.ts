import type { Drink, DrinkArtworkSpec } from '../data/bartending';

type IngredientIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

type CocktailDbDrink = {
  idDrink: string;
  strDrink: string;
  strCategory: string | null;
  strGlass: string | null;
  strInstructions: string | null;
  strInstructionsDE: string | null;
  strDrinkThumb: string | null;
} & {
  [key in `strIngredient${IngredientIndex}`]?: string | null;
} & {
  [key in `strMeasure${IngredientIndex}`]?: string | null;
};

export type WebDrinkSearchResult = {
  sourceId: string;
  name: string;
  category: string;
  glass: string;
  instructions: string;
  imageUrl?: string;
  ingredients: Array<{ amount: string; item: string }>;
  raw: CocktailDbDrink;
};

const COCKTAIL_DB_API_KEY = process.env.EXPO_PUBLIC_COCKTAIL_DB_API_KEY ?? '1';
const SEARCH_API_BASE = `https://www.thecocktaildb.com/api/json/v1/${COCKTAIL_DB_API_KEY}/search.php?s=`;
const INGREDIENT_INDEXES: IngredientIndex[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export async function searchWebDrinks(query: string): Promise<WebDrinkSearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const response = await fetch(`${SEARCH_API_BASE}${encodeURIComponent(trimmedQuery)}`);
  if (!response.ok) {
    throw new Error(`Websuche fehlgeschlagen (${response.status})`);
  }

  const payload = (await response.json()) as { drinks: CocktailDbDrink[] | null };
  const results = (payload.drinks ?? []).map((drink) => mapSearchResult(drink));
  const normalizedQuery = normalizeKey(trimmedQuery);

  return results.sort((left, right) => {
    const leftExact = normalizeKey(left.name) === normalizedQuery ? 1 : 0;
    const rightExact = normalizeKey(right.name) === normalizedQuery ? 1 : 0;
    return rightExact - leftExact;
  });
}

export function webResultToDrink(
  result: WebDrinkSearchResult,
  options?: { cachedImageDataUrl?: string }
): Drink {
  const instructions = splitInstructions(result.instructions);
  const garnish = inferGarnish(result);

  return {
    id: `web-${result.sourceId}`,
    sourceId: result.sourceId,
    source: 'web-import',
    name: result.name,
    category: result.category,
    technique: inferTechnique(result.instructions),
    difficulty: inferDifficulty(result.ingredients.length, instructions.length),
    glass: result.glass,
    garnish: garnish.label,
    summary: `Aus dem Web importierter Drink aus der Kategorie ${result.category}. Zutaten und Anleitung stammen aus TheCocktailDB.`,
    germanNote:
      'Per Websuche importiert. Online-Rezepte können sich je nach Quelle bei Mengen, Glas und Garnitur unterscheiden.',
    proTip:
      'Vergleiche das importierte Rezept kurz mit deinem Barstandard, bevor du den Drink im Service einsetzt.',
    ingredients: result.ingredients,
    method: instructions,
    artwork: inferArtwork(result, garnish.token),
    cachedImageDataUrl: options?.cachedImageDataUrl,
    imageUrl: result.imageUrl,
  };
}

export function normalizeDrinkKey(value: string) {
  return normalizeKey(value);
}

function mapSearchResult(drink: CocktailDbDrink): WebDrinkSearchResult {
  const instructions =
    cleanText(drink.strInstructionsDE) ??
    cleanText(drink.strInstructions) ??
    'Keine Anleitung in der Webquelle gefunden.';

  return {
    sourceId: drink.idDrink,
    name: cleanText(drink.strDrink) ?? 'Unbekannter Drink',
    category: translateCategory(cleanText(drink.strCategory)),
    glass: translateGlass(cleanText(drink.strGlass)),
    instructions,
    imageUrl: cleanText(drink.strDrinkThumb) ?? undefined,
    ingredients: collectIngredients(drink),
    raw: drink,
  };
}

function collectIngredients(drink: CocktailDbDrink) {
  const entries: Array<{ amount: string; item: string }> = [];

  for (const index of INGREDIENT_INDEXES) {
    const ingredientKey = `strIngredient${index}` as const;
    const measureKey = `strMeasure${index}` as const;
    const ingredient = cleanText(drink[ingredientKey]);
    const amount = cleanText(drink[measureKey]) ?? '';
    if (!ingredient) {
      continue;
    }

    entries.push({ amount, item: ingredient });
  }

  return entries;
}

function splitInstructions(instructions: string) {
  const lineBased = instructions
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lineBased.length > 1) {
    return lineBased;
  }

  const sentenceBased = instructions
    .split(/\.(?=\s+[A-ZÄÖÜ0-9])/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => (segment.endsWith('.') ? segment : `${segment}.`));

  return sentenceBased.length > 1 ? sentenceBased : [instructions.trim()];
}

function inferTechnique(instructions: string): Drink['technique'] {
  const normalized = instructions.toLowerCase();
  if (
    normalized.includes('shake') ||
    normalized.includes('shaker') ||
    normalized.includes('schütt') ||
    normalized.includes('geschütt')
  ) {
    return 'Shaken';
  }

  if (normalized.includes('blend') || normalized.includes('blender') || normalized.includes('mixer')) {
    return 'Blenden';
  }

  if (normalized.includes('stir') || normalized.includes('rühr') || normalized.includes('gerühr')) {
    return 'Rühren';
  }

  return 'Aufbauen';
}

function inferDifficulty(ingredientCount: number, methodCount: number): Drink['difficulty'] {
  return ingredientCount >= 5 || methodCount >= 4 ? 'Mittel' : 'Leicht';
}

function inferGarnish(result: WebDrinkSearchResult) {
  const haystack = `${result.instructions} ${result.ingredients
    .map((ingredient) => `${ingredient.amount} ${ingredient.item}`)
    .join(' ')}`.toLowerCase();

  if (haystack.includes('orange')) {
    return { label: 'Orange', token: 'orange' as DrinkArtworkSpec['garnish'] };
  }

  if (haystack.includes('limette') || haystack.includes('lime')) {
    return { label: 'Limette', token: 'lime' as DrinkArtworkSpec['garnish'] };
  }

  if (haystack.includes('grapefruit') || haystack.includes('pomelo')) {
    return { label: 'Grapefruit', token: 'grapefruit' as DrinkArtworkSpec['garnish'] };
  }

  if (haystack.includes('mint') || haystack.includes('minze')) {
    return { label: 'Minze', token: 'mint' as DrinkArtworkSpec['garnish'] };
  }

  if (haystack.includes('coffee') || haystack.includes('kaffee')) {
    return { label: 'Kaffeebohnen', token: 'coffee' as DrinkArtworkSpec['garnish'] };
  }

  if (haystack.includes('pineapple') || haystack.includes('ananas')) {
    return { label: 'Ananas', token: 'pineapple' as DrinkArtworkSpec['garnish'] };
  }

  if (haystack.includes('cherry') || haystack.includes('kirsche')) {
    return { label: 'Kirsche', token: 'cherry' as DrinkArtworkSpec['garnish'] };
  }

  if (haystack.includes('lemon') || haystack.includes('zitrone')) {
    return { label: 'Zitrone', token: 'lemon' as DrinkArtworkSpec['garnish'] };
  }

  return { label: 'Siehe Anleitung', token: undefined };
}

function inferArtwork(
  result: WebDrinkSearchResult,
  garnish?: DrinkArtworkSpec['garnish']
): DrinkArtworkSpec {
  const glassStyle = inferGlassStyle(result.glass);
  const haystack = `${result.name} ${result.category} ${result.instructions} ${result.ingredients
    .map((ingredient) => ingredient.item)
    .join(' ')}`.toLowerCase();

  let background: [string, string] = ['#1E3B45', '#7B4B36'];
  let liquid: [string, string] = ['#F0C36B', '#C26A2D'];

  if (haystack.includes('campari') || haystack.includes('aperol') || haystack.includes('orange')) {
    background = ['#2C1A1C', '#9A4A2B'];
    liquid = ['#F08D39', '#C0391E'];
  } else if (
    haystack.includes('mint') ||
    haystack.includes('minze') ||
    haystack.includes('lime') ||
    haystack.includes('limette')
  ) {
    background = ['#163D36', '#6BA35A'];
    liquid = ['#E7F3B3', '#BFD873'];
  } else if (haystack.includes('coffee') || haystack.includes('espresso') || haystack.includes('cola')) {
    background = ['#241916', '#6E4A39'];
    liquid = ['#5C372A', '#26130E'];
  } else if (
    haystack.includes('pineapple') ||
    haystack.includes('ananas') ||
    haystack.includes('coconut') ||
    haystack.includes('kokos')
  ) {
    background = ['#19423B', '#C36E2F'];
    liquid = ['#FFF1BC', '#E9D68D'];
  } else if (haystack.includes('grapefruit') || haystack.includes('cranberry')) {
    background = ['#2C2F48', '#E07A68'];
    liquid = ['#FFB29A', '#E3595B'];
  }

  const bubbles =
    haystack.includes('soda') ||
    haystack.includes('tonic') ||
    haystack.includes('prosecco') ||
    haystack.includes('champagne') ||
    haystack.includes('beer');

  return {
    background,
    liquid,
    glassStyle,
    garnish,
    bubbles,
    ice: true,
    straw: glassStyle === 'highball' || glassStyle === 'wine' || glassStyle === 'hurricane',
    foam:
      haystack.includes('egg white') ||
      haystack.includes('eiweiß') ||
      haystack.includes('cream') ||
      haystack.includes('crema'),
    saltRim: haystack.includes('salt') || haystack.includes('salzrand'),
  };
}

function inferGlassStyle(glass: string): DrinkArtworkSpec['glassStyle'] {
  const normalized = glass.toLowerCase();

  if (normalized.includes('martini')) {
    return 'martini';
  }

  if (normalized.includes('coupe') || normalized.includes('sour')) {
    return 'coupe';
  }

  if (normalized.includes('wine') || normalized.includes('weinglas') || normalized.includes('goblet')) {
    return 'wine';
  }

  if (normalized.includes('mug') || normalized.includes('becher')) {
    return 'mug';
  }

  if (normalized.includes('hurricane')) {
    return 'hurricane';
  }

  if (
    normalized.includes('old-fashioned') ||
    normalized.includes('rocks') ||
    normalized.includes('tumbler')
  ) {
    return 'rocks';
  }

  return 'highball';
}

function translateCategory(category: string | null) {
  switch (category) {
    case 'Ordinary Drink':
      return 'Klassische Drinks';
    case 'Cocktail':
      return 'Cocktails aus dem Web';
    case 'Punch / Party Drink':
      return 'Bowlen & Party';
    case 'Shake':
      return 'Shakes';
    case 'Cocoa':
      return 'Kakao';
    case 'Shot':
      return 'Shots';
    case 'Coffee / Tea':
      return 'Kaffee & Tee';
    case 'Homemade Liqueur':
      return 'Hausgemachte Liköre';
    case 'Beer':
      return 'Biermischgetränke';
    case 'Soft Drink / Soda':
      return 'Softdrinks & Soda';
    case 'Other / Unknown':
      return 'Sonstige Web-Drinks';
    default:
      return category ?? 'Web-Importe';
  }
}

function translateGlass(glass: string | null) {
  switch (glass) {
    case 'Old-fashioned glass':
      return 'Rocks-Glas';
    case 'Highball glass':
    case 'Collins glass':
      return 'Highball-Glas';
    case 'Cocktail glass':
      return 'Martiniglas';
    case 'Champagne flute':
      return 'Champagnerflöte';
    case 'Whiskey sour glass':
      return 'Sour-Glas';
    case 'Coffee mug':
      return 'Kaffeebecher';
    default:
      return glass ?? 'Unbekanntes Glas';
  }
}

function cleanText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeKey(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
