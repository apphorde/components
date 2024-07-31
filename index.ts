import { defineCustomElement } from "vue";
import main from "./main.vue";

export const styles = [__component__styles__];
export const component = defineCustomElement(main, { styles });
export const name = "__component__name__";

customElements.get(name) || customElements.define(name, component);
