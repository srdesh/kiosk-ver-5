/* Wild Bowls kiosk – menu data.
   Names, descriptions, CHF prices, sizes and add-ons come from wild-bowls.com/menu and the
   Wild Bowls pickup webshop (autumn 2026). Photos come from the same sources (assets/img).
   Açaí toppings, the Wild Combo, rewards, coupons and promo codes are prototype values. */

const IMG = (n) => `assets/img/${n}.jpg`;

const CATEGORIES = [
  { id: 'popular',   label: 'Popular',          icon: 'favorite',          title: 'Crowd favourites', sub: 'The bowls Zurich keeps coming back for.' },
  { id: 'acai',      label: 'Açaí bowls',       icon: 'icecream',          title: 'Açaí & smoothie bowls', sub: 'Organic açaí, blended thick and creamy. All day, all vegan.' },
  { id: 'hearty',    label: 'Hearty bowls',     icon: 'ramen_dining',      title: 'Hearty Bowls', sub: 'Lunch from 11 am. Vegan base and sauces, protein your way.' },
  { id: 'toast',     label: 'Toast & brunch',   icon: 'breakfast_dining',  title: 'Toast & brunch', sub: 'Avo toast all day. Protein pancakes at the weekend.' },
  { id: 'deals',     label: 'Build your own',   icon: 'tune',              title: 'Build your own', sub: 'Pick every layer yourself, or grab a combo.' },
  { id: 'smoothies', label: 'Smoothies',        icon: 'blender',           title: 'Smoothies', sub: '400 ml, blended to order.' },
  { id: 'refresher', label: 'Refreshers',       icon: 'local_drink',       title: 'Refreshers', sub: 'Agua fresca, Swiss kombucha on tap and cold bottles.' },
  { id: 'coffee',    label: 'Coffee & matcha',  icon: 'coffee',            title: 'Coffee, matcha & tea', sub: 'Organic coffee, ceremonial-grade matcha, chai and infusions.' },
  { id: 'sweets',    label: 'Sweet treats',     icon: 'cookie',            title: 'Sweet treats', sub: 'Energy balls for later. No refined sugar.' },
];

/* Items of these types open the customise stepper (size / protein → toppings → leave out → combo). */
const CUSTOM_TYPES = ['acai', 'hearty', 'toast'];

/* Step 1 of the stepper: sizes for açaí bowls, protein or side for hearty bowls. */
const SIZES = (m, l) => ({ title: 'Pick your size', sub: 'Every bowl is blended fresh to order.', opts: [
  { id: 's', name: 'Small',  sub: 'A light bite',        price: 0, icon: 'rice_bowl' },
  { id: 'm', name: 'Medium', sub: 'Our most popular',    price: m, icon: 'rice_bowl' },
  { id: 'l', name: 'Large',  sub: 'For a big appetite',  price: l, icon: 'rice_bowl' } ] });
const P = {
  tofu:    { id: 'tofu',    name: 'Sesame-tamari tofu',          sub: 'Vegan',                     icon: 'eco' },
  planted: { id: 'planted', name: 'Planted Chicken',             sub: 'Plant-based',               icon: 'nutrition' },
  bbq:     { id: 'bbq',     name: 'BBQ Planted Chicken',         sub: 'Plant-based',               icon: 'nutrition' },
  salmon:  { id: 'salmon',  name: 'Smoked wild salmon',          sub: 'Approx. 80 g',              icon: 'set_meal' },
  chicken: { id: 'chicken', name: 'Swiss Organic Chicken Breast', sub: 'Approx. 110 g · Bleicherweg', icon: 'egg_alt' },
};
const PROTEIN = (...opts) => ({ title: 'Choose your protein', sub: 'Vegan base and sauces. Pick what goes on top.', opts: opts.map(([k, price]) => ({ ...P[k], price })) });

