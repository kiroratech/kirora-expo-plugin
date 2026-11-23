export interface Product {
  id: string;
  name: string;
  category: 'Coffee' | 'Brewing' | 'Extras';
  price: number;
  emoji: string;
  tint: string;
  blurb: string;
  description: string;
  inStock: boolean;
}

export const CATEGORIES: Array<Product['category']> = ['Coffee', 'Brewing', 'Extras'];

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Yirgacheffe Beans',
    category: 'Coffee',
    price: 18,
    emoji: '☕️',
    tint: '#F6E7D8',
    blurb: 'Ethiopia · floral, bergamot',
    description: 'A washed Ethiopian coffee with jasmine, bergamot and a clean, tea-like finish. 250 g, roasted to order.',
    inStock: true
  },
  {
    id: 'p2',
    name: 'Huila Beans',
    category: 'Coffee',
    price: 17,
    emoji: '🫘',
    tint: '#EADFD3',
    blurb: 'Colombia · caramel, red apple',
    description: 'Sweet and round, with caramel and red apple. Our everyday filter coffee. 250 g, roasted to order.',
    inStock: true
  },
  {
    id: 'p3',
    name: 'Night Shift Espresso',
    category: 'Coffee',
    price: 19,
    emoji: '🌙',
    tint: '#E3E0F2',
    blurb: 'Blend · cocoa, molasses',
    description: 'A heavy, chocolatey espresso blend that holds up in milk. 250 g, roasted to order.',
    inStock: false
  },
  {
    id: 'p4',
    name: 'Gooseneck Kettle',
    category: 'Brewing',
    price: 64,
    emoji: '🫖',
    tint: '#DCEBF3',
    blurb: 'Stainless · 0.9 L',
    description: 'A slow, steady pour for pour-over brewing, with a built-in thermometer.',
    inStock: true
  },
  {
    id: 'p5',
    name: 'Burr Grinder',
    category: 'Brewing',
    price: 129,
    emoji: '⚙️',
    tint: '#E4E7EB',
    blurb: 'Conical burrs · 40 settings',
    description: 'Even grounds from espresso to French press. The one upgrade that changes your coffee most.',
    inStock: false
  },
  {
    id: 'p6',
    name: 'Cold Brew Bottle',
    category: 'Brewing',
    price: 29,
    emoji: '🧊',
    tint: '#DDF0EA',
    blurb: 'Glass · 1 L',
    description: 'Add coffee and water, leave it in the fridge overnight, pour. Fits in a fridge door.',
    inStock: true
  },
  {
    id: 'p7',
    name: 'Stoneware Mug',
    category: 'Extras',
    price: 22,
    emoji: '🍵',
    tint: '#F3E3E6',
    blurb: 'Handmade · 300 ml',
    description: 'Thrown by hand, so no two are alike. Dishwasher safe.',
    inStock: true
  },
  {
    id: 'p8',
    name: 'Dark Chocolate',
    category: 'Extras',
    price: 6.5,
    emoji: '🍫',
    tint: '#EFE4DA',
    blurb: '72% · single origin',
    description: 'Made to go with coffee: bright, a little fruity, never too sweet.',
    inStock: true
  }
];

/** The product as event properties. */
export function productProperties(p: Product) {
  return { product_id: p.id, name: p.name, category: p.category, price: p.price };
}

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function money(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
