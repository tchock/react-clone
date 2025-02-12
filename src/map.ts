import { Signal } from "@preact/signals-core";
import { JSX } from 'react/jsx-runtime';
import { RenderCache } from "./render-cache";

class MapRender<T> {
  constructor(public list: Signal<T[]>, private renderFn: (item: T, index: number) => JSX.Element) {
  }

  private _version = 0;
  renderCache = new Map<T, RenderCache>();

  initRender(parent: HTMLElement, renderNode: any) {
    this.list.value.map((item, index) => {
      const inputValue = item instanceof Signal ? item.value : item;
      const element = renderNode(parent, this.renderFn(inputValue, index));
      const renderCache = new RenderCache();
      
      renderCache.start(this._version);
      this.renderCache.set(item, renderCache);
      renderCache.add(element);
      return element;
    });
    this.renderCache.forEach((cache) => {
      cache.end();
    });

    
    this.list.subscribe((newList) => {
      this._version += 1;
      this.renderCache.forEach((cache) => {
        cache.start(this._version);
      });
      const newChildren = newList.map((item) => [item, this.renderCache.get(item)] as const).map(([item, itemCache], index) => {
        if (itemCache) {
          const itemNode = itemCache.get();

          if (!itemNode) {
            const newOutput = renderNode(parent, this.renderFn(item, index));
            itemCache.add(newOutput);
            return newOutput;
          }
          
          return itemNode;
        }
        const newCache = new RenderCache();
        newCache.start(this._version);
        this.renderCache.set(item, newCache);
        const newOutput = renderNode(parent, this.renderFn(item, index));
        newCache.add(newOutput);
        return newOutput;
      });
      this.renderCache.forEach((cache, key) => {
        cache.end();
        const hasMore = cache.cleanup();
        
        if (!hasMore) {
          this.renderCache.delete(key);
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
    });
  }
}

const map = <T,>(list: Signal<T[]>, renderFn: (item: T, index: number) => JSX.Element) => new MapRender(list, renderFn);


export { map, MapRender };