const ITEMS = [
  // Açaí & smoothie bowls
  { id: 'winter-snickers',  cat: ['acai', 'popular', 'special'], type: 'acai', name: 'Winter Snickers', price: 13.90, img: 'winter-snickers', bases: SIZES(3.00, 7.50),
    desc: 'Snickers blend with plum compote, banana, Peanut Crumble (gf) and cacao nibs.', ing: ['Plum compote', 'Banana', 'Peanut Crumble', 'Cacao nibs'], tags: ['Vegan', 'Seasonal'], badge: 'Seasonal' },
  { id: 'original-bowl',    cat: ['acai', 'popular'], type: 'acai', name: 'Original Bowl', price: 12.90, img: 'original-bowl', bases: SIZES(3.00, 7.00),
    desc: 'Our organic açaí and banana blend with Classic Granola, banana, blueberries and hemp seeds.', ing: ['Classic Granola', 'Banana', 'Blueberries', 'Hemp seeds'], tags: ['Vegan', 'Organic açaí'] },
  { id: 'berry-nice',       cat: ['acai'], type: 'acai', name: 'Berry Nice Bowl', price: 13.90, img: 'berry-nice', bases: SIZES(3.00, 7.00),
    desc: 'Our organic açaí and banana blend with Classic Granola, strawberries, blueberries, goji berries and coconut flakes.', ing: ['Classic Granola', 'Strawberries', 'Blueberries', 'Goji berries', 'Coconut flakes'], tags: ['Vegan', 'Organic açaí'] },
  { id: 'go-nuts',          cat: ['acai'], type: 'acai', name: 'Go Nuts Bowl', price: 13.90, img: 'go-nuts', bases: SIZES(3.00, 7.00),
    desc: 'Our organic açaí and banana blend with Peanut Crumble Granola (gf), kiwi, banana, cacao nibs and peanut butter.', ing: ['Peanut Crumble Granola', 'Kiwi', 'Banana', 'Cacao nibs', 'Peanut butter'], tags: ['Vegan', 'Organic açaí'] },
  { id: 'snickers-protein', cat: ['acai', 'popular'], type: 'acai', name: 'Snickers Protein Bowl', price: 13.90, img: 'snickers-protein', bases: SIZES(3.00, 7.50),
    desc: 'Coconut, banana, protein powder, cacao, peanut butter, mesquite and dates. Topped with Peanut Crumble Granola (gf), protein crispies, strawberries and banana.', ing: ['Peanut Crumble Granola', 'Cacao', 'Protein crispies', 'Peanut butter', 'Strawberries', 'Banana'], tags: ['Vegan', 'Protein'] },
  { id: 'layered',          cat: ['acai'], type: 'acai', name: 'Layered Açaí & Snickers Bowl', price: 16.90, img: 'layered',
    bases: { title: 'Pick your size', sub: 'Layers of açaí and Snickers blend.', opts: [{ id: 'm', name: 'Medium', sub: 'Our most popular', price: 0, icon: 'rice_bowl' }, { id: 'l', name: 'Large', sub: 'For a big appetite', price: 4.50, icon: 'rice_bowl' }] },
    desc: 'Layers of our organic açaí blend and Snickers blend, topped with Peanut Crumble Granola (gf), cacao, protein crispies, peanut butter, strawberries and banana.', ing: ['Peanut Crumble Granola', 'Cacao', 'Protein crispies', 'Peanut butter', 'Strawberries', 'Banana'], tags: ['Vegan', 'Protein'] },

  // Hearty Bowls
  { id: 'harvest-poke', cat: ['hearty', 'popular', 'special'], type: 'hearty', name: 'Harvest Poké', price: 24.90, img: 'harvest-poke', bases: PROTEIN(['tofu', 0], ['bbq', 1.00], ['salmon', 3.00], ['chicken', 5.00]),
    desc: 'Brown rice and quinoa with roasted Hokkaido pumpkin, Japanese coleslaw, avocado, edamame, cucumber, pomegranate, pickled onions and sesame. Miso-tahini dressing.',
    ing: ['Roasted pumpkin', 'Japanese coleslaw', 'Avocado', 'Edamame', 'Cucumber', 'Pomegranate', 'Pickled onions', 'Sesame', 'Miso-tahini dressing'], tags: ['Seasonal', 'Vegan base'], badge: 'Seasonal' },
  { id: 'udon-satay', cat: ['hearty', 'popular'], type: 'hearty', name: 'Udon Satay', price: 25.90, img: 'udon-satay', bases: PROTEIN(['planted', 0], ['chicken', 4.00]),
    desc: 'Udon noodles with satay-marinated Planted Chicken, sautéed pak choi, carrot, papaya salad, cucumber, red cabbage, pickled radishes and herbs. Asian-style vinaigrette.',
    ing: ['Pak choi', 'Carrot', 'Papaya salad', 'Cucumber', 'Red cabbage', 'Pickled radishes', 'Herbs', 'Asian vinaigrette'], tags: ['Plant-based'] },
  { id: 'mexican', cat: ['hearty'], type: 'hearty', name: 'Mexican', price: 24.90, img: 'mexican', bases: PROTEIN(['planted', 0], ['chicken', 4.00]),
    desc: 'Planted Chicken, brown rice and quinoa with guacamole, pico de gallo, black beans, lettuce, corn and coriander. Topped with nachos and chipotle-lime dressing.',
    ing: ['Guacamole', 'Pico de gallo', 'Black beans', 'Lettuce', 'Corn', 'Coriander', 'Nachos', 'Chipotle-lime dressing'], tags: ['Plant-based'] },
  { id: 'power-dahl', cat: ['hearty'], type: 'hearty', name: 'Power Dahl', price: 21.90, img: 'power-dahl',
    bases: { title: 'Choose your side', sub: 'Naan comes with every dahl.', opts: [{ id: 'naan', name: 'Naan bread', sub: 'On the side', price: 0, icon: 'bakery_dining' }, { id: 'rice', name: 'Naan + brown rice & quinoa', sub: 'Make it heartier', price: 2.00, icon: 'rice_bowl' }] },
    desc: 'Red lentils and chickpeas cooked with tomatoes, coconut milk and Indian spices, topped with vegan sour cream and herbs. Naan bread on the side.', ing: ['Vegan sour cream', 'Herbs'], tags: ['Vegan'] },
  { id: 'pumpkin-caesar', cat: ['hearty', 'special'], type: 'bundle', bowl: true, name: 'Pumpkin & Mushroom Caesar', price: 23.90, icon: 'eco', color: '#E2E8DF', badge: 'Seasonal',
    desc: 'Roasted Hokkaido pumpkin and sautéed mushrooms on crisp lettuce, with pumpkin seeds, pickled onions, sprouts and Caesar dressing. Served with toasted bread. Bleicherweg only.',
    groups: [{ key: 'protein', title: 'Add protein?', opts: [
      { id: 'none', name: 'No protein', price: 0, icon: 'eco' },
      { id: 'planted', name: 'Planted Chicken', price: 6.00, icon: 'nutrition' },
      { id: 'chicken', name: 'Swiss Organic Chicken', price: 8.00, icon: 'egg_alt' },
      { id: 'salmon', name: 'Smoked wild salmon', price: 8.00, icon: 'set_meal' } ] }] },

  // Toast & brunch
  { id: 'avo-toast', cat: ['toast', 'popular'], type: 'toast', name: 'Smashed Avo Toast', price: 14.90, img: 'avo-toast',
    desc: 'Smashed avocado on two slices of Power Bread, with lime, pickled onions, chilli flakes, corn crumble, olive oil, hemp seeds and sprouts.', ing: ['Pickled onions', 'Chilli flakes', 'Corn crumble', 'Hemp seeds', 'Sprouts'], tags: ['Vegan'] },
  { id: 'protein-pancakes', cat: ['toast'], type: 'brunch', name: 'Açaí Protein Pancakes', price: 15.90, img: 'protein-pancakes', badge: 'Weekends',
    desc: 'Three oat protein pancakes with açaí, banana, pomegranate, cacao sauce, maple syrup, Peanut Crumble Granola (gf) and mint.', tags: ['Vegan', 'Protein'] },

  // Build your own & combos: type 'bundle', each group is a required choice.
  { id: 'byo-acai', cat: ['deals'], type: 'bundle', bowl: true, name: 'Build Your Own Açaí Bowl', price: 13.90, img: 'byo-acai', badge: 'Your way',
    desc: 'Choose the size, the blend, the granola, the fruit and the nut butter.',
    groups: [
      { key: 'size',  title: 'Size', opts: [{ id: 's', name: 'Small', price: 0, icon: 'rice_bowl' }, { id: 'm', name: 'Medium', price: 3.00, icon: 'rice_bowl' }, { id: 'l', name: 'Large', price: 7.00, icon: 'rice_bowl' }] },
      { key: 'blend', title: 'Blend', opts: [{ id: 'acai', name: 'Açaí & banana', price: 0, img: 'original-bowl' }, { id: 'snickers', name: 'Snickers blend', price: 0, img: 'snickers-protein' }, { id: 'layered', name: 'Half & half', price: 0, img: 'layered' }] },
      { key: 'granola', title: 'Granola', opts: [{ id: 'classic', name: 'Classic Granola', price: 0, icon: 'grain' }, { id: 'crumble', name: 'Peanut Crumble (gf)', price: 0, icon: 'grain' }, { id: 'none', name: 'No granola', price: 0, icon: 'block' }] },
      { key: 'fruit', title: 'Fruit', opts: [{ id: 'banana', name: 'Banana', price: 0, icon: 'nutrition' }, { id: 'berries', name: 'Berries', price: 0, icon: 'nutrition' }, { id: 'kiwi', name: 'Kiwi', price: 0, icon: 'nutrition' }] },
      { key: 'butter', title: 'Nut butter', opts: [{ id: 'peanut', name: 'Peanut butter', price: 0, icon: 'cookie' }, { id: 'almond', name: 'Almond butter', price: 1.00, icon: 'cookie' }, { id: 'none', name: 'No nut butter', price: 0, icon: 'block' }] } ] },
  { id: 'byo-hearty', cat: ['deals'], type: 'bundle', bowl: true, name: 'Build Your Own Hearty Bowl', price: 24.90, img: 'byo-hearty', badge: 'Your way',
    desc: 'Choose the base, the protein and the dressing. Seasonal veggies included.', included: 'Seasonal veggies & toppings',
    groups: [
      { key: 'base', title: 'Base', opts: [{ id: 'rice', name: 'Brown rice & quinoa', price: 0, icon: 'rice_bowl' }, { id: 'udon', name: 'Udon noodles', price: 0, icon: 'ramen_dining' }, { id: 'greens', name: 'Crisp lettuce', price: 0, icon: 'eco' }] },
      { key: 'protein', title: 'Protein', opts: [{ id: 'tofu', name: 'Sesame-tamari tofu', price: 0, icon: 'eco' }, { id: 'bbq', name: 'BBQ Planted Chicken', price: 1.00, icon: 'nutrition' }, { id: 'salmon', name: 'Smoked wild salmon', price: 3.00, icon: 'set_meal' }] },
      { key: 'dressing', title: 'Dressing', opts: [{ id: 'miso', name: 'Miso-tahini', price: 0, icon: 'water_drop' }, { id: 'chipotle', name: 'Chipotle-lime', price: 0, icon: 'water_drop' }, { id: 'asian', name: 'Asian vinaigrette', price: 0, icon: 'water_drop' }] } ] },
  { id: 'dahl-avo-combo', cat: ['deals', 'hearty'], type: 'bundle', bowl: true, name: 'Power Dahl & Avo Toast Combo', price: 26.90, img: 'dahl-avo-combo', badge: 'Combo', coffee: true,
    desc: 'A portion of our coconut dahl with one slice of Smashed Avo Toast. Add a coffee for CHF 2.90.',
    groups: [{ key: 'protein', title: 'Add protein?', opts: [{ id: 'none', name: 'Just the combo', price: 0, img: 'dahl-avo-combo' }, { id: 'planted', name: 'Planted Chicken', price: 6.00, icon: 'nutrition' }] }] },

  // Smoothies
  { id: 'berry-wild',   cat: ['smoothies', 'popular'], type: 'drink', name: 'Berry Wild',   price: 13.90, img: 'berry-wild',   desc: 'Açaí blended with strawberries, banana, vanilla protein, almond butter and coconut water. 400 ml.', tags: ['Protein'] },
  { id: 'tropic-crush', cat: ['smoothies'],            type: 'drink', name: 'Tropic Crush', price: 13.90, img: 'tropic-crush', desc: 'Mango, pineapple and banana with vanilla protein and coconut water, finished with coconut yoghurt and blue spirulina. 400 ml.', tags: ['Protein'] },
  { id: 'beast-mode',   cat: ['smoothies'],            type: 'drink', name: 'Beast Mode',   price: 13.90, img: 'beast-mode',   desc: 'Coconut purée with banana, peanut butter, dates, cacao, carob, Choc & Peanut protein and pea milk. 400 ml.', tags: ['Protein'] },

  // Refreshers
  { id: 'agua-fresca',          cat: ['refresher'], type: 'drink', name: 'Strawberry Agua Fresca', price: 6.00, img: 'agua-fresca', desc: 'Strawberries, lemon, water and agave. 4 dl.', tags: ['Homemade'] },
  { id: 'kombucha-berry',       cat: ['refresher'], type: 'drink', name: 'Swiss Kombucha · Strawberry, Cherry & Mint', price: 7.00, img: 'kombucha-berry', desc: 'Swiss kombucha on tap. 4 dl.' },
  { id: 'kombucha-seasonal',    cat: ['refresher'], type: 'drink', name: 'Swiss Kombucha · Seasonal', price: 7.00, img: 'kombucha-seasonal', desc: 'Swiss kombucha on tap, flavour of the season. 4 dl.' },
  { id: 'coconut-water',        cat: ['refresher'], type: 'drink', name: 'Coconut Water',      price: 3.50, img: 'coconut-water',        desc: 'Chilled.' },
  { id: 'puerto-mate',          cat: ['refresher'], type: 'drink', name: 'Puerto Mate',        price: 4.50, img: 'puerto-mate',          desc: 'Mate iced tea, chilled bottle.' },
  { id: 'vivi-apfelschorle',    cat: ['refresher'], type: 'drink', name: 'Vivi Apfelschorle',  price: 5.00, img: 'vivi-apfelschorle',    desc: 'Sparkling apple juice, chilled bottle.' },
  { id: 'adelbodner-still',     cat: ['refresher'], type: 'drink', name: 'Adelbodner Still',     price: 5.00, img: 'adelbodner-still',     desc: 'Swiss mineral water, chilled bottle.' },
  { id: 'adelbodner-sparkling', cat: ['refresher'], type: 'drink', name: 'Adelbodner Sparkling', price: 5.00, img: 'adelbodner-sparkling', desc: 'Swiss mineral water, chilled bottle.' },
  { id: 'peaq-boost',   cat: ['refresher'], type: 'drink', name: 'Peaq Boost',   price: 4.90, img: 'peaq-boost',   desc: 'Functional drink, chilled can.' },
  { id: 'peaq-flow',    cat: ['refresher'], type: 'drink', name: 'Peaq Flow',    price: 4.90, img: 'peaq-flow',    desc: 'Functional drink, chilled can.' },
  { id: 'peaq-restart', cat: ['refresher'], type: 'drink', name: 'Peaq Restart', price: 4.90, img: 'peaq-restart', desc: 'Functional drink, chilled can.' },
  { id: 'peaq-win',     cat: ['refresher'], type: 'drink', name: 'Peaq Win',     price: 4.90, img: 'peaq-win',     desc: 'Functional drink, chilled can.' },

  // Coffee, matcha & tea
  { id: 'espresso',            cat: ['coffee'], type: 'drink', name: 'Espresso',            price: 4.50, img: 'espresso',            desc: 'Organic coffee, single shot.' },
  { id: 'doppio',              cat: ['coffee'], type: 'drink', name: 'Doppio',              price: 5.50, img: 'doppio',              desc: 'Organic coffee, double shot.' },
  { id: 'americano',           cat: ['coffee'], type: 'drink', name: 'Americano',           price: 5.50, img: 'americano',           desc: 'Espresso topped up with hot water.' },
  { id: 'cappuccino',          cat: ['coffee'], type: 'drink', name: 'Cappuccino',          price: 6.00, img: 'cappuccino',          desc: 'Espresso, steamed milk of your choice, foam.' },
  { id: 'flat-white',          cat: ['coffee'], type: 'drink', name: 'Flat White',          price: 6.50, img: 'flat-white',          desc: 'Double espresso with silky milk.' },
  { id: 'latte-macchiato',     cat: ['coffee'], type: 'drink', name: 'Latte Macchiato',     price: 6.50, img: 'latte-macchiato',     desc: 'Lots of milk, a shot of espresso.' },
  { id: 'cold-brew-americano', cat: ['coffee'], type: 'drink', name: 'Cold Brew Americano', price: 6.00, img: 'cold-brew-americano', desc: 'Slow-steeped cold brew over ice.' },
  { id: 'cold-brew-latte',     cat: ['coffee'], type: 'drink', name: 'Cold Brew Latte',     price: 7.00, img: 'cold-brew-latte',     desc: 'Cold brew with milk of your choice, over ice.' },
  { id: 'matcha-latte',        cat: ['coffee', 'popular'], type: 'drink', name: 'Matcha Latte', price: 6.50, img: 'matcha-latte', desc: 'Ceremonial-grade matcha with milk of your choice, hot or iced.' },
  { id: 'chai-latte',          cat: ['coffee'], type: 'drink', name: 'Chai Latte',          price: 6.50, img: 'chai-latte',          desc: 'Spiced chai with milk of your choice, hot or iced.' },
  { id: 'ginger-lemon',        cat: ['coffee'], type: 'drink', name: 'Ginger Lemon Infusion', price: 6.50, img: 'ginger-lemon',      desc: 'Ginger extract, fresh ginger, lemon juice and hot water.' },
  { id: 'red-kiss',            cat: ['coffee'], type: 'drink', name: 'Red Kiss',            price: 5.50, img: 'red-kiss',            desc: 'Hot tea infusion.' },
  { id: 'wellness-relax',      cat: ['coffee'], type: 'drink', name: 'Wellness Relax',      price: 5.50, img: 'wellness-relax',      desc: 'Hot tea infusion.' },
  { id: 'winter-moments',      cat: ['coffee'], type: 'drink', name: 'Winter Moments',      price: 5.50, img: 'winter-moments',      desc: 'Hot tea infusion, seasonal.' },

  // Sweet treats
  { id: 'cacao-coco',    cat: ['sweets'], type: 'sweet', name: 'Cacao Coco Balls',    price: 4.50, img: 'cacao-coco',    desc: 'Cacao and coconut energy balls.' },
  { id: 'peanut-cashew', cat: ['sweets'], type: 'sweet', name: 'Peanut Cashew Balls', price: 4.50, img: 'peanut-cashew', desc: 'Peanut and cashew energy balls.' },
  { id: 'protein-cacao', cat: ['sweets'], type: 'sweet', name: 'Protein Cacao Balls', price: 4.50, img: 'protein-cacao', desc: 'Cacao energy balls with added protein.' },
];

