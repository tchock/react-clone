
import './index.css'
import { App } from './App'
import { JSX } from 'react/jsx-runtime';
import { Signal } from '@preact/signals-core';
import { Renderer } from './renderer';
import { createRenderContext, getRenderContextByDom, linkDomToRenderContext, RenderContext } from './render-context';

const FRAGMENT = Symbol.for('react.fragment');

const ensureArray = <T,>(value: T) => {
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
}

const setRef = (ref: Signal | ((value: any) => void), value: any) => {
  if (ref) {
    if (value instanceof Promise) {
      value.then((resolvedValue) => setRef(ref, resolvedValue));
      return;
    }
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref instanceof Signal) {
        ref.value = value;
      }
    }
}

const cascadeCleanup = (cleanupHandlers: Map<any, (() => void)[]>, renderContext: RenderContext) => {
  if (cleanupHandlers.has(renderContext)) {
    
    cleanupHandlers.get(renderContext).forEach((cleanupFn) => {
      cleanupFn();
    });
    cleanupHandlers.delete(renderContext);
  }
  renderContext.children.forEach((childContext) => cascadeCleanup(cleanupHandlers, childContext));
  renderContext.children = [];
}

type OnCleanupFn = (unsubscribeFn: () => void, renderContext: RenderContext) => void;

const handleUnmount = () => {
  const cleanupHandlers = new Map<any, (() => void)[]>();
  
  const cleanup = (renderContext: RenderContext) => {
    renderContext.parent.children = renderContext.parent.children.filter((childContext) => childContext !== renderContext);
    cascadeCleanup(cleanupHandlers, renderContext);
  }
  
  const onCleanup: OnCleanupFn = (cleanupFn, identifier) => {
    const prevValue = cleanupHandlers.get(identifier);
    cleanupHandlers.set(identifier, [...prevValue, cleanupFn]);
  }

  const registerRenderContext = (renderContext: RenderContext) => {
    cleanupHandlers.set(renderContext, []);
  }


  return {
    onCleanup,
    cleanup,
    registerRenderContext,
  }
}

const placeDomElements = (rootElement: HTMLElement, element: Text | Text[] | HTMLElement | HTMLElement[], previousElement: Text | Text[] | HTMLElement | HTMLElement[]) => {
  if (element === previousElement) {
    return;
  }

  const elements = ensureArray(element);
  const previousElements = ensureArray(previousElement);

  elements.forEach((element, index) => {
    const previousElement = previousElements[index];
    if (previousElement) {
      rootElement.replaceChild(element, previousElement);
    } else {
      rootElement.appendChild(element);
    }
  });

  previousElements.slice(elements.length).forEach((element) => {
    rootElement.removeChild(element);
  });
}

type RenderElement = JSX.Element | string | number | Signal | Promise<RenderElement>;

const setAttribute = (renderContext: RenderContext, domElement: HTMLElement, element: JSX.Element, key: string, value: any) => {
  if (key.startsWith('on')) {
    const eventName = key.substring(2).toLowerCase();
    domElement.addEventListener(eventName, value as EventListener);
  } else
  if (key === 'children') {
    ensureArray(element.props.children).forEach((child: JSX.Element) => {
      renderNode(renderContext, domElement, child);
    });
  } else if (key === 'style') {
    Object.entries(value).forEach(([styleKey, styleValue]) => {
      domElement.style[styleKey] = styleValue;
    });
  } else if (key === 'className') {
    domElement.setAttribute('class', value.toString());
  } else {
    domElement.setAttribute(key, value.toString());
  }
}

