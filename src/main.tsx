
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

const renderNode = (
  rootElement: HTMLElement,
  element: RenderElement | RenderElement[],
  previousElement?: HTMLElement | HTMLElement[] | Text | Text[]
) => {

  if (element instanceof Promise) {
    const placeholderNode = previousElement || document.createTextNode('');
    placeDomElements(rootElement, placeholderNode, previousElement || []);
    return element.then((resolvedResult) => renderNode(rootElement, resolvedResult, placeholderNode));
  }

  if (Array.isArray(element)) {
    const previousElements = ensureArray(previousElement);
    previousElements.slice(element.length).forEach((element) => {
      rootElement.removeChild(element);
    });
    return element.map((child: JSX.Element, i: number) => renderNode(rootElement, child, previousElements[i]));
  }

  if (element instanceof HTMLElement) {
    placeDomElements(rootElement, element, previousElement);
    return element;
  }

  if (element instanceof Renderer) {
    const renderFn = (elem, overrideElement) => renderNode(
      rootElement,
      elem,
      overrideElement !== undefined ? overrideElement : previousElement
    );
    return element.init(renderFn, rootElement);
  }

  if (element instanceof Signal) {
    let node = renderNode(rootElement, element.value, previousElement);
    element.subscribe((value) => {
      node = updateTextNode(node, value);
    });
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
    return element.props.children.map((child: JSX.Element) => renderNode(rootElement, child));
  }

  if (typeof element.type === 'function') {
    const result = element.type(element.props);
    return renderNode(rootElement, result, previousElement);
  }
  
  if (typeof element.type === 'string') {
    const domElement = document.createElement(element.type);
    Object.entries(element.props).forEach(([key, value]) => {
      if (key.startsWith('on')) {
        const eventName = key.substring(2).toLowerCase();
        domElement.addEventListener(eventName, value as EventListener);
      } else
      if (key === 'children') {
        ensureArray(element.props.children).forEach((child: JSX.Element) => {
          renderNode(domElement, child);
        });
      } else if (key === 'style') {
        console.log('style', value);
      } else if (key === 'className') {
        domElement.setAttribute('class', value);
      } else if (typeof value === 'string' || typeof value === 'number') {
        domElement.setAttribute(key, value.toString());
      } else if (value instanceof Signal) {
        domElement.setAttribute(key, value.toString());
        value.subscribe((newValue) => {
          domElement.setAttribute(key, newValue.toString());
        });
      }
    });
    placeDomElements(rootElement, domElement, previousElement);
    return domElement;
  }

  return null;
}

const createRoot = (rootElement: HTMLElement) => {
  return {
    render(element: JSX.Element) {
      renderNode(rootElement, element);
    }
  }
};

createRoot(document.getElementById('root')!).render(
    <App />
)

export { renderNode }