/* Step 2 of the stepper: toppings for açaí bowls (prototype prices), add-ons for hearty bowls and toast (wild-bowls.com). */
const EXTRAS = [
  { id: 'pb',       for: ['acai'], name: 'Peanut butter',          price: 1.50, icon: 'cookie' },
  { id: 'ab',       for: ['acai'], name: 'Almond butter',          price: 2.00, icon: 'cookie' },
  { id: 'granola',  for: ['acai'], name: 'Extra granola',          price: 1.00, icon: 'grain' },
  { id: 'crumble',  for: ['acai'], name: 'Peanut Crumble (gf)',    price: 1.50, icon: 'grain' },
  { id: 'berries',  for: ['acai'], name: 'Fresh berries',          price: 2.00, icon: 'nutrition' },
  { id: 'cacao',    for: ['acai'], name: 'Cacao nibs',             price: 1.00, icon: 'scatter_plot' },
  { id: 'coconut',  for: ['acai'], name: 'Coconut flakes',         price: 0.50, icon: 'grass' },
  { id: 'planted',  for: ['hearty', 'toast'], name: 'Planted Chicken',                price: 6.00, icon: 'nutrition' },
  { id: 'salmon',   for: ['hearty', 'toast'], name: 'Smoked wild salmon · approx. 80 g', price: 8.00, icon: 'set_meal' },
  { id: 'eggs',     for: ['hearty', 'toast'], name: 'Two organic onsen eggs',          price: 5.00, icon: 'egg' },
  { id: 'mushrooms', for: ['hearty', 'toast'], name: 'Warm roasted mushrooms',         price: 4.00, icon: 'forest' },
  { id: 'rice',     for: ['hearty'], name: 'Brown rice & quinoa',                      price: 2.00, icon: 'rice_bowl' },
];

