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
import { createTemplate, defineComponent } from 'https://c.apphor.de/lib.mjs';
const template = createTemplate(${JSON.stringify(html)});
const __cmp__ = { template };

${js}

if (typeof shadowOptions !== 'undefined') __cmp__.shadow = shadowOptions;
if (typeof onInit !== 'undefined') __cmp__.init = onInit;
if (typeof onChange !== 'undefined') __cmp__.change = onChange;
if (typeof onDestroy !== 'undefined') __cmp__.destroy = onDestroy;
defineComponent('${name}', __cmp__);`;

  response.setHeader("Content-Type", "application/javascript");
  response.setHeader("Cache-control", "max-age=86400");
  response.setHeader("Content-Length", String(moduleSource.length));
  response.end(moduleSource);
}
