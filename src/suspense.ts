import { JSX } from 'react/jsx-runtime';
import { createRenderer } from "./renderer";

interface SuspenseProps {
  children: Promise<any>;
  fallback?: JSX.Element;
}

const suspenseRenderer = createRenderer<SuspenseProps>((props, renderFn) => {
  const placeholderNode = renderFn(props.fallback || '');
    return renderFn(props.children, placeholderNode);
});

const Suspense = (props: SuspenseProps) => {
  return suspenseRenderer(props);
}

export {
  Suspense
}
