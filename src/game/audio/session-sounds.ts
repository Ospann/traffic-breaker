import type { RunSession, SessionEvent } from '../sim/run-session';
import type { Sfx } from './sfx';

export function playSessionSounds(
  sfx: Sfx,
  events: readonly SessionEvent[],
  session: RunSession,
): void {
  for (const event of events) {
    switch (event.type) {
      case 'laneChange':
      case 'bounce':
        sfx.play('swipe');
        break;
      case 'jump':
        sfx.play(session.bonusTimers.superJump > 0 ? 'superJump' : 'jump');
        break;
      case 'land':
        sfx.play('land');
        break;
      case 'duck':
      case 'fastDrop':
        sfx.play('duck');
        break;
      case 'dashStart':
        sfx.play('dash');
        break;
      case 'rampLaunch':
        sfx.play('rampLaunch');
        break;
      case 'lightHit':
        sfx.play('lightHit');
        break;
      case 'crash':
        sfx.play('crash');
        break;
      case 'deco':
        sfx.play('deco');
        break;
      case 'coin':
        sfx.coin(event.streak);
        break;
      case 'bonus':
        sfx.bonus(event.bonus);
        break;
      case 'bonusEnd':
        sfx.play('bonusEnd');
        break;
      case 'shieldOn':
        sfx.play('shieldOn');
        break;
      case 'shieldSave':
        sfx.play('shieldSave');
        break;
      case 'shieldEnd':
        sfx.play('shieldEnd');
        break;
      case 'revive':
        sfx.play('revive');
        break;
      case 'dashEnd':
        break;
    }
  }
}
