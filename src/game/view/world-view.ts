import {
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  Scene,
  type WebGLRenderer,
} from 'three';
import { buildBreakerCar, carSockets, defaultCarSkin, type CarKit } from '../art/breaker-car';
import { buildBlobShadow, CityScenery } from '../art/city';
import { palette } from '../art/palette';
import { ParticleSystem } from '../art/particles';
import { buildShieldBubble } from '../art/pickups';
import { buildPoliceDrone, type DroneModel } from '../art/police-drone';
import { createGlowTexture, createWindowTexture } from '../art/textures';
import type { BonusType } from '../balance';
import { CameraRig } from '../engine/camera-rig';
import type { QualityLevel } from '../engine/quality';
import type { RunSession, SessionEvent } from '../sim/run-session';
import { PickupView } from './pickup-view';
import { TrackView } from './track-view';

export type ViewMode = 'menu' | 'run' | 'garage';

const MENU_SPEED = 9;
const PARTICLE_CAPACITY = 360;
const VAPOR_CAPACITY = 420;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

const bonusColor: Readonly<Record<BonusType, number>> = {
  fullTank: palette.amber,
  magnet: palette.red,
  double: palette.violet,
  superJump: palette.lime,
};

export interface CarLook {
  neon: number;
  kit: CarKit;
  flame: number;
}

export class WorldView {
  readonly scene = new Scene();
  readonly rig = new CameraRig();
  readonly track: TrackView;
  readonly pickups: PickupView;
  readonly particles: ParticleSystem;
  readonly vapor: ParticleSystem;
  private readonly fog: Fog;
  private readonly city: CityScenery;
  private readonly car = new Group();
  private carBody: Group;
  private jetColor = 0xf4fbff;
  private jetCore = 0xffffff;
  private readonly shadow: Mesh;
  private readonly drone: DroneModel;
  private readonly shieldBubble = buildShieldBubble();

  private mode: ViewMode = 'menu';
  private menuBlend = 1;
  private garageBlend = 0;
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
    this.pickups = new PickupView(this.scene);
    this.car.add(this.shieldBubble);
    const glowTexture = createGlowTexture();
    this.particles = new ParticleSystem(glowTexture, PARTICLE_CAPACITY);
    this.scene.add(this.particles.points);
    this.vapor = new ParticleSystem(glowTexture, VAPOR_CAPACITY, false, 0.75);
    this.scene.add(this.vapor.points);