/* "Wild Combo": a drink and a sweet treat added to any bowl or toast (prototype price). */
const MENU_PRICE = 7.90;
const MENU_COFFEE = 2.90;   // a coffee added to a combo
const MENU_SIDES = [
  { id: 'cacao-coco',    name: 'Cacao Coco Balls',    price: 0, img: 'cacao-coco' },
  { id: 'peanut-cashew', name: 'Peanut Cashew Balls', price: 0, img: 'peanut-cashew' },
  { id: 'protein-cacao', name: 'Protein Cacao Balls', price: 0, img: 'protein-cacao' },
];
const MENU_DRINKS = [
  { id: 'agua-fresca',          name: 'Strawberry Agua Fresca', price: 0,    img: 'agua-fresca' },
  { id: 'puerto-mate',          name: 'Puerto Mate',            price: 0,    img: 'puerto-mate' },
  { id: 'vivi-apfelschorle',    name: 'Vivi Apfelschorle',      price: 0,    img: 'vivi-apfelschorle' },
  { id: 'adelbodner-still',     name: 'Adelbodner Still',       price: 0,    img: 'adelbodner-still' },
  { id: 'adelbodner-sparkling', name: 'Adelbodner Sparkling',   price: 0,    img: 'adelbodner-sparkling' },
  { id: 'kombucha-berry',       name: 'Swiss Kombucha',         price: 1.00, img: 'kombucha-berry' },
];

