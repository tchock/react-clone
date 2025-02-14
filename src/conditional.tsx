import { effect, untracked } from "@preact/signals-core";
import { ReactNode } from "react";

const renderAsComponent = (Case) => {
  if (typeof Case === 'function') {
    return <Case />;
  }
  return Case;
}

class Conditional {
  constructor(public condition: () => boolean, public ifTrue: () => ReactNode, public ifFalse: () => ReactNode) {
    this.condition = condition;
    this.ifTrue = ifTrue;
    this.ifFalse = ifFalse;
  }

  initRender(parent: HTMLElement, renderNode: any) {
    let lastConditionResult = this.condition();
    let lastRenderResult: HTMLElement | null = null;
    effect(() => {
      const conditionResult = this.condition();
      if (lastConditionResult === conditionResult) {
        return;
      }
      lastConditionResult = conditionResult;
      lastRenderResult = renderNode(
        parent, 
        untracked(() => renderAsComponent(conditionResult ? this.ifTrue : this.ifFalse)),
        lastRenderResult
      );
    });

    const result = renderAsComponent(lastConditionResult ? this.ifTrue : this.ifFalse);
    lastRenderResult = renderNode(parent, result);
    return lastRenderResult;
  }
}

const conditional = (condition, ifTrue, ifFalse) => {
  return new Conditional(condition, ifTrue, ifFalse);
}

export {
  conditional,
  Conditional
}
