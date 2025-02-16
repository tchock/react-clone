import { Signal } from "@preact/signals-core";
import { JSX } from 'react/jsx-runtime';
import { RenderCache } from "./render-cache";
import { createRenderer } from "./renderer";
import { getRenderContextByDom } from "./render-context";

type RenderFn<T> = (item: T, index: number) => JSX.Element;

interface MapProps<T> {
  list: Signal<T[]>;
  renderFn: RenderFn<T>;
  renderCache: Map<T, RenderCache>;
  version: Signal<number>;
}

const map = <T,>(list: Signal<T[]>, renderFn: RenderFn<T>) => createRenderer<MapProps<T>>((props, renderFn, renderContext, parent) => {
  let renderOutput;
  props.renderCache.forEach((cache) => {
    cache.end();
  });

  renderContext.onCleanup(props.list.subscribe((newList) => {
    props.version.value += 1;
    props.renderCache.forEach((cache) => {
      cache.start(props.version.value);
    });
    const newChildren = newList.map((item) => [item, props.renderCache.get(item)] as const).map(([item, itemCache], index) => {
      if (itemCache) {
        const itemNode = itemCache.get();

        if (!itemNode) {
          const newOutput = renderFn(props.renderFn(item, index));
          itemCache.add(newOutput);
          return newOutput;
        }
        
        return itemNode;
      }
      const newCache = new RenderCache();
      newCache.start(props.version.value);
      props.renderCache.set(item, newCache);
      const newOutput = renderFn(props.renderFn(item, index));
      newCache.add(newOutput);
      return newOutput;
    });
    props.renderCache.forEach((cache, key) => {
      cache.end();
      const hasMore = cache.cleanup((node) => {
        const nodeRenderContext = getRenderContextByDom(node);
        nodeRenderContext.cleanup();
      });
      
      if (!hasMore) {
        props.renderCache.delete(key);
      }
    });
    
    let currentChildNode = parent.firstChild;
    
    newChildren.forEach((newChild) => {
      if (currentChildNode === undefined) {
        parent.appendChild(newChild);
      } else if (currentChildNode !== newChild) {
        parent.insertBefore(newChild, currentChildNode);
      } else {
        currentChildNode = currentChildNode.nextSibling;
      }
    });
    renderOutput = newChildren;
  }));

  return renderOutput;
})({
  list,
  renderFn,
  version: new Signal(0),
  renderCache: new Map<T, RenderCache>()
});

export { map };