    this.rig.snap({ x: 0, y: 0, dash: 0, menu: 1 });
  }

  setLook(look: CarLook): void {
    this.car.remove(this.carBody);
    this.carBody.traverse((child) => {
      if (child instanceof Mesh) child.geometry.dispose();
    });
    this.carBody = buildBreakerCar({ ...defaultCarSkin, neon: look.neon, kit: look.kit });
    this.car.add(this.carBody);
    this.jetColor = new Color(0xffffff).lerp(new Color(look.flame), 0.14).getHex();
    this.jetCore = 0xffffff;
  }

  setQuality(level: QualityLevel): void {
    this.fog.near = level.viewDistance * 0.25;
    this.fog.far = level.viewDistance;
    this.rig.setFar(level.viewDistance);
    this.city.setViewDistance(level.viewDistance);
    this.particles.emissionScale = level.particles;
    this.vapor.emissionScale = level.particles;
  }

  setViewport(width: number, height: number, pixelRatio: number): void {
    this.rig.setAspect(width / height);
    const fov = (this.rig.camera.fov * Math.PI) / 180;
    const scale = (height * pixelRatio) / (2 * Math.tan(fov / 2));
    this.particles.setViewportScale(scale);
    this.vapor.setViewportScale(scale);
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
    this.vapor.clear();
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
          if (session.bonusTimers.superJump > 0) {
            this.burstUnder(x, y, 30, 1.5);
            this.rig.shake(0.15);
          } else {
            this.burstUnder(x, y, 18, 1);
          }
          break;
        case 'land':
          this.sparks(x, y, 16, palette.amber);
          this.rig.shake(0.12);
          break;
        case 'rampLaunch':
          this.rig.shake(0.25);
          this.burstUnder(x, y, 22, 1.2);
          break;
        case 'fastDrop':
          this.burstUnder(x, y, 10, 0.8);
          break;
        case 'dashStart':
          this.rig.shake(0.7);
          this.burstUnder(x, y, 36, 1.8);
          this.rearBlast(x, y, 30);
          break;
        case 'lightHit':
          this.rig.shake(0.55);
          this.sparks((x + event.entity.x) / 2, y + 0.5, 26, palette.white);
          break;
        case 'crash':
          this.rig.shake(1);
          this.crashSpin = 9;
          this.sparks(x, y + 0.6, 60, palette.amber);
          this.burstUnder(x, y, 30, 1.6);
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
        case 'coin':
          this.coinSparkle(event.x, event.y, event.streak);
          break;
        case 'bonus':
          this.rig.shake(event.bonus === 'fullTank' ? 0.7 : 0.2);
          this.sparks(x, y + 1, 30, bonusColor[event.bonus]);
          break;
        case 'shieldOn':
          this.sparks(x, y + 0.6, 24, palette.cyan);
          break;
        case 'shieldSave':
          this.rig.shake(0.6);
          this.sparks(x, y + 0.6, 50, palette.cyan);
          break;
        case 'bonusEnd':
        case 'shieldEnd':
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
    const garageTarget = this.mode === 'garage' ? 1 : 0;
    this.garageBlend += (garageTarget - this.garageBlend) * Math.min(1, dt * 3);

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
    this.emitJets(dt, carX, this.car.position.y, dashing);
    this.particles.update(dt);
    this.vapor.update(dt);
    this.track.update(dt);
    this.pickups.update(dt, running ? session.track.pickups : null);
    this.updateShield(session, running);

    this.rig.update(dt, {
      x: carX,
      y: Math.min(carY, 4.5),
      dash: this.dashBlend,
      menu: this.menuBlend,
      garage: this.garageBlend,
      orbit: 2.2 + 0.6 * Math.sin(this.time * 0.25),
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

  private emitJets(dt: number, x: number, y: number, dashing: boolean): void {
    if (!dashing) {
      this.emitCarry = 0;
      return;
    }
    this.emitCarry += 150 * this.vapor.emissionScale * dt;
    while (this.emitCarry >= 1) {
      this.emitCarry -= 1;
      const socket = carSockets.rearNozzles[Math.random() < 0.5 ? 0 : 1];
      this.vapor.emit({
        x: x + socket[0],
        y: y + socket[1] * this.carBody.scale.y,
        z: socket[2],
        vx: rand(-0.5, 0.5),
        vy: rand(-0.3, 0.5),
        vz: rand(22, 30),
        color: Math.random() < 0.4 ? this.jetCore : this.jetColor,
        size: rand(0.18, 0.3),
        life: rand(0.28, 0.42),
        drag: 6,
        grow: 5,
      });
      const under = carSockets.underNozzles[Math.random() < 0.5 ? 0 : 1];
      this.vapor.emit({
        x: x + under[0],
        y: y + under[1],
        z: under[2],
        vx: rand(-0.8, 0.8),
        vy: rand(-16, -10),
        vz: rand(3, 6),
        color: this.jetColor,
        size: rand(0.2, 0.3),
        life: rand(0.22, 0.34),
        drag: 6,
        grow: 4.5,
      });
    }
  }

  private rearBlast(x: number, y: number, count: number): void {
    this.vapor.burst(count, () => {
      const socket = carSockets.rearNozzles[Math.random() < 0.5 ? 0 : 1];
      return {
        x: x + socket[0] + rand(-0.1, 0.1),
        y: y + socket[1] + rand(-0.1, 0.1),
        z: socket[2],
        vx: rand(-3, 3),
        vy: rand(-1, 2),
        vz: rand(14, 26),
        color: this.jetCore,
        size: rand(0.4, 0.7),
        life: rand(0.4, 0.6),
        drag: 4,
        grow: 4,
      };
    });
  }

  private updateShield(session: RunSession | null, running: boolean): void {
    const active = running && session !== null && session.shieldActive;
    this.shieldBubble.visible = active;
    if (!active) return;
    const left = session.shieldTimer;
    const blink = left < 2 ? (Math.sin(this.time * 30) > 0 ? 1 : 0.3) : 1;
    const material = this.shieldBubble.material;
    if ('opacity' in material) material.opacity = (0.16 + 0.08 * Math.sin(this.time * 8)) * blink;
  }

  private coinSparkle(x: number, y: number, streak: number): void {
    const count = Math.min(4 + Math.floor(streak / 5), 10);
    this.particles.burst(count, () => ({
      x: x + rand(-0.2, 0.2),
      y: y + rand(-0.2, 0.2),
      z: rand(-0.5, 0.5),
      vx: rand(-2.5, 2.5),
      vy: rand(1, 4),
      vz: rand(2, 8),
      color: 0xffd36a,
      size: rand(0.18, 0.3),
      life: rand(0.2, 0.35),
      drag: 2,
    }));
  }

  private burstUnder(x: number, y: number, count: number, power: number): void {
    this.vapor.burst(count, () => {
      const socket = carSockets.underNozzles[Math.random() < 0.5 ? 0 : 1];
      return {
        x: x + socket[0] + rand(-0.15, 0.15),
        y: y + 0.12,
        z: socket[2] + rand(-0.4, 0.4),
        vx: rand(-3, 3) * power,
        vy: rand(-9, -4) * power,
        vz: rand(3, 9),
        color: Math.random() < 0.5 ? this.jetCore : this.jetColor,
        size: rand(0.35, 0.6),
        life: rand(0.35, 0.55),
        drag: 4,
        grow: 3.5,
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
