interface RenderCacheNode {
  next: RenderCacheNode | null;
  prev: RenderCacheNode | null;
  element: HTMLElement;
}

const unlinkLeftCacheNodes = (node: RenderCacheNode | null) => {
  if (!node) {
    return;
  }
  const prevNode = node.prev;
  node.prev = null;
  node.next = null;
  node.element.parentElement?.removeChild(node.element);
  node.element = null;
  unlinkLeftCacheNodes(prevNode);
}

class RenderCache {
  constructor() {
    this._head = null;
    this._tail = null;
    this._current = null;
    this._recentUnused = null;
  }

  private _head: RenderCacheNode | null;
  private _tail: RenderCacheNode | null;
  private _current: RenderCacheNode | null;
  private _recentUnused: RenderCacheNode | null;
  private _version = 0;
  private _running = false;

  get() {
    const element = this._current.element;
    this._current = this._current.prev || null;
    return element;
  }

  start(version: number) {
    if (this._version !== version && !this._running) {
      this._current = this._tail;
      this._version = version;
      this._running = true;
    }
  }

  end() {
    this._running = false;
    this._recentUnused = this._current;
  }

  add(element: HTMLElement) {
    const node = {
      element,
      next: null,
      prev: this._tail,
    };
    if (this._tail) {
      this._tail.next = node;
    }
    this._tail = node;

    if (!this._head) {
      this._head = node;
    }
  }

  remove() {
    this._head.next = null;
    this._head.prev = null;
    this._head.element = null;
    if (this._head === this._tail) {
      this._tail = null;
    } else {
      this._head = this._head?.next || null;
    }
  }

  cleanup() {
    const node = this._recentUnused;
    const nextNode = node?.next || null;
    if (node) {
      unlinkLeftCacheNodes(this._recentUnused);
      this._head = nextNode;
      if (this._tail === node) {
        this._tail = null;
      }
      this._recentUnused = null;
    }

    return !!this._tail;
  }

  clear() {
    unlinkLeftCacheNodes(this._tail);
    this._head = null;
    this._tail = null;
    this._current = null;
  }
}

export {
  RenderCache,
}

export type {
  RenderCacheNode,
}
