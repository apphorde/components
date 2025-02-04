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
    const body = Buffer.concat(await request.toArray()).toString("utf-8");

    if (!body.trim()) {
      throw new Error("Invalid request body");
    }

    const json = JSON.parse(body);
    queue.add({
      name: json.name,
      js: json.js,
      css: json.css,
      html: json.html,
      sfc: json.sfc,
      response,
    });
  } catch (error) {
    console.log(error);
    invalidRequest(response);
  }
});

function invalidRequest(response) {
  response.writeHead(400).end("Invalid request");
}

function notFound(response) {
  response.writeHead(404).end("Not found");
}

const queue = {
  timer: 0,
  all: [],
  running: false,

  add(item) {
    queue.all.push(item);
    queue.next();
  },

  schedule() {
    clearTimeout(queue.timer);
    queue.timer = setTimeout(queue.next, queueInterval);
  },

  async next() {
    if (queue.running) {
      queue.schedule();
      return;
    }

    if (!queue.all.length) {
      queue.running = false;
      return;
    }

    queue.running = true;
    const nextItem = queue.all.shift();

    await generateComponent(nextItem);
    queue.running = false;
    queue.schedule();
  },
};

async function generateComponent(nextItem) {
  try {
    if (!nextItem.name || !componentNameRule.test(nextItem.name)) {
      throw new Error("Invalid component name.");
    }

    const content = generateContent(nextItem);
    const outputFile = "./dist/index.mjs";

    await writeFile("./main.vue", content, "utf-8");
    const sh = spawnSync("npm", ["run", "build"]);

    if (sh.status || !existsSync(outputFile)) {
      nextItem.response
        .writeHead(500, "Failed to build")
        .end([sh.stdout, sh.stderr].join("\n---\n"));
      return;
    }

    const result = await readFile(outputFile, "utf-8");
    nextItem.response.end(
      result.replace(/__component__name__/g, nextItem.name)
    );
  } catch (error) {
    console.log(new Date().toISOString(), error);
    nextItem.response.writeHead(500, "Internal error").end(String(error));
  }
}

function generateContent(nextItem) {
  if (nextItem.sfc) {
    return nextItem.sfc;
  }

  if (!nextItem.html) {
    throw new Error("Invalid component: no template defined.");
  }

  const content = [`<template>${nextItem.html}</template>`];

  if (nextItem.js) {
    content.push(`<script setup lang="ts">${nextItem.js}</script>`);
  }

  if (nextItem.css) {
    content.push(`<style scoped>${nextItem.css}</style>`);
  }

  return content.join("\n");
}
