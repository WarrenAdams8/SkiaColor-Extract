import { Palette, PaletteColor } from '../types';
import { quantizeColors } from '../utils/colorUtils';

// Define the global type for CanvasKitInit
declare global {
  function CanvasKitInit(options: any): Promise<any>;
}

class SkiaService {
  private CanvasKit: any = null;
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  async init() {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise(async (resolve, reject) => {
      try {
        if (typeof CanvasKitInit === 'undefined') {
          // Wait for script to load if it hasn't yet
          let checks = 0;
          const interval = setInterval(() => {
            checks++;
            if (typeof CanvasKitInit !== 'undefined') {
              clearInterval(interval);
              this.initCanvasKit().then(resolve).catch(reject);
            } else if (checks > 50) { // 5 seconds timeout
              clearInterval(interval);
              reject(new Error("CanvasKit script failed to load."));
            }
          }, 100);
        } else {
          await this.initCanvasKit();
          resolve();
        }
      } catch (e) {
        reject(e);
      }
    });

    return this.loadPromise;
  }

  private async initCanvasKit() {
    this.CanvasKit = await CanvasKitInit({
      locateFile: (file: string) => `https://unpkg.com/canvaskit-wasm@0.39.1/bin/${file}`,
    });
    this.isLoaded = true;
    console.log("Skia (CanvasKit) Loaded");
  }

  async processImage(imageUrl: string): Promise<Palette> {
    if (!this.isLoaded) await this.init();

    // 1. Fetch Image
    // Note: This often fails due to CORS. 
    // In a real app, you'd use a proxy. Here we try direct, catch error to warn user.
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();

    // 2. Decode with Skia
    // MakeImageFromEncoded decodes jpg/png/etc
    const image = this.CanvasKit.MakeImageFromEncoded(new Uint8Array(buffer));
    if (!image) throw new Error("Skia failed to decode image.");

    try {
        // 3. Resize / Downsample for Performance
        // We don't need HD pixels for color extraction. 128x128 is plenty.
        const targetSize = 128;
        const scale = Math.min(targetSize / image.width(), targetSize / image.height());
        const w = Math.round(image.width() * scale);
        const h = Math.round(image.height() * scale);

        // Create an offscreen surface (canvas) to draw the resized image
        const surface = this.CanvasKit.MakeSurface(w, h);
        if (!surface) {
          throw new Error("Failed to create Skia surface.");
        }
        const canvas = surface.getCanvas();
        
        // Draw image resized
        const paint = new this.CanvasKit.Paint();
        
        // Note: FilterQuality is deprecated/removed in newer CanvasKit versions.
        // We rely on default sampling or explicit SamplingOptions if needed.
        // For simple downscaling, default is acceptable.
        
        const srcRect = this.CanvasKit.XYWHRect(0, 0, image.width(), image.height());
        const dstRect = this.CanvasKit.XYWHRect(0, 0, w, h);
        
        canvas.drawImageRect(image, srcRect, dstRect, paint);
        
        // 4. Read Pixels
        // readPixels returns a Uint8Array of [r, g, b, a, ...] (if color type is RGBA_8888)
        // We use makeImageSnapshot() because readPixels on surface is not reliably available in JS bindings.
        const snapshot = surface.makeImageSnapshot();
        if (!snapshot) {
           surface.delete();
           paint.delete();
           throw new Error("Failed to make snapshot from surface.");
        }

        const pixelData = snapshot.readPixels(0, 0, {
            width: w,
            height: h,
            colorType: this.CanvasKit.ColorType.RGBA_8888,
            alphaType: this.CanvasKit.AlphaType.Unpremul,
            colorSpace: this.CanvasKit.ColorSpace.SRGB,
        });

        // Cleanup Skia objects immediately
        snapshot.delete();
        surface.delete();
        paint.delete();

        if (!pixelData) throw new Error("Failed to read pixels from Skia surface.");

        // 5. Run Quantization (Algorithm logic in pure JS for easier tweaking)
        const colors = quantizeColors(pixelData, 8); // Extract top 8 colors

        // 6. Identify Roles (Dominant, Vibrant, etc)
        const dominant = colors[0]; // Most populated
        
        // Find most vibrant (high Saturation, reasonable Lightness)
        // We score by (Saturation * 2) * PopulationRatio to balance commonality with vibrancy
        let bestVibrant: PaletteColor | null = null;
        let maxVibrantScore = -1;

        // Find Dark and Light variants
        let darkVibrant: PaletteColor | null = null;
        let lightVibrant: PaletteColor | null = null;
        let muted: PaletteColor | null = null;

        colors.forEach(c => {
            const sat = c.hsl.s;
            const lum = c.hsl.l;
            const popRatio = c.population / (dominant.population || 1);

            // Vibrant scoring
            if (sat > 0.3 && lum > 0.3 && lum < 0.8) {
                const score = sat * (1 + popRatio * 0.5); 
                if (score > maxVibrantScore) {
                    maxVibrantScore = score;
                    bestVibrant = c;
                }
            }

            // Dark Vibrant
            if (lum < 0.4 && sat > 0.2) {
                if (!darkVibrant || c.population > darkVibrant.population) {
                    darkVibrant = c;
                }
            }

            // Light Vibrant
            if (lum > 0.7 && sat > 0.2) {
                 if (!lightVibrant || c.population > lightVibrant.population) {
                    lightVibrant = c;
                }
            }
            
            // Muted (Low Saturation)
            if (sat < 0.3 && lum > 0.2 && lum < 0.8) {
                 if (!muted || c.population > muted.population) {
                    muted = c;
                }
            }
        });

        // Fallbacks
        if (!bestVibrant) bestVibrant = dominant.isVibrant ? dominant : (colors[1] || dominant);

        return {
            dominant,
            vibrant: bestVibrant,
            muted: muted || null,
            darkVibrant: darkVibrant || null,
            lightVibrant: lightVibrant || null,
            allColors: colors
        };

    } finally {
        image.delete();
    }
  }
}

export const skiaService = new SkiaService();