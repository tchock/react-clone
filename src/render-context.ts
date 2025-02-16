let currentRenderContext: RenderContext = null;
const domMap = new WeakMap<HTMLElement, RenderContext>()

interface RenderContext {
  parent: RenderContext | null;
  onCleanup: (unsubscribeFn: () => void, renderContext?: any) => void;
  cleanup: (renderContext?: RenderContext) => void;
  registerRenderContext: (renderContext: RenderContext) => void;
  children: RenderContext[];
}

const createRenderContext = (parentRenderContext?: RenderContext): RenderContext => {
  const registerRenderContext = parentRenderContext.registerRenderContext;
  const renderContext = {
    parent: parentRenderContext,
    onCleanup: (unsubscribeFn, overrideRenderContext) => parentRenderContext.onCleanup(unsubscribeFn, overrideRenderContext || renderContext),
    cleanup: (overrideRenderContext) => {
      parentRenderContext.cleanup(overrideRenderContext || renderContext);
    },
    registerRenderContext,
    children: [],
  };
  registerRenderContext(renderContext);
  if (parentRenderContext) {
    parentRenderContext.children.push(renderContext);
  }
  currentRenderContext = renderContext;
  return renderContext;
}

const linkDomToRenderContext = (dom: HTMLElement, renderContext: RenderContext) => {
  domMap.set(dom, renderContext);
}

const getRenderContextByDom = (dom: HTMLElement) => domMap.get(dom);

const getCurrentRenderContext = () => currentRenderContext;

export {
  createRenderContext,
  getCurrentRenderContext,
  getRenderContextByDom,
  linkDomToRenderContext,
}

export type {
  RenderContext,
}
