import { defineCustomElement } from "vue";
import main from "./main.vue";
const cls = defineCustomElement(main);
const name = "__component__name__";
customElements.get(name) || customElements.define(name, cls);
