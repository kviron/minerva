import process from 'node:process';globalThis._importMeta_={url:import.meta.url,env:process.env};import './timing.js';globalThis.__timing__.logStart('Nitro Start');import { u as useNitroApp } from './chunks/_/nitro.mjs';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const nitroApp = useNitroApp();
const server = Bun.serve({
  port: process.env.NITRO_PORT || process.env.PORT || 3e3,
  host: process.env.NITRO_HOST || process.env.HOST,
  idleTimeout: Number.parseInt(process.env.NITRO_BUN_IDLE_TIMEOUT) || void 0,
  websocket: void 0,
  async fetch(req, server2) {
    const url = new URL(req.url);
    let body;
    if (req.body) {
      body = await req.arrayBuffer();
    }
    return nitroApp.localFetch(url.pathname + url.search, {
      host: url.hostname,
      protocol: url.protocol,
      headers: req.headers,
      method: req.method,
      redirect: req.redirect,
      body
    });
  }
});
console.log(`Listening on ${server.url}...`);;globalThis.__timing__.logEnd('Nitro Start');
//# sourceMappingURL=index.mjs.map
