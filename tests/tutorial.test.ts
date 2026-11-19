import { describe, expect, it } from 'vitest';
import { patterns } from '../src/game/patterns';
import { RunSession } from '../src/game/sim/run-session';
import {
  TUTORIAL_TIME_SCALE,
  TutorialDirector,
  type TutorialStepId,
} from '../src/game/tutorial/tutorial-director';
import { PatternGenerator, TUTORIAL_TAG } from '../src/game/world/pattern-generator';
import { PrefixedSource } from '../src/game/world/prefixed-source';
import { SequentialSource } from '../src/game/world/sequential-source';

const DT = 1 / 120;
const lesson = patterns.find((p) => p.tags.includes(TUTORIAL_TAG));

const answers: Record<TutorialStepId, 'left' | 'up' | 'down' | 'dash'> = {
  lane: 'left',
  jump: 'up',
  duck: 'down',
  dash: 'dash',
};

function setup() {
  if (!lesson) throw new Error('tutorial pattern is missing');
  const source = new PrefixedSource(
    new SequentialSource(patterns.filter((p) => p.id === 'b2-coin-lanes')),
  );
  source.setPrefix([lesson]);
  const session = new RunSession(source);
  session.reset();
  const log: string[] = [];
  let finished = false;
  const director = new TutorialDirector(session, {
    show: (step) => log.push(`show:${step}`),
    hide: (ok) => log.push(ok ? 'ok' : 'miss'),
    finish: () => {
      finished = true;
    },
  });
  return { session, director, log, isFinished: () => finished };
}

describe('tutorial', () => {
  it('walks through lane, jump, duck and boost hints, freezing time on each, and finishes', () => {
    const { session, director, log, isFinished } = setup();
    let minScale = 1;
    for (let t = 0; t < 40 && !isFinished() && session.state === 'running'; t += DT) {
      director.update(DT);
      minScale = Math.min(minScale, director.timeScale);
      const step = director.current;
      if (step && director.timeScale === TUTORIAL_TIME_SCALE) {
        session.queue(answers[step]);
        director.onAction(answers[step]);
      }
      session.step(DT * director.timeScale);
    }
    expect(session.state).toBe('running');
    expect(log).toEqual([
      'show:lane',
      'ok',
      'show:jump',
      'ok',
      'show:duck',
      'ok',
      'show:dash',
      'ok',
    ]);
    expect(isFinished()).toBe(true);
    expect(minScale).toBe(TUTORIAL_TIME_SCALE);
  });

  it('waits for the player on every hint instead of letting the car crash', () => {
    const { session, director, log, isFinished } = setup();
    const waited: string[] = [];
    for (let t = 0; t < 120 && !isFinished() && session.state === 'running'; t += DT) {
      director.update(DT);
      const step = director.current;
      if (step && director.timeScale === TUTORIAL_TIME_SCALE) {
        for (let idle = 0; idle < 30; idle += DT) {
          director.update(DT);
          session.step(DT * director.timeScale);
        }
        waited.push(`${step}:${session.state}:${director.current}`);
        session.queue(answers[step]);
        director.onAction(answers[step]);
      }
      session.step(DT * director.timeScale);
    }
    expect(session.state).toBe('running');
    expect(log.filter((e) => e === 'ok')).toHaveLength(4);
    expect(waited).toEqual([
      'lane:running:lane',
      'jump:running:jump',
      'duck:running:duck',
      'dash:running:dash',
    ]);
    expect(isFinished()).toBe(true);
  });

  it('blocks gestures the current hint does not ask for', () => {
    const { session, director } = setup();
    for (let t = 0; t < 10 && director.current === null; t += DT) {
      director.update(DT);
      session.step(DT);
    }
    expect(director.current).toBe('lane');
    expect(director.allows('up')).toBe(false);
    expect(director.allows('dash')).toBe(false);
    expect(director.allows('left')).toBe(true);
    director.onAction('left');
    expect(director.allows('up')).toBe(true);
  });

  it('wrong gestures do not dismiss a hint', () => {
    const { session, director } = setup();
    for (let t = 0; t < 10 && director.current === null; t += DT) {
      director.update(DT);
      session.step(DT);
    }
    expect(director.current).toBe('lane');
    director.onAction('up');
    expect(director.current).toBe('lane');
    director.onAction('right');
    expect(director.current).toBeNull();
  });

  it('the tutorial pattern never comes from the generator', () => {
    const generator = new PatternGenerator(patterns, () => 4);
    for (let i = 0; i < 2000; i += 1) {
      expect(generator.next(i).tags).not.toContain(TUTORIAL_TAG);
    }
  });

  it('prefix patterns come first, once', () => {
    if (!lesson) throw new Error('tutorial pattern is missing');
    const inner = new SequentialSource(patterns.slice(0, 2));
    const source = new PrefixedSource(inner);
    source.setPrefix([lesson]);
    source.reset();
    expect(source.next(0).id).toBe(lesson.id);
    expect(source.next(0).id).not.toBe(lesson.id);
  });
});
