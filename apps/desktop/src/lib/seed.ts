export const getSeedHash = (seed: string): number => {
  let hash = 0;

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) % 100000;
  }

  return hash;
};

export const getSeedHue = (seed: string): number => getSeedHash(seed) % 360;
