
import './index.css'
import { App } from './App'
import { JSX } from 'react/jsx-runtime';
import { Signal } from '@preact/signals-core';
import { Renderer } from './renderer';

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

const removeUnmountedSubscribers = (subscriptions: Map<Node, Array<() => void>>, node: Node) => {
  if (subscriptions.has(node)) {
    console.log('removing subscriptions', node);
    
    subscriptions.get(node).forEach((unsubscribeFn) => unsubscribeFn());
    subscriptions.delete(node);
  }
  node.childNodes.forEach((childNode) => removeUnmountedSubscribers(subscriptions, childNode));
}

type AddSubscriptionFn = (domElement: HTMLElement, unsubscribeFn: () => void) => void;

const handleUnmount = (rootElement: HTMLElement) => {
  const subscriptions = new Map<Node, Array<() => void>>();
  const observer = new MutationObserver((mutationsList) => {
    for(const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {  
        mutation.removedNodes.forEach((node) => {
          if (node.parentElement) {
            return
          }

          if (node === rootElement) {
            subscriptions.forEach((subscribers) => subscribers.forEach((unsubscribeFn) => unsubscribeFn()));
            subscriptions.clear();
          }
          removeUnmountedSubscribers(subscriptions, node);
        });
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  const addSubscription: AddSubscriptionFn = (domElement, unsubscribeFn) => {
    const previousSubscriptions = subscriptions.get(domElement) || [];
    subscriptions.set(domElement, [...previousSubscriptions, unsubscribeFn]);
  }

  return {
    addSubscription,
    disconnect() {
      observer.disconnect();
    }
  }
}

const updateTextNode = (node: HTMLElement, value: string | number) => {
  if (node instanceof Text) {
    node.textContent = value.toString();
    return node;
  }
  const textNode = document.createTextNode(value.toString());
  node.parentElement.replaceChild(textNode, node);
  return textNode;
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

const setAttribute = (domElement: HTMLElement, element: JSX.Element, addSubscription: AddSubscriptionFn, key: string, value: any) => {
  if (key.startsWith('on')) {
    const eventName = key.substring(2).toLowerCase();
    domElement.addEventListener(eventName, value as EventListener);
  } else
  if (key === 'children') {
    ensureArray(element.props.children).forEach((child: JSX.Element) => {
      renderNode(domElement, child, addSubscription);
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

const renderNode = (
  rootElement: HTMLElement,
  element: RenderElement | RenderElement[],
  addSubscription: (domElement: HTMLElement, unsubscribeFn: () => void) => void,
  previousElement?: HTMLElement | HTMLElement[] | Text | Text[],
) => {

  if (element instanceof Promise) {
    const placeholderNode = previousElement || document.createTextNode('');
    placeDomElements(rootElement, placeholderNode, previousElement || []);
    return element.then((resolvedResult) => renderNode(rootElement, resolvedResult, addSubscription, placeholderNode));
  }

  if (Array.isArray(element)) {
    const previousElements = ensureArray(previousElement);
    previousElements.slice(element.length).forEach((element) => {
      rootElement.removeChild(element);
    });
    return element.map((child: JSX.Element, i: number) => renderNode(rootElement, child, addSubscription, previousElements[i]));
  }

  if (element instanceof HTMLElement) {
    placeDomElements(rootElement, element, previousElement);
    return element;
  }

  if (element instanceof Renderer) {
    const renderFn = (elem, overrideElement) => renderNode(
      rootElement,
      elem,
      addSubscription,
      overrideElement !== undefined ? overrideElement : previousElement
    );
    return element.init(renderFn, addSubscription, rootElement);
  }

  if (element instanceof Signal) {
    let node = renderNode(rootElement, element.value, addSubscription, previousElement);
    addSubscription(rootElement, element.subscribe((value) => {
      node = updateTextNode(node, value);
    }));
    return node;
  }
  
  if (element === null || element === undefined) {
    return;
  }

  if (typeof element === 'string' || typeof element === 'number') {
    const textNode = document.createTextNode(element.toString());
    placeDomElements(rootElement, textNode, previousElement);
    return textNode;
  }

  if (element.type === FRAGMENT) {
    const output = element.props.children.map((child: JSX.Element) => renderNode(rootElement, child, addSubscription));
    setRef(element.props.ref, output);
    return output;
  }

  if (typeof element.type === 'function') {
    const result = element.type(element.props);
    const renderOutput = renderNode(rootElement, result, addSubscription, previousElement);
    console.log('element.props', element.props);
    
    setRef(element.props.ref, renderOutput);
    return renderOutput;
  }
  
  if (typeof element.type === 'string') {
    const domElement = document.createElement(element.type);
    
    Object.entries(element.props).forEach(([key, value]) => {
      if (key === 'ref') {
        setRef(value as any, domElement);
        return;
      }
      const transformedValue = value instanceof Signal ? value.value : value;
      setAttribute(domElement, element, addSubscription, key, transformedValue);
      if (value instanceof Signal) {
        addSubscription(domElement, value.subscribe((newValue) => {
          setAttribute(domElement, element, addSubscription, key, newValue);
        }));
      }
    });
    placeDomElements(rootElement, domElement, previousElement);
    return domElement;
  }

  return null;
}

const createRoot = (rootElement: HTMLElement) => {
  
  const { addSubscription } = handleUnmount(rootElement);
  return {
    render(element: JSX.Element) {
      renderNode(rootElement, element, addSubscription);
    }
  }
};

createRoot(document.getElementById('root')!).render(
    <App />
)

export { renderNode }
