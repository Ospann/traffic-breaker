import {
  AdditiveBlending,
  BufferAttribute,
  NormalBlending,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Points,
  ShaderMaterial,
  type Texture,
} from 'three';

const vertexShader = `
attribute float size;
attribute vec3 tint;
attribute float alpha;
varying vec3 vTint;
varying float vAlpha;
uniform float uScale;
void main() {
  vTint = tint;
  vAlpha = alpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * uScale / max(-mv.z, 0.1);
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = `
uniform sampler2D uMap;
varying vec3 vTint;
varying float vAlpha;
uniform float uAdditive;
void main() {
  vec4 tex = texture2D(uMap, gl_PointCoord);
  float a = tex.a * vAlpha;
  gl_FragColor = uAdditive > 0.5 ? vec4(vTint * a, a) : vec4(vTint, a);
}
`;

export interface EmitOptions {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: number;
  size: number;
  life: number;
  gravity?: number;
  drag?: number;
  grow?: number;
}

const tmp = new Color();

export class ParticleSystem {
  readonly points: Points;
  private readonly material: ShaderMaterial;
  private readonly positions: Float32Array;
  private readonly tints: Float32Array;
  private readonly alphas: Float32Array;
  private readonly sizes: Float32Array;
  private readonly velocity: Float32Array;
  private readonly baseColor: Float32Array;
  private readonly baseSize: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly gravity: Float32Array;
  private readonly drag: Float32Array;
  private readonly grow: Float32Array;
  private cursor = 0;
  emissionScale = 1;

  constructor(
    texture: Texture,
    private readonly capacity: number,
    private readonly additive = true,
    private readonly opacity = 1,
  ) {
    this.alphas = new Float32Array(capacity);
    this.positions = new Float32Array(capacity * 3);
    this.tints = new Float32Array(capacity * 3);
    this.sizes = new Float32Array(capacity);
    this.velocity = new Float32Array(capacity * 3);
    this.baseColor = new Float32Array(capacity * 3);
    this.baseSize = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity).fill(1);
    this.gravity = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.grow = new Float32Array(capacity);

    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new BufferAttribute(this.positions, 3).setUsage(DynamicDrawUsage),
    );
    geometry.setAttribute('tint', new BufferAttribute(this.tints, 3).setUsage(DynamicDrawUsage));
    geometry.setAttribute('size', new BufferAttribute(this.sizes, 1).setUsage(DynamicDrawUsage));
    geometry.setAttribute('alpha', new BufferAttribute(this.alphas, 1).setUsage(DynamicDrawUsage));

    this.material = new ShaderMaterial({
      uniforms: {
        uMap: { value: texture },
        uScale: { value: 400 },
        uAdditive: { value: additive ? 1 : 0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: additive ? AdditiveBlending : NormalBlending,
    });
    this.points = new Points(geometry, this.material);
    this.points.frustumCulled = false;
  }

  setViewportScale(scale: number): void {
    const uniform = this.material.uniforms.uScale;
    if (uniform) uniform.value = scale;
  }

  emit(options: EmitOptions): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    const i3 = i * 3;
    this.positions[i3] = options.x;
    this.positions[i3 + 1] = options.y;
    this.positions[i3 + 2] = options.z;
    this.velocity[i3] = options.vx;
    this.velocity[i3 + 1] = options.vy;
    this.velocity[i3 + 2] = options.vz;
    tmp.setHex(options.color);
    this.baseColor[i3] = tmp.r;
    this.baseColor[i3 + 1] = tmp.g;
    this.baseColor[i3 + 2] = tmp.b;
    this.baseSize[i] = options.size;
    this.life[i] = options.life;
    this.maxLife[i] = options.life;
    this.gravity[i] = options.gravity ?? 0;
    this.drag[i] = options.drag ?? 0;
    this.grow[i] = options.grow ?? 0;
  }

  burst(count: number, make: (index: number) => EmitOptions): void {
    const scaled = Math.max(1, Math.round(count * this.emissionScale));
    for (let i = 0; i < scaled; i += 1) this.emit(make(i));
  }

  update(dt: number): void {
    for (let i = 0; i < this.capacity; i += 1) {
      const i3 = i * 3;
      const life = (this.life[i] ?? 0) - dt;
      this.life[i] = life;
      if (life <= 0) {
        this.sizes[i] = 0;
        continue;
      }
      const drag = Math.max(0, 1 - (this.drag[i] ?? 0) * dt);
      const vx = (this.velocity[i3] ?? 0) * drag;
      const vy = ((this.velocity[i3 + 1] ?? 0) - (this.gravity[i] ?? 0) * dt) * drag;
      const vz = (this.velocity[i3 + 2] ?? 0) * drag;
      this.velocity[i3] = vx;
      this.velocity[i3 + 1] = vy;
      this.velocity[i3 + 2] = vz;
      this.positions[i3] = (this.positions[i3] ?? 0) + vx * dt;
      this.positions[i3 + 1] = (this.positions[i3 + 1] ?? 0) + vy * dt;
      this.positions[i3 + 2] = (this.positions[i3 + 2] ?? 0) + vz * dt;
      const k = life / (this.maxLife[i] ?? 1);
      const fade = this.additive ? k : k * k * this.opacity;
      this.alphas[i] = this.additive ? 1 : fade;
      const shade = this.additive ? k : 1;
      this.tints[i3] = (this.baseColor[i3] ?? 0) * shade;
      this.tints[i3 + 1] = (this.baseColor[i3 + 1] ?? 0) * shade;
      this.tints[i3 + 2] = (this.baseColor[i3 + 2] ?? 0) * shade;
      this.sizes[i] = (this.baseSize[i] ?? 0) * (1 + (this.grow[i] ?? 0) * (1 - k));
    }
    const geometry = this.points.geometry;
    for (const name of ['position', 'tint', 'size', 'alpha']) {
      const attribute = geometry.getAttribute(name);
      attribute.needsUpdate = true;
    }
  }

  clear(): void {
    this.life.fill(0);
    this.sizes.fill(0);
  }
}
