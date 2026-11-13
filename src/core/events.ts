export type Unsubscribe = () => void;

type Listener<T> = (payload: T) => void;

type ListenerMap<Events> = { [K in keyof Events]?: Set<Listener<Events[K]>> };

export class Emitter<Events extends Record<string, unknown>> {
  private listeners: ListenerMap<Events> = {};

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): Unsubscribe {
    const set = (this.listeners[event] ??= new Set<Listener<Events[K]>>());
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners[event];
    if (!set) return;
    for (const listener of Array.from(set)) {
      listener(payload);
    }
  }

  clear(): void {
    this.listeners = {};
  }
}
