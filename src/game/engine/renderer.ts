import { WebGLRenderer } from 'three';
import { gameConfig } from '../config';

export interface StageSize {
  width: number;
  height: number;
}

export class Stage {
  readonly element: HTMLDivElement;
  readonly ui: HTMLDivElement;
  readonly renderer: WebGLRenderer;
  size: StageSize = { width: gameConfig.width, height: gameConfig.height };
  private pixelRatioCap: number = gameConfig.maxPixelRatio;
  private readonly listeners = new Set<(size: StageSize) => void>();

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'stage';
    this.renderer = new WebGLRenderer({
      antialias: window.devicePixelRatio < 2,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setClearColor(gameConfig.backgroundColor);
    this.renderer.domElement.className = 'stage__canvas';
    this.ui = document.createElement('div');
    this.ui.className = 'stage__ui';
    this.element.append(this.renderer.domElement, this.ui);
    parent.append(this.element);
    window.addEventListener('resize', this.resize);
    window.visualViewport?.addEventListener('resize', this.resize);
    this.resize();
  }

  get pixelRatio(): number {
    return this.renderer.getPixelRatio();
  }

  get logicalScale(): number {
    return gameConfig.width / this.size.width;
  }

  onResize(listener: (size: StageSize) => void): void {
    this.listeners.add(listener);
    listener(this.size);
  }

  setPixelRatioCap(cap: number): void {
    this.pixelRatioCap = cap;
    this.resize();
  }

  private readonly resize = (): void => {
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const baseAspect = gameConfig.width / gameConfig.height;
    const width = Math.floor(Math.min(viewW, viewH * baseAspect));
    const height = Math.floor(Math.min(viewH, width * gameConfig.maxAspect));
    this.size = { width, height };
    this.element.style.width = `${width}px`;
    this.element.style.height = `${height}px`;
    this.element.style.setProperty('--u', `${width / gameConfig.width}px`);
    const ratio = Math.min(
      window.devicePixelRatio || 1,
      gameConfig.maxPixelRatio,
      this.pixelRatioCap,
    );
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    for (const listener of this.listeners) listener(this.size);
  };
}
