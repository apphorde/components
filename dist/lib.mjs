let currentInstance = null;
let stack = [];

export function utils(target) {
  const $ = (s) => target.querySelector(s);
  const $$ = (s) => target.querySelectorAll(s);
  const $emit = (event, options) =>
    target.dispatchEvent(new CustomEvent(event, options));

  return { $, $$, $emit };
}

export function defineEmits(target, list) {
  for (const event in list) {
    let eventHandler = null;

    Object.defineProperty(target, "on" + event, {
      enumerable: true,
      configurable: false,
      get() {
        return eventHandler;
      },
      set(value) {
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
  for (const c in [...target.childNodes]) {
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

  if (options.init) {
    options.init.apply(target);
  }

  if (options.change) {
    const observer = new MutationObserver(function (mutation) {
      if (mutation.type === "attributes") {
        options.change.call(target, mutation.attributeName);
      }
    });

    observer.observe(target, { attributes: true });
    target.__obs__ = observer;
  }
}

export function onDisconnect(target, options) {
  if (options.destroy) {
    options.destroy.apply(target);
  }

  if (target.__obs__) {
    target.__obs__.disconnect();
  }
}

const componentRegistry = new Map();

export function onInit(callback) {
  const current = stack[stack.length - 1];
  componentRegistry.get(current).init = callback;
}

export function onDestroy(callback) {
  const current = stack[stack.length - 1];
  componentRegistry.get(current).destroy = callback;
}

export function onChange(callback) {
  const current = stack[stack.length - 1];
  componentRegistry.get(current).change = callback;
}

export function __addComponent(name) {
  if (customElements.get(name)) {
    throw new Error(
      `Component ${name} was already defined! ${stack.join("->")}`
    );
  }

  componentRegistry.set(name, {
    name,
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

  const options = componentRegistry.get(name, options);
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
