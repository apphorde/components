import { defineCustomElement } from "vue";
import main from "./main.vue";

export const styles = [];
export const component = defineCustomElement(main, { styles });
export const name = "__component__name__";

customElements.get(name) || customElements.define(name, component);
