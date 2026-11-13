export class Pool<T> {
  private readonly free: T[] = [];
  private readonly all: T[] = [];
  private exhaustedWarned = false;

  constructor(
    private readonly name: string,
    create: (index: number) => T,
    capacity: number,
  ) {
    for (let i = 0; i < capacity; i += 1) {
      const item = create(i);
      this.all.push(item);
      this.free.push(item);
    }
  }

  get capacity(): number {
    return this.all.length;
  }

  get available(): number {
    return this.free.length;
  }

  get items(): readonly T[] {
    return this.all;
  }

  acquire(): T | null {
    const item = this.free.pop();
    if (item === undefined) {
      if (!this.exhaustedWarned) {
        this.exhaustedWarned = true;
        console.warn(`[pool] ${this.name} exhausted (${this.all.length})`);
      }
      return null;
    }
    return item;
  }

  release(item: T): void {
    this.free.push(item);
  }
}
