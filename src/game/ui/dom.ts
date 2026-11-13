export function cx(styles: CSSModuleClasses, ...names: string[]): string {
  return names.map((name) => styles[name] ?? name).join(' ');
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  parent?: HTMLElement,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  parent?.append(node);
  return node;
}

export function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

export class Screen {
  readonly root: HTMLDivElement;

  constructor(parent: HTMLElement, className: string) {
    this.root = el('div', className, parent);
    this.root.hidden = true;
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  show(): void {
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }
}
