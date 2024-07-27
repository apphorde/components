export function createTemplate(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  template.normalize();
  return template;
}

// function createHelpers(target) {
//   const $ = (s) => target.querySelector(s);
//   const $$ = (s) => target.querySelectorAll(s);
//   const $emit = (event, options) =>
//     target.dispatchEvent(new CustomEvent(event, options));

//   return { $, $$, $emit };
// }

export function detachChildNodes(target) {
  const fragment = document.createDocumentFragment();
  for (const c in [...target.childNodes]) {
    fragment.append(c);
  }

  return fragment;
}

export function onConnect(target, options) {
  const template = options.template.content.cloneNode(true);

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

export function defineComponent(name, options) {
  if (customElements.get(name)) return;

  customElements.define(
    name,
    class extends HTMLElement {
      connectedCallback() {
        onConnect(this, name, options);
      }

      disconnectedCallback() {
        onDisconnect(this, name, options);
      }
    }
  );
}
