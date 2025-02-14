type RenderOutput = HTMLElement | HTMLElement[] | Text | Text[] | null;

type RendererInitFn<T> = (props: T, renderFn: any, parent?: HTMLElement) => RenderOutput;

class Renderer<T> {
  constructor(initFn: RendererInitFn<T>, props: T) {
    this.props = props;
    this.initFn = initFn;
  }

  private props: T;
  private initFn: RendererInitFn<T>;

  init(renderFn: any, parent?: HTMLElement) {
    return this.initFn(this.props, renderFn, parent);
  }
}

const createRenderer = <T,>(initFn: RendererInitFn<T>) => (props: T) => new Renderer(initFn, props);

export {
  createRenderer,
  Renderer,
}

export type {
  RenderOutput,
  RendererInitFn,
}
