import { PerspectiveCamera, Vector3 } from 'three';

export interface CameraTarget {
  x: number;
  y: number;
  dash: number;
  menu: number;
}

const BASE_ASPECT = 9 / 16;
const BASE_VFOV = 62;
const baseHalfH = Math.tan(((BASE_VFOV / 2) * Math.PI) / 180) * BASE_ASPECT;

export class CameraRig {
  readonly camera = new PerspectiveCamera(BASE_VFOV, BASE_ASPECT, 0.3, 220);
  private trauma = 0;
  private time = 0;
  private readonly pos = new Vector3(0, 5.8, 10.5);
  private readonly look = new Vector3(0, 1, -10);
  private readonly tmp = new Vector3();
  private readonly tmpLook = new Vector3();

  setAspect(aspect: number): void {
    const halfV = baseHalfH / Math.min(aspect, BASE_ASPECT);
    this.camera.fov = (2 * Math.atan(halfV) * 180) / Math.PI;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  setFar(far: number): void {
    this.camera.far = far + 30;
    this.camera.updateProjectionMatrix();
  }

  shake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  snap(target: CameraTarget): void {
    this.desired(target, this.pos, this.look);
    this.trauma = 0;
    this.apply();
  }

  update(dt: number, target: CameraTarget): void {
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const desiredPos = this.tmp;
    const desiredLook = this.tmpLook;
    this.desired(target, desiredPos, desiredLook);
    const k = 1 - Math.exp(-dt * 7);
    this.pos.lerp(desiredPos, k);
    this.look.lerp(desiredLook, 1 - Math.exp(-dt * 9));
    this.apply();
  }

  private desired(target: CameraTarget, pos: Vector3, look: Vector3): void {
    const dash = target.dash;
    const menu = target.menu;
    pos.set(
      target.x * 0.55 + menu * 3.2,
      5.8 + target.y * 0.55 + dash * 2.4 - menu * 3.6,
      10.5 + dash * 3.6 - menu * 3.6,
    );
    look.set(target.x * 0.7 - menu * 0.4, 0.4 + target.y * 0.7 + menu * 0.2, -16 + menu * 14);
  }

  private apply(): void {
    const shake = this.trauma * this.trauma;
    const t = this.time * 38;
    this.camera.position.set(
      this.pos.x + shake * 0.45 * Math.sin(t * 1.3),
      this.pos.y + shake * 0.35 * Math.sin(t * 1.7 + 1),
      this.pos.z,
    );
    this.camera.lookAt(this.look.x + shake * 0.3 * Math.sin(t * 0.9 + 2), this.look.y, this.look.z);
  }
}
