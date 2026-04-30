export type DrinkArtworkSpec = {
  background: [string, string];
  liquid: [string, string];
  glassStyle:
    | 'highball'
    | 'rocks'
    | 'coupe'
    | 'martini'
    | 'wine'
    | 'mug'
    | 'hurricane';
  garnish?:
    | 'orange'
    | 'lime'
    | 'mint'
    | 'coffee'
    | 'pineapple'
    | 'cherry'
    | 'grapefruit'
    | 'lemon';
  bubbles?: boolean;
  ice?: boolean;
  straw?: boolean;
  foam?: boolean;
  saltRim?: boolean;
};

export type Drink = {
  id: string;
  name: string;
  category: string;
  technique: 'Build' | 'Shake' | 'Stir' | 'Blend';
  difficulty: 'Easy' | 'Medium';
  glass: string;
  garnish: string;
  summary: string;
  germanNote: string;
  proTip: string;
  ingredients: Array<{ amount: string; item: string }>;
  method: string[];
  artwork: DrinkArtworkSpec;
};

export const lessons = [
  {
    title: 'Work in cl',
    body: 'German bars usually measure in centilitres. A clean 2/4 cl or 2.5/5 cl jigger keeps pours consistent and margins safe.',
  },
  {
    title: 'Fresh ice first',
    body: 'Fill the serving glass with fresh ice before you build. Cold glassware and solid cubes protect dilution and carbonation.',
  },
  {
    title: 'Know the technique',
    body: 'Build long drinks in the serving glass, shake citrus drinks hard, and stir spirit-forward classics until silky and cold.',
  },
  {
    title: 'Serve responsibly',
    body: 'Check ID when needed, offer water with strong drinks, and keep the station tidy. Speed matters, but clarity and safety matter more.',
  },
] as const;

export const glasswareGuide = [
  {
    name: 'Highball',
    use: 'Tall, chilled, and full of ice for long drinks like Mojito, Paloma, and Gin Tonic.',
  },
  {
    name: 'Rocks',
    use: 'Short tumbler for spirit-heavy drinks or crushed-ice serves such as Negroni and Caipirinha.',
  },
  {
    name: 'Wine Goblet',
    use: 'Large bowl for Spritz serves so sparkling wine, soda, garnish, and ice have room to breathe.',
  },
  {
    name: 'Coupe',
    use: 'Elegant stemmed glass for shaken drinks served up, including Margarita and Espresso Martini.',
  },
  {
    name: 'Martini Glass',
    use: 'Sharp, angular stemware for Cosmopolitan-style cocktails served without ice.',
  },
  {
    name: 'Mule Mug',
    use: 'Insulated mug for ginger beer drinks; a highball is an acceptable fallback in many bars.',
  },
  {
    name: 'Hurricane',
    use: 'Curved tropical glass for blended or juice-heavy drinks like Piña Colada.',
  },
] as const;

