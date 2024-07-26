export function createTemplate(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  template.normalize();
  return template;
}

function createHelpers(target) {
  const $ = (s) => target.querySelector(s)
  const $$ = (s) => target.querySelectorAll(s)
  const $emit = (event, options) => target.dispatchEvent(new CustomEvent(event, options));

  return { $, $$, $emit };
}

export function defineComponent(name, options) {
  if (customElements.get(name)) return;

  const templateContent = options.template.content;

  customElements.define(
    name,
    class extends HTMLElement {
      connectedCallback() {
        const tpl = templateContent.cloneNode(true);

        if (options.shadow) {
          const shadow = this.attachShadow(options.shadow);
          shadow.appendChild(tpl);
        } else {
          const tmp = document.createDocumentFragment();
          for (const c in [...this.childNodes]) {
            tmp.append(c);
          }

          this.appendChild(tpl);
          const slot = this.querySelector("slot");
          if (slot) {
            slot.innerHTML = "";
            slot.appendChild(tmp);
          } else {
            this.appendChild(tmp);
          }
        }

        if (options.init) {
          options.init.apply(this);
        }

        if (options.change) {
          const observer = new MutationObserver(function (mutation) {
            if (mutation.type === "attributes") {
              options.change.call(this, mutation.attributeName);
            }
          });

          observer.observe(this, { attributes: true });
          this.__obs__ = observer;
        }
      }

      disconnectedCallback() {
        if (options.destroy) {
          options.destroy.apply(this);
        }

        if (this.__obs__) {
          this.__obs__.disconnect();
        }
      }
    }
  );
}
