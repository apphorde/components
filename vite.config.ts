import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import pkg from "./package.json" assert { type: "json" };

const componentName = pkg.name;

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      external: ["vue", "@vue/.+"],
      plugins: [postprocess()],
      output: {
        globals: {
          vue: "Vue",
        },
      },
    },
    target: "esnext",
    lib: {
      entry: "./index.ts",
      formats: ["es"],
      fileName: "index",
    },
  },
});

function postprocess() {
  return {
    name: "post",
    generateBundle(_a, chunks) {
      const css = chunks["style.css"]
        ? JSON.stringify(chunks["style.css"].source)
        : "";

      const js = chunks["index.mjs"];

      js.code = js.code.replace(
        'from "vue"',
        'from "https://unpkg.com/vue@3/dist/vue.runtime.esm-browser.prod.js"'
      );

      if (css) {
        js.code += `customElements.get('__component__name__').styles.push(${css})`;
      }

      delete chunks["style.css"];
    },
  };
}