export const drinks: Drink[] = [
  {
    id: 'aperol-spritz',
    name: 'Aperol Spritz',
    category: 'Spritz & Aperitif',
    technique: 'Build',
    difficulty: 'Easy',
    glass: 'Wine goblet',
    garnish: 'Orange slice',
    summary: 'A low-effort, high-volume spritz that is common on German terraces and aperitif menus.',
    germanNote: 'Guests often expect a large goblet packed with ice, generous orange aroma, and a lively prosecco pour.',
    proTip: 'Build prosecco first and soda last to preserve sparkle and keep the bitterness balanced.',
    ingredients: [
      { amount: '9 cl', item: 'Prosecco' },
      { amount: '6 cl', item: 'Aperol' },
      { amount: '3 cl', item: 'Soda water' },
      { amount: '1 slice', item: 'Orange' },
    ],
    method: [
      'Fill a wine goblet with cubed ice.',
      'Pour in the prosecco, then Aperol.',
      'Top with soda water and give one gentle lift with the bar spoon.',
      'Garnish with the orange slice.',
    ],
    artwork: {
      background: ['#163A3B', '#D26A2E'],
      liquid: ['#FF8A2A', '#F0552D'],
      glassStyle: 'wine',
      garnish: 'orange',
      bubbles: true,
      ice: true,
      straw: true,
    },
  },
  {
    id: 'hugo',
    name: 'Hugo',
    category: 'Spritz & Aperitif',
    technique: 'Build',
    difficulty: 'Easy',
    glass: 'Wine goblet',
    garnish: 'Mint sprig and lime wheel',
    summary: 'A light elderflower spritz that sells strongly in spring and summer across German-speaking bars.',
    germanNote: 'Keep it fragrant, bright, and not overly sweet. Fresh mint should smell clean, not bruised.',
    proTip: 'Clap the mint once before adding it so the aroma lifts without turning grassy.',
    ingredients: [
      { amount: '12 cl', item: 'Prosecco' },
      { amount: '2 cl', item: 'Elderflower syrup' },
      { amount: '2 cl', item: 'Soda water' },
      { amount: '1 wheel', item: 'Lime' },
      { amount: '1 sprig', item: 'Mint' },
    ],
    method: [
      'Fill a wine goblet with cubed ice.',
      'Add elderflower syrup and prosecco.',
      'Top with soda water and stir very gently.',
      'Add the lime wheel and mint sprig.',
    ],
    artwork: {
      background: ['#0E3B3A', '#7FB09B'],
      liquid: ['#E6F5C0', '#C9E686'],
      glassStyle: 'wine',
      garnish: 'mint',
      bubbles: true,
      ice: true,
      straw: true,
    },
  },
  {
    id: 'gin-tonic',
    name: 'Gin Tonic',
    category: 'Highballs & Long Drinks',
    technique: 'Build',
    difficulty: 'Easy',
    glass: 'Highball',
    garnish: 'Lime wedge',
    summary: 'A staple call drink where clean dilution and fresh tonic matter more than complexity.',
    germanNote: 'Premium gin-and-tonic orders are common, so the garnish should support the gin botanicals rather than overpower them.',
    proTip: 'Use cold tonic and pour it down the inside of the glass to keep carbonation alive.',
    ingredients: [
      { amount: '5 cl', item: 'Gin' },
      { amount: '12 cl', item: 'Tonic water' },
      { amount: '1 wedge', item: 'Lime' },
    ],
    method: [
      'Fill a highball glass completely with fresh ice.',
      'Add the gin.',
      'Top with tonic water and give one careful lift from the bottom.',
      'Add the lime wedge or express it lightly before dropping it in.',
    ],
    artwork: {
      background: ['#123B4B', '#4A877E'],
      liquid: ['#E9F4DD', '#B8D6A8'],
      glassStyle: 'highball',
      garnish: 'lime',
      bubbles: true,
      ice: true,
    },
  },
  {
    id: 'moscow-mule',
    name: 'Moscow Mule',
    category: 'Highballs & Long Drinks',
    technique: 'Build',
    difficulty: 'Easy',
    glass: 'Mule mug or highball',
    garnish: 'Lime wedge',
    summary: 'Vodka, ginger beer, and lime make an easy seller with a sharp, refreshing finish.',
    germanNote: 'If the bar does not use copper mugs, serve it confidently in a chilled highball with plenty of ice.',
    proTip: 'A little extra lime sharpens the ginger beer and stops the drink tasting flat.',
    ingredients: [
      { amount: '5 cl', item: 'Vodka' },
      { amount: '1.5 cl', item: 'Fresh lime juice' },
      { amount: '12 cl', item: 'Ginger beer' },
      { amount: '1 wedge', item: 'Lime' },
    ],
    method: [
      'Fill a mule mug or highball with cubed ice.',
      'Add vodka and fresh lime juice.',
      'Top with ginger beer and stir once from the bottom.',
      'Garnish with the lime wedge.',
    ],
    artwork: {
      background: ['#152F46', '#A36E2E'],
      liquid: ['#F5CE62', '#E09428'],
      glassStyle: 'mug',
      garnish: 'lime',
      bubbles: true,
      ice: true,
    },
  },
  {
    id: 'mojito',
    name: 'Mojito',
    category: 'Highballs & Long Drinks',
    technique: 'Build',
    difficulty: 'Medium',
    glass: 'Highball',
    garnish: 'Mint bouquet and lime wedge',
    summary: 'A mint-and-rum long drink that teaches balance, carbonation, and how to handle fresh herbs.',
    germanNote: 'Many beginners over-muddle mint. German guests usually prefer it crisp and refreshing, not bitter and grassy.',
    proTip: 'Press the mint gently with the syrup and lime juice; never shred it into the drink.',
    ingredients: [
      { amount: '5 cl', item: 'White rum' },
      { amount: '2 cl', item: 'Fresh lime juice' },
      { amount: '2 cl', item: 'Sugar syrup' },
      { amount: '8 leaves', item: 'Mint' },
      { amount: '6 cl', item: 'Soda water' },
    ],
    method: [
      'Place mint, sugar syrup, and lime juice in a highball glass.',
      'Press the mint lightly to release aroma.',
      'Add rum, fill with crushed or cubed ice, and churn briefly with the bar spoon.',
      'Top with soda water, add more ice if needed, and crown with mint and a lime wedge.',
    ],
    artwork: {
      background: ['#133F36', '#5F995E'],
      liquid: ['#D9F0A3', '#B5DB74'],
      glassStyle: 'highball',
      garnish: 'mint',
      bubbles: true,
      ice: true,
      straw: true,
    },
  },
  {
    id: 'caipirinha',
    name: 'Caipirinha',
    category: 'Highballs & Long Drinks',
    technique: 'Build',
    difficulty: 'Medium',
    glass: 'Rocks glass',
    garnish: 'Lime wedge',
    summary: 'A crushed-lime classic that trains muddling, sweetness control, and a fast churn over ice.',
    germanNote: 'This remains a familiar order in casual German bars, but it should taste fresh rather than sugary.',
    proTip: 'Muddle just enough to release juice from the lime. Crushing the pith makes the drink harsh.',
    ingredients: [
      { amount: '6 cl', item: 'Cachaca' },
      { amount: '1 whole', item: 'Lime cut into wedges' },
      { amount: '2 tsp', item: 'White sugar' },
      { amount: 'As needed', item: 'Crushed ice' },
    ],
    method: [
      'Place lime wedges and sugar in a rocks glass.',
      'Muddle firmly but briefly to release juice.',
      'Fill the glass with crushed ice, add cachaca, and churn until evenly mixed.',
      'Top with more crushed ice and garnish with a small lime wedge if desired.',
    ],
    artwork: {
      background: ['#214739', '#C39C3B'],
      liquid: ['#E8E2A2', '#C7B95E'],
      glassStyle: 'rocks',
      garnish: 'lime',
      ice: true,
      straw: true,
    },
  },
  {
    id: 'cuba-libre',
    name: 'Cuba Libre',
    category: 'Highballs & Long Drinks',
    technique: 'Build',
    difficulty: 'Easy',
    glass: 'Highball',
    garnish: 'Lime wedge',
    summary: 'Rum, cola, and lime done properly. The lime is the difference between a mixed drink and a real Cuba Libre.',
    germanNote: 'Late-night bar guests know this drink well, so speed matters, but it still needs a bright lime note.',
    proTip: 'Use enough ice to keep the cola lively and avoid a watery finish.',
    ingredients: [
      { amount: '5 cl', item: 'Light or golden rum' },
      { amount: '1 cl', item: 'Fresh lime juice' },
      { amount: '12 cl', item: 'Cola' },
      { amount: '1 wedge', item: 'Lime' },
    ],
    method: [
      'Fill a highball glass with cubed ice.',
      'Add rum and lime juice.',
      'Top with cola and stir once from the bottom.',
      'Garnish with the lime wedge.',
    ],
    artwork: {
      background: ['#241A1B', '#6A4332'],
      liquid: ['#5F3324', '#311813'],
      glassStyle: 'highball',
      garnish: 'lime',
      ice: true,
    },
  },
  {
    id: 'whiskey-sour',
    name: 'Whiskey Sour',
    category: 'Sours & Citrus',
    technique: 'Shake',
    difficulty: 'Medium',
    glass: 'Rocks glass',
    garnish: 'Angostura bitters and lemon zest',
    summary: 'A foundational sour that teaches proper shake texture, citrus balance, and optional egg white handling.',
    germanNote: 'Many modern bars in Germany serve this over ice with a silky foam cap and a restrained bitters pattern.',
    proTip: 'If using egg white, dry-shake first for texture, then shake again with ice for chill and dilution.',
    ingredients: [
      { amount: '5 cl', item: 'Bourbon or rye whiskey' },
      { amount: '3 cl', item: 'Fresh lemon juice' },
      { amount: '2 cl', item: 'Sugar syrup' },
      { amount: '2 cl', item: 'Egg white (optional)' },
      { amount: '2 dashes', item: 'Angostura bitters' },
    ],
    method: [
      'Add all liquid ingredients to a shaker.',
      'Dry-shake first if using egg white, then add ice and shake hard.',
      'Double strain into a rocks glass over fresh ice.',
      'Finish with bitters on the foam and a small lemon zest expression.',
    ],
    artwork: {
      background: ['#2A2216', '#A56B2E'],
      liquid: ['#F3C761', '#D18C2E'],
      glassStyle: 'rocks',
      garnish: 'lemon',
      ice: true,
      foam: true,
    },
  },
  {
    id: 'espresso-martini',
    name: 'Espresso Martini',
    category: 'Dessert & After-Dinner',
    technique: 'Shake',
    difficulty: 'Medium',
    glass: 'Coupe',
    garnish: 'Three coffee beans',
    summary: 'A modern classic that teaches hard shaking, coffee freshness, and how to pour a stable crema.',
    germanNote: 'This is a frequent late-evening order. Fresh, hot espresso gives the best foam and aroma.',
    proTip: 'Shake longer than you think. The foam should sit as a smooth cap, not a few scattered bubbles.',
    ingredients: [
      { amount: '5 cl', item: 'Vodka' },
      { amount: '3 cl', item: 'Coffee liqueur' },
      { amount: '3 cl', item: 'Fresh espresso' },
      { amount: '1 cl', item: 'Sugar syrup' },
    ],
    method: [
      'Add all ingredients to a shaker filled with ice.',
      'Shake hard until the tin is thoroughly chilled and frosty.',
      'Double strain into a chilled coupe.',
      'Place three coffee beans on the crema.',
    ],
    artwork: {
      background: ['#271B17', '#7A523C'],
      liquid: ['#533328', '#25120D'],
      glassStyle: 'coupe',
      garnish: 'coffee',
      foam: true,
    },
  },
  {
    id: 'margarita',
    name: 'Margarita',
    category: 'Sours & Citrus',
    technique: 'Shake',
    difficulty: 'Medium',
    glass: 'Coupe',
    garnish: 'Half salt rim and lime wheel',
    summary: 'A bartender benchmark for sour balance and clean coupe service.',
    germanNote: 'A half-rim is practical in service because guests can choose each sip with or without salt.',
    proTip: 'A fresh saline edge and a cold coupe sharpen the drink more effectively than extra lime.',
    ingredients: [
      { amount: '5 cl', item: 'Tequila blanco' },
      { amount: '3 cl', item: 'Triple sec or Cointreau' },
      { amount: '2.5 cl', item: 'Fresh lime juice' },
    ],
    method: [
      'Prepare a chilled coupe with a half salt rim.',
      'Add all ingredients to a shaker with ice and shake hard.',
      'Double strain into the prepared coupe.',
      'Garnish with a lime wheel or a small lime wedge.',
    ],
    artwork: {
      background: ['#1E3F3A', '#C59A40'],
      liquid: ['#F6E39A', '#E1C667'],
      glassStyle: 'coupe',
      garnish: 'lime',
      saltRim: true,
    },
  },
  {
    id: 'negroni',
    name: 'Negroni',
    category: 'Spirit Forward',
    technique: 'Stir',
    difficulty: 'Easy',
    glass: 'Rocks glass',
    garnish: 'Orange peel',
    summary: 'One of the easiest drinks to build incorrectly. Precision and dilution matter because every part is bitter and strong.',
    germanNote: 'A clean block of ice and a bright orange expression make this read as premium immediately.',
    proTip: 'Stir until the edges soften, then strain over fresh ice instead of serving on the same wet mixing ice.',
    ingredients: [
      { amount: '3 cl', item: 'Gin' },
      { amount: '3 cl', item: 'Campari' },
      { amount: '3 cl', item: 'Sweet vermouth' },
    ],
    method: [
      'Add all ingredients to a mixing glass filled with ice.',
      'Stir until cold and slightly diluted.',
      'Strain into a rocks glass over fresh ice.',
      'Express an orange peel over the drink and place it neatly on top.',
    ],
    artwork: {
      background: ['#2A1115', '#7E2F2B'],
      liquid: ['#B22E1A', '#781010'],
      glassStyle: 'rocks',
      garnish: 'orange',
      ice: true,
    },
  },
  {
    id: 'cosmopolitan',
    name: 'Cosmopolitan',
    category: 'Sours & Citrus',
    technique: 'Shake',
    difficulty: 'Easy',
    glass: 'Martini glass',
    garnish: 'Orange zest',
    summary: 'A clean, pink classic that teaches good shake dilution and elegant stemware service.',
    germanNote: 'Keep the colour bright and the drink dry. Too much cranberry turns it into juice.',
    proTip: 'Double strain for a polished surface and keep the coupe or martini glass very cold.',
    ingredients: [
      { amount: '4 cl', item: 'Citrus vodka' },
      { amount: '2 cl', item: 'Cointreau' },
      { amount: '1.5 cl', item: 'Fresh lime juice' },
      { amount: '3 cl', item: 'Cranberry juice' },
    ],
    method: [
      'Add all ingredients to a shaker with ice.',
      'Shake hard until the tin is very cold.',
      'Double strain into a chilled martini glass.',
      'Express a small orange zest over the surface.',
    ],
    artwork: {
      background: ['#331B2E', '#9A4F67'],
      liquid: ['#FF7A8D', '#D6466F'],
      glassStyle: 'martini',
      garnish: 'orange',
    },
  },
  {
    id: 'paloma',
    name: 'Paloma',
    category: 'Highballs & Long Drinks',
    technique: 'Build',
    difficulty: 'Easy',
    glass: 'Highball',
    garnish: 'Grapefruit wedge',
    summary: 'A bright tequila highball that is easy to sell to guests who want something lighter than a Margarita.',
    germanNote: 'When grapefruit soda is sweet, a pinch of salt or a fresher lime squeeze keeps the drink in balance.',
    proTip: 'Build it tall and cold. The carbonation should do the lifting, not added sugar syrup.',
    ingredients: [
      { amount: '5 cl', item: 'Tequila blanco' },
      { amount: '1.5 cl', item: 'Fresh lime juice' },
      { amount: '12 cl', item: 'Pink grapefruit soda' },
      { amount: 'Pinch', item: 'Salt (optional)' },
    ],
    method: [
      'Fill a highball glass with ice.',
      'Add tequila and lime juice.',
      'Top with pink grapefruit soda and a tiny pinch of salt if needed.',
      'Stir once and garnish with a grapefruit wedge.',
    ],
    artwork: {
      background: ['#2E364A', '#F38C70'],
      liquid: ['#FFB090', '#F16854'],
      glassStyle: 'highball',
      garnish: 'grapefruit',
      bubbles: true,
      ice: true,
    },
  },
  {
    id: 'pina-colada',
    name: 'Piña Colada',
    category: 'Tropical & Party',
    technique: 'Blend',
    difficulty: 'Medium',
    glass: 'Hurricane glass',
    garnish: 'Pineapple wedge and cherry',
    summary: 'Creamy, tropical, and useful for learning how texture changes when you blend or whip-shake.',
    germanNote: 'Even when the bar does not have a blender running, a strong shake with crushed ice can still make a convincing serve.',
    proTip: 'Use enough coconut cream for body, but keep the finish bright with proper pineapple acidity.',
    ingredients: [
      { amount: '5 cl', item: 'White rum' },
      { amount: '9 cl', item: 'Pineapple juice' },
      { amount: '3 cl', item: 'Coconut cream' },
      { amount: '1 cl', item: 'Fresh lime juice' },
      { amount: '1 cup', item: 'Crushed ice' },
    ],
    method: [
      'Add all ingredients to a blender with crushed ice.',
      'Blend until smooth and thick, but still pourable.',
      'Pour into a chilled hurricane glass.',
      'Garnish with pineapple and a cherry.',
    ],
    artwork: {
      background: ['#19443F', '#C26C2E'],
      liquid: ['#FFF4C4', '#E7D48A'],
      glassStyle: 'hurricane',
      garnish: 'pineapple',
      straw: true,
    },
  },
  {
    id: 'sex-on-the-beach',
    name: 'Sex on the Beach',
    category: 'Tropical & Party',
    technique: 'Build',
    difficulty: 'Easy',
    glass: 'Highball',
    garnish: 'Orange half-wheel',
    summary: 'A familiar party-style fruit drink that trains layering, colour control, and a balanced sweet profile.',
    germanNote: 'This should taste cleaner than it sounds. Keep the juices cold and avoid overpouring peach liqueur.',
    proTip: 'Cranberry can overpower the colour quickly, so add it carefully at the end of the build.',
    ingredients: [
      { amount: '4 cl', item: 'Vodka' },
      { amount: '2 cl', item: 'Peach liqueur' },
      { amount: '4 cl', item: 'Orange juice' },
      { amount: '4 cl', item: 'Cranberry juice' },
    ],
    method: [
      'Fill a highball glass with ice.',
      'Add vodka, peach liqueur, and orange juice.',
      'Top with cranberry juice to create a sunset colour.',
      'Stir lightly and garnish with orange.',
    ],
    artwork: {
      background: ['#2F1E36', '#F07B5B'],
      liquid: ['#FFB56E', '#E7535E'],
      glassStyle: 'highball',
      garnish: 'orange',
      ice: true,
      straw: true,
    },
  },
  {
    id: 'white-russian',
    name: 'White Russian',
    category: 'Dessert & After-Dinner',
    technique: 'Build',
    difficulty: 'Easy',
    glass: 'Rocks glass',
    garnish: 'None or light nutmeg',
    summary: 'A creamy vodka classic that teaches layering and how dairy changes the mouthfeel of a short drink.',
    germanNote: 'Serve it cold and concise. Guests ordering this usually want a rich after-dinner drink, not a diluted milkshake.',
    proTip: 'Float the cream last if you want a two-tone look, then let the guest decide when to stir it in.',
    ingredients: [
      { amount: '5 cl', item: 'Vodka' },
      { amount: '2 cl', item: 'Coffee liqueur' },
      { amount: '3 cl', item: 'Cream' },
    ],
    method: [
      'Fill a rocks glass with ice.',
      'Add vodka and coffee liqueur.',
      'Float or pour the cream over the top.',
      'Serve with a short stir only if the guest prefers it integrated.',
    ],
    artwork: {
      background: ['#261A17', '#82604E'],
      liquid: ['#F4E2C5', '#7B4E3D'],
      glassStyle: 'rocks',
      foam: true,
      ice: true,
    },
  },
  {
    id: 'tequila-sunrise',
    name: 'Tequila Sunrise',
    category: 'Tropical & Party',
    technique: 'Build',
    difficulty: 'Easy',
    glass: 'Highball',
    garnish: 'Orange slice and cherry',
    summary: 'A colourful beginner drink that teaches controlled layering and presentation.',
    germanNote: 'Build it carefully enough that the red-to-orange fade stays visible when it leaves the bar.',
    proTip: 'Add grenadine last without stirring too hard so it settles and creates the sunrise effect.',
    ingredients: [
      { amount: '5 cl', item: 'Tequila blanco' },
      { amount: '10 cl', item: 'Orange juice' },
      { amount: '1 cl', item: 'Grenadine' },
    ],
    method: [
      'Fill a highball glass with ice.',
      'Add tequila and orange juice, then stir.',
      'Slowly pour grenadine so it sinks through the drink.',
      'Garnish with orange and cherry.',
    ],
    artwork: {
      background: ['#2B2154', '#F38C44'],
      liquid: ['#FFCF69', '#EF4B4B'],
      glassStyle: 'highball',
      garnish: 'cherry',
      ice: true,
      straw: true,
    },
  },
  {
    id: 'mai-tai',
    name: 'Mai Tai',
    category: 'Tropical & Party',
    technique: 'Shake',
    difficulty: 'Medium',
    glass: 'Rocks glass',
    garnish: 'Mint and lime shell',
    summary: 'A deeper tropical classic that teaches layered rum flavour, nut syrup balance, and a compact crushed-ice serve.',
    germanNote: 'If the bar stocks multiple rums, explain the flavour profile confidently. Guests often treat this as a premium tropical order.',
    proTip: 'Orgeat should support the drink, not dominate it. Keep the lime sharp and the rum dry.',
    ingredients: [
      { amount: '4 cl', item: 'Dark rum' },
      { amount: '2 cl', item: 'Aged or white rum' },
      { amount: '1.5 cl', item: 'Orange curaçao' },
      { amount: '1.5 cl', item: 'Orgeat syrup' },
      { amount: '2.5 cl', item: 'Fresh lime juice' },
    ],
    method: [
      'Add all ingredients to a shaker with ice.',
      'Shake hard and dirty-dump into a rocks glass.',
      'Top with crushed ice and gently swizzle if needed.',
      'Garnish with mint and an inverted lime shell.',
    ],
    artwork: {
      background: ['#152A3A', '#B65D34'],
      liquid: ['#E0A94F', '#9A421E'],
      glassStyle: 'rocks',
      garnish: 'mint',
      ice: true,
      straw: true,
    },
  },
  {
    id: 'old-fashioned',
    name: 'Old Fashioned',
    category: 'Spirit Forward',
    technique: 'Stir',
    difficulty: 'Easy',
    glass: 'Rocks glass',
    garnish: 'Orange peel',
    summary: 'A short whiskey classic that shows whether a bartender can dilute with control and keep a spirit drink clean.',
    germanNote: 'In many German hotel and cocktail bars this is a trust-building order. Guests notice oversized pours, too much sugar, and sloppy garnish immediately.',
    proTip: 'Aim for cold, smooth, and lightly sweet. If the bitters are loud, the drink is not integrated yet.',
    ingredients: [
      { amount: '5 cl', item: 'Bourbon or rye whiskey' },
      { amount: '0.75 cl', item: 'Sugar syrup' },
      { amount: '2 dashes', item: 'Angostura bitters' },
    ],
    method: [
      'Add whiskey, syrup, and bitters to a mixing glass with ice.',
      'Stir until thoroughly chilled and slightly softened.',
      'Strain into a rocks glass over a large ice cube.',
      'Express an orange peel over the drink and place it neatly in the glass.',
    ],
    artwork: {
      background: ['#1F1712', '#7A4D2B'],
      liquid: ['#C27C31', '#7B3F15'],
      glassStyle: 'rocks',
      garnish: 'orange',
      ice: true,
    },
  },
];

export const categoryLabels = ['All', ...new Set(drinks.map((drink) => drink.category))];
