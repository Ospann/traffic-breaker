import Phaser from 'phaser';
import { FONT_FAMILY } from '../keys';

export interface ButtonOptions {
  width?: number;
  height?: number;
  color?: number;
  textColor?: string;
  fontSize?: number;
}

export class Button extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly btnWidth: number;
  private readonly btnHeight: number;
  private readonly baseColor: number;
  private enabled = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    onClick: () => void,
    options: ButtonOptions = {},
  ) {
    super(scene, x, y);
    this.btnWidth = options.width ?? 440;
    this.btnHeight = options.height ?? 110;
    this.baseColor = options.color ?? 0x4f7cff;

    this.background = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, text, {
        fontFamily: FONT_FAMILY,
        fontSize: `${options.fontSize ?? 44}px`,
        color: options.textColor ?? '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add([this.background, this.label]);
    this.setSize(this.btnWidth, this.btnHeight);
    this.draw(this.baseColor);

    this.setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.POINTER_OVER, () => this.enabled && this.draw(this.shade(0.12)))
      .on(Phaser.Input.Events.POINTER_OUT, () => {
        this.draw(this.enabled ? this.baseColor : 0x555a6e);
        this.setScale(1);
      })
      .on(Phaser.Input.Events.POINTER_DOWN, () => this.enabled && this.setScale(0.96))
      .on(Phaser.Input.Events.POINTER_UP, () => {
        this.setScale(1);
        if (this.enabled) onClick();
      });

    scene.add.existing(this);
  }

  static create(...args: ConstructorParameters<typeof Button>): Button {
    return new Button(...args);
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.draw(enabled ? this.baseColor : 0x555a6e);
    this.setAlpha(enabled ? 1 : 0.7);
    return this;
  }

  private draw(color: number): void {
    this.background.clear();
    this.background.fillStyle(0x000000, 0.25);
    this.background.fillRoundedRect(
      -this.btnWidth / 2,
      -this.btnHeight / 2 + 8,
      this.btnWidth,
      this.btnHeight,
      28,
    );
    this.background.fillStyle(color, 1);
    this.background.fillRoundedRect(
      -this.btnWidth / 2,
      -this.btnHeight / 2,
      this.btnWidth,
      this.btnHeight,
      28,
    );
  }

  private shade(amount: number): number {
    const c = Phaser.Display.Color.IntegerToColor(this.baseColor);
    c.lighten(amount * 100);
    return c.color;
  }
}
