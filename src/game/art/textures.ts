import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const element = document.createElement('canvas');
  element.width = width;
  element.height = height;
  const context = element.getContext('2d');
  if (!context) throw new Error('2D canvas is not available');
  return [element, context];
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function createWindowTexture(): CanvasTexture {
  const [element, ctx] = canvas(128, 256);
  const random = seeded(7);
  ctx.fillStyle = '#0c0a18';
  ctx.fillRect(0, 0, 128, 256);
  const colors = ['#ffd27a', '#7fe9ff', '#ff7ae0', '#c9b8ff'];
  for (let y = 4; y < 256; y += 12) {
    for (let x = 4; x < 128; x += 10) {
      const r = random();
      if (r < 0.42) continue;
      ctx.globalAlpha = 0.35 + random() * 0.65;
      ctx.fillStyle = colors[Math.floor(random() * colors.length)] ?? '#ffd27a';
      ctx.fillRect(x, y, 6, 7);
    }
  }
  ctx.globalAlpha = 1;
  const texture = new CanvasTexture(element);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function createGlowTexture(): CanvasTexture {
  const [element, ctx] = canvas(64, 64);
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new CanvasTexture(element);
}