/* Wild Club rewards. */
const REWARDS = [
  { pts: 300,  item: 'cacao-coco',    label: 'Energy balls' },
  { pts: 500,  item: 'cappuccino',    label: 'Cappuccino' },
  { pts: 800,  item: 'matcha-latte',  label: 'Matcha Latte' },
  { pts: 1000, item: 'original-bowl', label: 'Original Bowl' },
  { pts: 1500, item: 'berry-wild',    label: 'Berry Wild' },
  { pts: 2100, item: 'harvest-poke',  label: 'Harvest Poké', hero: true },
];

const DEMO_MEMBER = { name: 'Lena', points: 1240, code: '4821', photo: 'member-photo' };   // member portrait supplied for the prototype
const POINTS_PER_CHF = 10;

/* Packaged items that can be scanned at the kiosk (barcode / item number). */
const SCAN_ITEMS = [
  { id: 'scan-sparkling', code: '1001', name: 'Adelbodner Sparkling', sub: 'Mineral water · bottle', price: 5.00, img: 'adelbodner-sparkling' },
  { id: 'scan-still',     code: '1002', name: 'Adelbodner Still',     sub: 'Mineral water · bottle', price: 5.00, img: 'adelbodner-still' },
  { id: 'scan-peaq',      code: '1003', name: 'Peaq Boost',           sub: 'Functional drink · can', price: 4.90, img: 'peaq-boost' },
  { id: 'scan-mate',      code: '1004', name: 'Puerto Mate',          sub: 'Iced mate · bottle',     price: 4.50, img: 'puerto-mate' },
  { id: 'scan-vivi',      code: '1005', name: 'Vivi Apfelschorle',    sub: 'Apple spritz · bottle',  price: 5.00, img: 'vivi-apfelschorle' },
];

