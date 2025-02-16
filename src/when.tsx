import { effect, untracked } from "@preact/signals-core";
import { createRenderer } from "./renderer";
import { getRenderContextByDom } from "./render-context";

const renderAsComponent = (Case) => {
  if (typeof Case === 'function') {
    return <Case />;
  }
  return Case;
}

interface ConditionalProps {
  condition: () => boolean;
  ifTrue: () => any;
  ifFalse: () => any;
}

const whenRenderer = createRenderer<ConditionalProps>((props, renderNode, renderContext, parent) => {
  let lastConditionResult = props.condition();
    let lastRenderResult: HTMLElement | null = null;
    renderContext.onCleanup(effect(() => {
      const conditionResult = props.condition();
      if (lastConditionResult === conditionResult) {
        return;
      }
      lastConditionResult = conditionResult;
      lastRenderResult = renderNode(
        untracked(() => renderAsComponent(conditionResult ? props.ifTrue : props.ifFalse)),
        lastRenderResult
      );
    }));

    const result = renderAsComponent(lastConditionResult ? props.ifTrue : props.ifFalse);
    lastRenderResult = renderNode(result);
    return lastRenderResult;
});

const when = (condition, ifTrue, ifFalse) => whenRenderer({
  condition,
  ifTrue,
  ifFalse
});

export {
  when,
}
