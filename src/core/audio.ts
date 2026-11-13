export type MuteReason = 'settings' | 'platform' | 'ad' | 'pause' | (string & {});

export class MuteController {
  private readonly reasons = new Set<MuteReason>();

  constructor(private readonly apply: (muted: boolean) => void) {}

  get isMuted(): boolean {
    return this.reasons.size > 0;
  }

  set(reason: MuteReason, muted: boolean): void {
    const before = this.isMuted;
    if (muted) this.reasons.add(reason);
    else this.reasons.delete(reason);
    if (before !== this.isMuted) this.apply(this.isMuted);
  }
}
