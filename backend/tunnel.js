// Túnel TCP local → Neon Postgres via HTTP CONNECT proxy (ambiente sandbox).
// Escuta em 127.0.0.1:5433 e reencaminha todo tráfego para o host/porta Neon.
// Uso: node tunnel.js
const net = require('net');
const http = require('http');

const PROXY = { host: '192.168.132.202', port: 8080, user: 'denisdmm', pass: 'GotistmeinHerr.5791' };
const TARGET = { host: process.env.TUNNEL_HOST || 'ep-spring-sun-ac91gxjl-pooler.sa-east-1.aws.neon.tech', port: parseInt(process.env.TUNNEL_PORT || '5432', 10) };
const LOCAL_PORT = parseInt(process.env.LOCAL_PORT || '5433', 10);

if (!PROXY.user) {
  console.error('Sem credenciais de proxy definidas.');
  process.exit(1);
}

const auth = 'Basic ' + Buffer.from(`${PROXY.user}:${PROXY.pass}`).toString('base64');

function connectViaProxy(rhost, rport) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: PROXY.host, port: PROXY.port, method: 'CONNECT',
      path: `${rhost}:${rport}`,
      headers: { Host: `${rhost}:${rport}`, 'Proxy-Authorization': auth },
    });
    req.on('connect', (res, socket) => {
      if (res.statusCode === 200) resolve(socket);
      else { socket.destroy(); reject(new Error(`CONNECT falhou: ${res.statusCode}`)); }
    });
    req.on('error', reject);
    req.end();
  });
}

const server = net.createServer((client) => {
  connectViaProxy(TARGET.host, TARGET.port).then((remote) => {
    client.pipe(remote);
    remote.pipe(client);
    remote.on('error', (e) => client.destroy());
    client.on('error', () => remote.destroy());
  }).catch((err) => {
    console.error('Falha no túnel:', err.message);
    client.destroy();
  });
});

server.listen(LOCAL_PORT, '127.0.0.1', () => {
  console.log(`Túnel ouvindo em 127.0.0.1:${LOCAL_PORT} -> ${TARGET.host}:${TARGET.port} via ${PROXY.host}:${PROXY.port}`);
});