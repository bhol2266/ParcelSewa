export type Brand = {
  name: string;
  image: string; // path under the `public` folder, e.g. `/StoresImages/foo.png`
  url: string;
};

export const brands: Brand[] = [
  { name: 'Amazon', image: '/StoresImages/amazon.png', url: 'https://www.amazon.in' },
  { name: 'Flipkart', image: '/StoresImages/flipkart.png', url: 'https://www.flipkart.com' },
  { name: 'Myntra', image: '/StoresImages/myntra.png', url: 'https://www.myntra.com' },
  { name: 'Ajio', image: '/StoresImages/ajio.png', url: 'https://www.ajio.com' },
  { name: 'Biba', image: '/StoresImages/biba.png', url: 'https://www.biba.in' },
  { name: 'Croma', image: '/StoresImages/croma.png', url: 'https://www.croma.com' },
  { name: 'FirstCry', image: '/StoresImages/firstcry.png', url: 'https://www.firstcry.com' },
  { name: 'H&M', image: '/StoresImages/hnm.png', url: 'https://www.hm.com' },
  { name: 'Lenskart', image: '/StoresImages/lenskart.png', url: 'https://www.lenskart.com' },
  { name: 'Meesho', image: '/StoresImages/meesho.png', url: 'https://www.meesho.com' },
  { name: 'MuscleBlaze', image: '/StoresImages/muscleblaze.png', url: 'https://www.muscleblaze.com' },
  { name: 'Nike', image: '/StoresImages/nike.png', url: 'https://www.nike.com' },
  { name: 'Nykaa', image: '/StoresImages/nykaa.png', url: 'https://www.nykaa.com' },
  { name: 'Tata CLiQ', image: '/StoresImages/tata_cliq.png', url: 'https://www.tatacliq.com' },
  { name: 'Urban Ladder', image: '/StoresImages/urbanladder.png', url: 'https://www.urbanladder.com' },
  { name: 'Zara', image: '/StoresImages/zara.png', url: 'https://www.zara.com' },
];

export default brands;