const renderNodeInner = (
  parentRenderContext: RenderContext,
  parent: HTMLElement,
  element: RenderElement | RenderElement[],
  previousElement?: HTMLElement | HTMLElement[] | Text | Text[],
) => {

  if (element instanceof Promise) {
    const placeholderNode = previousElement || document.createTextNode('');
    placeDomElements(parent, placeholderNode, previousElement || []);
    return element.then((resolvedResult) => renderNode(parentRenderContext, parent, resolvedResult, placeholderNode));
  }

  if (Array.isArray(element)) {
    const previousElements = ensureArray(previousElement);
    previousElements.slice(element.length).forEach((element) => {
      parent.removeChild(element);
    });
    return element.map((child: JSX.Element, i: number) => renderNode(parentRenderContext, parent, child, previousElements[i]));
  }

  if (element instanceof HTMLElement) {
    placeDomElements(parent, element, previousElement);
    return element;
  }

  if (element instanceof Renderer) {
    const renderFn = (elem, overrideElement) => renderNode(
      parentRenderContext,
      parent,
      elem,
      overrideElement !== undefined ? overrideElement : previousElement
    );
    return element.init(renderFn, parentRenderContext, parent);
  }

  if (element instanceof Signal) {
    let node;
    parentRenderContext.onCleanup(element.subscribe((value) => {
      node = renderNode(parentRenderContext, parent, value, node || previousElement)
    }));
    return node;
  }
  
  if (element === null || element === undefined) {
    return;
  }

  if (typeof element === 'string' || typeof element === 'number') {
    const textNode = document.createTextNode(element.toString());
    placeDomElements(parent, textNode, previousElement);
    return textNode;
  }

  if (element.type === FRAGMENT) {
    const output = element.props.children.map((child: JSX.Element) => renderNode(parentRenderContext, parent, child));
    setRef(element.props.ref, output);
    return output;
  }

  if (typeof element.type === 'function') {
    const result = element.type(element.props);
    const renderContext = createRenderContext(parentRenderContext);
    const renderOutput = renderNode(renderContext, parent,result, previousElement);
    if (renderOutput instanceof HTMLElement) {
      linkDomToRenderContext(renderOutput, renderContext);
    }
    setRef(element.props.ref, renderOutput);
    return renderOutput;
  }
  
  if (typeof element.type === 'string') {
    const domElement = document.createElement(element.type);
    const renderContext = createRenderContext(parentRenderContext);
    linkDomToRenderContext(domElement, renderContext);
    Object.entries(element.props).forEach(([key, value]) => {
      if (key === 'ref') {
        setRef(value as any, domElement);
        return;
      }
      const handleSignal = value instanceof Signal && key !== 'children';
      if (handleSignal) {
        renderContext.onCleanup(value.subscribe((newValue) => {
          setAttribute(renderContext, domElement, element, key, newValue);
        }));
      } else {
        setAttribute(renderContext, domElement, element, key, value);
      }
    });
    placeDomElements(parent, domElement, previousElement);
    return domElement;
  }

  return null;
}

const renderNode = (
  parentRenderContext: RenderContext,
  parent: HTMLElement,
  element: RenderElement | RenderElement[],
  previousElement?: HTMLElement | HTMLElement[] | Text | Text[],
) => {
  if (previousElement instanceof HTMLElement) {
    const previousRenderContext = getRenderContextByDom(previousElement);
    if (previousRenderContext) {
      previousRenderContext.cleanup();
    }
  }

  return renderNodeInner(parentRenderContext, parent, element, previousElement);  
}

const createRoot = (rootElement: HTMLElement) => {
  const { onCleanup, cleanup, registerRenderContext } = handleUnmount();
  const rootRenderContext = createRenderContext({
    onCleanup: (unsubscribeFn, renderContext) => {
      return onCleanup(unsubscribeFn, renderContext || rootRenderContext);
    },
    cleanup: (renderContext) => cleanup(renderContext),
    children: [],
    registerRenderContext,
    parent: null,
  });
  return {
    render(element: JSX.Element) {
      renderNode(rootRenderContext, rootElement, element);
    }
  }
};

createRoot(document.getElementById('root')!).render(
    <App />
)

export { renderNode }
