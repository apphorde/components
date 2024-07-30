import createServer from "@cloud-cli/http";
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { writeFile, readFile } from "fs/promises";

const componentNameRule = /^[a-z]+-[a-z]+$/;
const queueInterval = Number(process.env.QUEUE_INTERVAL) || 1000;

createServer(async function (request, response) {
  if (request.method !== "POST" || request.url !== "/build") {
    return invalidRequest(response);
  }

  try {
    const body = await readStream(request);

    if (!body.trim()) {
      throw new Error("Invalid request body");
    }

    const json = JSON.parse(body);
    queue.add({
      name: json.name,
      js: json.js,
      css: json.css,
      html: json.html,
      response,
    });
  } catch (error) {
    console.log(error);
    response.writeHead(400).end("Invalid request");
  }
});

function invalidRequest(response) {
  response.writeHead(400).end("Invalid request");
}

function notFound(response) {
  response.writeHead(404).end("Not found");
}

function readStream(stream) {
  return new Promise((r, s) => {
    const all = [];
    stream.on("data", (c) => all.push(c));
    stream.on("end", () => r(Buffer.concat(all).toString('utf8')));
    stream.on("error", s);
  });
}

const queue = {
  timer: 0,
  all: [],
  running: false,

  add(item) {
    console.log(item)
    queue.all.push(item);
    queue.next();
  },

  schedule() {
    clearTimeout(queue.timer);
    queue.timer = setTimeout(queue.next, queueInterval);
  },

  async next() {
    console.log(queue)
    if (queue.running) {
      queue.schedule();
      return;
    }

    if (!queue.length) {
      queue.running = false;
      return;
    }

    queue.running = true;
    const nextItem = queue.all.shift();

    try {
      if (!nextItem.html) {
        throw new Error("Invalid component: no template defined.");
      }

      if (!nextItem.name || !componentNameRule.test(nextItem.name)) {
        throw new Error("Invalid component name.");
      }

      const content = [`<template>${nextItem.html}</template>`];

      if (nextItem.js) {
        content.push(`<script setup lang="ts">${nextItem.js}</script>`);
      }

      if (nextItem.css) {
        content.push(`<style scoped>${nextItem.css}</style>`);
      }

      const outputFile = "./dist/index.mjs";

      await writeFile("./main.vue", content.join("\n"), "utf-8");
      const sh = spawnSync("npm", ["run", "build"]);
      console.log(sh);
      if (sh.status || !existsSync(outputFile)) {
        nextItem.response
          .writeHead(500, "Failed to build")
          .end([sh.stdout, sh.stderr].join("\n---\n"));
        return;
      }

      const result = await readFile(outputFile, "utf-8");
      nextItem.response.end(
        result.replace("__component__name__", nextItem.name)
      );
    } catch (error) {
      console.log(new Date().toISOString(), error);
      nextItem.response.writeHead(500, "Internal error").end("");
    } finally {
      queue.running = false;
      queue.schedule();
    }
  },
};
