export default async function (request, response, next) {
  if (!request.url.startsWith("/s/")) {
    return next();
  }

  const [binId, fileId] = request.url.replace("/s/", "").split("/");
  if (!(binId && fileId)) {
    return next();
  }

  const file = await fetch(`https://file.api.apphor.de/f/${binId}/${fileId}`);
  if (!file.ok) {
    return next();
  }

  const buffer = await file.text();
  response.setHeader('Content-Type', 'application/javascript');
  response.setHeader('Content-Length', String(buffer.length));
  response.end(buffer);
}
