export type StateId = 'boot' | 'preload' | 'menu' | 'run' | 'pause' | 'game-over' | 'garage';

export interface AppState {
  enter(from: StateId | null): void;
  exit?(to: StateId): void;
}

export const transitions: Readonly<Record<StateId, readonly StateId[]>> = {
  boot: ['preload'],
  preload: ['menu'],
  menu: ['run', 'garage'],
  run: ['pause', 'game-over'],
  pause: ['run', 'menu'],
  'game-over': ['run', 'menu'],
  garage: ['menu'],
};

export class StateMachine {
  private currentId: StateId | null = null;
  private readonly states = new Map<StateId, AppState>();

  get current(): StateId | null {
    return this.currentId;
  }

  register(id: StateId, state: AppState): this {
    this.states.set(id, state);
    return this;
  }

  canGo(to: StateId): boolean {
    if (this.currentId === null) return to === 'boot';
    return transitions[this.currentId].includes(to);
  }

  go(to: StateId): void {
    if (!this.canGo(to)) {
      console.warn(`[state] ${String(this.currentId)} -> ${to} is not allowed`);
      return;
    }
    const next = this.states.get(to);
    if (!next) throw new Error(`State ${to} is not registered`);
    const from = this.currentId;
    if (from !== null) this.states.get(from)?.exit?.(to);
    this.currentId = to;
    next.enter(from);
  }
}
