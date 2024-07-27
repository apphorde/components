export default async function (request, response, next) {
  if (!request.url.startsWith("/c/")) {
    return next();
  }

  const [binId, fileId] = request.url.replace("/c/", "").split("/");
  if (!(binId && fileId)) {
    return next();
  }

  const file = await fetch(
    `https://file.api.apphor.de/f/${binId}/${fileId.replace(".mjs", "")}`
  );

  if (!file.ok) {
    return next();
  }

  const { js, html, name = "" } = await file.json();

  const moduleSource = `
import { onInit, onDestroy, onChange, defineEmits, __defineComponent, __addComponent, utils } from 'https://c.apphor.de/lib.mjs';
__addComponent('${name}');
${js}
let __tpl=${JSON.stringify(html)};
__defineComponent('${name}', __tpl);

`;

  response.setHeader("Content-Type", "application/javascript");
  response.setHeader("Cache-control", "max-age=86400");
  response.setHeader("Content-Length", String(moduleSource.length));
  response.end(moduleSource);
}
