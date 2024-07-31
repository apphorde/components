import { defineCustomElement } from "vue";
import main from "./main.vue";

export const styles = [__component__styles__];
Object.assign(main, { styles });

export const component = defineCustomElement(main);
export const name = "__component__name__";
export * from './main.vue';

customElements.get(name) || customElements.define(name, component);
