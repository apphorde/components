import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import pkg from "./package.json" assert { type: "json" };

const componentName = pkg.name;

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      external: ["vue", "@vue/.+"],
      plugins: [postcss()],
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

function postcss() {
  return {
    name: "yes",
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
        js.code += `styles.push(${JSON.stringify(css)})`;
      }

      delete chunks["style.css"];
    },
  };
}
