const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 5000;
const root = path.resolve(__dirname, '..', 'dist');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(root, reqPath);
  const ext = path.extname(filePath).toLowerCase();

  const send = (fp) => {
    fs.readFile(fp, (err, data) => {
      if (err) {
        if (fp.endsWith('index.html')) {
          res.writeHead(500); res.end('index.html missing');
        } else {
          const indexPath = path.join(root, 'index.html');
          fs.readFile(indexPath, (e2, html) => {
            if (e2) { res.writeHead(404); return res.end('Not found'); }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
          });
        }
        return;
      }
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      res.end(data);
    });
  };

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      const alt = filePath + '.html';
      fs.stat(alt, (e2, st2) => {
        if (!e2 && st2.isFile()) return send(alt);
        return send(path.join(root, 'index.html'));
      });
    } else {
      send(filePath);
    }
  });
});

server.listen(port, () => {
  console.log(`Serving dist on http://localhost:${port}`);
});
