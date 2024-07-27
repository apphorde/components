let stack = [];

export function createHelpers(target) {
  const $ = (s) => target.querySelector(s);
  const $$ = (s) => [...target.querySelectorAll(s)];
  const $emit = emitEvent.bind(null, target);

  return { $el: target, $, $$, $emit };
}

function emitEvent(target, event, options) {
  const customEvent = new CustomEvent(event, options);

  if (target["on" + event]) {
    target["on" + event](customEvent);
  }

  target.dispatchEvent(customEvent);
}

function __defineEmits(target, list) {
  for (const event of list) {
    let eventHandler = null;

    Object.defineProperty(target, "on" + event, {
      enumerable: true,
      configurable: false,
      get() {
        return eventHandler;
      },
      set(value) {
        if (typeof value !== "function" && value !== null) {
          throw new Error("Invalid value for an event handler");
        }

        eventHandler = value;
      },
    });
  }
}

export function createTemplate(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  template.normalize();
  return template;
}

export function detachChildNodes(target) {
  const fragment = document.createDocumentFragment();
  const nodes = [...target.childNodes];
  for (const c of nodes) {
    fragment.append(c);
  }

  return fragment;
}

export function onConnect(target, templateRef, options) {
  const template = templateRef.content.cloneNode(true);

  if (options.shadow) {
    const shadow = target.attachShadow(options.shadow);
    shadow.appendChild(template);
  } else {
    const previousContent = detachChildNodes(target);
    target.appendChild(template);
    const slot = target.querySelector("slot");

    if (slot) {
      slot.innerHTML = "";
      slot.appendChild(previousContent);
    } else {
      target.appendChild(previousContent);
    }
  }

  if (options.emits.length) {
    __defineEmits(this, options.emits);
  }

  const helpers = createHelpers(target);

  if (options.init) {
    options.init.apply(target, [helpers]);
  }

  if (options.change) {
    const observer = new MutationObserver(function (mutation) {
      if (mutation.type === "attributes") {
        options.change.apply(target, [mutation.attributeName, helpers]);
      }
    });

    observer.observe(target, { attributes: true });
    target.__obs__ = observer;
  }
}

export function onDisconnect(target, options) {
  if (options.destroy) {
    const helpers = createHelpers(target);
    options.destroy.apply(target, [helpers]);
  }

  if (target.__obs__) {
    target.__obs__.disconnect();
  }
}

const componentRegistry = new Map();

function getCurrent() {
  const current = stack[stack.length - 1];
  return componentRegistry.get(current);
}

export function onInit(callback) {
  getCurrent().init = callback;
}

export function onDestroy(callback) {
  getCurrent().destroy = callback;
}

export function onChange(callback) {
  getCurrent().change = callback;
}

export function defineEmits(list) {
  getCurrent().emits = list;
}

export function __addComponent(name) {
  if (customElements.get(name)) {
    throw new Error(
      `Component ${name} was already defined! ${stack.join("->")}`
    );
  }

  componentRegistry.set(name, {
    name,
    emits: [],
    init: null,
    destroy: null,
    change: null,
  });

  stack.push(name);
}

export function __defineComponent(name, html) {
  if (customElements.get(name)) {
    throw new Error(
      `Component ${name} was already defined! ${stack.join("->")}`
    );
  }

  const current = stack.pop();
  if (current !== name) {
    throw new Error(
      `Component stack is out of sync! Expected ${name}, got ${current} instead.`
    );
  }

  const options = componentRegistry.get(name);
  const template = createTemplate(html);

  customElements.define(
    name,
    class extends HTMLElement {
      connectedCallback() {
        onConnect(this, template, options);
      }

      disconnectedCallback() {
        onDisconnect(this, options);
      }
    }
  );
}
