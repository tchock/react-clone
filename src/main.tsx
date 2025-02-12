
import './index.css'
import { App } from './App'
import { MapRender } from './map';
import { JSX } from 'react/jsx-runtime';
import { Signal } from '@preact/signals-core';

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
  } else {
    const textNode = document.createTextNode(value.toString());
    node.parentElement.replaceChild(textNode, node);
  }
}


const renderNode = (rootElement: HTMLElement, element: JSX.Element | string | number | Signal) => {
  if (element instanceof MapRender) {
    return element.initRender(rootElement, renderNode);
  }

  if (element instanceof Signal) {
    const node = renderNode(rootElement, element.value);
    element.subscribe((value) => {
      updateTextNode(node, value);
    });
    return node;
  }
  
  if (element === null || element === undefined) {
    return;
  }

  if (typeof element === 'string' || typeof element === 'number') {
    const textNode = document.createTextNode(element.toString());
    rootElement.appendChild(textNode);
    return textNode;
  }

  if (element.type === FRAGMENT) {
    return element.props.children.map((child: JSX.Element) => renderNode(rootElement, child));
  }

  if (typeof element.type === 'function') {
    const result = element.type(element.props);
    return renderNode(rootElement, result);
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
    rootElement.appendChild(domElement);
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
