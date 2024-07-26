export default async function (request, response, next) {
  if (!request.url.startsWith("/s/")) {
    return next();
  }

  const [binId, fileId] = request.url.replace("/s/", "").split("/");
  if (!(binId && fileId)) {
    return next();
  }

  const file = await fetch(`https://file.api.apphor.de/f/${binId}/${fileId.replace('.mjs', '')}`);
  if (!file.ok) {
    return next();
  }

  const source = await file.json();
  const { js, html, meta = {} } = source;
  const { name = 'x-invalid'} = meta;

  const moduleSource = `
  import { createTemplate, defineComponent } from 'https://c.apphor.de/lib.mjs';

  const template = createTemplate(${JSON.stringify(html)});

  ${js}

  const __cmp__ = { template };
  typeof shadowOptions !== 'undefined' && __cmp__.shadow = shadowOptions;
  typeof onInit !== 'undefined' && __cmp__.init = onInit;
  typeof onChange !== 'undefined' && __cmp__.change = onChange;
  typeof onDestroy !== 'undefined' && __cmp__.destroy = onDestroy;

  defineComponent('${name}', __cmp__);
  `

  response.setHeader('Content-Type', 'application/javascript');
  response.setHeader('Content-Length', String(moduleSource.length));
  response.end(moduleSource);
}
