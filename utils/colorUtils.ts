import { RGB, HSL, PaletteColor } from '../types';

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s, l };
}

// Calculate luminance (perceived brightness)
export function getLuminance({ r, g, b }: RGB): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

// Euclidean distance squared (faster than root)
function colorDistanceSq(c1: RGB, c2: RGB): number {
  return (c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2;
}

/**
 * Perform K-Means clustering on pixel data to find dominant colors.
 * We used a fixed K and maxIterations for performance.
 */
export function quantizeColors(pixels: Uint8Array, k: number = 8): PaletteColor[] {
  // 1. Initial Sampling (Random Centroids)
  // Pixels is Uint8Array [r,g,b,a, r,g,b,a ...]
  const pixelCount = pixels.length / 4;
  const centroids: RGB[] = [];
  
  // Pick random starting points
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(Math.random() * pixelCount) * 4;
    centroids.push({
      r: pixels[idx],
      g: pixels[idx + 1],
      b: pixels[idx + 2],
    });
  }

  const assignments = new Uint8Array(pixelCount);
  const clusterSums = new Float64Array(k * 3); // [r0, g0, b0, r1, g1, b1...]
  const clusterCounts = new Int32Array(k);

  // 2. K-Means Iterations
  const maxIterations = 5; 
  for (let iter = 0; iter < maxIterations; iter++) {
    // Reset accumulators
    clusterSums.fill(0);
    clusterCounts.fill(0);

    // E-Step: Assign pixels to nearest centroid
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      // Skip transparent pixels
      if (pixels[idx + 3] < 128) continue; 

      const p: RGB = { r: pixels[idx], g: pixels[idx + 1], b: pixels[idx + 2] };
      
      let minDist = Infinity;
      let clusterIndex = 0;

      for (let c = 0; c < k; c++) {
        const dist = colorDistanceSq(p, centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          clusterIndex = c;
        }
      }

      assignments[i] = clusterIndex;
      clusterSums[clusterIndex * 3] += p.r;
      clusterSums[clusterIndex * 3 + 1] += p.g;
      clusterSums[clusterIndex * 3 + 2] += p.b;
      clusterCounts[clusterIndex]++;
    }

    // M-Step: Update centroids
    let changed = false;
    for (let c = 0; c < k; c++) {
      if (clusterCounts[c] > 0) {
        const newR = clusterSums[c * 3] / clusterCounts[c];
        const newG = clusterSums[c * 3 + 1] / clusterCounts[c];
        const newB = clusterSums[c * 3 + 2] / clusterCounts[c];
        
        // Simple convergence check (if needed, but fixed iterations is usually fine for UI)
        centroids[c] = { r: newR, g: newG, b: newB };
      }
    }
  }

  // 3. Convert Centroids to PaletteColors
  return centroids
    .map((c, i) => {
      const count = clusterCounts[i];
      if (count === 0) return null;
      
      const hsl = rgbToHsl(c);
      const isVibrant = hsl.s > 0.5 && hsl.l > 0.3 && hsl.l < 0.8;
      const isDark = hsl.l < 0.4;
      const isLight = hsl.l > 0.7;

      return {
        rgb: { r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) },
        hsl,
        hex: rgbToHex(c),
        population: count,
        score: count, // Baseline score is population
        isVibrant,
        isDark,
        isLight
      } as PaletteColor;
    })
    .filter((c): c is PaletteColor => c !== null)
    .sort((a, b) => b.population - a.population);
}
