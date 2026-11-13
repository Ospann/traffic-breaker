import {
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Scene,
  type Mesh,
  type WebGLRenderer,
} from 'three';
import { buildBreakerCar, carSockets } from '../art/breaker-car';
import { buildBlobShadow, CityScenery } from '../art/city';
import { palette } from '../art/palette';
import { ParticleSystem } from '../art/particles';
import { buildPoliceDrone, type DroneModel } from '../art/police-drone';
import { createGlowTexture, createWindowTexture } from '../art/textures';
import { CameraRig } from '../engine/camera-rig';
import type { QualityLevel } from '../engine/quality';
import type { RunSession, SessionEvent } from '../sim/run-session';
import { TrackView } from './track-view';

export type ViewMode = 'menu' | 'run';

const MENU_SPEED = 9;
const PARTICLE_CAPACITY = 420;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class WorldView {
  readonly scene = new Scene();
  readonly rig = new CameraRig();
  readonly track: TrackView;
  readonly particles: ParticleSystem;
  private readonly fog: Fog;
  private readonly city: CityScenery;
  private readonly car = new Group();
  private readonly carBody: Group;
  private readonly shadow: Mesh;
  private readonly drone: DroneModel;

  private mode: ViewMode = 'menu';
  private menuBlend = 1;
  private dashBlend = 0;
  private time = 0;
  private lastDistance = 0;
  private prevCarX = 0;
  private duckBlend = 0;
  private crashSpin = 0;
  private emitCarry = 0;

  constructor() {
    this.scene.background = null;
    this.fog = new Fog(palette.fog, 40, 170);
    this.scene.fog = this.fog;
    this.scene.add(new HemisphereLight(0x9a8cff, 0x2a1036, 2.2));
    const moon = new DirectionalLight(0xffd6f4, 1.6);
    moon.position.set(-4, 10, 6);
    this.scene.add(moon);

    this.city = new CityScenery(createWindowTexture());
    this.scene.add(this.city.root);

    this.carBody = buildBreakerCar();
    this.car.add(this.carBody);
    this.scene.add(this.car);
    this.shadow = buildBlobShadow();
    this.scene.add(this.shadow);

    this.drone = buildPoliceDrone();
    this.scene.add(this.drone.root);

    this.track = new TrackView(this.scene);
    this.particles = new ParticleSystem(createGlowTexture(), PARTICLE_CAPACITY);
    this.scene.add(this.particles.points);

    this.rig.snap({ x: 0, y: 0, dash: 0, menu: 1 });
  }

  setQuality(level: QualityLevel): void {
    this.fog.near = level.viewDistance * 0.25;
    this.fog.far = level.viewDistance;
    this.rig.setFar(level.viewDistance);
    this.city.setViewDistance(level.viewDistance);
    this.particles.emissionScale = level.particles;
  }

  setViewport(width: number, height: number, pixelRatio: number): void {
    this.rig.setAspect(width / height);
    const fov = (this.rig.camera.fov * Math.PI) / 180;
    this.particles.setViewportScale((height * pixelRatio) / (2 * Math.tan(fov / 2)));
  }

  setMode(mode: ViewMode, session: RunSession | null): void {
    this.mode = mode;
    if (mode === 'run' && session) {
      this.lastDistance = session.distance;
      this.crashSpin = 0;
      this.car.rotation.set(0, 0, 0);
    }
  }

  reset(): void {
    this.track.reset();
    this.particles.clear();
    this.crashSpin = 0;
    this.car.rotation.set(0, 0, 0);
  }

  compile(renderer: WebGLRenderer): void {
    renderer.compile(this.scene, this.rig.camera);
  }

  handleEvents(events: readonly SessionEvent[], session: RunSession): void {
    const x = session.motion.x;
    const y = session.motion.y;
    for (const event of events) {
      switch (event.type) {
        case 'jump':
          this.burstUnder(x, y, 18, palette.amber);
          break;
        case 'land':
          this.sparks(x, y, 16, palette.amber);
          this.rig.shake(0.12);
          break;
        case 'rampLaunch':
          this.rig.shake(0.25);
          this.burstUnder(x, y, 24, palette.cyan);
          break;
        case 'fastDrop':
          this.burstUnder(x, y, 10, palette.cyan);
          break;
        case 'dashStart':
          this.rig.shake(0.7);
          this.burstUnder(x, y, 40, palette.orange);
          break;
        case 'lightHit':
          this.rig.shake(0.55);
          this.sparks((x + event.entity.x) / 2, y + 0.5, 26, palette.white);
          break;
        case 'crash':
          this.rig.shake(1);
          this.crashSpin = 9;
          this.sparks(x, y + 0.6, 60, palette.amber);
          this.burstUnder(x, y, 30, palette.red);
          break;
        case 'deco':
          this.track.markTouched(event.entity);
          this.sparks(
            event.entity.x,
            0.8,
            14,
            event.entity.type === 'hologram' ? palette.magenta : palette.orange,
          );
          break;
        case 'laneChange':
        case 'duck':
        case 'dashEnd':
        case 'bounce':
          break;
      }
    }
  }

  frame(dt: number, session: RunSession | null): void {
    this.time += dt;
    const running = this.mode === 'run' && session !== null;
    this.menuBlend += ((running ? 0 : 1) - this.menuBlend) * Math.min(1, dt * 2.5);

    let travelled = MENU_SPEED * dt;
    if (running) {
      travelled = session.distance - this.lastDistance;
      this.lastDistance = session.distance;
    }
    this.city.update(travelled, dt);

    const motion = session?.motion;
    const carX = running && motion ? motion.x : 0;
    const carY = running && motion ? motion.y : 0.05 * Math.sin(this.time * 2);
    const dashing = running && motion ? motion.isDashing : false;
    const ducking = running && motion ? motion.isDucking : false;
    const groundY = running && motion ? motion.groundY : 0;
    this.dashBlend += ((dashing ? 1 : 0) - this.dashBlend) * Math.min(1, dt * (dashing ? 4 : 1.5));

    const vx = dt > 0 ? (carX - this.prevCarX) / dt : 0;
    this.prevCarX = carX;
    this.duckBlend += ((ducking ? 1 : 0) - this.duckBlend) * Math.min(1, dt * 18);

    const hover = 0.12 + 0.03 * Math.sin(this.time * 6);
    this.car.position.set(carX, carY + hover * (1 - this.duckBlend), 0);
    this.carBody.scale.y = 1 - this.duckBlend * 0.35;
    if (this.crashSpin > 0) {
      this.car.rotation.y += this.crashSpin * dt;
      this.crashSpin = Math.max(0, this.crashSpin - dt * 9);
    } else if (!session || session.state === 'running') {
      const vy = motion && !motion.isGrounded ? motion.vy : 0;
      this.car.rotation.set(
        Math.max(-0.25, Math.min(0.25, vy * 0.012)) + this.dashBlend * 0.08,
        -vx * 0.012,
        -vx * 0.02,
      );
    }

    const height = Math.max(0, carY - groundY);
    const shadowScale = Math.max(0.35, 1 - height / 6);
    this.shadow.position.set(carX, groundY + 0.03, 0);
    this.shadow.scale.set(shadowScale, 1, shadowScale);

    this.updateDrone(session, carX, carY);
    this.emitExhaust(
      dt,
      carX,
      this.car.position.y,
      running ? (session?.speed ?? 0) : MENU_SPEED,
      dashing,
    );
    this.particles.update(dt);
    this.track.update(dt);

    this.rig.update(dt, {
      x: carX,
      y: Math.min(carY, 4.5),
      dash: this.dashBlend,
      menu: this.menuBlend,
    });
  }

  private updateDrone(session: RunSession | null, carX: number, carY: number): void {
    const proximity = session ? session.drone.proximity : 0;
    const root = this.drone.root;
    const farX = carX * 0.3;
    const nearX = carX * 0.85;
    root.position.set(
      farX + (nearX - farX) * proximity,
      10 + (4.6 + carY - 10) * proximity + 0.15 * Math.sin(this.time * 3),
      15 + (0.5 - 15) * proximity,
    );
    root.rotation.set(0, 0, -0.1 * Math.sin(this.time * 1.7));
    const phase = Math.floor(this.time * 7) % 2 === 0;
    this.drone.sirenRed.visible = phase;
    this.drone.sirenBlue.visible = !phase;
    this.drone.beam.visible = proximity > 0.05;
    this.drone.beam.rotation.x = -0.25;
  }

  private emitExhaust(dt: number, x: number, y: number, speed: number, dashing: boolean): void {
    const rate = (dashing ? 160 : 28 + speed * 0.8) * this.particles.emissionScale;
    this.emitCarry += rate * dt;
    while (this.emitCarry >= 1) {
      this.emitCarry -= 1;
      const socket = carSockets.rearNozzles[Math.random() < 0.5 ? 0 : 1];
      this.particles.emit({
        x: x + socket[0] + rand(-0.05, 0.05),
        y: y + socket[1] * this.carBody.scale.y + rand(-0.05, 0.05),
        z: socket[2],
        vx: rand(-0.4, 0.4),
        vy: rand(-0.2, 0.4),
        vz: dashing ? rand(16, 24) : rand(6, 10),
        color: dashing ? (Math.random() < 0.5 ? palette.orange : palette.amber) : palette.cyan,
        size: dashing ? rand(0.7, 1.1) : rand(0.25, 0.4),
        life: dashing ? rand(0.25, 0.4) : rand(0.12, 0.22),
        drag: 2,
        grow: dashing ? 1.6 : 0.8,
      });
      if (dashing) {
        const under = carSockets.underNozzles[Math.random() < 0.5 ? 0 : 1];
        this.particles.emit({
          x: x + under[0],
          y: y + under[1],
          z: under[2],
          vx: rand(-0.6, 0.6),
          vy: rand(-9, -5),
          vz: rand(4, 8),
          color: palette.magenta,
          size: rand(0.5, 0.8),
          life: rand(0.2, 0.32),
          drag: 3,
          grow: 1.2,
        });
      }
    }
  }

  private burstUnder(x: number, y: number, count: number, color: number): void {
    this.particles.burst(count, () => {
      const socket = carSockets.underNozzles[Math.random() < 0.5 ? 0 : 1];
      return {
        x: x + socket[0] + rand(-0.2, 0.2),
        y: y + 0.1,
        z: socket[2] + rand(-0.6, 0.6),
        vx: rand(-2, 2),
        vy: rand(-6, -2),
        vz: rand(4, 10),
        color,
        size: rand(0.5, 0.9),
        life: rand(0.25, 0.45),
        drag: 3,
        grow: 1.4,
      };
    });
  }

  private sparks(x: number, y: number, count: number, color: number): void {
    this.particles.burst(count, () => ({
      x: x + rand(-0.6, 0.6),
      y: y + 0.05,
      z: rand(-1.2, 1.6),
      vx: rand(-4, 4),
      vy: rand(1.5, 6),
      vz: rand(6, 14),
      color,
      size: rand(0.12, 0.22),
      life: rand(0.3, 0.6),
      gravity: 22,
      drag: 1,
    }));
  }
}
