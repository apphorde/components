import { defineCustomElement } from "vue";
import main from "./main.vue";

export const styles = [];
export const component = defineCustomElement(main, { styles });
export const name = "__component__name__";

Object.defineProperty(component, 'styles', { value: styles, configurable: false, enumerable: false });
customElements.get(name) || customElements.define(name, component);
