import type { WebGLRenderer } from 'three';
import { cx, el } from '../dom';
import styles from './index.module.css';

export interface DebugStats {
  fps: number;
  quality: number;
  pixelRatio: number;
  entities: number;
  speed: number;
  state: string;
}

export class DebugOverlay {
  private readonly root: HTMLDivElement;
  private frames = 0;
  private elapsed = 0;
  private minFps = Infinity;
  private worstFrameMs = 0;

  constructor(parent: HTMLElement) {
    this.root = el('div', cx(styles, 'root'), parent);
  }

  update(frameDt: number, renderer: WebGLRenderer, stats: DebugStats): void {
    this.frames += 1;
    this.elapsed += frameDt;
    this.worstFrameMs = Math.max(this.worstFrameMs, frameDt * 1000);
    if (this.elapsed < 0.5) return;
    const fps = this.frames / this.elapsed;
    this.minFps = Math.min(this.minFps, fps);
    const { calls, triangles } = renderer.info.render;
    const { geometries, textures } = renderer.info.memory;
    this.root.textContent = [
      `fps ${fps.toFixed(0)} (min ${this.minFps.toFixed(0)}, worst ${this.worstFrameMs.toFixed(1)}ms)`,
      `calls ${calls}  tris ${triangles}`,
      `geo ${geometries}  tex ${textures}`,
      `quality ${stats.quality}  dpr ${stats.pixelRatio.toFixed(2)}`,
      `entities ${stats.entities}  speed ${stats.speed.toFixed(1)}`,
      `state ${stats.state}`,
    ].join('\n');
    this.frames = 0;
    this.elapsed = 0;
    this.worstFrameMs = 0;
  }

  resetMin(): void {
    this.minFps = Infinity;
  }
}
