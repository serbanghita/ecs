import Component from "./Component.ts";

export class Idle extends Component<Record<string, never>> {
  constructor(public properties: Record<string, never>) {
    super(properties);
  }
}

export class Walking extends Component<Record<string, never>> {
  constructor(public properties: Record<string, never>) {
    super(properties);
  }
}

export class Attacking extends Component<Record<string, never>> {
  constructor(public properties: Record<string, never>) {
    super(properties);
  }
}

export class Renderable extends Component<Record<string, never>> {
  constructor(public properties: Record<string, never>) {
    super(properties);
  }
}

export type PositionOnScreenProps = {
  x: number;
  y: number;
};

export class PositionOnScreen extends Component<PositionOnScreenProps> {
  constructor(public properties: PositionOnScreenProps) {
    super(properties);
  }

  public get x(): number {
    return this.properties.x;
  }

  public get y(): number {
    return this.properties.y;
  }

  public setXY(x: number, y: number) {
    this.properties.x = x;
    this.properties.y = y;
  }
}

export type BodyProps = {
  width: number;
  height: number;
};

export class Body extends Component<BodyProps> {
  constructor(public properties: BodyProps) {
    super(properties);
  }

  public get width(): number {
    return this.properties.width;
  }

  public get height(): number {
    return this.properties.height;
  }
}

export interface KeyboardProps {
  up: string;
  down: string;
  left: string;
  right: string;
  action_1: string;
}

export class Keyboard extends Component<KeyboardProps> {
  constructor(public properties: KeyboardProps) {
    super(properties);
  }
}
