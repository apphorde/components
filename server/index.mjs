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
  ${js}

  customElements.get('${name}') || customElements.define('${name}', class extends HTMLElement {
    connectedCallback() {
      if (typeof onInit !== 'undefined') {
        onInit.apply(this);
      }

      if (typeof onChange !== 'undefined') {
        const observer = new MutationObserver(function(mutation) {
          if (mutation.type === 'attributes') {
            onChange.call(this, mutation.attributeName);
          }
        });

        observer.observe(this, { attributes: true });
        this.__obs__ = observer;
      }
    }

    disconnectedCallback() {
      if (typeof onDestroy !== 'undefined') {
        onDestroy.apply(this);
      }

      if (this.__obs__) {
        this.__obs__.disconnect();
      }
    }
  })
  `

  response.setHeader('Content-Type', 'application/javascript');
  response.setHeader('Content-Length', String(moduleSource.length));
  response.end(moduleSource);
}