/* Loyalty discounts redeemable in the cart (cost in points). */
const LOYALTY_DISCOUNTS = [
  { id: 'l5',  label: '5%',     sub: 'Discount', pct: 5,  cost: 100 },
  { id: 'l10', label: '10%',    sub: 'Discount', pct: 10, cost: 200 },
  { id: 'l15', label: '15%',    sub: 'Discount', pct: 15, cost: 300 },
  { id: 'l20', label: '20%',    sub: 'Discount', pct: 20, cost: 400 },
  { id: 'lhh', label: '10%',    sub: '14:00 – 17:00', pct: 10, cost: 100, icon: 'schedule' },
  { id: 'l20c', label: 'CHF 20', sub: 'Cash discount', chf: 20, cost: 1000 },
];

/* Discount coupons / vouchers (claimable in My Offers, applied in the cart). */
const COUPONS = [
  { id: 'c-treat',  title: 'Free energy balls', sub: 'With any bowl', code: 'WBT***556', exp: '31 Dec 2026', chf: 4.50, needs: 'bowl' },
  { id: 'c-bowl',   title: '20% off',           sub: 'On all bowls',  code: 'WBB***201', exp: '30 Nov 2026', pct: 20, scope: 'bowl' },
  { id: 'c-drinks', title: '30% off',           sub: 'On drinks',     code: 'WBD***543', exp: '15 Dec 2026', pct: 30, scope: 'drink' },
];

/* Promo codes accepted by the prototype. */
const PROMO_CODES = {
  WILD10:   { label: '10% off', pct: 10 },
  LETSBOWL: { label: 'CHF 5 off', chf: 5 },
};

const TIERS = [
  { name: 'Seed',   at: 0 },
  { name: 'Sprout', at: 1000 },
  { name: 'Bloom',  at: 1500 },
  { name: 'Wild',   at: 2500 },
];
