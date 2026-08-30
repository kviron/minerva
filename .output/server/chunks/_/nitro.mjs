import process from 'node:process';globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};globalThis.__timing__.logStart('Load chunks/_/nitro');import { EventEmitter } from 'node:events';
import { Buffer as Buffer$1 } from 'node:buffer';
import { promises, existsSync, readFileSync } from 'node:fs';
import { resolve as resolve$1, dirname as dirname$1, join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import nodemailer from 'nodemailer';
import { APIError } from '@better-auth/core/error';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username } from 'better-auth/plugins/username';
import { sql, relations, eq, and } from 'drizzle-orm';
import { pgTable, timestamp, text, boolean, uuid as uuid$2, index, bigint, integer, jsonb, check, unique, uniqueIndex, foreignKey } from 'drizzle-orm/pg-core';
import { oauthProvider, getOAuthProviderState } from '@better-auth/oauth-provider';

const suspectProtoRx = /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/;
const suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
const JsonSigRx = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;
function jsonParseTransform(key, value) {
  if (key === "__proto__" || key === "constructor" && value && typeof value === "object" && "prototype" in value) {
    warnKeyDropped(key);
    return;
  }
  return value;
}
function warnKeyDropped(key) {
  console.warn(`[destr] Dropping "${key}" key to prevent prototype pollution.`);
}
function destr(value, options = {}) {
  if (typeof value !== "string") {
    return value;
  }
  if (value[0] === '"' && value[value.length - 1] === '"' && value.indexOf("\\") === -1) {
    return value.slice(1, -1);
  }
  const _value = value.trim();
  if (_value.length <= 9) {
    switch (_value.toLowerCase()) {
      case "true": {
        return true;
      }
      case "false": {
        return false;
      }
      case "undefined": {
        return void 0;
      }
      case "null": {
        return null;
      }
      case "nan": {
        return Number.NaN;
      }
      case "infinity": {
        return Number.POSITIVE_INFINITY;
      }
      case "-infinity": {
        return Number.NEGATIVE_INFINITY;
      }
    }
  }
  if (!JsonSigRx.test(value)) {
    if (options.strict) {
      throw new SyntaxError("[destr] Invalid JSON");
    }
    return value;
  }
  try {
    if (suspectProtoRx.test(value) || suspectConstructorRx.test(value)) {
      if (options.strict) {
        throw new Error("[destr] Possible prototype pollution");
      }
      return JSON.parse(value, jsonParseTransform);
    }
    return JSON.parse(value);
  } catch (error) {
    if (options.strict) {
      throw error;
    }
    return value;
  }
}

const HASH_RE = /#/g;
const AMPERSAND_RE = /&/g;
const SLASH_RE = /\//g;
const EQUAL_RE = /=/g;
const IM_RE = /\?/g;
const PLUS_RE = /\+/g;
const ENC_CARET_RE = /%5e/gi;
const ENC_BACKTICK_RE = /%60/gi;
const ENC_PIPE_RE = /%7c/gi;
const ENC_SPACE_RE = /%20/gi;
const ENC_SLASH_RE = /%2f/gi;
const ENC_ENC_SLASH_RE = /%252f/gi;
function encode(text) {
  return encodeURI("" + text).replace(ENC_PIPE_RE, "|");
}
function encodeQueryValue(input) {
  return encode(typeof input === "string" ? input : JSON.stringify(input)).replace(PLUS_RE, "%2B").replace(ENC_SPACE_RE, "+").replace(HASH_RE, "%23").replace(AMPERSAND_RE, "%26").replace(ENC_BACKTICK_RE, "`").replace(ENC_CARET_RE, "^").replace(SLASH_RE, "%2F");
}
function encodeQueryKey(text) {
  return encodeQueryValue(text).replace(EQUAL_RE, "%3D");
}
function encodePath(text) {
  return encode(text).replace(HASH_RE, "%23").replace(IM_RE, "%3F").replace(ENC_ENC_SLASH_RE, "%2F").replace(AMPERSAND_RE, "%26").replace(PLUS_RE, "%2B");
}
function decode(text = "") {
  try {
    return decodeURIComponent("" + text);
  } catch {
    return "" + text;
  }
}
function decodePath(text) {
  return decode(text.replace(ENC_SLASH_RE, "%252F"));
}
function decodeQueryKey(text) {
  return decode(text.replace(PLUS_RE, " "));
}
function decodeQueryValue(text) {
  return decode(text.replace(PLUS_RE, " "));
}

function parseQuery(parametersString = "") {
  const object = /* @__PURE__ */ Object.create(null);
  if (parametersString[0] === "?") {
    parametersString = parametersString.slice(1);
  }
  for (const parameter of parametersString.split("&")) {
    const s = parameter.match(/([^=]+)=?(.*)/) || [];
    if (s.length < 2) {
      continue;
    }
    const key = decodeQueryKey(s[1]);
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = decodeQueryValue(s[2] || "");
    if (object[key] === void 0) {
      object[key] = value;
    } else if (Array.isArray(object[key])) {
      object[key].push(value);
    } else {
      object[key] = [object[key], value];
    }
  }
  return object;
}
function encodeQueryItem(key, value) {
  if (typeof value === "number" || typeof value === "boolean") {
    value = String(value);
  }
  if (!value) {
    return encodeQueryKey(key);
  }
  if (Array.isArray(value)) {
    return value.map(
      (_value) => `${encodeQueryKey(key)}=${encodeQueryValue(_value)}`
    ).join("&");
  }
  return `${encodeQueryKey(key)}=${encodeQueryValue(value)}`;
}
function stringifyQuery(query) {
  return Object.keys(query).filter((k) => query[k] !== void 0).map((k) => encodeQueryItem(k, query[k])).filter(Boolean).join("&");
}

const PROTOCOL_STRICT_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{1,2})/;
const PROTOCOL_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{2})?/;
const PROTOCOL_RELATIVE_REGEX = /^([/\\]\s*){2,}[^/\\]/;
const JOIN_LEADING_SLASH_RE = /^\.?\//;
function hasProtocol(inputString, opts = {}) {
  if (typeof opts === "boolean") {
    opts = { acceptRelative: opts };
  }
  if (opts.strict) {
    return PROTOCOL_STRICT_REGEX.test(inputString);
  }
  return PROTOCOL_REGEX.test(inputString) || (opts.acceptRelative ? PROTOCOL_RELATIVE_REGEX.test(inputString) : false);
}
function hasTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return input.endsWith("/");
  }
}
function withoutTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return (hasTrailingSlash(input) ? input.slice(0, -1) : input) || "/";
  }
}
function withTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return input.endsWith("/") ? input : input + "/";
  }
}
function hasLeadingSlash(input = "") {
  return input.startsWith("/");
}
function withLeadingSlash(input = "") {
  return hasLeadingSlash(input) ? input : "/" + input;
}
function withBase(input, base) {
  if (isEmptyURL(base) || hasProtocol(input)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (input.startsWith(_base)) {
    const nextChar = input[_base.length];
    if (!nextChar || nextChar === "/" || nextChar === "?") {
      return input;
    }
  }
  return joinURL(_base, input);
}
function withoutBase(input, base) {
  if (isEmptyURL(base)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (!input.startsWith(_base)) {
    return input;
  }
  const nextChar = input[_base.length];
  if (nextChar && nextChar !== "/" && nextChar !== "?") {
    return input;
  }
  const trimmed = input.slice(_base.length).replace(/^\/+/, "");
  return "/" + trimmed;
}
function withQuery(input, query) {
  const parsed = parseURL(input);
  const mergedQuery = { ...parseQuery(parsed.search), ...query };
  parsed.search = stringifyQuery(mergedQuery);
  return stringifyParsedURL(parsed);
}
function getQuery$1(input) {
  return parseQuery(parseURL(input).search);
}
function isEmptyURL(url) {
  return !url || url === "/";
}
function isNonEmptyURL(url) {
  return url && url !== "/";
}
function joinURL(base, ...input) {
  let url = base || "";
  for (const segment of input.filter((url2) => isNonEmptyURL(url2))) {
    if (url) {
      const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
      url = withTrailingSlash(url) + _segment;
    } else {
      url = segment;
    }
  }
  return url;
}
function joinRelativeURL(..._input) {
  const JOIN_SEGMENT_SPLIT_RE = /\/(?!\/)/;
  const input = _input.filter(Boolean);
  const segments = [];
  let segmentsDepth = 0;
  for (const i of input) {
    if (!i || i === "/") {
      continue;
    }
    for (const [sindex, s] of i.split(JOIN_SEGMENT_SPLIT_RE).entries()) {
      if (!s || s === ".") {
        continue;
      }
      if (s === "..") {
        if (segments.length === 1 && hasProtocol(segments[0])) {
          continue;
        }
        segments.pop();
        segmentsDepth--;
        continue;
      }
      if (sindex === 1 && segments[segments.length - 1]?.endsWith(":/")) {
        segments[segments.length - 1] += "/" + s;
        continue;
      }
      segments.push(s);
      segmentsDepth++;
    }
  }
  let url = segments.join("/");
  if (segmentsDepth >= 0) {
    if (input[0]?.startsWith("/") && !url.startsWith("/")) {
      url = "/" + url;
    } else if (input[0]?.startsWith("./") && !url.startsWith("./")) {
      url = "./" + url;
    }
  } else {
    url = "../".repeat(-1 * segmentsDepth) + url;
  }
  if (input[input.length - 1]?.endsWith("/") && !url.endsWith("/")) {
    url += "/";
  }
  return url;
}

const protocolRelative = Symbol.for("ufo:protocolRelative");
function parseURL(input = "", defaultProto) {
  const _specialProtoMatch = input.match(
    /^[\s\0]*(blob:|data:|javascript:|vbscript:)(.*)/i
  );
  if (_specialProtoMatch) {
    const [, _proto, _pathname = ""] = _specialProtoMatch;
    return {
      protocol: _proto.toLowerCase(),
      pathname: _pathname,
      href: _proto + _pathname,
      auth: "",
      host: "",
      search: "",
      hash: ""
    };
  }
  if (!hasProtocol(input, { acceptRelative: true })) {
    return parsePath(input);
  }
  const [, protocol = "", auth, hostAndPath = ""] = input.replace(/\\/g, "/").match(/^[\s\0]*([\w+.-]{2,}:)?\/\/([^/@]+@)?(.*)/) || [];
  let [, host = "", path = ""] = hostAndPath.match(/([^#/?]*)(.*)?/) || [];
  if (protocol === "file:") {
    path = path.replace(/\/(?=[A-Za-z]:)/, "");
  }
  const { pathname, search, hash } = parsePath(path);
  return {
    protocol: protocol.toLowerCase(),
    auth: auth ? auth.slice(0, Math.max(0, auth.length - 1)) : "",
    host,
    pathname,
    search,
    hash,
    [protocolRelative]: !protocol
  };
}
function parsePath(input = "") {
  const [pathname = "", search = "", hash = ""] = (input.match(/([^#?]*)(\?[^#]*)?(#.*)?/) || []).splice(1);
  return {
    pathname,
    search,
    hash
  };
}
function stringifyParsedURL(parsed) {
  const pathname = parsed.pathname || "";
  const search = parsed.search ? (parsed.search.startsWith("?") ? "" : "?") + parsed.search : "";
  const hash = parsed.hash || "";
  const auth = parsed.auth ? parsed.auth + "@" : "";
  const host = parsed.host || "";
  const proto = parsed.protocol || parsed[protocolRelative] ? (parsed.protocol || "") + "//" : "";
  return proto + auth + host + pathname + search + hash;
}

const NODE_TYPES = {
  NORMAL: 0,
  WILDCARD: 1,
  PLACEHOLDER: 2
};

function createRouter$1(options = {}) {
  const ctx = {
    options,
    rootNode: createRadixNode(),
    staticRoutesMap: {}
  };
  const normalizeTrailingSlash = (p) => options.strictTrailingSlash ? p : p.replace(/\/$/, "") || "/";
  if (options.routes) {
    for (const path in options.routes) {
      insert(ctx, normalizeTrailingSlash(path), options.routes[path]);
    }
  }
  return {
    ctx,
    lookup: (path) => lookup(ctx, normalizeTrailingSlash(path)),
    insert: (path, data) => insert(ctx, normalizeTrailingSlash(path), data),
    remove: (path) => remove(ctx, normalizeTrailingSlash(path))
  };
}
function lookup(ctx, path) {
  const staticPathNode = ctx.staticRoutesMap[path];
  if (staticPathNode) {
    return staticPathNode.data;
  }
  const sections = path.split("/");
  const params = {};
  let paramsFound = false;
  let wildcardNode = null;
  let node = ctx.rootNode;
  let wildCardParam = null;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (node.wildcardChildNode !== null) {
      wildcardNode = node.wildcardChildNode;
      wildCardParam = sections.slice(i).join("/");
    }
    const nextNode = node.children.get(section);
    if (nextNode === void 0) {
      if (node && node.placeholderChildren.length > 1) {
        const remaining = sections.length - i;
        node = node.placeholderChildren.find((c) => c.maxDepth === remaining) || null;
      } else {
        node = node.placeholderChildren[0] || null;
      }
      if (!node) {
        break;
      }
      if (node.paramName) {
        params[node.paramName] = section;
      }
      paramsFound = true;
    } else {
      node = nextNode;
    }
  }
  if ((node === null || node.data === null) && wildcardNode !== null) {
    node = wildcardNode;
    params[node.paramName || "_"] = wildCardParam;
    paramsFound = true;
  }
  if (!node) {
    return null;
  }
  if (paramsFound) {
    return {
      ...node.data,
      params: paramsFound ? params : void 0
    };
  }
  return node.data;
}
function insert(ctx, path, data) {
  let isStaticRoute = true;
  const sections = path.split("/");
  let node = ctx.rootNode;
  let _unnamedPlaceholderCtr = 0;
  const matchedNodes = [node];
  for (const section of sections) {
    let childNode;
    if (childNode = node.children.get(section)) {
      node = childNode;
    } else {
      const type = getNodeType(section);
      childNode = createRadixNode({ type, parent: node });
      node.children.set(section, childNode);
      if (type === NODE_TYPES.PLACEHOLDER) {
        childNode.paramName = section === "*" ? `_${_unnamedPlaceholderCtr++}` : section.slice(1);
        node.placeholderChildren.push(childNode);
        isStaticRoute = false;
      } else if (type === NODE_TYPES.WILDCARD) {
        node.wildcardChildNode = childNode;
        childNode.paramName = section.slice(
          3
          /* "**:" */
        ) || "_";
        isStaticRoute = false;
      }
      matchedNodes.push(childNode);
      node = childNode;
    }
  }
  for (const [depth, node2] of matchedNodes.entries()) {
    node2.maxDepth = Math.max(matchedNodes.length - depth, node2.maxDepth || 0);
  }
  node.data = data;
  if (isStaticRoute === true) {
    ctx.staticRoutesMap[path] = node;
  }
  return node;
}
function remove(ctx, path) {
  let success = false;
  const sections = path.split("/");
  let node = ctx.rootNode;
  for (const section of sections) {
    node = node.children.get(section);
    if (!node) {
      return success;
    }
  }
  if (node.data) {
    const lastSection = sections.at(-1) || "";
    node.data = null;
    if (Object.keys(node.children).length === 0 && node.parent) {
      node.parent.children.delete(lastSection);
      node.parent.wildcardChildNode = null;
      node.parent.placeholderChildren = [];
    }
    success = true;
  }
  return success;
}
function createRadixNode(options = {}) {
  return {
    type: options.type || NODE_TYPES.NORMAL,
    maxDepth: 0,
    parent: options.parent || null,
    children: /* @__PURE__ */ new Map(),
    data: options.data || null,
    paramName: options.paramName || null,
    wildcardChildNode: null,
    placeholderChildren: []
  };
}
function getNodeType(str) {
  if (str.startsWith("**")) {
    return NODE_TYPES.WILDCARD;
  }
  if (str[0] === ":" || str === "*") {
    return NODE_TYPES.PLACEHOLDER;
  }
  return NODE_TYPES.NORMAL;
}

function toRouteMatcher(router) {
  const table = _routerNodeToTable("", router.ctx.rootNode);
  return _createMatcher(table, router.ctx.options.strictTrailingSlash);
}
function _createMatcher(table, strictTrailingSlash) {
  return {
    ctx: { table },
    matchAll: (path) => _matchRoutes(path, table, strictTrailingSlash)
  };
}
function _createRouteTable() {
  return {
    static: /* @__PURE__ */ new Map(),
    wildcard: /* @__PURE__ */ new Map(),
    dynamic: /* @__PURE__ */ new Map()
  };
}
function _matchRoutes(path, table, strictTrailingSlash) {
  if (strictTrailingSlash !== true && path.endsWith("/")) {
    path = path.slice(0, -1) || "/";
  }
  const matches = [];
  for (const [key, value] of _sortRoutesMap(table.wildcard)) {
    if (path === key || path.startsWith(key + "/")) {
      matches.push(value);
    }
  }
  for (const [key, value] of _sortRoutesMap(table.dynamic)) {
    if (path.startsWith(key + "/")) {
      const subPath = "/" + path.slice(key.length).split("/").splice(2).join("/");
      matches.push(..._matchRoutes(subPath, value));
    }
  }
  const staticMatch = table.static.get(path);
  if (staticMatch) {
    matches.push(staticMatch);
  }
  return matches.filter(Boolean);
}
function _sortRoutesMap(m) {
  return [...m.entries()].sort((a, b) => a[0].length - b[0].length);
}
function _routerNodeToTable(initialPath, initialNode) {
  const table = _createRouteTable();
  function _addNode(path, node) {
    if (path) {
      if (node.type === NODE_TYPES.NORMAL && !(path.includes("*") || path.includes(":"))) {
        if (node.data) {
          table.static.set(path, node.data);
        }
      } else if (node.type === NODE_TYPES.WILDCARD) {
        table.wildcard.set(path.replace("/**", ""), node.data);
      } else if (node.type === NODE_TYPES.PLACEHOLDER) {
        const subTable = _routerNodeToTable("", node);
        if (node.data) {
          subTable.static.set("/", node.data);
        }
        table.dynamic.set(path.replace(/\/\*|\/:\w+/, ""), subTable);
        return;
      }
    }
    for (const [childPath, child] of node.children.entries()) {
      _addNode(`${path}/${childPath}`.replace("//", "/"), child);
    }
  }
  _addNode(initialPath, initialNode);
  return table;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}

function _defu(baseObject, defaults, namespace = ".", merger) {
  if (!isPlainObject(defaults)) {
    return _defu(baseObject, {}, namespace, merger);
  }
  const object = { ...defaults };
  for (const key of Object.keys(baseObject)) {
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = baseObject[key];
    if (value === null || value === void 0) {
      continue;
    }
    if (merger && merger(object, key, value, namespace)) {
      continue;
    }
    if (Array.isArray(value) && Array.isArray(object[key])) {
      object[key] = [...value, ...object[key]];
    } else if (isPlainObject(value) && isPlainObject(object[key])) {
      object[key] = _defu(
        value,
        object[key],
        (namespace ? `${namespace}.` : "") + key.toString(),
        merger
      );
    } else {
      object[key] = value;
    }
  }
  return object;
}
function createDefu(merger) {
  return (...arguments_) => (
    // eslint-disable-next-line unicorn/no-array-reduce
    arguments_.reduce((p, c) => _defu(p, c, "", merger), {})
  );
}
const defu = createDefu();
const defuFn = createDefu((object, key, currentValue) => {
  if (object[key] !== void 0 && typeof currentValue === "function") {
    object[key] = currentValue(object[key]);
    return true;
  }
});

function o(n){throw new Error(`${n} is not implemented yet!`)}class i extends EventEmitter{__unenv__={};readableEncoding=null;readableEnded=true;readableFlowing=false;readableHighWaterMark=0;readableLength=0;readableObjectMode=false;readableAborted=false;readableDidRead=false;closed=false;errored=null;readable=false;destroyed=false;static from(e,t){return new i(t)}constructor(e){super();}_read(e){}read(e){}setEncoding(e){return this}pause(){return this}resume(){return this}isPaused(){return  true}unpipe(e){return this}unshift(e,t){}wrap(e){return this}push(e,t){return  false}_destroy(e,t){this.removeAllListeners();}destroy(e){return this.destroyed=true,this._destroy(e),this}pipe(e,t){return {}}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return this.destroy(),Promise.resolve()}async*[Symbol.asyncIterator](){throw o("Readable.asyncIterator")}iterator(e){throw o("Readable.iterator")}map(e,t){throw o("Readable.map")}filter(e,t){throw o("Readable.filter")}forEach(e,t){throw o("Readable.forEach")}reduce(e,t,r){throw o("Readable.reduce")}find(e,t){throw o("Readable.find")}findIndex(e,t){throw o("Readable.findIndex")}some(e,t){throw o("Readable.some")}toArray(e){throw o("Readable.toArray")}every(e,t){throw o("Readable.every")}flatMap(e,t){throw o("Readable.flatMap")}drop(e,t){throw o("Readable.drop")}take(e,t){throw o("Readable.take")}asIndexedPairs(e){throw o("Readable.asIndexedPairs")}}class l extends EventEmitter{__unenv__={};writable=true;writableEnded=false;writableFinished=false;writableHighWaterMark=0;writableLength=0;writableObjectMode=false;writableCorked=0;closed=false;errored=null;writableNeedDrain=false;writableAborted=false;destroyed=false;_data;_encoding="utf8";constructor(e){super();}pipe(e,t){return {}}_write(e,t,r){if(this.writableEnded){r&&r();return}if(this._data===void 0)this._data=e;else {const s=typeof this._data=="string"?Buffer$1.from(this._data,this._encoding||t||"utf8"):this._data,a=typeof e=="string"?Buffer$1.from(e,t||this._encoding||"utf8"):e;this._data=Buffer$1.concat([s,a]);}this._encoding=t,r&&r();}_writev(e,t){}_destroy(e,t){}_final(e){}write(e,t,r){const s=typeof t=="string"?this._encoding:"utf8",a=typeof t=="function"?t:typeof r=="function"?r:void 0;return this._write(e,s,a),true}setDefaultEncoding(e){return this}end(e,t,r){const s=typeof e=="function"?e:typeof t=="function"?t:typeof r=="function"?r:void 0;if(this.writableEnded)return s&&s(),this;const a=e===s?void 0:e;if(a){const u=t===s?void 0:t;this.write(a,u,s);}return this.writableEnded=true,this.writableFinished=true,this.emit("close"),this.emit("finish"),this}cork(){}uncork(){}destroy(e){return this.destroyed=true,delete this._data,this.removeAllListeners(),this}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return Promise.resolve()}}const c=class{allowHalfOpen=true;_destroy;constructor(e=new i,t=new l){Object.assign(this,e),Object.assign(this,t),this._destroy=m(e._destroy,t._destroy);}};function _(){return Object.assign(c.prototype,i.prototype),Object.assign(c.prototype,l.prototype),c}function m(...n){return function(...e){for(const t of n)t(...e);}}const g=_();class A extends g{__unenv__={};bufferSize=0;bytesRead=0;bytesWritten=0;connecting=false;destroyed=false;pending=false;localAddress="";localPort=0;remoteAddress="";remoteFamily="";remotePort=0;autoSelectFamilyAttemptedAddresses=[];readyState="readOnly";constructor(e){super();}write(e,t,r){return  false}connect(e,t,r){return this}end(e,t,r){return this}setEncoding(e){return this}pause(){return this}resume(){return this}setTimeout(e,t){return this}setNoDelay(e){return this}setKeepAlive(e,t){return this}address(){return {}}unref(){return this}ref(){return this}destroySoon(){this.destroy();}resetAndDestroy(){const e=new Error("ERR_SOCKET_CLOSED");return e.code="ERR_SOCKET_CLOSED",this.destroy(e),this}}class y extends i{aborted=false;httpVersion="1.1";httpVersionMajor=1;httpVersionMinor=1;complete=true;connection;socket;headers={};trailers={};method="GET";url="/";statusCode=200;statusMessage="";closed=false;errored=null;readable=false;constructor(e){super(),this.socket=this.connection=e||new A;}get rawHeaders(){const e=this.headers,t=[];for(const r in e)if(Array.isArray(e[r]))for(const s of e[r])t.push(r,s);else t.push(r,e[r]);return t}get rawTrailers(){return []}setTimeout(e,t){return this}get headersDistinct(){return p(this.headers)}get trailersDistinct(){return p(this.trailers)}}function p(n){const e={};for(const[t,r]of Object.entries(n))t&&(e[t]=(Array.isArray(r)?r:[r]).filter(Boolean));return e}class w extends l{statusCode=200;statusMessage="";upgrading=false;chunkedEncoding=false;shouldKeepAlive=false;useChunkedEncodingByDefault=false;sendDate=false;finished=false;headersSent=false;strictContentLength=false;connection=null;socket=null;req;_headers={};constructor(e){super(),this.req=e;}assignSocket(e){e._httpMessage=this,this.socket=e,this.connection=e,this.emit("socket",e),this._flush();}_flush(){this.flushHeaders();}detachSocket(e){}writeContinue(e){}writeHead(e,t,r){e&&(this.statusCode=e),typeof t=="string"&&(this.statusMessage=t,t=void 0);const s=r||t;if(s&&!Array.isArray(s))for(const a in s)this.setHeader(a,s[a]);return this.headersSent=true,this}writeProcessing(){}setTimeout(e,t){return this}appendHeader(e,t){e=e.toLowerCase();const r=this._headers[e],s=[...Array.isArray(r)?r:[r],...Array.isArray(t)?t:[t]].filter(Boolean);return this._headers[e]=s.length>1?s:s[0],this}setHeader(e,t){return this._headers[e.toLowerCase()]=t,this}setHeaders(e){for(const[t,r]of Object.entries(e))this.setHeader(t,r);return this}getHeader(e){return this._headers[e.toLowerCase()]}getHeaders(){return this._headers}getHeaderNames(){return Object.keys(this._headers)}hasHeader(e){return e.toLowerCase()in this._headers}removeHeader(e){delete this._headers[e.toLowerCase()];}addTrailers(e){}flushHeaders(){}writeEarlyHints(e,t){typeof t=="function"&&t();}}const E=(()=>{const n=function(){};return n.prototype=Object.create(null),n})();function R(n={}){const e=new E,t=Array.isArray(n)||H(n)?n:Object.entries(n);for(const[r,s]of t)if(s){if(e[r]===void 0){e[r]=s;continue}e[r]=[...Array.isArray(e[r])?e[r]:[e[r]],...Array.isArray(s)?s:[s]];}return e}function H(n){return typeof n?.entries=="function"}function v(n={}){if(n instanceof Headers)return n;const e=new Headers;for(const[t,r]of Object.entries(n))if(r!==void 0){if(Array.isArray(r)){for(const s of r)e.append(t,String(s));continue}e.set(t,String(r));}return e}const S=new Set([101,204,205,304]);async function b(n,e){const t=new y,r=new w(t);t.url=e.url?.toString()||"/";let s;if(!t.url.startsWith("/")){const d=new URL(t.url);s=d.host,t.url=d.pathname+d.search+d.hash;}t.method=e.method||"GET",t.headers=R(e.headers||{}),t.headers.host||(t.headers.host=e.host||s||"localhost"),t.connection.encrypted=t.connection.encrypted||e.protocol==="https",t.body=e.body||null,t.__unenv__=e.context,await n(t,r);let a=r._data;(S.has(r.statusCode)||t.method.toUpperCase()==="HEAD")&&(a=null,delete r._headers["content-length"]);const u={status:r.statusCode,statusText:r.statusMessage,headers:r._headers,body:a};return t.destroy(),r.destroy(),u}async function C(n,e,t={}){try{const r=await b(n,{url:e,...t});return new Response(r.body,{status:r.status,statusText:r.statusText,headers:v(r.headers)})}catch(r){return new Response(r.toString(),{status:Number.parseInt(r.statusCode||r.code)||500,statusText:r.statusText})}}

function hasProp(obj, prop) {
  try {
    return prop in obj;
  } catch {
    return false;
  }
}

class H3Error extends Error {
  static __h3_error__ = true;
  statusCode = 500;
  fatal = false;
  unhandled = false;
  statusMessage;
  data;
  cause;
  constructor(message, opts = {}) {
    super(message, opts);
    if (opts.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
  toJSON() {
    const obj = {
      message: this.message,
      statusCode: sanitizeStatusCode(this.statusCode, 500)
    };
    if (this.statusMessage) {
      obj.statusMessage = sanitizeStatusMessage(this.statusMessage);
    }
    if (this.data !== void 0) {
      obj.data = this.data;
    }
    return obj;
  }
}
function createError$1(input) {
  if (typeof input === "string") {
    return new H3Error(input);
  }
  if (isError(input)) {
    return input;
  }
  const err = new H3Error(input.message ?? input.statusMessage ?? "", {
    cause: input.cause || input
  });
  if (hasProp(input, "stack")) {
    try {
      Object.defineProperty(err, "stack", {
        get() {
          return input.stack;
        }
      });
    } catch {
      try {
        err.stack = input.stack;
      } catch {
      }
    }
  }
  if (input.data) {
    err.data = input.data;
  }
  if (input.statusCode) {
    err.statusCode = sanitizeStatusCode(input.statusCode, err.statusCode);
  } else if (input.status) {
    err.statusCode = sanitizeStatusCode(input.status, err.statusCode);
  }
  if (input.statusMessage) {
    err.statusMessage = input.statusMessage;
  } else if (input.statusText) {
    err.statusMessage = input.statusText;
  }
  if (err.statusMessage) {
    const originalMessage = err.statusMessage;
    const sanitizedMessage = sanitizeStatusMessage(err.statusMessage);
    if (sanitizedMessage !== originalMessage) {
      console.warn(
        "[h3] Please prefer using `message` for longer error messages instead of `statusMessage`. In the future, `statusMessage` will be sanitized by default."
      );
    }
  }
  if (input.fatal !== void 0) {
    err.fatal = input.fatal;
  }
  if (input.unhandled !== void 0) {
    err.unhandled = input.unhandled;
  }
  return err;
}
function sendError(event, error, debug) {
  if (event.handled) {
    return;
  }
  const h3Error = isError(error) ? error : createError$1(error);
  const responseBody = {
    statusCode: h3Error.statusCode,
    statusMessage: h3Error.statusMessage,
    stack: [],
    data: h3Error.data
  };
  if (debug) {
    responseBody.stack = (h3Error.stack || "").split("\n").map((l) => l.trim());
  }
  if (event.handled) {
    return;
  }
  const _code = Number.parseInt(h3Error.statusCode);
  setResponseStatus(event, _code, h3Error.statusMessage);
  event.node.res.setHeader("content-type", MIMES.json);
  event.node.res.end(JSON.stringify(responseBody, void 0, 2));
}
function isError(input) {
  return input?.constructor?.__h3_error__ === true;
}

function parse(multipartBodyBuffer, boundary) {
  let lastline = "";
  let state = 0 /* INIT */;
  let buffer = [];
  const allParts = [];
  let currentPartHeaders = [];
  for (let i = 0; i < multipartBodyBuffer.length; i++) {
    const prevByte = i > 0 ? multipartBodyBuffer[i - 1] : null;
    const currByte = multipartBodyBuffer[i];
    const newLineChar = currByte === 10 || currByte === 13;
    if (!newLineChar) {
      lastline += String.fromCodePoint(currByte);
    }
    const newLineDetected = currByte === 10 && prevByte === 13;
    if (0 /* INIT */ === state && newLineDetected) {
      if ("--" + boundary === lastline) {
        state = 1 /* READING_HEADERS */;
      }
      lastline = "";
    } else if (1 /* READING_HEADERS */ === state && newLineDetected) {
      if (lastline.length > 0) {
        const i2 = lastline.indexOf(":");
        if (i2 > 0) {
          const name = lastline.slice(0, i2).toLowerCase();
          const value = lastline.slice(i2 + 1).trim();
          currentPartHeaders.push([name, value]);
        }
      } else {
        state = 2 /* READING_DATA */;
        buffer = [];
      }
      lastline = "";
    } else if (2 /* READING_DATA */ === state) {
      if (lastline.length > boundary.length + 4) {
        lastline = "";
      }
      if ("--" + boundary === lastline) {
        const j = buffer.length - lastline.length;
        const part = buffer.slice(0, j - 1);
        allParts.push(process$1(part, currentPartHeaders));
        buffer = [];
        currentPartHeaders = [];
        lastline = "";
        state = 3 /* READING_PART_SEPARATOR */;
      } else {
        buffer.push(currByte);
      }
      if (newLineDetected) {
        lastline = "";
      }
    } else if (3 /* READING_PART_SEPARATOR */ === state && newLineDetected) {
      state = 1 /* READING_HEADERS */;
    }
  }
  return allParts;
}
function process$1(data, headers) {
  const dataObj = {};
  const contentDispositionHeader = headers.find((h) => h[0] === "content-disposition")?.[1] || "";
  for (const i of contentDispositionHeader.split(";")) {
    const s = i.split("=");
    if (s.length !== 2) {
      continue;
    }
    const key = (s[0] || "").trim();
    if (key === "name" || key === "filename") {
      const _value = (s[1] || "").trim().replace(/"/g, "");
      dataObj[key] = Buffer.from(_value, "latin1").toString("utf8");
    }
  }
  const contentType = headers.find((h) => h[0] === "content-type")?.[1] || "";
  if (contentType) {
    dataObj.type = contentType;
  }
  dataObj.data = Buffer.from(data);
  return dataObj;
}

async function validateData(data, fn) {
  try {
    const res = await fn(data);
    if (res === false) {
      throw createValidationError();
    }
    if (res === true) {
      return data;
    }
    return res ?? data;
  } catch (error) {
    throw createValidationError(error);
  }
}
function createValidationError(validateError) {
  throw createError$1({
    status: 400,
    statusMessage: "Validation Error",
    message: validateError?.message || "Validation Error",
    data: validateError
  });
}

function getQuery(event) {
  return getQuery$1(event.path || "");
}
function getValidatedQuery(event, validate) {
  const query = getQuery(event);
  return validateData(query, validate);
}
function getRouterParams(event, opts = {}) {
  let params = event.context.params || {};
  if (opts.decode) {
    params = { ...params };
    for (const key in params) {
      params[key] = decode(params[key]);
    }
  }
  return params;
}
function getValidatedRouterParams(event, validate, opts = {}) {
  const routerParams = getRouterParams(event, opts);
  return validateData(routerParams, validate);
}
function getRouterParam(event, name, opts = {}) {
  const params = getRouterParams(event, opts);
  return params[name];
}
function getMethod(event, defaultMethod = "GET") {
  return (event.node.req.method || defaultMethod).toUpperCase();
}
function isMethod(event, expected, allowHead) {
  if (typeof expected === "string") {
    if (event.method === expected) {
      return true;
    }
  } else if (expected.includes(event.method)) {
    return true;
  }
  return false;
}
function assertMethod(event, expected, allowHead) {
  if (!isMethod(event, expected)) {
    throw createError$1({
      statusCode: 405,
      statusMessage: "HTTP method is not allowed."
    });
  }
}
function getRequestHeaders(event) {
  const _headers = {};
  for (const key in event.node.req.headers) {
    const val = event.node.req.headers[key];
    _headers[key] = Array.isArray(val) ? val.filter(Boolean).join(", ") : val;
  }
  return _headers;
}
function getRequestHeader(event, name) {
  const headers = getRequestHeaders(event);
  const value = headers[name.toLowerCase()];
  return value;
}
const getHeader = getRequestHeader;
function getRequestHost(event, opts = {}) {
  if (opts.xForwardedHost) {
    const _header = event.node.req.headers["x-forwarded-host"];
    const xForwardedHost = (_header || "").split(",").shift()?.trim();
    if (xForwardedHost) {
      return xForwardedHost;
    }
  }
  return event.node.req.headers.host || "localhost";
}
function getRequestProtocol(event, opts = {}) {
  if (opts.xForwardedProto !== false && event.node.req.headers["x-forwarded-proto"] === "https") {
    return "https";
  }
  return event.node.req.connection?.encrypted ? "https" : "http";
}
function getRequestURL(event, opts = {}) {
  const host = getRequestHost(event, opts);
  const protocol = getRequestProtocol(event, opts);
  const path = (event.node.req.originalUrl || event.path).replace(
    /^[/\\]+/g,
    "/"
  );
  return new URL(path, `${protocol}://${host}`);
}
function toWebRequest(event) {
  return event.web?.request || new Request(getRequestURL(event), {
    // @ts-ignore Undici option
    duplex: "half",
    method: event.method,
    headers: event.headers,
    body: getRequestWebStream(event)
  });
}
function getRequestIP(event, opts = {}) {
  if (event.context.clientAddress) {
    return event.context.clientAddress;
  }
  if (opts.xForwardedFor) {
    const xForwardedFor = getRequestHeader(event, "x-forwarded-for")?.split(",").shift()?.trim();
    if (xForwardedFor) {
      return xForwardedFor;
    }
  }
  if (event.node.req.socket.remoteAddress) {
    return event.node.req.socket.remoteAddress;
  }
}

const RawBodySymbol = Symbol.for("h3RawBody");
const ParsedBodySymbol = Symbol.for("h3ParsedBody");
const PayloadMethods$1 = ["PATCH", "POST", "PUT", "DELETE"];
function readRawBody(event, encoding = "utf8") {
  assertMethod(event, PayloadMethods$1);
  const _rawBody = event._requestBody || event.web?.request?.body || event.node.req[RawBodySymbol] || event.node.req.rawBody || event.node.req.body;
  if (_rawBody) {
    const promise2 = Promise.resolve(_rawBody).then((_resolved) => {
      if (Buffer.isBuffer(_resolved)) {
        return _resolved;
      }
      if (typeof _resolved.pipeTo === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.pipeTo(
            new WritableStream({
              write(chunk) {
                chunks.push(chunk);
              },
              close() {
                resolve(Buffer.concat(chunks));
              },
              abort(reason) {
                reject(reason);
              }
            })
          ).catch(reject);
        });
      } else if (typeof _resolved.pipe === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.on("data", (chunk) => {
            chunks.push(chunk);
          }).on("end", () => {
            resolve(Buffer.concat(chunks));
          }).on("error", reject);
        });
      }
      if (_resolved.constructor === Object) {
        return Buffer.from(JSON.stringify(_resolved));
      }
      if (_resolved instanceof URLSearchParams) {
        return Buffer.from(_resolved.toString());
      }
      if (_resolved instanceof FormData) {
        return new Response(_resolved).bytes().then((uint8arr) => Buffer.from(uint8arr));
      }
      return Buffer.from(_resolved);
    });
    return encoding ? promise2.then((buff) => buff.toString(encoding)) : promise2;
  }
  if (!Number.parseInt(event.node.req.headers["content-length"] || "") && !/\bchunked\b/i.test(
    String(event.node.req.headers["transfer-encoding"] ?? "")
  )) {
    return Promise.resolve(void 0);
  }
  const promise = event.node.req[RawBodySymbol] = new Promise(
    (resolve, reject) => {
      const bodyData = [];
      event.node.req.on("error", (err) => {
        reject(err);
      }).on("data", (chunk) => {
        bodyData.push(chunk);
      }).on("end", () => {
        resolve(Buffer.concat(bodyData));
      });
    }
  );
  const result = encoding ? promise.then((buff) => buff.toString(encoding)) : promise;
  return result;
}
async function readBody(event, options = {}) {
  const request = event.node.req;
  if (hasProp(request, ParsedBodySymbol)) {
    return request[ParsedBodySymbol];
  }
  const contentType = request.headers["content-type"] || "";
  const body = await readRawBody(event);
  let parsed;
  if (contentType === "application/json") {
    parsed = _parseJSON(body, options.strict ?? true);
  } else if (contentType.startsWith("application/x-www-form-urlencoded")) {
    parsed = _parseURLEncodedBody(body);
  } else if (contentType.startsWith("text/")) {
    parsed = body;
  } else {
    parsed = _parseJSON(body, options.strict ?? false);
  }
  request[ParsedBodySymbol] = parsed;
  return parsed;
}
async function readValidatedBody(event, validate) {
  const _body = await readBody(event, { strict: true });
  return validateData(_body, validate);
}
async function readMultipartFormData(event) {
  const contentType = getRequestHeader(event, "content-type");
  if (!contentType || !contentType.startsWith("multipart/form-data")) {
    return;
  }
  const boundary = contentType.match(/boundary=([^;]*)(;|$)/i)?.[1];
  if (!boundary) {
    return;
  }
  const body = await readRawBody(event, false);
  if (!body) {
    return;
  }
  return parse(body, boundary);
}
function getRequestWebStream(event) {
  if (!PayloadMethods$1.includes(event.method)) {
    return;
  }
  const bodyStream = event.web?.request?.body || event._requestBody;
  if (bodyStream) {
    return bodyStream;
  }
  const _hasRawBody = RawBodySymbol in event.node.req || "rawBody" in event.node.req || "body" in event.node.req || "__unenv__" in event.node.req;
  if (_hasRawBody) {
    return new ReadableStream({
      async start(controller) {
        const _rawBody = await readRawBody(event, false);
        if (_rawBody) {
          controller.enqueue(_rawBody);
        }
        controller.close();
      }
    });
  }
  return new ReadableStream({
    start: (controller) => {
      event.node.req.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      event.node.req.on("end", () => {
        controller.close();
      });
      event.node.req.on("error", (err) => {
        controller.error(err);
      });
    }
  });
}
function _parseJSON(body = "", strict) {
  if (!body) {
    return void 0;
  }
  try {
    return destr(body, { strict });
  } catch {
    throw createError$1({
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Invalid JSON body"
    });
  }
}
function _parseURLEncodedBody(body) {
  const form = new URLSearchParams(body);
  const parsedForm = /* @__PURE__ */ Object.create(null);
  for (const [key, value] of form.entries()) {
    if (hasProp(parsedForm, key)) {
      if (!Array.isArray(parsedForm[key])) {
        parsedForm[key] = [parsedForm[key]];
      }
      parsedForm[key].push(value);
    } else {
      parsedForm[key] = value;
    }
  }
  return parsedForm;
}

function handleCacheHeaders(event, opts) {
  const cacheControls = ["public", ...opts.cacheControls || []];
  let cacheMatched = false;
  if (opts.maxAge !== void 0) {
    cacheControls.push(`max-age=${+opts.maxAge}`, `s-maxage=${+opts.maxAge}`);
  }
  if (opts.modifiedTime) {
    const modifiedTime = new Date(opts.modifiedTime);
    const ifModifiedSince = event.node.req.headers["if-modified-since"];
    event.node.res.setHeader("last-modified", modifiedTime.toUTCString());
    if (ifModifiedSince && new Date(ifModifiedSince) >= modifiedTime) {
      cacheMatched = true;
    }
  }
  if (opts.etag) {
    event.node.res.setHeader("etag", opts.etag);
    const ifNonMatch = event.node.req.headers["if-none-match"];
    if (ifNonMatch === opts.etag) {
      cacheMatched = true;
    }
  }
  event.node.res.setHeader("cache-control", cacheControls.join(", "));
  if (cacheMatched) {
    event.node.res.statusCode = 304;
    if (!event.handled) {
      event.node.res.end();
    }
    return true;
  }
  return false;
}

const MIMES = {
  html: "text/html",
  json: "application/json"
};

const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
  if (!statusCode) {
    return defaultStatusCode;
  }
  if (typeof statusCode === "string") {
    statusCode = Number.parseInt(statusCode, 10);
  }
  if (statusCode < 100 || statusCode > 999) {
    return defaultStatusCode;
  }
  return statusCode;
}
function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString.flatMap((c) => splitCookiesString(c));
  }
  if (typeof cookiesString !== "string") {
    return [];
  }
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.slice(start));
    }
  }
  return cookiesStrings;
}

const defer = typeof setImmediate === "undefined" ? (fn) => fn() : setImmediate;
function send(event, data, type) {
  if (type) {
    defaultContentType(event, type);
  }
  return new Promise((resolve) => {
    defer(() => {
      if (!event.handled) {
        event.node.res.end(data);
      }
      resolve();
    });
  });
}
function sendNoContent(event, code) {
  if (event.handled) {
    return;
  }
  if (!code && event.node.res.statusCode !== 200) {
    code = event.node.res.statusCode;
  }
  const _code = sanitizeStatusCode(code, 204);
  if (_code === 204) {
    event.node.res.removeHeader("content-length");
  }
  event.node.res.writeHead(_code);
  event.node.res.end();
}
function setResponseStatus(event, code, text) {
  if (code) {
    event.node.res.statusCode = sanitizeStatusCode(
      code,
      event.node.res.statusCode
    );
  }
  if (text) {
    event.node.res.statusMessage = sanitizeStatusMessage(text);
  }
}
function getResponseStatus(event) {
  return event.node.res.statusCode;
}
function getResponseStatusText(event) {
  return event.node.res.statusMessage;
}
function defaultContentType(event, type) {
  if (type && event.node.res.statusCode !== 304 && !event.node.res.getHeader("content-type")) {
    event.node.res.setHeader("content-type", type);
  }
}
function sendRedirect(event, location, code = 302) {
  event.node.res.statusCode = sanitizeStatusCode(
    code,
    event.node.res.statusCode
  );
  event.node.res.setHeader("location", location);
  const encodedLoc = location.replace(/"/g, "%22");
  const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`;
  return send(event, html, MIMES.html);
}
function getResponseHeader(event, name) {
  return event.node.res.getHeader(name);
}
function setResponseHeaders(event, headers) {
  for (const [name, value] of Object.entries(headers)) {
    event.node.res.setHeader(
      name,
      value
    );
  }
}
const setHeaders = setResponseHeaders;
function setResponseHeader(event, name, value) {
  event.node.res.setHeader(name, value);
}
const setHeader = setResponseHeader;
function appendResponseHeader(event, name, value) {
  let current = event.node.res.getHeader(name);
  if (!current) {
    event.node.res.setHeader(name, value);
    return;
  }
  if (!Array.isArray(current)) {
    current = [current.toString()];
  }
  event.node.res.setHeader(name, [...current, value]);
}
function removeResponseHeader(event, name) {
  return event.node.res.removeHeader(name);
}
function isStream(data) {
  if (!data || typeof data !== "object") {
    return false;
  }
  if (typeof data.pipe === "function") {
    if (typeof data._read === "function") {
      return true;
    }
    if (typeof data.abort === "function") {
      return true;
    }
  }
  if (typeof data.pipeTo === "function") {
    return true;
  }
  return false;
}
function isWebResponse(data) {
  return typeof Response !== "undefined" && data instanceof Response;
}
function sendStream(event, stream) {
  if (!stream || typeof stream !== "object") {
    throw new Error("[h3] Invalid stream provided.");
  }
  event.node.res._data = stream;
  if (!event.node.res.socket) {
    event._handled = true;
    return Promise.resolve();
  }
  if (hasProp(stream, "pipeTo") && typeof stream.pipeTo === "function") {
    return stream.pipeTo(
      new WritableStream({
        write(chunk) {
          event.node.res.write(chunk);
        }
      })
    ).then(() => {
      event.node.res.end();
    });
  }
  if (hasProp(stream, "pipe") && typeof stream.pipe === "function") {
    return new Promise((resolve, reject) => {
      stream.pipe(event.node.res);
      if (stream.on) {
        stream.on("end", () => {
          event.node.res.end();
          resolve();
        });
        stream.on("error", (error) => {
          reject(error);
        });
      }
      event.node.res.on("close", () => {
        if (stream.abort) {
          stream.abort();
        }
      });
    });
  }
  throw new Error("[h3] Invalid or incompatible stream provided.");
}
function sendWebResponse(event, response) {
  for (const [key, value] of response.headers) {
    if (key === "set-cookie") {
      event.node.res.appendHeader(key, splitCookiesString(value));
    } else {
      event.node.res.setHeader(key, value);
    }
  }
  if (response.status) {
    event.node.res.statusCode = sanitizeStatusCode(
      response.status,
      event.node.res.statusCode
    );
  }
  if (response.statusText) {
    event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  }
  if (response.redirected) {
    event.node.res.setHeader("location", response.url);
  }
  if (!response.body) {
    event.node.res.end();
    return;
  }
  return sendStream(event, response.body);
}

const PayloadMethods = /* @__PURE__ */ new Set(["PATCH", "POST", "PUT", "DELETE"]);
const ignoredHeaders = /* @__PURE__ */ new Set([
  "transfer-encoding",
  "accept-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  "expect",
  "host",
  "accept"
]);
async function proxyRequest(event, target, opts = {}) {
  let body;
  let duplex;
  if (PayloadMethods.has(event.method)) {
    if (opts.streamRequest) {
      body = getRequestWebStream(event);
      duplex = "half";
    } else {
      body = await readRawBody(event, false).catch(() => void 0);
    }
  }
  const method = opts.fetchOptions?.method || event.method;
  const fetchHeaders = mergeHeaders$1(
    getProxyRequestHeaders(event, { host: target.startsWith("/") }),
    opts.fetchOptions?.headers,
    opts.headers
  );
  return sendProxy(event, target, {
    ...opts,
    fetchOptions: {
      method,
      body,
      duplex,
      ...opts.fetchOptions,
      headers: fetchHeaders
    }
  });
}
async function sendProxy(event, target, opts = {}) {
  let response;
  try {
    response = await _getFetch(opts.fetch)(target, {
      headers: opts.headers,
      ignoreResponseError: true,
      // make $ofetch.raw transparent
      ...opts.fetchOptions
    });
  } catch (error) {
    throw createError$1({
      status: 502,
      statusMessage: "Bad Gateway",
      cause: error
    });
  }
  event.node.res.statusCode = sanitizeStatusCode(
    response.status,
    event.node.res.statusCode
  );
  event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  const cookies = [];
  for (const [key, value] of response.headers.entries()) {
    if (key === "content-encoding") {
      continue;
    }
    if (key === "content-length") {
      continue;
    }
    if (key === "set-cookie") {
      cookies.push(...splitCookiesString(value));
      continue;
    }
    event.node.res.setHeader(key, value);
  }
  if (cookies.length > 0) {
    event.node.res.setHeader(
      "set-cookie",
      cookies.map((cookie) => {
        if (opts.cookieDomainRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookieDomainRewrite,
            "domain"
          );
        }
        if (opts.cookiePathRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookiePathRewrite,
            "path"
          );
        }
        return cookie;
      })
    );
  }
  if (opts.onResponse) {
    await opts.onResponse(event, response);
  }
  if (response._data !== void 0) {
    return response._data;
  }
  if (event.handled) {
    return;
  }
  if (opts.sendStream === false) {
    const data = new Uint8Array(await response.arrayBuffer());
    return event.node.res.end(data);
  }
  if (response.body) {
    for await (const chunk of response.body) {
      event.node.res.write(chunk);
    }
  }
  return event.node.res.end();
}
function getProxyRequestHeaders(event, opts) {
  const headers = /* @__PURE__ */ Object.create(null);
  const reqHeaders = getRequestHeaders(event);
  for (const name in reqHeaders) {
    if (!ignoredHeaders.has(name) || name === "host" && opts?.host) {
      headers[name] = reqHeaders[name];
    }
  }
  return headers;
}
function fetchWithEvent(event, req, init, options) {
  return _getFetch(options?.fetch)(req, {
    ...init,
    context: init?.context || event.context,
    headers: {
      ...getProxyRequestHeaders(event, {
        host: typeof req === "string" && req.startsWith("/")
      }),
      ...init?.headers
    }
  });
}
function _getFetch(_fetch) {
  if (_fetch) {
    return _fetch;
  }
  if (globalThis.fetch) {
    return globalThis.fetch;
  }
  throw new Error(
    "fetch is not available. Try importing `node-fetch-native/polyfill` for Node.js."
  );
}
function rewriteCookieProperty(header, map, property) {
  const _map = typeof map === "string" ? { "*": map } : map;
  return header.replace(
    new RegExp(`(;\\s*${property}=)([^;]+)`, "gi"),
    (match, prefix, previousValue) => {
      let newValue;
      if (previousValue in _map) {
        newValue = _map[previousValue];
      } else if ("*" in _map) {
        newValue = _map["*"];
      } else {
        return match;
      }
      return newValue ? prefix + newValue : "";
    }
  );
}
function mergeHeaders$1(defaults, ...inputs) {
  const _inputs = inputs.filter(Boolean);
  if (_inputs.length === 0) {
    return defaults;
  }
  const merged = new Headers(defaults);
  for (const input of _inputs) {
    const entries = Array.isArray(input) ? input : typeof input.entries === "function" ? input.entries() : Object.entries(input);
    for (const [key, value] of entries) {
      if (value !== void 0) {
        merged.set(key, value);
      }
    }
  }
  return merged;
}

function formatEventStreamMessage(message) {
  let result = "";
  if (message.id) {
    result += `id: ${_sanitizeSingleLine(message.id)}
`;
  }
  if (message.event) {
    result += `event: ${_sanitizeSingleLine(message.event)}
`;
  }
  if (typeof message.retry === "number" && Number.isInteger(message.retry)) {
    result += `retry: ${message.retry}
`;
  }
  const data = typeof message.data === "string" ? message.data : "";
  for (const line of data.split(/\r\n|\r|\n/)) {
    result += `data: ${line}
`;
  }
  result += "\n";
  return result;
}
function _sanitizeSingleLine(value) {
  return value.replace(/[\n\r]/g, "");
}
function formatEventStreamMessages(messages) {
  let result = "";
  for (const msg of messages) {
    result += formatEventStreamMessage(msg);
  }
  return result;
}
function setEventStreamHeaders(event) {
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "private, no-cache, no-store, no-transform, must-revalidate, max-age=0",
    "X-Accel-Buffering": "no"
    // prevent nginx from buffering the response
  };
  if (!isHttp2Request(event)) {
    headers.Connection = "keep-alive";
  }
  setResponseHeaders(event, headers);
}
function isHttp2Request(event) {
  return getHeader(event, ":path") !== void 0 && getHeader(event, ":method") !== void 0;
}

class EventStream {
  _h3Event;
  _transformStream = new TransformStream();
  _writer;
  _encoder = new TextEncoder();
  _writerIsClosed = false;
  _paused = false;
  _unsentData;
  _disposed = false;
  _handled = false;
  constructor(event, opts = {}) {
    this._h3Event = event;
    this._writer = this._transformStream.writable.getWriter();
    this._writer.closed.then(() => {
      this._writerIsClosed = true;
    });
    if (opts.autoclose !== false) {
      this._h3Event.node.req.on("close", () => this.close());
    }
  }
  async push(message) {
    if (typeof message === "string") {
      await this._sendEvent({ data: message });
      return;
    }
    if (Array.isArray(message)) {
      if (message.length === 0) {
        return;
      }
      if (typeof message[0] === "string") {
        const msgs = [];
        for (const item of message) {
          msgs.push({ data: item });
        }
        await this._sendEvents(msgs);
        return;
      }
      await this._sendEvents(message);
      return;
    }
    await this._sendEvent(message);
  }
  async _sendEvent(message) {
    if (this._writerIsClosed) {
      return;
    }
    if (this._paused && !this._unsentData) {
      this._unsentData = formatEventStreamMessage(message);
      return;
    }
    if (this._paused) {
      this._unsentData += formatEventStreamMessage(message);
      return;
    }
    await this._writer.write(this._encoder.encode(formatEventStreamMessage(message))).catch();
  }
  async _sendEvents(messages) {
    if (this._writerIsClosed) {
      return;
    }
    const payload = formatEventStreamMessages(messages);
    if (this._paused && !this._unsentData) {
      this._unsentData = payload;
      return;
    }
    if (this._paused) {
      this._unsentData += payload;
      return;
    }
    await this._writer.write(this._encoder.encode(payload)).catch();
  }
  pause() {
    this._paused = true;
  }
  get isPaused() {
    return this._paused;
  }
  async resume() {
    this._paused = false;
    await this.flush();
  }
  async flush() {
    if (this._writerIsClosed) {
      return;
    }
    if (this._unsentData?.length) {
      await this._writer.write(this._encoder.encode(this._unsentData));
      this._unsentData = void 0;
    }
  }
  /**
   * Close the stream and the connection if the stream is being sent to the client
   */
  async close() {
    if (this._disposed) {
      return;
    }
    if (!this._writerIsClosed) {
      try {
        await this._writer.close();
      } catch {
      }
    }
    if (this._h3Event._handled && this._handled && !this._h3Event.node.res.closed) {
      this._h3Event.node.res.end();
    }
    this._disposed = true;
  }
  /**
   * Triggers callback when the writable stream is closed.
   * It is also triggered after calling the `close()` method.
   */
  onClosed(cb) {
    this._writer.closed.then(cb);
  }
  async send() {
    setEventStreamHeaders(this._h3Event);
    setResponseStatus(this._h3Event, 200);
    this._h3Event._handled = true;
    this._handled = true;
    await sendStream(this._h3Event, this._transformStream.readable);
  }
}

function createEventStream(event, opts) {
  return new EventStream(event, opts);
}

class H3Event {
  "__is_event__" = true;
  // Context
  node;
  // Node
  web;
  // Web
  context = {};
  // Shared
  // Request
  _method;
  _path;
  _headers;
  _requestBody;
  // Response
  _handled = false;
  // Hooks
  _onBeforeResponseCalled;
  _onAfterResponseCalled;
  constructor(req, res) {
    this.node = { req, res };
  }
  // --- Request ---
  get method() {
    if (!this._method) {
      this._method = (this.node.req.method || "GET").toUpperCase();
    }
    return this._method;
  }
  get path() {
    return this._path || this.node.req.url || "/";
  }
  get headers() {
    if (!this._headers) {
      this._headers = _normalizeNodeHeaders(this.node.req.headers);
    }
    return this._headers;
  }
  // --- Respoonse ---
  get handled() {
    return this._handled || this.node.res.writableEnded || this.node.res.headersSent;
  }
  respondWith(response) {
    return Promise.resolve(response).then(
      (_response) => sendWebResponse(this, _response)
    );
  }
  // --- Utils ---
  toString() {
    return `[${this.method}] ${this.path}`;
  }
  toJSON() {
    return this.toString();
  }
  // --- Deprecated ---
  /** @deprecated Please use `event.node.req` instead. */
  get req() {
    return this.node.req;
  }
  /** @deprecated Please use `event.node.res` instead. */
  get res() {
    return this.node.res;
  }
}
function isEvent(input) {
  return hasProp(input, "__is_event__");
}
function createEvent(req, res) {
  return new H3Event(req, res);
}
function _normalizeNodeHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value) {
      headers.set(name, value);
    }
  }
  return headers;
}

function defineEventHandler(handler) {
  if (typeof handler === "function") {
    handler.__is_handler__ = true;
    return handler;
  }
  const _hooks = {
    onRequest: _normalizeArray(handler.onRequest),
    onBeforeResponse: _normalizeArray(handler.onBeforeResponse)
  };
  const _handler = (event) => {
    return _callHandler(event, handler.handler, _hooks);
  };
  _handler.__is_handler__ = true;
  _handler.__resolve__ = handler.handler.__resolve__;
  _handler.__websocket__ = handler.websocket;
  return _handler;
}
function _normalizeArray(input) {
  return input ? Array.isArray(input) ? input : [input] : void 0;
}
async function _callHandler(event, handler, hooks) {
  if (hooks.onRequest) {
    for (const hook of hooks.onRequest) {
      await hook(event);
      if (event.handled) {
        return;
      }
    }
  }
  const body = await handler(event);
  const response = { body };
  if (hooks.onBeforeResponse) {
    for (const hook of hooks.onBeforeResponse) {
      await hook(event, response);
    }
  }
  return response.body;
}
const eventHandler = defineEventHandler;
function isEventHandler(input) {
  return hasProp(input, "__is_handler__");
}
function toEventHandler(input, _, _route) {
  return input;
}
function defineLazyEventHandler(factory) {
  let _promise;
  let _resolved;
  const resolveHandler = () => {
    if (_resolved) {
      return Promise.resolve(_resolved);
    }
    if (!_promise) {
      _promise = Promise.resolve(factory()).then((r) => {
        const handler2 = r.default || r;
        if (typeof handler2 !== "function") {
          throw new TypeError(
            "Invalid lazy handler result. It should be a function:",
            handler2
          );
        }
        _resolved = { handler: toEventHandler(r.default || r) };
        return _resolved;
      });
    }
    return _promise;
  };
  const handler = eventHandler((event) => {
    if (_resolved) {
      return _resolved.handler(event);
    }
    return resolveHandler().then((r) => r.handler(event));
  });
  handler.__resolve__ = resolveHandler;
  return handler;
}
const lazyEventHandler = defineLazyEventHandler;

function createApp(options = {}) {
  const stack = [];
  const handler = createAppEventHandler(stack, options);
  const resolve = createResolver(stack);
  handler.__resolve__ = resolve;
  const getWebsocket = cachedFn(() => websocketOptions(resolve, options));
  const app = {
    // @ts-expect-error
    use: (arg1, arg2, arg3) => use(app, arg1, arg2, arg3),
    resolve,
    handler,
    stack,
    options,
    get websocket() {
      return getWebsocket();
    }
  };
  return app;
}
function use(app, arg1, arg2, arg3) {
  if (Array.isArray(arg1)) {
    for (const i of arg1) {
      use(app, i, arg2, arg3);
    }
  } else if (Array.isArray(arg2)) {
    for (const i of arg2) {
      use(app, arg1, i, arg3);
    }
  } else if (typeof arg1 === "string") {
    app.stack.push(
      normalizeLayer({ ...arg3, route: arg1, handler: arg2 })
    );
  } else if (typeof arg1 === "function") {
    app.stack.push(normalizeLayer({ ...arg2, handler: arg1 }));
  } else {
    app.stack.push(normalizeLayer({ ...arg1 }));
  }
  return app;
}
function createAppEventHandler(stack, options) {
  const spacing = options.debug ? 2 : void 0;
  return eventHandler(async (event) => {
    event.node.req.originalUrl = event.node.req.originalUrl || event.node.req.url || "/";
    const _rawReqUrl = event.node.req.url || "/";
    const _reqPath = _decodePath(event._path || _rawReqUrl);
    event._path = _reqPath;
    const _needsRawUrl = _reqPath !== _rawReqUrl;
    let _layerPath;
    if (options.onRequest) {
      await options.onRequest(event);
    }
    for (const layer of stack) {
      if (layer.route.length > 1) {
        if (!_reqPath.startsWith(layer.route)) {
          continue;
        }
        _layerPath = _reqPath.slice(layer.route.length) || "/";
      } else {
        _layerPath = _reqPath;
      }
      if (layer.match && !layer.match(_layerPath, event)) {
        continue;
      }
      event._path = _layerPath;
      event.node.req.url = _needsRawUrl ? layer.route.length > 1 ? _rawReqUrl.slice(layer.route.length) || "/" : _rawReqUrl : _layerPath;
      const val = await layer.handler(event);
      const _body = val === void 0 ? void 0 : await val;
      if (_body !== void 0) {
        const _response = { body: _body };
        if (options.onBeforeResponse) {
          event._onBeforeResponseCalled = true;
          await options.onBeforeResponse(event, _response);
        }
        await handleHandlerResponse(event, _response.body, spacing);
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, _response);
        }
        return;
      }
      if (event.handled) {
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, void 0);
        }
        return;
      }
    }
    if (!event.handled) {
      throw createError$1({
        statusCode: 404,
        statusMessage: `Cannot find any path matching ${event.path || "/"}.`
      });
    }
    if (options.onAfterResponse) {
      event._onAfterResponseCalled = true;
      await options.onAfterResponse(event, void 0);
    }
  });
}
function createResolver(stack) {
  return async (path) => {
    let _layerPath;
    for (const layer of stack) {
      if (layer.route === "/" && !layer.handler.__resolve__) {
        continue;
      }
      if (!path.startsWith(layer.route)) {
        continue;
      }
      _layerPath = path.slice(layer.route.length) || "/";
      if (layer.match && !layer.match(_layerPath, void 0)) {
        continue;
      }
      let res = { route: layer.route, handler: layer.handler };
      if (res.handler.__resolve__) {
        const _res = await res.handler.__resolve__(_layerPath);
        if (!_res) {
          continue;
        }
        res = {
          ...res,
          ..._res,
          route: joinURL(res.route || "/", _res.route || "/")
        };
      }
      return res;
    }
  };
}
function normalizeLayer(input) {
  let handler = input.handler;
  if (handler.handler) {
    handler = handler.handler;
  }
  if (input.lazy) {
    handler = lazyEventHandler(handler);
  } else if (!isEventHandler(handler)) {
    handler = toEventHandler(handler, void 0, input.route);
  }
  return {
    route: withoutTrailingSlash(input.route),
    match: input.match,
    handler
  };
}
function handleHandlerResponse(event, val, jsonSpace) {
  if (val === null) {
    return sendNoContent(event);
  }
  if (val) {
    if (isWebResponse(val)) {
      return sendWebResponse(event, val);
    }
    if (isStream(val)) {
      return sendStream(event, val);
    }
    if (val.buffer) {
      return send(event, val);
    }
    if (val.arrayBuffer && typeof val.arrayBuffer === "function") {
      return val.arrayBuffer().then((arrayBuffer) => {
        return send(event, Buffer.from(arrayBuffer), val.type);
      });
    }
    if (val instanceof Error) {
      throw createError$1(val);
    }
    if (typeof val.end === "function") {
      return true;
    }
  }
  const valType = typeof val;
  if (valType === "string") {
    return send(event, val, MIMES.html);
  }
  if (valType === "object" || valType === "boolean" || valType === "number") {
    return send(event, JSON.stringify(val, void 0, jsonSpace), MIMES.json);
  }
  if (valType === "bigint") {
    return send(event, val.toString(), MIMES.json);
  }
  throw createError$1({
    statusCode: 500,
    statusMessage: `[h3] Cannot send ${valType} as response.`
  });
}
function cachedFn(fn) {
  let cache;
  return () => {
    if (!cache) {
      cache = fn();
    }
    return cache;
  };
}
function _decodePath(url) {
  const qIndex = url.indexOf("?");
  const path = qIndex === -1 ? url : url.slice(0, qIndex);
  const query = qIndex === -1 ? "" : url.slice(qIndex);
  const decodedPath = path.includes("%25") ? decodePath(path.replace(/%25/g, "%2525")) : decodePath(path);
  return decodedPath + query;
}
function websocketOptions(evResolver, appOptions) {
  return {
    ...appOptions.websocket,
    async resolve(info) {
      const url = info.request?.url || info.url || "/";
      const { pathname } = typeof url === "string" ? parseURL(url) : url;
      const resolved = await evResolver(pathname);
      return resolved?.handler?.__websocket__ || {};
    }
  };
}

const RouterMethods = [
  "connect",
  "delete",
  "get",
  "head",
  "options",
  "post",
  "put",
  "trace",
  "patch"
];
function createRouter(opts = {}) {
  const _router = createRouter$1({});
  const routes = {};
  let _matcher;
  const router = {};
  const addRoute = (path, handler, method) => {
    let route = routes[path];
    if (!route) {
      routes[path] = route = { path, handlers: {} };
      _router.insert(path, route);
    }
    if (Array.isArray(method)) {
      for (const m of method) {
        addRoute(path, handler, m);
      }
    } else {
      route.handlers[method] = toEventHandler(handler);
    }
    return router;
  };
  router.use = router.add = (path, handler, method) => addRoute(path, handler, method || "all");
  for (const method of RouterMethods) {
    router[method] = (path, handle) => router.add(path, handle, method);
  }
  const matchHandler = (path = "/", method = "get") => {
    const qIndex = path.indexOf("?");
    if (qIndex !== -1) {
      path = path.slice(0, Math.max(0, qIndex));
    }
    const matched = _router.lookup(path);
    if (!matched || !matched.handlers) {
      return {
        error: createError$1({
          statusCode: 404,
          name: "Not Found",
          statusMessage: `Cannot find any route matching ${path || "/"}.`
        })
      };
    }
    let handler = matched.handlers[method] || matched.handlers.all;
    if (!handler) {
      if (!_matcher) {
        _matcher = toRouteMatcher(_router);
      }
      const _matches = _matcher.matchAll(path).reverse();
      for (const _match of _matches) {
        if (_match.handlers[method]) {
          handler = _match.handlers[method];
          matched.handlers[method] = matched.handlers[method] || handler;
          break;
        }
        if (_match.handlers.all) {
          handler = _match.handlers.all;
          matched.handlers.all = matched.handlers.all || handler;
          break;
        }
      }
    }
    if (!handler) {
      return {
        error: createError$1({
          statusCode: 405,
          name: "Method Not Allowed",
          statusMessage: `Method ${method} is not allowed on this route.`
        })
      };
    }
    return { matched, handler };
  };
  const isPreemptive = opts.preemptive || opts.preemtive;
  router.handler = eventHandler((event) => {
    const match = matchHandler(
      event.path,
      event.method.toLowerCase()
    );
    if ("error" in match) {
      if (isPreemptive) {
        throw match.error;
      } else {
        return;
      }
    }
    event.context.matchedRoute = match.matched;
    const params = match.matched.params || {};
    event.context.params = params;
    return Promise.resolve(match.handler(event)).then((res) => {
      if (res === void 0 && isPreemptive) {
        return null;
      }
      return res;
    });
  });
  router.handler.__resolve__ = async (path) => {
    path = withLeadingSlash(path);
    const match = matchHandler(path);
    if ("error" in match) {
      return;
    }
    let res = {
      route: match.matched.path,
      handler: match.handler
    };
    if (match.handler.__resolve__) {
      const _res = await match.handler.__resolve__(path);
      if (!_res) {
        return;
      }
      res = { ...res, ..._res };
    }
    return res;
  };
  return router;
}
function toNodeListener(app) {
  const toNodeHandle = async function(req, res) {
    const event = createEvent(req, res);
    try {
      await app.handler(event);
    } catch (_error) {
      const error = createError$1(_error);
      if (!isError(_error)) {
        error.unhandled = true;
      }
      setResponseStatus(event, error.statusCode, error.statusMessage);
      if (app.options.onError) {
        await app.options.onError(error, event);
      }
      if (event.handled) {
        return;
      }
      if (error.unhandled || error.fatal) {
        console.error("[h3]", error.fatal ? "[fatal]" : "[unhandled]", error);
      }
      if (app.options.onBeforeResponse && !event._onBeforeResponseCalled) {
        await app.options.onBeforeResponse(event, { body: error });
      }
      await sendError(event, error, !!app.options.debug);
      if (app.options.onAfterResponse && !event._onAfterResponseCalled) {
        await app.options.onAfterResponse(event, { body: error });
      }
    }
  };
  return toNodeHandle;
}

function flatHooks(configHooks, hooks = {}, parentName) {
  for (const key in configHooks) {
    const subHook = configHooks[key];
    const name = parentName ? `${parentName}:${key}` : key;
    if (typeof subHook === "object" && subHook !== null) {
      flatHooks(subHook, hooks, name);
    } else if (typeof subHook === "function") {
      hooks[name] = subHook;
    }
  }
  return hooks;
}
const defaultTask = { run: (function_) => function_() };
const _createTask = () => defaultTask;
const createTask = typeof console.createTask !== "undefined" ? console.createTask : _createTask;
function serialTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return hooks.reduce(
    (promise, hookFunction) => promise.then(() => task.run(() => hookFunction(...args))),
    Promise.resolve()
  );
}
function parallelTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
}
function callEachWith(callbacks, arg0) {
  for (const callback of [...callbacks]) {
    callback(arg0);
  }
}

class Hookable {
  constructor() {
    this._hooks = {};
    this._before = void 0;
    this._after = void 0;
    this._deprecatedMessages = void 0;
    this._deprecatedHooks = {};
    this.hook = this.hook.bind(this);
    this.callHook = this.callHook.bind(this);
    this.callHookWith = this.callHookWith.bind(this);
  }
  hook(name, function_, options = {}) {
    if (!name || typeof function_ !== "function") {
      return () => {
      };
    }
    const originalName = name;
    let dep;
    while (this._deprecatedHooks[name]) {
      dep = this._deprecatedHooks[name];
      name = dep.to;
    }
    if (dep && !options.allowDeprecated) {
      let message = dep.message;
      if (!message) {
        message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
      }
      if (!this._deprecatedMessages) {
        this._deprecatedMessages = /* @__PURE__ */ new Set();
      }
      if (!this._deprecatedMessages.has(message)) {
        console.warn(message);
        this._deprecatedMessages.add(message);
      }
    }
    if (!function_.name) {
      try {
        Object.defineProperty(function_, "name", {
          get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
          configurable: true
        });
      } catch {
      }
    }
    this._hooks[name] = this._hooks[name] || [];
    this._hooks[name].push(function_);
    return () => {
      if (function_) {
        this.removeHook(name, function_);
        function_ = void 0;
      }
    };
  }
  hookOnce(name, function_) {
    let _unreg;
    let _function = (...arguments_) => {
      if (typeof _unreg === "function") {
        _unreg();
      }
      _unreg = void 0;
      _function = void 0;
      return function_(...arguments_);
    };
    _unreg = this.hook(name, _function);
    return _unreg;
  }
  removeHook(name, function_) {
    if (this._hooks[name]) {
      const index = this._hooks[name].indexOf(function_);
      if (index !== -1) {
        this._hooks[name].splice(index, 1);
      }
      if (this._hooks[name].length === 0) {
        delete this._hooks[name];
      }
    }
  }
  deprecateHook(name, deprecated) {
    this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
    const _hooks = this._hooks[name] || [];
    delete this._hooks[name];
    for (const hook of _hooks) {
      this.hook(name, hook);
    }
  }
  deprecateHooks(deprecatedHooks) {
    Object.assign(this._deprecatedHooks, deprecatedHooks);
    for (const name in deprecatedHooks) {
      this.deprecateHook(name, deprecatedHooks[name]);
    }
  }
  addHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    const removeFns = Object.keys(hooks).map(
      (key) => this.hook(key, hooks[key])
    );
    return () => {
      for (const unreg of removeFns.splice(0, removeFns.length)) {
        unreg();
      }
    };
  }
  removeHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    for (const key in hooks) {
      this.removeHook(key, hooks[key]);
    }
  }
  removeAllHooks() {
    for (const key in this._hooks) {
      delete this._hooks[key];
    }
  }
  callHook(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(serialTaskCaller, name, ...arguments_);
  }
  callHookParallel(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(parallelTaskCaller, name, ...arguments_);
  }
  callHookWith(caller, name, ...arguments_) {
    const event = this._before || this._after ? { name, args: arguments_, context: {} } : void 0;
    if (this._before) {
      callEachWith(this._before, event);
    }
    const result = caller(
      name in this._hooks ? [...this._hooks[name]] : [],
      arguments_
    );
    if (result instanceof Promise) {
      return result.finally(() => {
        if (this._after && event) {
          callEachWith(this._after, event);
        }
      });
    }
    if (this._after && event) {
      callEachWith(this._after, event);
    }
    return result;
  }
  beforeEach(function_) {
    this._before = this._before || [];
    this._before.push(function_);
    return () => {
      if (this._before !== void 0) {
        const index = this._before.indexOf(function_);
        if (index !== -1) {
          this._before.splice(index, 1);
        }
      }
    };
  }
  afterEach(function_) {
    this._after = this._after || [];
    this._after.push(function_);
    return () => {
      if (this._after !== void 0) {
        const index = this._after.indexOf(function_);
        if (index !== -1) {
          this._after.splice(index, 1);
        }
      }
    };
  }
}
function createHooks() {
  return new Hookable();
}

const isBrowser = "undefined" !== "undefined";
function createDebugger(hooks, _options = {}) {
  const options = {
    inspect: isBrowser,
    group: isBrowser,
    filter: () => true,
    ..._options
  };
  const _filter = options.filter;
  const filter = typeof _filter === "string" ? (name) => name.startsWith(_filter) : _filter;
  const _tag = options.tag ? `[${options.tag}] ` : "";
  const logPrefix = (event) => _tag + event.name + "".padEnd(event._id, "\0");
  const _idCtr = {};
  const unsubscribeBefore = hooks.beforeEach((event) => {
    if (filter !== void 0 && !filter(event.name)) {
      return;
    }
    _idCtr[event.name] = _idCtr[event.name] || 0;
    event._id = _idCtr[event.name]++;
    console.time(logPrefix(event));
  });
  const unsubscribeAfter = hooks.afterEach((event) => {
    if (filter !== void 0 && !filter(event.name)) {
      return;
    }
    if (options.group) {
      console.groupCollapsed(event.name);
    }
    if (options.inspect) {
      console.timeLog(logPrefix(event), event.args);
    } else {
      console.timeEnd(logPrefix(event));
    }
    if (options.group) {
      console.groupEnd();
    }
    _idCtr[event.name]--;
  });
  return {
    /** Stop debugging and remove listeners */
    close: () => {
      unsubscribeBefore();
      unsubscribeAfter();
    }
  };
}

class FetchError extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "FetchError";
    if (opts?.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
}
function createFetchError(ctx) {
  const errorMessage = ctx.error?.message || ctx.error?.toString() || "";
  const method = ctx.request?.method || ctx.options?.method || "GET";
  const url = ctx.request?.url || String(ctx.request) || "/";
  const requestStr = `[${method}] ${JSON.stringify(url)}`;
  const statusStr = ctx.response ? `${ctx.response.status} ${ctx.response.statusText}` : "<no response>";
  const message = `${requestStr}: ${statusStr}${errorMessage ? ` ${errorMessage}` : ""}`;
  const fetchError = new FetchError(
    message,
    ctx.error ? { cause: ctx.error } : void 0
  );
  for (const key of ["request", "options", "response"]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx[key];
      }
    });
  }
  for (const [key, refKey] of [
    ["data", "_data"],
    ["status", "status"],
    ["statusCode", "status"],
    ["statusText", "statusText"],
    ["statusMessage", "statusText"]
  ]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx.response && ctx.response[refKey];
      }
    });
  }
  return fetchError;
}

const payloadMethods = new Set(
  Object.freeze(["PATCH", "POST", "PUT", "DELETE"])
);
function isPayloadMethod(method = "GET") {
  return payloadMethods.has(method.toUpperCase());
}
function isJSONSerializable(value) {
  if (value === void 0) {
    return false;
  }
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === null) {
    return true;
  }
  if (t !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  if (value.buffer) {
    return false;
  }
  if (value instanceof FormData || value instanceof URLSearchParams) {
    return false;
  }
  return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
}
const textTypes = /* @__PURE__ */ new Set([
  "image/svg",
  "application/xml",
  "application/xhtml",
  "application/html"
]);
const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
function detectResponseType(_contentType = "") {
  if (!_contentType) {
    return "json";
  }
  const contentType = _contentType.split(";").shift() || "";
  if (JSON_RE.test(contentType)) {
    return "json";
  }
  if (contentType === "text/event-stream") {
    return "stream";
  }
  if (textTypes.has(contentType) || contentType.startsWith("text/")) {
    return "text";
  }
  return "blob";
}
function resolveFetchOptions(request, input, defaults, Headers) {
  const headers = mergeHeaders(
    input?.headers ?? request?.headers,
    defaults?.headers,
    Headers
  );
  let query;
  if (defaults?.query || defaults?.params || input?.params || input?.query) {
    query = {
      ...defaults?.params,
      ...defaults?.query,
      ...input?.params,
      ...input?.query
    };
  }
  return {
    ...defaults,
    ...input,
    query,
    params: query,
    headers
  };
}
function mergeHeaders(input, defaults, Headers) {
  if (!defaults) {
    return new Headers(input);
  }
  const headers = new Headers(defaults);
  if (input) {
    for (const [key, value] of Symbol.iterator in input || Array.isArray(input) ? input : new Headers(input)) {
      headers.set(key, value);
    }
  }
  return headers;
}
async function callHooks(context, hooks) {
  if (hooks) {
    if (Array.isArray(hooks)) {
      for (const hook of hooks) {
        await hook(context);
      }
    } else {
      await hooks(context);
    }
  }
}

const retryStatusCodes = /* @__PURE__ */ new Set([
  408,
  // Request Timeout
  409,
  // Conflict
  425,
  // Too Early (Experimental)
  429,
  // Too Many Requests
  500,
  // Internal Server Error
  502,
  // Bad Gateway
  503,
  // Service Unavailable
  504
  // Gateway Timeout
]);
const nullBodyResponses = /* @__PURE__ */ new Set([101, 204, 205, 304]);
function createFetch(globalOptions = {}) {
  const {
    fetch = globalThis.fetch,
    Headers = globalThis.Headers,
    AbortController = globalThis.AbortController
  } = globalOptions;
  async function onError(context) {
    const isAbort = context.error && context.error.name === "AbortError" && !context.options.timeout || false;
    if (context.options.retry !== false && !isAbort) {
      let retries;
      if (typeof context.options.retry === "number") {
        retries = context.options.retry;
      } else {
        retries = isPayloadMethod(context.options.method) ? 0 : 1;
      }
      const responseCode = context.response && context.response.status || 500;
      if (retries > 0 && (Array.isArray(context.options.retryStatusCodes) ? context.options.retryStatusCodes.includes(responseCode) : retryStatusCodes.has(responseCode))) {
        const retryDelay = typeof context.options.retryDelay === "function" ? context.options.retryDelay(context) : context.options.retryDelay || 0;
        if (retryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
        return $fetchRaw(context.request, {
          ...context.options,
          retry: retries - 1
        });
      }
    }
    const error = createFetchError(context);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(error, $fetchRaw);
    }
    throw error;
  }
  const $fetchRaw = async function $fetchRaw2(_request, _options = {}) {
    const context = {
      request: _request,
      options: resolveFetchOptions(
        _request,
        _options,
        globalOptions.defaults,
        Headers
      ),
      response: void 0,
      error: void 0
    };
    if (context.options.method) {
      context.options.method = context.options.method.toUpperCase();
    }
    if (context.options.onRequest) {
      await callHooks(context, context.options.onRequest);
      if (!(context.options.headers instanceof Headers)) {
        context.options.headers = new Headers(
          context.options.headers || {}
          /* compat */
        );
      }
    }
    if (typeof context.request === "string") {
      if (context.options.baseURL) {
        context.request = withBase(context.request, context.options.baseURL);
      }
      if (context.options.query) {
        context.request = withQuery(context.request, context.options.query);
        delete context.options.query;
      }
      if ("query" in context.options) {
        delete context.options.query;
      }
      if ("params" in context.options) {
        delete context.options.params;
      }
    }
    if (context.options.body && isPayloadMethod(context.options.method)) {
      if (isJSONSerializable(context.options.body)) {
        const contentType = context.options.headers.get("content-type");
        if (typeof context.options.body !== "string") {
          context.options.body = contentType === "application/x-www-form-urlencoded" ? new URLSearchParams(
            context.options.body
          ).toString() : JSON.stringify(context.options.body);
        }
        if (!contentType) {
          context.options.headers.set("content-type", "application/json");
        }
        if (!context.options.headers.has("accept")) {
          context.options.headers.set("accept", "application/json");
        }
      } else if (
        // ReadableStream Body
        "pipeTo" in context.options.body && typeof context.options.body.pipeTo === "function" || // Node.js Stream Body
        typeof context.options.body.pipe === "function"
      ) {
        if (!("duplex" in context.options)) {
          context.options.duplex = "half";
        }
      }
    }
    let abortTimeout;
    if (!context.options.signal && context.options.timeout) {
      const controller = new AbortController();
      abortTimeout = setTimeout(() => {
        const error = new Error(
          "[TimeoutError]: The operation was aborted due to timeout"
        );
        error.name = "TimeoutError";
        error.code = 23;
        controller.abort(error);
      }, context.options.timeout);
      context.options.signal = controller.signal;
    }
    try {
      context.response = await fetch(
        context.request,
        context.options
      );
    } catch (error) {
      context.error = error;
      if (context.options.onRequestError) {
        await callHooks(
          context,
          context.options.onRequestError
        );
      }
      return await onError(context);
    } finally {
      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }
    }
    const hasBody = (context.response.body || // https://github.com/unjs/ofetch/issues/324
    // https://github.com/unjs/ofetch/issues/294
    // https://github.com/JakeChampion/fetch/issues/1454
    context.response._bodyInit) && !nullBodyResponses.has(context.response.status) && context.options.method !== "HEAD";
    if (hasBody) {
      const responseType = (context.options.parseResponse ? "json" : context.options.responseType) || detectResponseType(context.response.headers.get("content-type") || "");
      switch (responseType) {
        case "json": {
          const data = await context.response.text();
          const parseFunction = context.options.parseResponse || destr;
          context.response._data = parseFunction(data);
          break;
        }
        case "stream": {
          context.response._data = context.response.body || context.response._bodyInit;
          break;
        }
        default: {
          context.response._data = await context.response[responseType]();
        }
      }
    }
    if (context.options.onResponse) {
      await callHooks(
        context,
        context.options.onResponse
      );
    }
    if (!context.options.ignoreResponseError && context.response.status >= 400 && context.response.status < 600) {
      if (context.options.onResponseError) {
        await callHooks(
          context,
          context.options.onResponseError
        );
      }
      return await onError(context);
    }
    return context.response;
  };
  const $fetch = async function $fetch2(request, options) {
    const r = await $fetchRaw(request, options);
    return r._data;
  };
  $fetch.raw = $fetchRaw;
  $fetch.native = (...args) => fetch(...args);
  $fetch.create = (defaultOptions = {}, customGlobalOptions = {}) => createFetch({
    ...globalOptions,
    ...customGlobalOptions,
    defaults: {
      ...globalOptions.defaults,
      ...customGlobalOptions.defaults,
      ...defaultOptions
    }
  });
  return $fetch;
}

const _globalThis = (function() {
  if (typeof globalThis !== "undefined") {
    return globalThis;
  }
  if (typeof self !== "undefined") {
    return self;
  }
  if (typeof global !== "undefined") {
    return global;
  }
  throw new Error("unable to locate global object");
})();
const fetch = _globalThis.fetch ? (...args) => _globalThis.fetch(...args) : () => Promise.reject(new Error("[ofetch] global.fetch is not supported!"));
const Headers$1 = _globalThis.Headers;
const AbortController = _globalThis.AbortController;
createFetch({ fetch, Headers: Headers$1, AbortController });

function wrapToPromise(value) {
  if (!value || typeof value.then !== "function") {
    return Promise.resolve(value);
  }
  return value;
}
function asyncCall(function_, ...arguments_) {
  try {
    return wrapToPromise(function_(...arguments_));
  } catch (error) {
    return Promise.reject(error);
  }
}
function isPrimitive(value) {
  const type = typeof value;
  return value === null || type !== "object" && type !== "function";
}
function isPureObject(value) {
  const proto = Object.getPrototypeOf(value);
  return !proto || proto.isPrototypeOf(Object);
}
function stringify(value) {
  if (isPrimitive(value)) {
    return String(value);
  }
  if (isPureObject(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value.toJSON === "function") {
    return stringify(value.toJSON());
  }
  throw new Error("[unstorage] Cannot stringify value!");
}
const BASE64_PREFIX = "base64:";
function serializeRaw(value) {
  if (typeof value === "string") {
    return value;
  }
  return BASE64_PREFIX + base64Encode(value);
}
function deserializeRaw(value) {
  if (typeof value !== "string") {
    return value;
  }
  if (!value.startsWith(BASE64_PREFIX)) {
    return value;
  }
  return base64Decode(value.slice(BASE64_PREFIX.length));
}
function base64Decode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input, "base64");
  }
  return Uint8Array.from(
    globalThis.atob(input),
    (c) => c.codePointAt(0)
  );
}
function base64Encode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input).toString("base64");
  }
  return globalThis.btoa(String.fromCodePoint(...input));
}

const storageKeyProperties = [
  "has",
  "hasItem",
  "get",
  "getItem",
  "getItemRaw",
  "set",
  "setItem",
  "setItemRaw",
  "del",
  "remove",
  "removeItem",
  "getMeta",
  "setMeta",
  "removeMeta",
  "getKeys",
  "clear",
  "mount",
  "unmount"
];
function prefixStorage(storage, base) {
  base = normalizeBaseKey(base);
  if (!base) {
    return storage;
  }
  const nsStorage = { ...storage };
  for (const property of storageKeyProperties) {
    nsStorage[property] = (key = "", ...args) => (
      // @ts-ignore
      storage[property](base + key, ...args)
    );
  }
  nsStorage.getKeys = (key = "", ...arguments_) => storage.getKeys(base + key, ...arguments_).then((keys) => keys.map((key2) => key2.slice(base.length)));
  nsStorage.keys = nsStorage.getKeys;
  nsStorage.getItems = async (items, commonOptions) => {
    const prefixedItems = items.map(
      (item) => typeof item === "string" ? base + item : { ...item, key: base + item.key }
    );
    const results = await storage.getItems(prefixedItems, commonOptions);
    return results.map((entry) => ({
      key: entry.key.slice(base.length),
      value: entry.value
    }));
  };
  nsStorage.setItems = async (items, commonOptions) => {
    const prefixedItems = items.map((item) => ({
      key: base + item.key,
      value: item.value,
      options: item.options
    }));
    return storage.setItems(prefixedItems, commonOptions);
  };
  return nsStorage;
}
function normalizeKey$1(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
}
function joinKeys(...keys) {
  return normalizeKey$1(keys.join(":"));
}
function normalizeBaseKey(base) {
  base = normalizeKey$1(base);
  return base ? base + ":" : "";
}
function filterKeyByDepth(key, depth) {
  if (depth === void 0) {
    return true;
  }
  let substrCount = 0;
  let index = key.indexOf(":");
  while (index > -1) {
    substrCount++;
    index = key.indexOf(":", index + 1);
  }
  return substrCount <= depth;
}
function filterKeyByBase(key, base) {
  if (base) {
    return key.startsWith(base) && key[key.length - 1] !== "$";
  }
  return key[key.length - 1] !== "$";
}

function defineDriver$1(factory) {
  return factory;
}

const DRIVER_NAME$1 = "memory";
const memory = defineDriver$1(() => {
  const data = /* @__PURE__ */ new Map();
  return {
    name: DRIVER_NAME$1,
    getInstance: () => data,
    hasItem(key) {
      return data.has(key);
    },
    getItem(key) {
      return data.get(key) ?? null;
    },
    getItemRaw(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    setItemRaw(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
    getKeys() {
      return [...data.keys()];
    },
    clear() {
      data.clear();
    },
    dispose() {
      data.clear();
    }
  };
});

function createStorage(options = {}) {
  const context = {
    mounts: { "": options.driver || memory() },
    mountpoints: [""],
    watching: false,
    watchListeners: [],
    unwatch: {}
  };
  const getMount = (key) => {
    for (const base of context.mountpoints) {
      if (key.startsWith(base)) {
        return {
          base,
          relativeKey: key.slice(base.length),
          driver: context.mounts[base]
        };
      }
    }
    return {
      base: "",
      relativeKey: key,
      driver: context.mounts[""]
    };
  };
  const getMounts = (base, includeParent) => {
    return context.mountpoints.filter(
      (mountpoint) => mountpoint.startsWith(base) || includeParent && base.startsWith(mountpoint)
    ).map((mountpoint) => ({
      relativeBase: base.length > mountpoint.length ? base.slice(mountpoint.length) : void 0,
      mountpoint,
      driver: context.mounts[mountpoint]
    }));
  };
  const onChange = (event, key) => {
    if (!context.watching) {
      return;
    }
    key = normalizeKey$1(key);
    for (const listener of context.watchListeners) {
      listener(event, key);
    }
  };
  const startWatch = async () => {
    if (context.watching) {
      return;
    }
    context.watching = true;
    for (const mountpoint in context.mounts) {
      context.unwatch[mountpoint] = await watch(
        context.mounts[mountpoint],
        onChange,
        mountpoint
      );
    }
  };
  const stopWatch = async () => {
    if (!context.watching) {
      return;
    }
    for (const mountpoint in context.unwatch) {
      await context.unwatch[mountpoint]();
    }
    context.unwatch = {};
    context.watching = false;
  };
  const runBatch = (items, commonOptions, cb) => {
    const batches = /* @__PURE__ */ new Map();
    const getBatch = (mount) => {
      let batch = batches.get(mount.base);
      if (!batch) {
        batch = {
          driver: mount.driver,
          base: mount.base,
          items: []
        };
        batches.set(mount.base, batch);
      }
      return batch;
    };
    for (const item of items) {
      const isStringItem = typeof item === "string";
      const key = normalizeKey$1(isStringItem ? item : item.key);
      const value = isStringItem ? void 0 : item.value;
      const options2 = isStringItem || !item.options ? commonOptions : { ...commonOptions, ...item.options };
      const mount = getMount(key);
      getBatch(mount).items.push({
        key,
        value,
        relativeKey: mount.relativeKey,
        options: options2
      });
    }
    return Promise.all([...batches.values()].map((batch) => cb(batch))).then(
      (r) => r.flat()
    );
  };
  const storage = {
    // Item
    hasItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.hasItem, relativeKey, opts);
    },
    getItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => destr(value)
      );
    },
    getItems(items, commonOptions = {}) {
      return runBatch(items, commonOptions, (batch) => {
        if (batch.driver.getItems) {
          return asyncCall(
            batch.driver.getItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              options: item.options
            })),
            commonOptions
          ).then(
            (r) => r.map((item) => ({
              key: joinKeys(batch.base, item.key),
              value: destr(item.value)
            }))
          );
        }
        return Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.getItem,
              item.relativeKey,
              item.options
            ).then((value) => ({
              key: item.key,
              value: destr(value)
            }));
          })
        );
      });
    },
    getItemRaw(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.getItemRaw) {
        return asyncCall(driver.getItemRaw, relativeKey, opts);
      }
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => deserializeRaw(value)
      );
    },
    async setItem(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.setItem) {
        return;
      }
      await asyncCall(driver.setItem, relativeKey, stringify(value), opts);
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async setItems(items, commonOptions) {
      await runBatch(items, commonOptions, async (batch) => {
        if (batch.driver.setItems) {
          return asyncCall(
            batch.driver.setItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              value: stringify(item.value),
              options: item.options
            })),
            commonOptions
          );
        }
        if (!batch.driver.setItem) {
          return;
        }
        await Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.setItem,
              item.relativeKey,
              stringify(item.value),
              item.options
            );
          })
        );
      });
    },
    async setItemRaw(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key, opts);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.setItemRaw) {
        await asyncCall(driver.setItemRaw, relativeKey, value, opts);
      } else if (driver.setItem) {
        await asyncCall(driver.setItem, relativeKey, serializeRaw(value), opts);
      } else {
        return;
      }
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async removeItem(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { removeMeta: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.removeItem) {
        return;
      }
      await asyncCall(driver.removeItem, relativeKey, opts);
      if (opts.removeMeta || opts.removeMata) {
        await asyncCall(driver.removeItem, relativeKey + "$", opts);
      }
      if (!driver.watch) {
        onChange("remove", key);
      }
    },
    // Meta
    async getMeta(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { nativeOnly: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      const meta = /* @__PURE__ */ Object.create(null);
      if (driver.getMeta) {
        Object.assign(meta, await asyncCall(driver.getMeta, relativeKey, opts));
      }
      if (!opts.nativeOnly) {
        const value = await asyncCall(
          driver.getItem,
          relativeKey + "$",
          opts
        ).then((value_) => destr(value_));
        if (value && typeof value === "object") {
          if (typeof value.atime === "string") {
            value.atime = new Date(value.atime);
          }
          if (typeof value.mtime === "string") {
            value.mtime = new Date(value.mtime);
          }
          Object.assign(meta, value);
        }
      }
      return meta;
    },
    setMeta(key, value, opts = {}) {
      return this.setItem(key + "$", value, opts);
    },
    removeMeta(key, opts = {}) {
      return this.removeItem(key + "$", opts);
    },
    // Keys
    async getKeys(base, opts = {}) {
      base = normalizeBaseKey(base);
      const mounts = getMounts(base, true);
      let maskedMounts = [];
      const allKeys = [];
      let allMountsSupportMaxDepth = true;
      for (const mount of mounts) {
        if (!mount.driver.flags?.maxDepth) {
          allMountsSupportMaxDepth = false;
        }
        const rawKeys = await asyncCall(
          mount.driver.getKeys,
          mount.relativeBase,
          opts
        );
        for (const key of rawKeys) {
          const fullKey = mount.mountpoint + normalizeKey$1(key);
          if (!maskedMounts.some((p) => fullKey.startsWith(p))) {
            allKeys.push(fullKey);
          }
        }
        maskedMounts = [
          mount.mountpoint,
          ...maskedMounts.filter((p) => !p.startsWith(mount.mountpoint))
        ];
      }
      const shouldFilterByDepth = opts.maxDepth !== void 0 && !allMountsSupportMaxDepth;
      return allKeys.filter(
        (key) => (!shouldFilterByDepth || filterKeyByDepth(key, opts.maxDepth)) && filterKeyByBase(key, base)
      );
    },
    // Utils
    async clear(base, opts = {}) {
      base = normalizeBaseKey(base);
      await Promise.all(
        getMounts(base, false).map(async (m) => {
          if (m.driver.clear) {
            return asyncCall(m.driver.clear, m.relativeBase, opts);
          }
          if (m.driver.removeItem) {
            const keys = await m.driver.getKeys(m.relativeBase || "", opts);
            return Promise.all(
              keys.map((key) => m.driver.removeItem(key, opts))
            );
          }
        })
      );
    },
    async dispose() {
      await Promise.all(
        Object.values(context.mounts).map((driver) => dispose(driver))
      );
    },
    async watch(callback) {
      await startWatch();
      context.watchListeners.push(callback);
      return async () => {
        context.watchListeners = context.watchListeners.filter(
          (listener) => listener !== callback
        );
        if (context.watchListeners.length === 0) {
          await stopWatch();
        }
      };
    },
    async unwatch() {
      context.watchListeners = [];
      await stopWatch();
    },
    // Mount
    mount(base, driver) {
      base = normalizeBaseKey(base);
      if (base && context.mounts[base]) {
        throw new Error(`already mounted at ${base}`);
      }
      if (base) {
        context.mountpoints.push(base);
        context.mountpoints.sort((a, b) => b.length - a.length);
      }
      context.mounts[base] = driver;
      if (context.watching) {
        Promise.resolve(watch(driver, onChange, base)).then((unwatcher) => {
          context.unwatch[base] = unwatcher;
        }).catch(console.error);
      }
      return storage;
    },
    async unmount(base, _dispose = true) {
      base = normalizeBaseKey(base);
      if (!base || !context.mounts[base]) {
        return;
      }
      if (context.watching && base in context.unwatch) {
        context.unwatch[base]?.();
        delete context.unwatch[base];
      }
      if (_dispose) {
        await dispose(context.mounts[base]);
      }
      context.mountpoints = context.mountpoints.filter((key) => key !== base);
      delete context.mounts[base];
    },
    getMount(key = "") {
      key = normalizeKey$1(key) + ":";
      const m = getMount(key);
      return {
        driver: m.driver,
        base: m.base
      };
    },
    getMounts(base = "", opts = {}) {
      base = normalizeKey$1(base);
      const mounts = getMounts(base, opts.parents);
      return mounts.map((m) => ({
        driver: m.driver,
        base: m.mountpoint
      }));
    },
    // Aliases
    keys: (base, opts = {}) => storage.getKeys(base, opts),
    get: (key, opts = {}) => storage.getItem(key, opts),
    set: (key, value, opts = {}) => storage.setItem(key, value, opts),
    has: (key, opts = {}) => storage.hasItem(key, opts),
    del: (key, opts = {}) => storage.removeItem(key, opts),
    remove: (key, opts = {}) => storage.removeItem(key, opts)
  };
  return storage;
}
function watch(driver, onChange, base) {
  return driver.watch ? driver.watch((event, key) => onChange(event, base + key)) : () => {
  };
}
async function dispose(driver) {
  if (typeof driver.dispose === "function") {
    await asyncCall(driver.dispose);
  }
}

const _assets = {

};

const normalizeKey = function normalizeKey(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
};

const assets$1 = {
  getKeys() {
    return Promise.resolve(Object.keys(_assets))
  },
  hasItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(id in _assets)
  },
  getItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].import() : null)
  },
  getMeta (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].meta : {})
  }
};

function defineDriver(factory) {
  return factory;
}
function createError(driver, message, opts) {
  const err = new Error(`[unstorage] [${driver}] ${message}`, opts);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(err, createError);
  }
  return err;
}
function createRequiredError(driver, name) {
  if (Array.isArray(name)) {
    return createError(
      driver,
      `Missing some of the required options ${name.map((n) => "`" + n + "`").join(", ")}`
    );
  }
  return createError(driver, `Missing required option \`${name}\`.`);
}

function ignoreNotfound(err) {
  return err.code === "ENOENT" || err.code === "EISDIR" ? null : err;
}
function ignoreExists(err) {
  return err.code === "EEXIST" ? null : err;
}
async function writeFile(path, data, encoding) {
  await ensuredir(dirname$1(path));
  return promises.writeFile(path, data, encoding);
}
function readFile(path, encoding) {
  return promises.readFile(path, encoding).catch(ignoreNotfound);
}
function unlink(path) {
  return promises.unlink(path).catch(ignoreNotfound);
}
function readdir(dir) {
  return promises.readdir(dir, { withFileTypes: true }).catch(ignoreNotfound).then((r) => r || []);
}
async function ensuredir(dir) {
  if (existsSync(dir)) {
    return;
  }
  await ensuredir(dirname$1(dir)).catch(ignoreExists);
  await promises.mkdir(dir).catch(ignoreExists);
}
async function readdirRecursive(dir, ignore, maxDepth) {
  if (ignore && ignore(dir)) {
    return [];
  }
  const entries = await readdir(dir);
  const files = [];
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        if (maxDepth === void 0 || maxDepth > 0) {
          const dirFiles = await readdirRecursive(
            entryPath,
            ignore,
            maxDepth === void 0 ? void 0 : maxDepth - 1
          );
          files.push(...dirFiles.map((f) => entry.name + "/" + f));
        }
      } else {
        if (!(ignore && ignore(entry.name))) {
          files.push(entry.name);
        }
      }
    })
  );
  return files;
}
async function rmRecursive(dir) {
  const entries = await readdir(dir);
  await Promise.all(
    entries.map((entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        return rmRecursive(entryPath).then(() => promises.rmdir(entryPath));
      } else {
        return promises.unlink(entryPath);
      }
    })
  );
}

const PATH_TRAVERSE_RE = /\.\.:|\.\.$/;
const DRIVER_NAME = "fs-lite";
const unstorage_47drivers_47fs_45lite = defineDriver((opts = {}) => {
  if (!opts.base) {
    throw createRequiredError(DRIVER_NAME, "base");
  }
  opts.base = resolve$1(opts.base);
  const r = (key) => {
    if (PATH_TRAVERSE_RE.test(key)) {
      throw createError(
        DRIVER_NAME,
        `Invalid key: ${JSON.stringify(key)}. It should not contain .. segments`
      );
    }
    const resolved = join(opts.base, key.replace(/:/g, "/"));
    return resolved;
  };
  return {
    name: DRIVER_NAME,
    options: opts,
    flags: {
      maxDepth: true
    },
    hasItem(key) {
      return existsSync(r(key));
    },
    getItem(key) {
      return readFile(r(key), "utf8");
    },
    getItemRaw(key) {
      return readFile(r(key));
    },
    async getMeta(key) {
      const { atime, mtime, size, birthtime, ctime } = await promises.stat(r(key)).catch(() => ({}));
      return { atime, mtime, size, birthtime, ctime };
    },
    setItem(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value, "utf8");
    },
    setItemRaw(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value);
    },
    removeItem(key) {
      if (opts.readOnly) {
        return;
      }
      return unlink(r(key));
    },
    getKeys(_base, topts) {
      return readdirRecursive(r("."), opts.ignore, topts?.maxDepth);
    },
    async clear() {
      if (opts.readOnly || opts.noClear) {
        return;
      }
      await rmRecursive(r("."));
    }
  };
});

const storage = createStorage({});

storage.mount('/assets', assets$1);

storage.mount('data', unstorage_47drivers_47fs_45lite({"driver":"fsLite","base":"./.data/kv"}));

function useStorage(base = "") {
  return base ? prefixStorage(storage, base) : storage;
}

const e=globalThis.process?.getBuiltinModule?.("crypto")?.hash,r="sha256",s="base64url";function digest(t){if(e)return e(r,t,s);const o=createHash(r).update(t);return globalThis.process?.versions?.webcontainer?o.digest().toString(s):o.digest(s)}

const Hasher = /* @__PURE__ */ (() => {
  class Hasher2 {
    buff = "";
    #context = /* @__PURE__ */ new Map();
    write(str) {
      this.buff += str;
    }
    dispatch(value) {
      const type = value === null ? "null" : typeof value;
      return this[type](value);
    }
    object(object) {
      if (object && typeof object.toJSON === "function") {
        return this.object(object.toJSON());
      }
      const objString = Object.prototype.toString.call(object);
      let objType = "";
      const objectLength = objString.length;
      objType = objectLength < 10 ? "unknown:[" + objString + "]" : objString.slice(8, objectLength - 1);
      objType = objType.toLowerCase();
      let objectNumber = null;
      if ((objectNumber = this.#context.get(object)) === void 0) {
        this.#context.set(object, this.#context.size);
      } else {
        return this.dispatch("[CIRCULAR:" + objectNumber + "]");
      }
      if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(object)) {
        this.write("buffer:");
        return this.write(object.toString("utf8"));
      }
      if (objType !== "object" && objType !== "function" && objType !== "asyncfunction") {
        if (this[objType]) {
          this[objType](object);
        } else {
          this.unknown(object, objType);
        }
      } else {
        const keys = Object.keys(object).sort();
        const extraKeys = [];
        this.write("object:" + (keys.length + extraKeys.length) + ":");
        const dispatchForKey = (key) => {
          this.dispatch(key);
          this.write(":");
          this.dispatch(object[key]);
          this.write(",");
        };
        for (const key of keys) {
          dispatchForKey(key);
        }
        for (const key of extraKeys) {
          dispatchForKey(key);
        }
      }
    }
    array(arr, unordered) {
      unordered = unordered === void 0 ? false : unordered;
      this.write("array:" + arr.length + ":");
      if (!unordered || arr.length <= 1) {
        for (const entry of arr) {
          this.dispatch(entry);
        }
        return;
      }
      const contextAdditions = /* @__PURE__ */ new Map();
      const entries = arr.map((entry) => {
        const hasher = new Hasher2();
        hasher.dispatch(entry);
        for (const [key, value] of hasher.#context) {
          contextAdditions.set(key, value);
        }
        return hasher.toString();
      });
      this.#context = contextAdditions;
      entries.sort();
      return this.array(entries, false);
    }
    date(date) {
      return this.write("date:" + date.toJSON());
    }
    symbol(sym) {
      return this.write("symbol:" + sym.toString());
    }
    unknown(value, type) {
      this.write(type);
      if (!value) {
        return;
      }
      this.write(":");
      if (value && typeof value.entries === "function") {
        return this.array(
          [...value.entries()],
          true
          /* ordered */
        );
      }
    }
    error(err) {
      return this.write("error:" + err.toString());
    }
    boolean(bool) {
      return this.write("bool:" + bool);
    }
    string(string) {
      this.write("string:" + string.length + ":");
      this.write(string);
    }
    function(fn) {
      this.write("fn:");
      if (isNativeFunction(fn)) {
        this.dispatch("[native]");
      } else {
        this.dispatch(fn.toString());
      }
    }
    number(number) {
      return this.write("number:" + number);
    }
    null() {
      return this.write("Null");
    }
    undefined() {
      return this.write("Undefined");
    }
    regexp(regex) {
      return this.write("regex:" + regex.toString());
    }
    arraybuffer(arr) {
      this.write("arraybuffer:");
      return this.dispatch(new Uint8Array(arr));
    }
    url(url) {
      return this.write("url:" + url.toString());
    }
    map(map) {
      this.write("map:");
      const arr = [...map];
      return this.array(arr, false);
    }
    set(set) {
      this.write("set:");
      const arr = [...set];
      return this.array(arr, false);
    }
    bigint(number) {
      return this.write("bigint:" + number.toString());
    }
  }
  for (const type of [
    "uint8array",
    "uint8clampedarray",
    "unt8array",
    "uint16array",
    "unt16array",
    "uint32array",
    "unt32array",
    "float32array",
    "float64array"
  ]) {
    Hasher2.prototype[type] = function(arr) {
      this.write(type + ":");
      return this.array([...arr], false);
    };
  }
  function isNativeFunction(f) {
    if (typeof f !== "function") {
      return false;
    }
    return Function.prototype.toString.call(f).slice(
      -15
      /* "[native code] }".length */
    ) === "[native code] }";
  }
  return Hasher2;
})();
function serialize(object) {
  const hasher = new Hasher();
  hasher.dispatch(object);
  return hasher.buff;
}
function hash(value) {
  return digest(typeof value === "string" ? value : serialize(value)).replace(/[-_]/g, "").slice(0, 10);
}

function defaultCacheOptions() {
  return {
    name: "_",
    base: "/cache",
    swr: true,
    maxAge: 1
  };
}
function defineCachedFunction(fn, opts = {}) {
  opts = { ...defaultCacheOptions(), ...opts };
  const pending = {};
  const group = opts.group || "nitro/functions";
  const name = opts.name || fn.name || "_";
  const integrity = opts.integrity || hash([fn, opts]);
  const validate = opts.validate || ((entry) => entry.value !== void 0);
  async function get(key, resolver, shouldInvalidateCache, event) {
    const cacheKey = [opts.base, group, name, key + ".json"].filter(Boolean).join(":").replace(/:\/$/, ":index");
    let entry = await useStorage().getItem(cacheKey).catch((error) => {
      console.error(`[cache] Cache read error.`, error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }) || {};
    if (typeof entry !== "object") {
      entry = {};
      const error = new Error("Malformed data read from cache.");
      console.error("[cache]", error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }
    const ttl = (opts.maxAge ?? 0) * 1e3;
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    const expired = shouldInvalidateCache || entry.integrity !== integrity || ttl && Date.now() - (entry.mtime || 0) > ttl || validate(entry) === false;
    const _resolve = async () => {
      const isPending = pending[key];
      if (!isPending) {
        if (entry.value !== void 0 && (opts.staleMaxAge || 0) >= 0 && opts.swr === false) {
          entry.value = void 0;
          entry.integrity = void 0;
          entry.mtime = void 0;
          entry.expires = void 0;
        }
        pending[key] = Promise.resolve(resolver());
      }
      try {
        entry.value = await pending[key];
      } catch (error) {
        if (!isPending) {
          delete pending[key];
        }
        throw error;
      }
      if (!isPending) {
        entry.mtime = Date.now();
        entry.integrity = integrity;
        delete pending[key];
        if (validate(entry) !== false) {
          let setOpts;
          if (opts.maxAge && !opts.swr) {
            setOpts = { ttl: opts.maxAge };
          }
          const promise = useStorage().setItem(cacheKey, entry, setOpts).catch((error) => {
            console.error(`[cache] Cache write error.`, error);
            useNitroApp().captureError(error, { event, tags: ["cache"] });
          });
          if (event?.waitUntil) {
            event.waitUntil(promise);
          }
        }
      }
    };
    const _resolvePromise = expired ? _resolve() : Promise.resolve();
    if (entry.value === void 0) {
      await _resolvePromise;
    } else if (expired && event && event.waitUntil) {
      event.waitUntil(_resolvePromise);
    }
    if (opts.swr && validate(entry) !== false) {
      _resolvePromise.catch((error) => {
        console.error(`[cache] SWR handler error.`, error);
        useNitroApp().captureError(error, { event, tags: ["cache"] });
      });
      return entry;
    }
    return _resolvePromise.then(() => entry);
  }
  return async (...args) => {
    const shouldBypassCache = await opts.shouldBypassCache?.(...args);
    if (shouldBypassCache) {
      return fn(...args);
    }
    const key = await (opts.getKey || getKey)(...args);
    const shouldInvalidateCache = await opts.shouldInvalidateCache?.(...args);
    const entry = await get(
      key,
      () => fn(...args),
      shouldInvalidateCache,
      args[0] && isEvent(args[0]) ? args[0] : void 0
    );
    let value = entry.value;
    if (opts.transform) {
      value = await opts.transform(entry, ...args) || value;
    }
    return value;
  };
}
function cachedFunction(fn, opts = {}) {
  return defineCachedFunction(fn, opts);
}
function getKey(...args) {
  return args.length > 0 ? hash(args) : "";
}
function escapeKey(key) {
  return String(key).replace(/\W/g, "");
}
function defineCachedEventHandler(handler, opts = defaultCacheOptions()) {
  const variableHeaderNames = (opts.varies || []).filter(Boolean).map((h) => h.toLowerCase()).sort();
  const _opts = {
    ...opts,
    getKey: async (event) => {
      const customKey = await opts.getKey?.(event);
      if (customKey) {
        return escapeKey(customKey);
      }
      const _path = event.node.req.originalUrl || event.node.req.url || event.path;
      let _pathname;
      try {
        _pathname = escapeKey(decodeURI(parseURL(_path).pathname)).slice(0, 16) || "index";
      } catch {
        _pathname = "-";
      }
      const _hashedPath = `${_pathname}.${hash(_path)}`;
      const _headers = variableHeaderNames.map((header) => [header, event.node.req.headers[header]]).map(([name, value]) => `${escapeKey(name)}.${hash(value)}`);
      return [_hashedPath, ..._headers].join(":");
    },
    validate: (entry) => {
      if (!entry.value) {
        return false;
      }
      if (entry.value.code >= 400) {
        return false;
      }
      if (entry.value.body === void 0) {
        return false;
      }
      if (entry.value.headers.etag === "undefined" || entry.value.headers["last-modified"] === "undefined") {
        return false;
      }
      return true;
    },
    group: opts.group || "nitro/handlers",
    integrity: opts.integrity || hash([handler, opts])
  };
  const _cachedHandler = cachedFunction(
    async (incomingEvent) => {
      const variableHeaders = {};
      for (const header of variableHeaderNames) {
        const value = incomingEvent.node.req.headers[header];
        if (value !== void 0) {
          variableHeaders[header] = value;
        }
      }
      const reqProxy = cloneWithProxy(incomingEvent.node.req, {
        headers: variableHeaders
      });
      const resHeaders = {};
      let _resSendBody;
      const resProxy = cloneWithProxy(incomingEvent.node.res, {
        statusCode: 200,
        writableEnded: false,
        writableFinished: false,
        headersSent: false,
        closed: false,
        getHeader(name) {
          return resHeaders[name];
        },
        setHeader(name, value) {
          resHeaders[name] = value;
          return this;
        },
        getHeaderNames() {
          return Object.keys(resHeaders);
        },
        hasHeader(name) {
          return name in resHeaders;
        },
        removeHeader(name) {
          delete resHeaders[name];
        },
        getHeaders() {
          return resHeaders;
        },
        end(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        write(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2(void 0);
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return true;
        },
        writeHead(statusCode, headers2) {
          this.statusCode = statusCode;
          if (headers2) {
            if (Array.isArray(headers2) || typeof headers2 === "string") {
              throw new TypeError("Raw headers  is not supported.");
            }
            for (const header in headers2) {
              const value = headers2[header];
              if (value !== void 0) {
                this.setHeader(
                  header,
                  value
                );
              }
            }
          }
          return this;
        }
      });
      const event = createEvent(reqProxy, resProxy);
      event.fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: useNitroApp().localFetch
      });
      event.$fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: globalThis.$fetch
      });
      event.waitUntil = incomingEvent.waitUntil;
      event.context = incomingEvent.context;
      event.context.cache = {
        options: _opts
      };
      const body = await handler(event) || _resSendBody;
      const headers = event.node.res.getHeaders();
      headers.etag = String(
        headers.Etag || headers.etag || `W/"${hash(body)}"`
      );
      headers["last-modified"] = String(
        headers["Last-Modified"] || headers["last-modified"] || (/* @__PURE__ */ new Date()).toUTCString()
      );
      const cacheControl = [];
      if (opts.swr) {
        if (opts.maxAge) {
          cacheControl.push(`s-maxage=${opts.maxAge}`);
        }
        if (opts.staleMaxAge) {
          cacheControl.push(`stale-while-revalidate=${opts.staleMaxAge}`);
        } else {
          cacheControl.push("stale-while-revalidate");
        }
      } else if (opts.maxAge) {
        cacheControl.push(`max-age=${opts.maxAge}`);
      }
      if (cacheControl.length > 0) {
        headers["cache-control"] = cacheControl.join(", ");
      }
      const cacheEntry = {
        code: event.node.res.statusCode,
        headers,
        body
      };
      return cacheEntry;
    },
    _opts
  );
  return defineEventHandler(async (event) => {
    if (opts.headersOnly) {
      if (handleCacheHeaders(event, { maxAge: opts.maxAge })) {
        return;
      }
      return handler(event);
    }
    const response = await _cachedHandler(
      event
    );
    if (event.node.res.headersSent || event.node.res.writableEnded) {
      return response.body;
    }
    if (handleCacheHeaders(event, {
      modifiedTime: new Date(response.headers["last-modified"]),
      etag: response.headers.etag,
      maxAge: opts.maxAge
    })) {
      return;
    }
    event.node.res.statusCode = response.code;
    for (const name in response.headers) {
      const value = response.headers[name];
      if (name === "set-cookie") {
        event.node.res.appendHeader(
          name,
          splitCookiesString(value)
        );
      } else {
        if (value !== void 0) {
          event.node.res.setHeader(name, value);
        }
      }
    }
    return response.body;
  });
}
function cloneWithProxy(obj, overrides) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      if (property in overrides) {
        return overrides[property];
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      if (property in overrides) {
        overrides[property] = value;
        return true;
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}
const cachedEventHandler = defineCachedEventHandler;

function klona(x) {
	if (typeof x !== 'object') return x;

	var k, tmp, str=Object.prototype.toString.call(x);

	if (str === '[object Object]') {
		if (x.constructor !== Object && typeof x.constructor === 'function') {
			tmp = new x.constructor();
			for (k in x) {
				if (x.hasOwnProperty(k) && tmp[k] !== x[k]) {
					tmp[k] = klona(x[k]);
				}
			}
		} else {
			tmp = {}; // null
			for (k in x) {
				if (k === '__proto__') {
					Object.defineProperty(tmp, k, {
						value: klona(x[k]),
						configurable: true,
						enumerable: true,
						writable: true,
					});
				} else {
					tmp[k] = klona(x[k]);
				}
			}
		}
		return tmp;
	}

	if (str === '[object Array]') {
		k = x.length;
		for (tmp=Array(k); k--;) {
			tmp[k] = klona(x[k]);
		}
		return tmp;
	}

	if (str === '[object Set]') {
		tmp = new Set;
		x.forEach(function (val) {
			tmp.add(klona(val));
		});
		return tmp;
	}

	if (str === '[object Map]') {
		tmp = new Map;
		x.forEach(function (val, key) {
			tmp.set(klona(key), klona(val));
		});
		return tmp;
	}

	if (str === '[object Date]') {
		return new Date(+x);
	}

	if (str === '[object RegExp]') {
		tmp = new RegExp(x.source, x.flags);
		tmp.lastIndex = x.lastIndex;
		return tmp;
	}

	if (str === '[object DataView]') {
		return new x.constructor( klona(x.buffer) );
	}

	if (str === '[object ArrayBuffer]') {
		return x.slice(0);
	}

	// ArrayBuffer.isView(x)
	// ~> `new` bcuz `Buffer.slice` => ref
	if (str.slice(-6) === 'Array]') {
		return new x.constructor(x);
	}

	return x;
}

const inlineAppConfig = {
  "nuxt": {}
};



const appConfig = defuFn(inlineAppConfig);

const NUMBER_CHAR_RE = /\d/;
const STR_SPLITTERS = ["-", "_", "/", "."];
function isUppercase(char = "") {
  if (NUMBER_CHAR_RE.test(char)) {
    return void 0;
  }
  return char !== char.toLowerCase();
}
function splitByCase(str, separators) {
  const splitters = STR_SPLITTERS;
  const parts = [];
  if (!str || typeof str !== "string") {
    return parts;
  }
  let buff = "";
  let previousUpper;
  let previousSplitter;
  for (const char of str) {
    const isSplitter = splitters.includes(char);
    if (isSplitter === true) {
      parts.push(buff);
      buff = "";
      previousUpper = void 0;
      continue;
    }
    const isUpper = isUppercase(char);
    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        parts.push(buff);
        buff = char;
        previousUpper = isUpper;
        continue;
      }
      if (previousUpper === true && isUpper === false && buff.length > 1) {
        const lastChar = buff.at(-1);
        parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
        buff = lastChar + char;
        previousUpper = isUpper;
        continue;
      }
    }
    buff += char;
    previousUpper = isUpper;
    previousSplitter = isSplitter;
  }
  parts.push(buff);
  return parts;
}
function kebabCase(str, joiner) {
  return str ? (Array.isArray(str) ? str : splitByCase(str)).map((p) => p.toLowerCase()).join(joiner) : "";
}
function snakeCase(str) {
  return kebabCase(str || "", "_");
}

function getEnv(key, opts) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    process.env[opts.prefix + envKey] ?? process.env[opts.altPrefix + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function applyEnv(obj, opts, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = getEnv(subKey, opts);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
        applyEnv(obj[key], opts, subKey);
      } else if (envValue === void 0) {
        applyEnv(obj[key], opts, subKey);
      } else {
        obj[key] = envValue ?? obj[key];
      }
    } else {
      obj[key] = envValue ?? obj[key];
    }
    if (opts.envExpansion && typeof obj[key] === "string") {
      obj[key] = _expandFromEnv(obj[key]);
    }
  }
  return obj;
}
const envExpandRx = /\{\{([^{}]*)\}\}/g;
function _expandFromEnv(value) {
  return value.replace(envExpandRx, (match, key) => {
    return process.env[key] || match;
  });
}

const _inlineRuntimeConfig = {
  "app": {
    "baseURL": "/",
    "buildId": "b3716c26-4312-4853-a91e-f394c7d9eb60",
    "buildAssetsDir": "/_nuxt/",
    "cdnURL": ""
  },
  "nitro": {
    "envPrefix": "NUXT_",
    "routeRules": {
      "/__nuxt_error": {
        "cache": false
      },
      "/_nuxt/builds/meta/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      },
      "/_nuxt/builds/**": {
        "headers": {
          "cache-control": "public, max-age=1, immutable"
        }
      },
      "/_nuxt/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      }
    }
  },
  "public": {}
};
const envOptions = {
  prefix: "NITRO_",
  altPrefix: _inlineRuntimeConfig.nitro.envPrefix ?? process.env.NITRO_ENV_PREFIX ?? "_",
  envExpansion: _inlineRuntimeConfig.nitro.envExpansion ?? process.env.NITRO_ENV_EXPANSION ?? false
};
const _sharedRuntimeConfig = _deepFreeze(
  applyEnv(klona(_inlineRuntimeConfig), envOptions)
);
function useRuntimeConfig(event) {
  if (!event) {
    return _sharedRuntimeConfig;
  }
  if (event.context.nitro.runtimeConfig) {
    return event.context.nitro.runtimeConfig;
  }
  const runtimeConfig = klona(_inlineRuntimeConfig);
  applyEnv(runtimeConfig, envOptions);
  event.context.nitro.runtimeConfig = runtimeConfig;
  return runtimeConfig;
}
_deepFreeze(klona(appConfig));
function _deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      _deepFreeze(value);
    }
  }
  return Object.freeze(object);
}
new Proxy(/* @__PURE__ */ Object.create(null), {
  get: (_, prop) => {
    console.warn(
      "Please use `useRuntimeConfig()` instead of accessing config directly."
    );
    const runtimeConfig = useRuntimeConfig();
    if (prop in runtimeConfig) {
      return runtimeConfig[prop];
    }
    return void 0;
  }
});

function isPathInScope(pathname, base) {
  let canonical;
  try {
    const pre = pathname.replace(/%2f/gi, "/").replace(/%5c/gi, "\\");
    canonical = new URL(pre, "http://_").pathname;
  } catch {
    return false;
  }
  return !base || canonical === base || canonical.startsWith(base + "/");
}

const config = useRuntimeConfig();
const _routeRulesMatcher = toRouteMatcher(
  createRouter$1({ routes: config.nitro.routeRules })
);
function createRouteRulesHandler(ctx) {
  return eventHandler((event) => {
    const routeRules = getRouteRules(event);
    if (routeRules.headers) {
      setHeaders(event, routeRules.headers);
    }
    if (routeRules.redirect) {
      let target = routeRules.redirect.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.redirect._redirectStripBase;
        if (strpBase) {
          if (!isPathInScope(event.path.split("?")[0], strpBase)) {
            throw createError$1({ statusCode: 400 });
          }
          targetPath = withoutBase(targetPath, strpBase);
        } else if (targetPath.startsWith("//")) {
          targetPath = targetPath.replace(/^\/+/, "/");
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery$1(event.path);
        target = withQuery(target, query);
      }
      return sendRedirect(event, target, routeRules.redirect.statusCode);
    }
    if (routeRules.proxy) {
      let target = routeRules.proxy.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.proxy._proxyStripBase;
        if (strpBase) {
          if (!isPathInScope(event.path.split("?")[0], strpBase)) {
            throw createError$1({ statusCode: 400 });
          }
          targetPath = withoutBase(targetPath, strpBase);
        } else if (targetPath.startsWith("//")) {
          targetPath = targetPath.replace(/^\/+/, "/");
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery$1(event.path);
        target = withQuery(target, query);
      }
      return proxyRequest(event, target, {
        fetch: ctx.localFetch,
        ...routeRules.proxy
      });
    }
  });
}
function getRouteRules(event) {
  event.context._nitro = event.context._nitro || {};
  if (!event.context._nitro.routeRules) {
    event.context._nitro.routeRules = getRouteRulesForPath(
      withoutBase(event.path.split("?")[0], useRuntimeConfig().app.baseURL)
    );
  }
  return event.context._nitro.routeRules;
}
function getRouteRulesForPath(path) {
  return defu({}, ..._routeRulesMatcher.matchAll(path).reverse());
}

function joinHeaders(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
function normalizeFetchResponse(response) {
  if (!response.headers.has("set-cookie")) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: normalizeCookieHeaders(response.headers)
  });
}
function normalizeCookieHeader(header = "") {
  return splitCookiesString(joinHeaders(header));
}
function normalizeCookieHeaders(headers) {
  const outgoingHeaders = new Headers();
  for (const [name, header] of headers) {
    if (name === "set-cookie") {
      for (const cookie of normalizeCookieHeader(header)) {
        outgoingHeaders.append("set-cookie", cookie);
      }
    } else {
      outgoingHeaders.set(name, joinHeaders(header));
    }
  }
  return outgoingHeaders;
}

function isJsonRequest(event) {
	
	if (hasReqHeader(event, "accept", "text/html")) {
		return false;
	}
	return hasReqHeader(event, "accept", "application/json") || hasReqHeader(event, "user-agent", "curl/") || hasReqHeader(event, "user-agent", "httpie/") || hasReqHeader(event, "sec-fetch-mode", "cors") || event.path.startsWith("/api/") || event.path.endsWith(".json");
}
function hasReqHeader(event, name, includes) {
	const value = getRequestHeader(event, name);
	return !!(value && typeof value === "string" && value.toLowerCase().includes(includes));
}

const errorHandler$0 = (async function errorhandler(error, event, { defaultHandler }) {
	if (event.handled || isJsonRequest(event)) {
		
		return;
	}
	
	const defaultRes = await defaultHandler(error, event, { json: true });
	
	const status = error.status || error.statusCode || 500;
	if (status === 404 && defaultRes.status === 302) {
		setResponseHeaders(event, defaultRes.headers);
		setResponseStatus(event, defaultRes.status, defaultRes.statusText);
		return send(event, JSON.stringify(defaultRes.body, null, 2));
	}
	const errorObject = defaultRes.body;
	
	const url = new URL(errorObject.url);
	errorObject.url = withoutBase(url.pathname, useRuntimeConfig(event).app.baseURL) + url.search + url.hash;
	
	errorObject.message = error.unhandled ? errorObject.message || "Server Error" : error.message || errorObject.message || "Server Error";
	
	errorObject.data ||= error.data;
	errorObject.statusText ||= error.statusText || error.statusMessage;
	delete defaultRes.headers["content-type"];
	delete defaultRes.headers["content-security-policy"];
	setResponseHeaders(event, defaultRes.headers);
	
	const reqHeaders = getRequestHeaders(event);
	
	const isRenderingError = event.path.startsWith("/__nuxt_error") || !!reqHeaders["x-nuxt-error"];
	
	const res = isRenderingError ? null : await useNitroApp().localFetch(withQuery(joinURL(useRuntimeConfig(event).app.baseURL, "/__nuxt_error"), errorObject), {
		headers: {
			...reqHeaders,
			"x-nuxt-error": "true"
		},
		redirect: "manual"
	}).catch(() => null);
	if (event.handled) {
		return;
	}
	
	if (!res) {
		const { template } = await import('./error-500.mjs');
		setResponseHeader(event, "Content-Type", "text/html;charset=UTF-8");
		return send(event, template(errorObject));
	}
	const html = await res.text();
	for (const [header, value] of res.headers.entries()) {
		if (header === "set-cookie") {
			appendResponseHeader(event, header, value);
			continue;
		}
		setResponseHeader(event, header, value);
	}
	setResponseStatus(event, res.status && res.status !== 200 ? res.status : defaultRes.status, res.statusText || defaultRes.statusText);
	return send(event, html);
});

function defineNitroErrorHandler(handler) {
  return handler;
}

const errorHandler$1 = defineNitroErrorHandler(
  function defaultNitroErrorHandler(error, event) {
    const res = defaultHandler(error, event);
    setResponseHeaders(event, res.headers);
    setResponseStatus(event, res.status, res.statusText);
    return send(event, JSON.stringify(res.body, null, 2));
  }
);
function defaultHandler(error, event, opts) {
  const isSensitive = error.unhandled || error.fatal;
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage || "Server Error";
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  if (statusCode === 404) {
    const baseURL = "/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) {
      const redirectTo = `${baseURL}${url.pathname.slice(1)}${url.search}`;
      return {
        status: 302,
        statusText: "Found",
        headers: { location: redirectTo },
        body: `Redirecting...`
      };
    }
  }
  if (isSensitive && !opts?.silent) {
    const tags = [error.unhandled && "[unhandled]", error.fatal && "[fatal]"].filter(Boolean).join(" ");
    console.error(`[request error] ${tags} [${event.method}] ${url}
`, error);
  }
  const headers = {
    "content-type": "application/json",
    // Prevent browser from guessing the MIME types of resources.
    "x-content-type-options": "nosniff",
    // Prevent error page from being embedded in an iframe
    "x-frame-options": "DENY",
    // Prevent browsers from sending the Referer header
    "referrer-policy": "no-referrer",
    // Disable the execution of any js
    "content-security-policy": "script-src 'none'; frame-ancestors 'none';"
  };
  setResponseStatus(event, statusCode, statusMessage);
  if (statusCode === 404 || !getResponseHeader(event, "cache-control")) {
    headers["cache-control"] = "no-cache";
  }
  const body = {
    error: true,
    url: url.href,
    statusCode,
    statusMessage,
    message: isSensitive ? "Server Error" : error.message,
    data: isSensitive ? void 0 : error.data
  };
  return {
    status: statusCode,
    statusText: statusMessage,
    headers,
    body
  };
}

const errorHandlers = [errorHandler$0, errorHandler$1];

async function errorHandler(error, event) {
  for (const handler of errorHandlers) {
    try {
      await handler(error, event, { defaultHandler });
      if (event.handled) {
        return; // Response handled
      }
    } catch(error) {
      // Handler itself thrown, log and continue
      console.error(error);
    }
  }
  // H3 will handle fallback
}

const script = "\"use strict\";(()=>{const o=window,e=document.documentElement,c=[\"dark\",\"light\"],s=getStorageValue(\"localStorage\",\"nuxt-color-mode\")||\"system\";let r=s===\"system\"?f():s;const l=e.getAttribute(\"data-color-mode-forced\");l&&(r=l),i(r),o[\"__NUXT_COLOR_MODE__\"]={preference:s,value:r,getColorScheme:f,addColorScheme:i,removeColorScheme:d};function i(t){const a=\"\"+t+\"\",n=\"\";e.classList?e.classList.add(a):e.className+=\" \"+a,n&&e.setAttribute(\"data-\"+n,t)}function d(t){const a=\"\"+t+\"\",n=\"\";e.classList?e.classList.remove(a):e.className=e.className.replace(new RegExp(a,\"g\"),\"\"),n&&e.removeAttribute(\"data-\"+n)}function u(t){return o.matchMedia(\"(prefers-color-scheme\"+t+\")\")}function f(){if(o.matchMedia&&u(\"\").media!==\"not all\"){for(const t of c)if(u(\":\"+t).matches)return t}return\"light\"}})();function getStorageValue(o,e){switch(o){case\"localStorage\":try{return window.localStorage.getItem(e)}catch{return null}case\"sessionStorage\":try{return window.sessionStorage.getItem(e)}catch{return null}case\"cookie\":try{return getCookie(e)}catch{return null}default:return null}}function getCookie(o){const c=(\"; \"+window.document.cookie).split(\"; \"+o+\"=\");if(c.length===2){const s=c.pop();return s?s.split(\";\").shift():null}}";

const _gibI9lLmcnuGhjE6_O9CuYZsh8tC4Gza4rC7oZC1UKo = (function(nitro) {
  nitro.hooks.hook("render:html", (htmlContext) => {
    htmlContext.head.push(`<script>${script}<\/script>`);
  });
});

function defineNitroPlugin(def) {
  return def;
}

const REQUEST_EVENT = {
  COMPLETED: "http.request.completed",
  FAILED: "http.request.failed"
};
const REQUEST_LEVEL = {
  INFO: "info",
  ERROR: "error"
};
const canonicalRequestId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const uuid$1 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const publicCapability = /^[A-Za-z0-9_-]{43}$/u;
const createRequestIdentity = (inbound, createId) => inbound && canonicalRequestId.test(inbound) ? inbound.toLowerCase() : createId();
const requestTelemetryRoute = (pathname) => {
  const segments = pathname.split("/").filter(Boolean);
  const publicApi = segments[0] === "api" && segments[1] === "public" && segments[2] === "documentation";
  const publicPage = segments[0] === "share" && segments[1] === "documentation";
  const safeSegments = segments.map((segment, index) => {
    if ((publicApi && index === 3 || publicPage && index === 2) && publicCapability.test(segment)) return "[capability]";
    if (uuid$1.test(segment)) return "[id]";
    if (/^\d+$/u.test(segment)) return "[number]";
    return /^[A-Za-z][A-Za-z0-9._-]{0,63}$/u.test(segment) ? segment : "[segment]";
  });
  return `/${safeSegments.join("/")}`;
};
const createRequestLogRecord = (input) => ({
  timestamp: input.occurredAt,
  level: input.type === "failed" ? REQUEST_LEVEL.ERROR : REQUEST_LEVEL.INFO,
  event: input.type === "failed" ? REQUEST_EVENT.FAILED : REQUEST_EVENT.COMPLETED,
  requestId: input.requestId,
  method: input.method.toUpperCase().slice(0, 16),
  route: input.route.slice(0, 256),
  statusCode: Number.isSafeInteger(input.statusCode) ? input.statusCode : 500,
  durationMs: Math.max(0, Math.round(input.durationMs))
});

const observationFrom = (value) => {
  if (!value || typeof value !== "object") return void 0;
  const requestId = Reflect.get(value, "requestId");
  const startedAt = Reflect.get(value, "startedAt");
  const failed = Reflect.get(value, "failed");
  return typeof requestId === "string" && typeof startedAt === "number" && typeof failed === "boolean" ? { requestId, startedAt, failed } : void 0;
};
const errorStatusCode = (error) => {
  if (!error || typeof error !== "object") return 500;
  const statusCode = Reflect.get(error, "statusCode");
  return typeof statusCode === "number" && Number.isSafeInteger(statusCode) ? statusCode : 500;
};
const createRecord = (event, observation, type, statusCode) => createRequestLogRecord({
  type,
  requestId: observation.requestId,
  method: getMethod(event),
  route: requestTelemetryRoute(getRequestURL(event).pathname),
  statusCode,
  durationMs: performance.now() - observation.startedAt,
  occurredAt: (/* @__PURE__ */ new Date()).toISOString()
});
const writeRecord = (record) => {
  process.stdout.write(`${JSON.stringify(record)}
`);
};
const _wFeLemrflV55V3sjBqCw3oTWliDD5QmZ8nhJY3fFw_Q = defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", (event) => {
    const requestId = createRequestIdentity(getHeader(event, "x-request-id"), randomUUID);
    event.context.requestObservation = { requestId, startedAt: performance.now(), failed: false };
    setHeader(event, "X-Request-ID", requestId);
  });
  nitroApp.hooks.hook("afterResponse", (event) => {
    const observation = observationFrom(event.context.requestObservation);
    if (!observation || observation.failed) return;
    writeRecord(createRecord(event, observation, "completed", getResponseStatus(event)));
  });
  nitroApp.hooks.hook("error", (error, context) => {
    const event = context.event;
    if (!event) return;
    const observation = observationFrom(event.context.requestObservation);
    if (!observation || observation.failed) return;
    event.context.requestObservation = { ...observation, failed: true };
    writeRecord(createRecord(event, observation, "failed", errorStatusCode(error)));
  });
});

const _e2PzcV5McmjOx0U8GVHV2ume71ISs_fLiFGcs4Y8WF4 = defineNitroPlugin((nitro) => {
  createDebugger(nitro.hooks, { tag: "nitro-runtime" });
});

const globalTiming = globalThis.__timing__ || {
  start: () => 0,
  end: () => 0,
  metrics: []
};
const timingMiddleware = eventHandler((event) => {
  const start = globalTiming.start();
  const _end = event.node.res.end;
  event.node.res.end = function(chunk, encoding, cb) {
    const metrics = [
      ["Generate", globalTiming.end(start)],
      ...globalTiming.metrics
    ];
    const serverTiming = metrics.map((m) => `-;dur=${m[1]};desc="${encodeURIComponent(m[0])}"`).join(", ");
    if (!event.node.res.headersSent) {
      event.node.res.setHeader("Server-Timing", serverTiming);
    }
    _end.call(event.node.res, chunk, encoding, cb);
    return this;
  }.bind(event.node.res);
});
const _RsAMqRps4We9yEX_U5kgERLSwxo6coihF0nyZUvnpig = defineNitroPlugin((nitro) => {
  nitro.h3App.stack.unshift({
    route: "/",
    handler: timingMiddleware
  });
});

const plugins = [
  _gibI9lLmcnuGhjE6_O9CuYZsh8tC4Gza4rC7oZC1UKo,
_wFeLemrflV55V3sjBqCw3oTWliDD5QmZ8nhJY3fFw_Q,
_e2PzcV5McmjOx0U8GVHV2ume71ISs_fLiFGcs4Y8WF4,
_RsAMqRps4We9yEX_U5kgERLSwxo6coihF0nyZUvnpig
];

const assets = {
  "/_nuxt/0OmktEbl.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"66e-av7gzXyn6O6SU6hf9kD0yyybS4U\"",
    "mtime": "2026-08-30T12:06:38.678Z",
    "size": 1646,
    "path": "../public/_nuxt/0OmktEbl.js"
  },
  "/_nuxt/-NHgln5L.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"14f5-RizXUgfNZrP0SQaaQoBcDbnhtJo\"",
    "mtime": "2026-08-30T12:06:38.684Z",
    "size": 5365,
    "path": "../public/_nuxt/-NHgln5L.js"
  },
  "/_nuxt/0QFmeVZ6.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3be0-umL22jKb+cs1tq8imV1vVcw+emM\"",
    "mtime": "2026-08-30T12:06:38.684Z",
    "size": 15328,
    "path": "../public/_nuxt/0QFmeVZ6.js"
  },
  "/_nuxt/1vyu6QnQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"36c-whp+jsdfrjatKHsxrv883cYr3j0\"",
    "mtime": "2026-08-30T12:06:38.700Z",
    "size": 876,
    "path": "../public/_nuxt/1vyu6QnQ.js"
  },
  "/_nuxt/2VH6Y686.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e269-M5R1oq2tSr9bkwtzrpWlSvLIlGE\"",
    "mtime": "2026-08-30T12:06:38.684Z",
    "size": 57961,
    "path": "../public/_nuxt/2VH6Y686.js"
  },
  "/_nuxt/9pQ3eFd1.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d8-coEbOB2c1IWv7XoHeuGPY8gjkN8\"",
    "mtime": "2026-08-30T12:06:38.678Z",
    "size": 216,
    "path": "../public/_nuxt/9pQ3eFd1.js"
  },
  "/_nuxt/94yGyqqf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b07-pfInohsNO5/A9YVFZW/a+QQjJ9A\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 2823,
    "path": "../public/_nuxt/94yGyqqf.js"
  },
  "/_nuxt/41vteUI0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"319-GdH/7jUlZLtkttAtBis6snThCCE\"",
    "mtime": "2026-08-30T12:06:38.666Z",
    "size": 793,
    "path": "../public/_nuxt/41vteUI0.js"
  },
  "/_nuxt/B4zzYtVx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3f8-Z04sUE6XAtrDbJo152H6fzJLCHA\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 1016,
    "path": "../public/_nuxt/B4zzYtVx.js"
  },
  "/_nuxt/B7oIlAc3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1af-ADPmA92AdBsoA2jmwscb22Pp4UQ\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 431,
    "path": "../public/_nuxt/B7oIlAc3.js"
  },
  "/_nuxt/B7wahygf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9731-GJ8ROEbMoXyv4sseYy3QOwLHXM0\"",
    "mtime": "2026-08-30T12:06:38.678Z",
    "size": 38705,
    "path": "../public/_nuxt/B7wahygf.js"
  },
  "/_nuxt/BB59rW8S.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9d-jw/OjWz0KfzanviiWzvaNGZqoJE\"",
    "mtime": "2026-08-30T12:06:38.678Z",
    "size": 157,
    "path": "../public/_nuxt/BB59rW8S.js"
  },
  "/_nuxt/BbK6vX8l.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"126-eIN5DrlJVdv9IqSoTXYcvJWuICY\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 294,
    "path": "../public/_nuxt/BbK6vX8l.js"
  },
  "/_nuxt/AzBvApwg.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2359f-HdY/ayzdoFy1oZKiWZ0s6ap1Lkc\"",
    "mtime": "2026-08-30T12:06:38.700Z",
    "size": 144799,
    "path": "../public/_nuxt/AzBvApwg.js"
  },
  "/_nuxt/Bj2WU7Se.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"296-AWFO3aCVrrV87aElVGJU+V9yVyA\"",
    "mtime": "2026-08-30T12:06:38.692Z",
    "size": 662,
    "path": "../public/_nuxt/Bj2WU7Se.js"
  },
  "/_nuxt/BgYwsW3l.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8927-8ylfTvxr1bkGFf26k2qrwVKlAxA\"",
    "mtime": "2026-08-30T12:06:38.692Z",
    "size": 35111,
    "path": "../public/_nuxt/BgYwsW3l.js"
  },
  "/_nuxt/BL4H4Ny-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"19b5-Vhb22W52OkC4XnPvTaEBDY75zcs\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 6581,
    "path": "../public/_nuxt/BL4H4Ny-.js"
  },
  "/_nuxt/BKkl5na6.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"492-BDO/m1qHWVNP0GLk9mNDC3X8gD8\"",
    "mtime": "2026-08-30T12:06:38.677Z",
    "size": 1170,
    "path": "../public/_nuxt/BKkl5na6.js"
  },
  "/_nuxt/BlMcyPNj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"137-UESmJh+r3/fou/hs8fCvxqtAxSw\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 311,
    "path": "../public/_nuxt/BlMcyPNj.js"
  },
  "/_nuxt/BLRvqCsp.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"278-3xRBSw+kiQ/KM1Wnuti2Rx5br6s\"",
    "mtime": "2026-08-30T12:06:38.700Z",
    "size": 632,
    "path": "../public/_nuxt/BLRvqCsp.js"
  },
  "/_nuxt/BluErhDo.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1022-ga1CrDyiPCTmmr809TaZtXc/Jv4\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 4130,
    "path": "../public/_nuxt/BluErhDo.js"
  },
  "/_nuxt/BNb3cVzY.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6f4-wzsLQqPEZPKeBFrYFrBdeUY4stQ\"",
    "mtime": "2026-08-30T12:06:38.684Z",
    "size": 1780,
    "path": "../public/_nuxt/BNb3cVzY.js"
  },
  "/_nuxt/BOu2gdIr.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"630-gMxNLOZQQvm5xNWffSNoqYqKGy4\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 1584,
    "path": "../public/_nuxt/BOu2gdIr.js"
  },
  "/_nuxt/BOU7PYM0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"45b-MM2EZ133cTKLrvBe7w8beq/7qqY\"",
    "mtime": "2026-08-30T12:06:38.692Z",
    "size": 1115,
    "path": "../public/_nuxt/BOU7PYM0.js"
  },
  "/_nuxt/BleA28p_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"239-KOzTNdnP3z16PMFxlO3aievVOkQ\"",
    "mtime": "2026-08-30T12:06:38.685Z",
    "size": 569,
    "path": "../public/_nuxt/BleA28p_.js"
  },
  "/_nuxt/BPLj3dvt.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2d4-4/o1dPG3rgUMmP+jYymAzoLF8cE\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 724,
    "path": "../public/_nuxt/BPLj3dvt.js"
  },
  "/_nuxt/BpywybXM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"bfd-8RbiRfiVE2edjka+lgWMLUIU2ko\"",
    "mtime": "2026-08-30T12:06:38.677Z",
    "size": 3069,
    "path": "../public/_nuxt/BpywybXM.js"
  },
  "/_nuxt/Btqq_VtS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3ab-H7/sHFm//LznNkjU0UxGIV866AM\"",
    "mtime": "2026-08-30T12:06:38.701Z",
    "size": 939,
    "path": "../public/_nuxt/Btqq_VtS.js"
  },
  "/_nuxt/Br25OLEZ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2bf9-FQxSMVtNttvjtAz+u0Sd7/LHXEg\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 11257,
    "path": "../public/_nuxt/Br25OLEZ.js"
  },
  "/_nuxt/BThoySlL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1243-ksKDiGgfw39wLQewFDiRBROP7yg\"",
    "mtime": "2026-08-30T12:06:38.666Z",
    "size": 4675,
    "path": "../public/_nuxt/BThoySlL.js"
  },
  "/_nuxt/BtsiK0kE.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7cae-LnXSSdKqHJneKKQYGPGtwXKSV5E\"",
    "mtime": "2026-08-30T12:06:38.692Z",
    "size": 31918,
    "path": "../public/_nuxt/BtsiK0kE.js"
  },
  "/_nuxt/BUhw3yaI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2ab-jUWy2oPvrh0plusKFVfSu4jTkR8\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 683,
    "path": "../public/_nuxt/BUhw3yaI.js"
  },
  "/_nuxt/BrlbU3P-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f3-S3C5RYfY5oEps2fm0YXs/B2kca8\"",
    "mtime": "2026-08-30T12:06:38.677Z",
    "size": 243,
    "path": "../public/_nuxt/BrlbU3P-.js"
  },
  "/_nuxt/BURVyIRO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e7-VNB3uNhMdRxJ9Xwgs/6pJcP1Wys\"",
    "mtime": "2026-08-30T12:06:38.677Z",
    "size": 231,
    "path": "../public/_nuxt/BURVyIRO.js"
  },
  "/_nuxt/BwDihf1O.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f4-csFXxXax2oYIaKSOMMrf1OvJPF8\"",
    "mtime": "2026-08-30T12:06:38.677Z",
    "size": 244,
    "path": "../public/_nuxt/BwDihf1O.js"
  },
  "/_nuxt/BwMrU84D.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"91-KdsqeP9MsP13/eIErE6iLFU5IL4\"",
    "mtime": "2026-08-30T12:06:38.685Z",
    "size": 145,
    "path": "../public/_nuxt/BwMrU84D.js"
  },
  "/_nuxt/C0TCh2gp.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ff6-GLDCfZHUn12ZAsmG0n8uqdBuVb0\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 4086,
    "path": "../public/_nuxt/C0TCh2gp.js"
  },
  "/_nuxt/BVTnQJob.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e57-fHqs/mNlDyn63DhXPF+I6NH7gUU\"",
    "mtime": "2026-08-30T12:06:38.692Z",
    "size": 3671,
    "path": "../public/_nuxt/BVTnQJob.js"
  },
  "/_nuxt/C3nJrBjr.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4e1-6Cv/c1zHtGMxgGED1Z8+lPzr5IA\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 1249,
    "path": "../public/_nuxt/C3nJrBjr.js"
  },
  "/_nuxt/C6mv32Er.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"91-5H9IZJQ7X+cZXMpQWOyLrold3cs\"",
    "mtime": "2026-08-30T12:06:38.685Z",
    "size": 145,
    "path": "../public/_nuxt/C6mv32Er.js"
  },
  "/_nuxt/C71Tzrip.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"91-ldtjhK6dKzKGuTBLg1yZGfkFjYI\"",
    "mtime": "2026-08-30T12:06:38.677Z",
    "size": 145,
    "path": "../public/_nuxt/C71Tzrip.js"
  },
  "/_nuxt/C8AJfa3_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7d8-kB+yWCMimMzN6xaYFcZpp7fNURk\"",
    "mtime": "2026-08-30T12:06:38.700Z",
    "size": 2008,
    "path": "../public/_nuxt/C8AJfa3_.js"
  },
  "/_nuxt/C7RYKm-V.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2e1c-LGPCoKUJKC4lB23Me311tejqORU\"",
    "mtime": "2026-08-30T12:06:38.666Z",
    "size": 11804,
    "path": "../public/_nuxt/C7RYKm-V.js"
  },
  "/_nuxt/C8bjzvAv.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f66-37TCBG6bcyj81izZ72IYdr+i65I\"",
    "mtime": "2026-08-30T12:06:38.678Z",
    "size": 3942,
    "path": "../public/_nuxt/C8bjzvAv.js"
  },
  "/_nuxt/CaVZyeKT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"648-R9ApQtvffbehCZIoCdW3iYfthQk\"",
    "mtime": "2026-08-30T12:06:38.692Z",
    "size": 1608,
    "path": "../public/_nuxt/CaVZyeKT.js"
  },
  "/_nuxt/CAjbx3UP.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"aac1-4aKTjkNgsMLDfnNyQsvAJmYPcL0\"",
    "mtime": "2026-08-30T12:06:38.678Z",
    "size": 43713,
    "path": "../public/_nuxt/CAjbx3UP.js"
  },
  "/_nuxt/CBXOHngn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b73-eoOkcfOftL2DOXITOmhNGgkrhzk\"",
    "mtime": "2026-08-30T12:06:38.692Z",
    "size": 2931,
    "path": "../public/_nuxt/CBXOHngn.js"
  },
  "/_nuxt/CB_o-I5f.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"edb-u02S484kC2m5Y9DhgHePnLkkzWg\"",
    "mtime": "2026-08-30T12:06:38.677Z",
    "size": 3803,
    "path": "../public/_nuxt/CB_o-I5f.js"
  },
  "/_nuxt/C1dGP41x.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"45118-rO37btdqcXdYE6xfIpyBIvv0lXw\"",
    "mtime": "2026-08-30T12:06:38.700Z",
    "size": 282904,
    "path": "../public/_nuxt/C1dGP41x.js"
  },
  "/_nuxt/CC4XVubb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"93-tHiwOykp59otrJM5egk/eSCikjI\"",
    "mtime": "2026-08-30T12:06:38.701Z",
    "size": 147,
    "path": "../public/_nuxt/CC4XVubb.js"
  },
  "/_nuxt/CCBN247d.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"14b-dDLClPCLI6aZ89KpOT5EG9/gaRE\"",
    "mtime": "2026-08-30T12:06:38.685Z",
    "size": 331,
    "path": "../public/_nuxt/CCBN247d.js"
  },
  "/_nuxt/CeFgzHN-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f2a-7ibTwlwi7MMJAzdqwFF4BWYlXKU\"",
    "mtime": "2026-08-30T12:06:38.677Z",
    "size": 3882,
    "path": "../public/_nuxt/CeFgzHN-.js"
  },
  "/_nuxt/CgHvhQD2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"fad-8rjSn8qDxBFbfViVSBN6Zo+2b8E\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 4013,
    "path": "../public/_nuxt/CgHvhQD2.js"
  },
  "/_nuxt/CDEJJA4w.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3d6-v2rn302KeRgFjpzAwbq5+XW5Wg8\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 982,
    "path": "../public/_nuxt/CDEJJA4w.js"
  },
  "/_nuxt/CjPCk9oC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6a6d-DPHvGU5jLpzWEKVWmRqV1+bA7FE\"",
    "mtime": "2026-08-30T12:06:38.685Z",
    "size": 27245,
    "path": "../public/_nuxt/CjPCk9oC.js"
  },
  "/_nuxt/ClTfvy4a.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c3-YuB5tYlC1a0vPXt07584lQZlN3Y\"",
    "mtime": "2026-08-30T12:06:38.692Z",
    "size": 195,
    "path": "../public/_nuxt/ClTfvy4a.js"
  },
  "/_nuxt/CHRdvowB.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13a-m09f5ivCFNEcvLfWjxpUmjMy724\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 314,
    "path": "../public/_nuxt/CHRdvowB.js"
  },
  "/_nuxt/Cl104HAo.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"12041-dEE7LnERre87MnxJ9ZTiGTtABx8\"",
    "mtime": "2026-08-30T12:06:38.677Z",
    "size": 73793,
    "path": "../public/_nuxt/Cl104HAo.js"
  },
  "/_nuxt/CniPQI_t.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"663-izyh7C3HhRc8MK/+oJoXXpyeOSQ\"",
    "mtime": "2026-08-30T12:06:38.692Z",
    "size": 1635,
    "path": "../public/_nuxt/CniPQI_t.js"
  },
  "/_nuxt/Co9-sw0P.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"10f-OLNmUap+hXDp8gBCKP8XBoh6TCY\"",
    "mtime": "2026-08-30T12:06:38.678Z",
    "size": 271,
    "path": "../public/_nuxt/Co9-sw0P.js"
  },
  "/_nuxt/CqdlvtMO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"371-8c+6FMO5A3Onnld31xoCOCDm4Ck\"",
    "mtime": "2026-08-30T12:06:38.692Z",
    "size": 881,
    "path": "../public/_nuxt/CqdlvtMO.js"
  },
  "/_nuxt/CrID8IAo.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13e6-gSiWM370TDvzpo4AkuFY4YUbcp4\"",
    "mtime": "2026-08-30T12:06:38.692Z",
    "size": 5094,
    "path": "../public/_nuxt/CrID8IAo.js"
  },
  "/_nuxt/Cs4y3z6v.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"144-SQWEYjdPCGDlvZiKw7lZDKEyMiQ\"",
    "mtime": "2026-08-30T12:06:38.700Z",
    "size": 324,
    "path": "../public/_nuxt/Cs4y3z6v.js"
  },
  "/_nuxt/CtQrcwQX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"8b8-zHRXRYJRqGA2EeT2ZsygRLDATSQ\"",
    "mtime": "2026-08-30T12:06:38.685Z",
    "size": 2232,
    "path": "../public/_nuxt/CtQrcwQX.js"
  },
  "/_nuxt/CWpBe6V3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1c9-Z1HgCxp7LFs9/Csjn1UdQrzaSb0\"",
    "mtime": "2026-08-30T12:06:38.685Z",
    "size": 457,
    "path": "../public/_nuxt/CWpBe6V3.js"
  },
  "/_nuxt/CXYlZzOq.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f7d-Z0ewLzZCzuZDFFDgndWKZygOGIk\"",
    "mtime": "2026-08-30T12:06:38.666Z",
    "size": 3965,
    "path": "../public/_nuxt/CXYlZzOq.js"
  },
  "/_nuxt/C_icKTN-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"648-Mavj7H07/sd9XNFd0e6GGnaMJjI\"",
    "mtime": "2026-08-30T12:06:38.685Z",
    "size": 1608,
    "path": "../public/_nuxt/C_icKTN-.js"
  },
  "/_nuxt/CyrWH7_B.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"18e-gDq3QmGBgpMOS/SLxmIDfvLMKvE\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 398,
    "path": "../public/_nuxt/CyrWH7_B.js"
  },
  "/_nuxt/D5UX12Tb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"318-g/kiqcj+NImAgiV3YGJo7bdOXGE\"",
    "mtime": "2026-08-30T12:06:38.684Z",
    "size": 792,
    "path": "../public/_nuxt/D5UX12Tb.js"
  },
  "/_nuxt/D2KhM9uG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"296-AWFO3aCVrrV87aElVGJU+V9yVyA\"",
    "mtime": "2026-08-30T12:06:38.666Z",
    "size": 662,
    "path": "../public/_nuxt/D2KhM9uG.js"
  },
  "/_nuxt/D8aDAgt1.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3d3-1X+7ei6I83qP7KbWX7trLRlp/5g\"",
    "mtime": "2026-08-30T12:06:38.677Z",
    "size": 979,
    "path": "../public/_nuxt/D8aDAgt1.js"
  },
  "/_nuxt/D9XOcY78.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"318-236lsVWSUaqrA5CcAI2Grj7Ov28\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 792,
    "path": "../public/_nuxt/D9XOcY78.js"
  },
  "/_nuxt/DaERUlld.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1237-Lg4k5rcSpd3xYtHP+oUu2Tim3ic\"",
    "mtime": "2026-08-30T12:06:38.685Z",
    "size": 4663,
    "path": "../public/_nuxt/DaERUlld.js"
  },
  "/_nuxt/DCZxInBS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"28e-P9SIbSiBBJkft0ZMs/ukmKYoJOU\"",
    "mtime": "2026-08-30T12:06:38.692Z",
    "size": 654,
    "path": "../public/_nuxt/DCZxInBS.js"
  },
  "/_nuxt/DeT2aUra.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"91-rSfY+vLzqgXtjG0VwMGx6+EE5uw\"",
    "mtime": "2026-08-30T12:06:38.666Z",
    "size": 145,
    "path": "../public/_nuxt/DeT2aUra.js"
  },
  "/_nuxt/DFbGV8z_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5d78-HjCxG3Ug87Mv5aUsKYD3PUF/+qQ\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 23928,
    "path": "../public/_nuxt/DFbGV8z_.js"
  },
  "/_nuxt/DeuTWfM9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"10a6-YYhOqWA9h55LA6wu7WgA22a7S50\"",
    "mtime": "2026-08-30T12:06:38.692Z",
    "size": 4262,
    "path": "../public/_nuxt/DeuTWfM9.js"
  },
  "/_nuxt/DIvAM3Tn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d1b-GU/OaJ67yJqT1MNQBio61YguMi8\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 3355,
    "path": "../public/_nuxt/DIvAM3Tn.js"
  },
  "/_nuxt/Djbdn-IM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"720-Kiwkb2Gf50qy1KE6m8a8icwuIi8\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 1824,
    "path": "../public/_nuxt/Djbdn-IM.js"
  },
  "/_nuxt/DKntMAqG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1208-Gz4ehzr1CY9YdiBwsH/Mz2UzenQ\"",
    "mtime": "2026-08-30T12:06:38.700Z",
    "size": 4616,
    "path": "../public/_nuxt/DKntMAqG.js"
  },
  "/_nuxt/DMzWtSy1.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a9-RsbEfcqifalZiS9zwW+KLUsZ4cY\"",
    "mtime": "2026-08-30T12:06:38.700Z",
    "size": 169,
    "path": "../public/_nuxt/DMzWtSy1.js"
  },
  "/_nuxt/Djbn1TaB.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2896-l4yTreUcAwDGMI9ZiUrMnooUnIc\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 10390,
    "path": "../public/_nuxt/Djbn1TaB.js"
  },
  "/_nuxt/dnEnB94i.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"7d-XXRu2mnTbnJfb8WOELPGTXBC1vM\"",
    "mtime": "2026-08-30T12:06:38.700Z",
    "size": 125,
    "path": "../public/_nuxt/dnEnB94i.js"
  },
  "/_nuxt/DlNprukh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5fa7-5xwJC0v91nMe9Iz+wYuxorJZ5c0\"",
    "mtime": "2026-08-30T12:06:38.700Z",
    "size": 24487,
    "path": "../public/_nuxt/DlNprukh.js"
  },
  "/_nuxt/DocumentEditor.5Ge0_uj8.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"7be-w5Z6HD1EbANOAtkB/sZFSZHOmlg\"",
    "mtime": "2026-08-30T12:06:38.651Z",
    "size": 1982,
    "path": "../public/_nuxt/DocumentEditor.5Ge0_uj8.css"
  },
  "/_nuxt/DoublLX8.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"15e-a3yeiTyWAveApgVFG0fSfqzOXZQ\"",
    "mtime": "2026-08-30T12:06:38.700Z",
    "size": 350,
    "path": "../public/_nuxt/DoublLX8.js"
  },
  "/_nuxt/DtARBCkz.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a0-9zgqbrizd9ff6oqOQ5bAIvwKCb4\"",
    "mtime": "2026-08-30T12:06:38.692Z",
    "size": 160,
    "path": "../public/_nuxt/DtARBCkz.js"
  },
  "/_nuxt/DT3ywxGk.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"14a-Z1ant11fpqityFyl8f/i1EGvvcY\"",
    "mtime": "2026-08-30T12:06:38.685Z",
    "size": 330,
    "path": "../public/_nuxt/DT3ywxGk.js"
  },
  "/_nuxt/DTQXsfk0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a25-om92aEfofNvKRJHK4isLc5c6vVI\"",
    "mtime": "2026-08-30T12:06:38.692Z",
    "size": 6693,
    "path": "../public/_nuxt/DTQXsfk0.js"
  },
  "/_nuxt/DWJpyv5s.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1ae-/eUfdcjNHQFAwdp4gzRZTLN1beI\"",
    "mtime": "2026-08-30T12:06:38.685Z",
    "size": 430,
    "path": "../public/_nuxt/DWJpyv5s.js"
  },
  "/_nuxt/DwxWilwj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"14b-QacuUoo8TcQjWhsfc1I9PS8ERNU\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 331,
    "path": "../public/_nuxt/DwxWilwj.js"
  },
  "/_nuxt/DzQX66A4.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a4-sbvuQJ5lOGQGopv8JLQhTYBv6BY\"",
    "mtime": "2026-08-30T12:06:38.684Z",
    "size": 164,
    "path": "../public/_nuxt/DzQX66A4.js"
  },
  "/_nuxt/F3FklRMn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"10b9-WNycPZTmPKmH5jolFkpZWY2BkaM\"",
    "mtime": "2026-08-30T12:06:38.700Z",
    "size": 4281,
    "path": "../public/_nuxt/F3FklRMn.js"
  },
  "/_nuxt/HhZbMtO0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e7f-tVP4d/AhkkpgRKnx6O+cWJgyhp0\"",
    "mtime": "2026-08-30T12:06:38.700Z",
    "size": 3711,
    "path": "../public/_nuxt/HhZbMtO0.js"
  },
  "/_nuxt/Dfxuhtj_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6caac-qMNXHTBDmOqNQ19Q2pmALSsAnFM\"",
    "mtime": "2026-08-30T12:06:38.666Z",
    "size": 445100,
    "path": "../public/_nuxt/Dfxuhtj_.js"
  },
  "/_nuxt/k-T89IX1.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"cf-WUAZKv70AS0+fa/mMCd7WUSzUTI\"",
    "mtime": "2026-08-30T12:06:38.700Z",
    "size": 207,
    "path": "../public/_nuxt/k-T89IX1.js"
  },
  "/_nuxt/kLIimDF9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"5f1-h4GgoyBItXqdPQwHEwrNL3HFXX0\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 1521,
    "path": "../public/_nuxt/kLIimDF9.js"
  },
  "/_nuxt/Kzc7UgiF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"168-XCWSW4uh+olY2ZlTG+chFNjGJrU\"",
    "mtime": "2026-08-30T12:06:38.666Z",
    "size": 360,
    "path": "../public/_nuxt/Kzc7UgiF.js"
  },
  "/_nuxt/entry.C0SFREuy.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"1d1d2-7ifrPgMTz8gooERgo/7L3PR6sNs\"",
    "mtime": "2026-08-30T12:06:38.666Z",
    "size": 119250,
    "path": "../public/_nuxt/entry.C0SFREuy.css"
  },
  "/_nuxt/lgF-yTOY.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"502-D4ptIrqx86nArjpyZFZNJ/4t9RI\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 1282,
    "path": "../public/_nuxt/lgF-yTOY.js"
  },
  "/_nuxt/LwH39CgS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e5-6Kr6LNOWJEsMF+3uOipVH1x0hY4\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 229,
    "path": "../public/_nuxt/LwH39CgS.js"
  },
  "/_nuxt/oJLKJ7kF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"731-KNeSUnPODpUHhoEQmlu6jEKgnT4\"",
    "mtime": "2026-08-30T12:06:38.701Z",
    "size": 1841,
    "path": "../public/_nuxt/oJLKJ7kF.js"
  },
  "/_nuxt/pBV_3Zxr.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"fc-FpaDsSRDHAxrqdrkpl87JlOv7EA\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 252,
    "path": "../public/_nuxt/pBV_3Zxr.js"
  },
  "/_nuxt/RUwLWmbu.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"91-jycfdkmUr+TGEzHQOS0JIdPxrq8\"",
    "mtime": "2026-08-30T12:06:38.677Z",
    "size": 145,
    "path": "../public/_nuxt/RUwLWmbu.js"
  },
  "/_nuxt/qWRj23b0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"55-NxwikMQF5tsbW8HcbksEJchUAzo\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 85,
    "path": "../public/_nuxt/qWRj23b0.js"
  },
  "/_nuxt/szA7pWFo.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"94-gEHqjkvQAi2B5rvufMVY4PEzmFc\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 148,
    "path": "../public/_nuxt/szA7pWFo.js"
  },
  "/_nuxt/uryZxHpO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2ac-q/BcYUqI8CNpAAOnHMPeX60509U\"",
    "mtime": "2026-08-30T12:06:38.666Z",
    "size": 684,
    "path": "../public/_nuxt/uryZxHpO.js"
  },
  "/_nuxt/w9Mf-Y5_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3d5-HuEORDgtet2lHaWk4mcMLIrzKsA\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 981,
    "path": "../public/_nuxt/w9Mf-Y5_.js"
  },
  "/_nuxt/UuNyOSkY.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"234a-+9It7o6HZ8oQZ/FtVqpZAT+TXWE\"",
    "mtime": "2026-08-30T12:06:38.684Z",
    "size": 9034,
    "path": "../public/_nuxt/UuNyOSkY.js"
  },
  "/_nuxt/xlYQws15.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"90a9-LAKBpo3NyPtUkI82u3lXYbbZt9Y\"",
    "mtime": "2026-08-30T12:06:38.677Z",
    "size": 37033,
    "path": "../public/_nuxt/xlYQws15.js"
  },
  "/_nuxt/Z9Mlo4kY.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"55f-jCGnH4EcaTqbZkpn4nSc6tIh4pU\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 1375,
    "path": "../public/_nuxt/Z9Mlo4kY.js"
  },
  "/_nuxt/YAK5YD58.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"215-djP+V/i9RbQpzrdA2i4spHezkm4\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 533,
    "path": "../public/_nuxt/YAK5YD58.js"
  },
  "/_nuxt/_fH8a0Bq.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6ee-+dCa/Ruy45icrgJwVfxts5pHXAI\"",
    "mtime": "2026-08-30T12:06:38.693Z",
    "size": 1774,
    "path": "../public/_nuxt/_fH8a0Bq.js"
  },
  "/_nuxt/builds/latest.json": {
    "type": "application/json",
    "etag": "\"47-IZdOBVLTSpwCl32n7b8bDTQbGss\"",
    "mtime": "2026-08-30T12:06:41.234Z",
    "size": 71,
    "path": "../public/_nuxt/builds/latest.json"
  },
  "/_nuxt/builds/meta/b3716c26-4312-4853-a91e-f394c7d9eb60.json": {
    "type": "application/json",
    "etag": "\"58-sNvoOkBQZ0SDS5WSV9PnM12vEKQ\"",
    "mtime": "2026-08-30T12:06:41.235Z",
    "size": 88,
    "path": "../public/_nuxt/builds/meta/b3716c26-4312-4853-a91e-f394c7d9eb60.json"
  },
  "/images/auth/minerva-auth-visual.png": {
    "type": "image/png",
    "etag": "\"297ef4-ot+4W5ROXqfa6TLaQa51hlutmIE\"",
    "mtime": "2026-06-27T23:28:28.650Z",
    "size": 2719476,
    "path": "../public/images/auth/minerva-auth-visual.png"
  }
};

const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
function cwd() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1) ; else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
const dirname = function(p) {
  const segments = normalizeWindowsPath(p).replace(/\/$/, "").split("/").slice(0, -1);
  if (segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0])) {
    segments[0] += "/";
  }
  return segments.join("/") || (isAbsolute(p) ? "/" : ".");
};

function readAsset (id) {
  const serverDir = dirname(fileURLToPath(globalThis._importMeta_.url));
  return promises.readFile(resolve(serverDir, assets[id].path))
}

const publicAssetBases = {"/_nuxt/builds/meta/":{"maxAge":31536000},"/_nuxt/builds/":{"maxAge":1},"/_nuxt/":{"maxAge":31536000}};

function isPublicAssetURL(id = '') {
  if (assets[id]) {
    return true
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) { return true }
  }
  return false
}

function getAsset (id) {
  return assets[id]
}

const METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
const EncodingMap = { gzip: ".gz", br: ".br" };
const _qoihGq = eventHandler((event) => {
  if (event.method && !METHODS.has(event.method)) {
    return;
  }
  let id = decodePath(
    withLeadingSlash(withoutTrailingSlash(parseURL(event.path).pathname))
  );
  let asset;
  const encodingHeader = String(
    getRequestHeader(event, "accept-encoding") || ""
  );
  const encodings = [
    ...encodingHeader.split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(),
    ""
  ];
  for (const encoding of encodings) {
    for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
      const _asset = getAsset(_id);
      if (_asset) {
        asset = _asset;
        id = _id;
        break;
      }
    }
  }
  if (!asset) {
    if (isPublicAssetURL(id)) {
      removeResponseHeader(event, "Cache-Control");
      throw createError$1({ statusCode: 404 });
    }
    return;
  }
  if (asset.encoding !== void 0) {
    appendResponseHeader(event, "Vary", "Accept-Encoding");
  }
  const ifNotMatch = getRequestHeader(event, "if-none-match") === asset.etag;
  if (ifNotMatch) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  const ifModifiedSinceH = getRequestHeader(event, "if-modified-since");
  const mtimeDate = new Date(asset.mtime);
  if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  if (asset.type && !getResponseHeader(event, "Content-Type")) {
    setResponseHeader(event, "Content-Type", asset.type);
  }
  if (asset.etag && !getResponseHeader(event, "ETag")) {
    setResponseHeader(event, "ETag", asset.etag);
  }
  if (asset.mtime && !getResponseHeader(event, "Last-Modified")) {
    setResponseHeader(event, "Last-Modified", mtimeDate.toUTCString());
  }
  if (asset.encoding && !getResponseHeader(event, "Content-Encoding")) {
    setResponseHeader(event, "Content-Encoding", asset.encoding);
  }
  if (asset.size > 0 && !getResponseHeader(event, "Content-Length")) {
    setResponseHeader(event, "Content-Length", asset.size);
  }
  return readAsset(id);
});

const HTTP_SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; frame-src 'self' https://embed.figma.com https://www.figma.com; form-action 'self'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

const _7yksNR = defineEventHandler((event) => {
  for (const [name, value] of Object.entries(HTTP_SECURITY_HEADERS)) {
    setHeader(event, name, value);
  }
});

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
class AuthorizationError extends Error {
  constructor(code) {
    super(code);
    __publicField$1(this, "code", code);
    __publicField$1(this, "statusCode", 403);
    this.name = "AuthorizationError";
  }
}

const API_ACCESS = {
  NOT_API: "not-api",
  PUBLIC: "public",
  AUTHENTICATED: "authenticated",
  SUPER_ADMIN: "super-admin"
};
const PUBLIC_ENDPOINTS = /* @__PURE__ */ new Set([
  "POST /api/identity/sign-in",
  "POST /api/identity/request-password-reset",
  "POST /api/identity/reset-password",
  "GET /api/health/database",
  "GET /api/health/live",
  "GET /api/health/ready"
]);
function isPathOrDescendant(path, root) {
  return path === root || path.startsWith(`${root}/`);
}
const publicDocumentationToken = /^[A-Za-z0-9_-]{43}$/u;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
function isPublicDocumentationEndpoint(method, path) {
  var _a, _b;
  if (method.toUpperCase() !== "GET") return false;
  const segments = path.split("/").filter(Boolean);
  if (segments[0] !== "api" || segments[1] !== "public" || segments[2] !== "documentation" || !publicDocumentationToken.test((_a = segments[3]) != null ? _a : "")) return false;
  if (segments.length === 4) return true;
  return segments.length === 6 && (segments[4] === "pages" || segments[4] === "images") && uuid.test((_b = segments[5]) != null ? _b : "");
}
function classifyApiAccess(method, path) {
  if (!isPathOrDescendant(path, "/api")) {
    return API_ACCESS.NOT_API;
  }
  if (isPathOrDescendant(path, "/api/auth") || PUBLIC_ENDPOINTS.has(`${method.toUpperCase()} ${path}`) || isPublicDocumentationEndpoint(method, path)) {
    return API_ACCESS.PUBLIC;
  }
  if (isPathOrDescendant(path, "/api/administration")) {
    return API_ACCESS.SUPER_ADMIN;
  }
  return API_ACCESS.AUTHENTICATED;
}

const AUTHORIZATION_CODE = {
  FORBIDDEN: "FORBIDDEN"
};

const ACCOUNT_STATUS = {
  ACTIVE: "active",
  DISABLED: "disabled"
};
const AUTH_MODE = {
  RUNTIME: "runtime"};
const IDENTITY_CODE = {
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  ACCOUNT_DISABLED: "ACCOUNT_DISABLED",
  RESET_REQUEST_ACCEPTED: "RESET_REQUEST_ACCEPTED",
  RESET_TOKEN_INVALID: "RESET_TOKEN_INVALID",
  RATE_LIMITED: "RATE_LIMITED",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE"
};
const LOGIN_IDENTIFIER_KIND = {
  EMAIL: "email",
  USERNAME: "username"
};
const OAUTH_GRANT_STATUS = {
  ACTIVE: "active",
  REVOKED: "revoked"
};

const credentialKeysSchema = z.string().transform((value, context) => {
  var _a;
  const keys = /* @__PURE__ */ new Map();
  const entries = value.split(",").map((entry) => entry.trim()).filter(Boolean);
  for (const entry of entries) {
    const match = /^(\d+):([A-Za-z0-9+/]+={0,2})$/.exec(entry);
    const version = match ? Number(match[1]) : 0;
    const encoded = (_a = match == null ? void 0 : match[2]) != null ? _a : "";
    const key = Buffer.from(encoded, "base64");
    if (!match || !Number.isSafeInteger(version) || version < 1 || keys.has(version) || key.length !== 32 || key.toString("base64") !== encoded) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid credential encryption key configuration" });
      return z.NEVER;
    }
    keys.set(version, key);
  }
  if (keys.size === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "At least one credential encryption key is required" });
    return z.NEVER;
  }
  return keys;
});
const mcpResourceUrlSchema = z.string().transform((value, context) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid MCP resource URL" });
    return z.NEVER;
  }
  const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "[::1]";
  const secureProtocol = url.protocol === "https:" || url.protocol === "http:" && loopback;
  const canonical = url.toString() === value;
  if (!secureProtocol || !canonical || url.pathname !== "/mcp" || url.username || url.password || url.search || url.hash) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid canonical MCP resource URL" });
    return z.NEVER;
  }
  return value;
});
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  MCP_RESOURCE_URL: mcpResourceUrlSchema,
  TRUSTED_ORIGINS: z.string().transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean)).pipe(z.array(z.string().url()).min(1)),
  RATE_LIMIT_HMAC_SECRET: z.string().min(32),
  TRUST_PROXY: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  MAIL_FROM: z.string().min(3),
  MAILPIT_API_URL: z.string().url().optional()
});
const credentialEncryptionEnvSchema = z.object({
  CREDENTIAL_ENCRYPTION_ACTIVE_KEY_VERSION: z.coerce.number().int().positive(),
  CREDENTIAL_ENCRYPTION_KEYS: credentialKeysSchema
}).superRefine((value, context) => {
  if (!value.CREDENTIAL_ENCRYPTION_KEYS.has(value.CREDENTIAL_ENCRYPTION_ACTIVE_KEY_VERSION)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["CREDENTIAL_ENCRYPTION_ACTIVE_KEY_VERSION"],
      message: "Active credential encryption key version is unavailable"
    });
  }
});
const objectStorageEnvSchema = z.object({
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(8),
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("true").transform((value) => value === "true")
});
function parseServerEnv(input) {
  return serverEnvSchema.parse(input);
}
function parseCredentialEncryptionEnv(input) {
  return credentialEncryptionEnvSchema.parse(input);
}
function parseObjectStorageEnv(input) {
  return objectStorageEnvSchema.parse(input);
}

const DEFAULT_MAX_SECRET_BYTES = 65536;
class SecretFileConfigurationError extends Error {
  constructor(key) {
    super(`Invalid secret file configuration for ${key}`);
    this.name = "SecretFileConfigurationError";
  }
}
const removeSingleTrailingLineEnding = (value) => value.endsWith("\r\n") ? value.slice(0, -2) : value.endsWith("\n") ? value.slice(0, -1) : value;
const resolveSecretFileValues = (input, keys, readFile, maxSecretBytes = DEFAULT_MAX_SECRET_BYTES) => {
  const resolved = { ...input };
  for (const key of keys) {
    const fileKey = `${key}_FILE`;
    const directValue = input[key];
    const filePath = input[fileKey];
    if (directValue !== void 0 && filePath !== void 0) {
      throw new SecretFileConfigurationError(key);
    }
    if (filePath === void 0) continue;
    if (filePath.length === 0) throw new SecretFileConfigurationError(key);
    try {
      const content = readFile(filePath);
      if (Buffer.byteLength(content, "utf8") > maxSecretBytes) {
        throw new SecretFileConfigurationError(key);
      }
      resolved[key] = removeSingleTrailingLineEnding(content);
    } catch (error) {
      if (error instanceof SecretFileConfigurationError) throw error;
      throw new SecretFileConfigurationError(key);
    }
  }
  return resolved;
};

const SERVER_SECRET_KEYS = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "RATE_LIMIT_HMAC_SECRET"
];
const CREDENTIAL_SECRET_KEYS = ["CREDENTIAL_ENCRYPTION_KEYS"];
const OBJECT_STORAGE_SECRET_KEYS = ["S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
const readSecretFile = (path) => readFileSync(path, "utf8");
let cachedServerEnv;
let cachedCredentialEncryptionEnv;
let cachedObjectStorageEnv;
const getServerEnv = () => cachedServerEnv != null ? cachedServerEnv : cachedServerEnv = parseServerEnv(
  resolveSecretFileValues(process.env, SERVER_SECRET_KEYS, readSecretFile)
);
const getCredentialEncryptionEnv = () => cachedCredentialEncryptionEnv != null ? cachedCredentialEncryptionEnv : cachedCredentialEncryptionEnv = parseCredentialEncryptionEnv(
  resolveSecretFileValues(process.env, CREDENTIAL_SECRET_KEYS, readSecretFile)
);
const getObjectStorageEnv = () => cachedObjectStorageEnv != null ? cachedObjectStorageEnv : cachedObjectStorageEnv = parseObjectStorageEnv(
  resolveSecretFileValues(process.env, OBJECT_STORAGE_SECRET_KEYS, readSecretFile)
);
const initializeRuntimeConfiguration = () => {
  getServerEnv();
  getCredentialEncryptionEnv();
  getObjectStorageEnv();
};

function createDatabase(url, max = 10) {
  const queryClient = postgres(url, { max });
  return {
    db: drizzle(queryClient),
    queryClient,
    close: () => queryClient.end()
  };
}
let runtimeDatabase;
function getDatabase() {
  return runtimeDatabase != null ? runtimeDatabase : runtimeDatabase = createDatabase(getServerEnv().DATABASE_URL);
}

function createSmtpPasswordResetMailer(options) {
  const transport = nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: false
  });
  return {
    async sendPasswordReset({ to, resetUrl }) {
      try {
        await transport.sendMail({
          from: options.from,
          to,
          subject: "\u0412\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0430\u0440\u043E\u043B\u044F Minerva",
          text: `\u0414\u043B\u044F \u0441\u043C\u0435\u043D\u044B \u043F\u0430\u0440\u043E\u043B\u044F \u043F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043F\u043E \u0441\u0441\u044B\u043B\u043A\u0435: ${resetUrl}`
        });
      } catch {
        throw new Error("Password reset email delivery failed.");
      }
    }
  };
}

const user = pgTable("user", {
  id: uuid$2("id").default(sql`pg_catalog.gen_random_uuid()`).primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull(),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  superAdmin: boolean("super_admin").default(false).notNull(),
  status: text("status", { enum: ["active", "disabled"] }).default("active").notNull(),
  disabledAt: timestamp("disabled_at"),
  disabledReason: text("disabled_reason"),
  lastLoginAt: timestamp("last_login_at")
});
const session = pgTable(
  "session",
  {
    id: uuid$2("id").default(sql`pg_catalog.gen_random_uuid()`).primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => /* @__PURE__ */ new Date()).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid$2("user_id").notNull().references(() => user.id, { onDelete: "cascade" })
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);
const account = pgTable(
  "account",
  {
    id: uuid$2("id").default(sql`pg_catalog.gen_random_uuid()`).primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid$2("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);
const verification = pgTable(
  "verification",
  {
    id: uuid$2("id").default(sql`pg_catalog.gen_random_uuid()`).primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);
const rateLimit = pgTable("rate_limit", {
  id: uuid$2("id").default(sql`pg_catalog.gen_random_uuid()`).primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull()
});
const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account)
}));
const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id]
  })
}));
const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id]
  })
}));

const AI_PROVIDER = {
  OPENAI: "openai"
};
const AI_CONNECTION_STATUS = {
  UNVERIFIED: "unverified",
  VALID: "valid",
  INVALID: "invalid"
};
const AI_ASSISTANT_AVAILABILITY = {
  READY: "ready",
  NOT_CONFIGURED: "not_configured",
  DISABLED: "disabled",
  NEEDS_VALIDATION: "needs_validation"
};
const AI_DOCUMENT_PROPOSAL_KIND = {
  CREATE: "create",
  UPDATE: "update"
};
const AI_DOCUMENT_PROPOSAL_STATUS = {
  PENDING: "pending",
  APPLIED: "applied",
  REJECTED: "rejected",
  STALE: "stale",
  EXPIRED: "expired"
};
const AI_DOCUMENT_PROPOSAL_DECISION = {
  CONFIRM: "confirm",
  REJECT: "reject"
};
const AI_DOCUMENT_PROPOSAL_CONTENT_MAX_BYTES = 64 * 1024;
const AI_MODEL_MAX_LENGTH = 100;
const AI_API_KEY_MIN_LENGTH = 16;
const AI_API_KEY_MAX_LENGTH = 512;
const AI_SYSTEM_INSTRUCTIONS_MAX_LENGTH = 4e3;
const AI_MAX_OUTPUT_TOKENS_MIN = 128;
const AI_MAX_OUTPUT_TOKENS_MAX = 8192;
const AI_REQUEST_TIMEOUT_MS_MIN = 5e3;
const AI_REQUEST_TIMEOUT_MS_MAX = 12e4;
const AI_QUESTION_MAX_LENGTH = 4e3;
const AI_ASSISTANT_ANSWER_MAX_LENGTH = 12e3;
const AI_TURN_RATE_MAX_REQUESTS = 10;
const AI_TURN_RATE_WINDOW_SECONDS = 300;
const AI_TURN_LEASE_GRACE_MS = 15e3;
const AI_TURN_ERROR_CODE_MAX_LENGTH = 100;
const AI_CONVERSATION_TITLE_MAX_LENGTH = 120;
const AI_CONVERSATION_RETENTION_DAYS = 30;
const AI_CONVERSATION_TRASH_DAYS = 7;
const AI_CONVERSATION_PAGE_DEFAULT = 20;
const AI_CONVERSATION_PAGE_MAX = 50;
const AI_CONVERSATION_STATUS = {
  ACTIVE: "active",
  TRASH: "trash"
};
const AI_CONVERSATION_MESSAGE_ROLE = {
  USER: "user",
  ASSISTANT: "assistant"
};
const AI_TURN_OUTCOME = {
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
  DENIED: "denied"
};
const AI_ASSISTANT_STREAM_EVENT = {
  CONTEXT: "context",
  DELTA: "delta",
  COMPLETED: "completed",
  ERROR: "error"
};
const AI_ASSISTANT_STREAM_ERROR = {
  PERMISSION_DENIED: "PERMISSION_DENIED",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  CANCELLED: "CANCELLED"
};

const PROJECT_PERMISSION = {
  PROJECT_VIEW: "project.view",
  PROJECT_UPDATE: "project.update",
  PROJECT_PAUSE: "project.pause",
  PROJECT_RESUME: "project.resume",
  PROJECT_CLOSE: "project.close",
  PROJECT_REOPEN: "project.reopen",
  PROJECT_ARCHIVE: "project.archive",
  PROJECT_RESTORE: "project.restore",
  DOCUMENTS_VIEW: "documents.view",
  DOCUMENTS_CREATE: "documents.create",
  DOCUMENTS_UPDATE_DRAFT: "documents.update_draft",
  DOCUMENTS_PUBLISH: "documents.publish",
  DOCUMENTS_MOVE: "documents.move",
  DOCUMENTS_ARCHIVE: "documents.archive",
  DOCUMENTS_RESTORE: "documents.restore",
  DOCUMENTS_VIEW_HISTORY: "documents.view_history",
  DOCUMENTS_SHARE: "documents.share",
  MEMBERS_VIEW: "members.view",
  MEMBERS_INVITE: "members.invite",
  MEMBERS_ASSIGN_ROLE: "members.assign_role",
  MEMBERS_REMOVE: "members.remove",
  ROLES_VIEW: "roles.view",
  ROLES_CREATE: "roles.create",
  ROLES_UPDATE: "roles.update",
  ROLES_DELETE: "roles.delete",
  AUDIT_VIEW: "audit.view",
  CREDENTIALS_VIEW: "credentials.view",
  CREDENTIALS_CREATE: "credentials.create",
  CREDENTIALS_UPDATE: "credentials.update",
  CREDENTIALS_ARCHIVE: "credentials.archive",
  CREDENTIAL_CATEGORIES_CREATE: "credential_categories.create",
  CREDENTIAL_CATEGORIES_UPDATE: "credential_categories.update",
  CREDENTIAL_CATEGORIES_ARCHIVE: "credential_categories.archive",
  CREDENTIAL_CATEGORIES_MANAGE_ACCESS: "credential_categories.manage_access",
  PROJECT_AI_USE: "project.ai.use",
  PROJECT_AI_MANAGE: "project.ai.manage"
};
const PROJECT_STATUS = {
  ACTIVE: "active",
  PAUSED: "paused",
  CLOSED: "closed",
  ARCHIVED: "archived"
};
const PROJECT_NAME_MAX_LENGTH = 120;
const PROJECT_DESCRIPTION_MAX_LENGTH = 2e3;
const PROJECT_LIST_DEFAULT_LIMIT = 50;
const PROJECT_LIST_MAX_LIMIT = 100;
const PROJECT_ICON_MAX_BYTES = 2 * 1024 * 1024;
const PROJECT_ICON_MIME_TYPE = {
  PNG: "image/png",
  JPEG: "image/jpeg",
  WEBP: "image/webp"
};
const CREATE_PROJECT_ERROR = {
  INVALID_REQUEST: "INVALID_REQUEST",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  ACCOUNT_INACTIVE: "ACCOUNT_INACTIVE",
  INVALID_PROJECT_NAME: "INVALID_PROJECT_NAME",
  INVALID_PROJECT_DESCRIPTION: "INVALID_PROJECT_DESCRIPTION",
  PROJECT_CREATE_FAILED: "PROJECT_CREATE_FAILED"
};
const PROJECT_ROLE_KEY = {
  ADMIN: "admin",
  EDITOR: "editor",
  VIEWER: "viewer"
};
const PROJECT_ROLE_KIND = {
  BUILT_IN: "built_in",
  CUSTOM: "custom"
};
const MEMBERSHIP_STATUS = {
  ACTIVE: "active",
  REMOVED: "removed"
};
const AUDIT_CHANNEL = {
  WEB: "web",
  API: "api",
  MCP: "mcp",
  SYSTEM: "system"
};
const AUDIT_OUTCOME = {
  SUCCEEDED: "succeeded",
  FAILED: "failed"
};

const PROJECT_LIFECYCLE_TRANSITION = {
  PAUSE: "pause",
  RESUME: "resume",
  CLOSE: "close",
  REOPEN: "reopen",
  ARCHIVE: "archive",
  RESTORE: "restore"
};
const PROJECT_OPERATION_MODE = {
  AUTHENTICATED_READ: "authenticated_read",
  CREDENTIAL_REVEAL: "credential_reveal",
  WORK_MUTATION: "work_mutation",
  SECURITY_REDUCTION: "security_reduction",
  AI: "ai",
  MCP: "mcp",
  PUBLIC_READ: "public_read",
  PUBLIC_CAPABILITY_ISSUE: "public_capability_issue",
  PUBLIC_CAPABILITY_REVOKE: "public_capability_revoke"
};
const PROJECT_LIFECYCLE_RECEIPT_OUTCOME = {
  APPLIED: "applied",
  REPLAYED: "replayed"
};
const PROJECT_LIFECYCLE_CONFLICT_CODE = {
  STALE_REVISION: "stale_revision",
  TRANSITION_NOT_ALLOWED: "transition_not_allowed",
  TRANSITION_ID_CONFLICT: "transition_id_conflict"
};
const PROJECT_LIFECYCLE_REASON_MAX_LENGTH = 500;
const PROJECT_LIFECYCLE_PERMISSION_BY_TRANSITION = {
  [PROJECT_LIFECYCLE_TRANSITION.PAUSE]: PROJECT_PERMISSION.PROJECT_PAUSE,
  [PROJECT_LIFECYCLE_TRANSITION.RESUME]: PROJECT_PERMISSION.PROJECT_RESUME,
  [PROJECT_LIFECYCLE_TRANSITION.CLOSE]: PROJECT_PERMISSION.PROJECT_CLOSE,
  [PROJECT_LIFECYCLE_TRANSITION.REOPEN]: PROJECT_PERMISSION.PROJECT_REOPEN,
  [PROJECT_LIFECYCLE_TRANSITION.ARCHIVE]: PROJECT_PERMISSION.PROJECT_ARCHIVE,
  [PROJECT_LIFECYCLE_TRANSITION.RESTORE]: PROJECT_PERMISSION.PROJECT_RESTORE
};
const availableTransitions = {
  [PROJECT_STATUS.ACTIVE]: [
    PROJECT_LIFECYCLE_TRANSITION.PAUSE,
    PROJECT_LIFECYCLE_TRANSITION.CLOSE
  ],
  [PROJECT_STATUS.PAUSED]: [
    PROJECT_LIFECYCLE_TRANSITION.RESUME,
    PROJECT_LIFECYCLE_TRANSITION.CLOSE
  ],
  [PROJECT_STATUS.CLOSED]: [
    PROJECT_LIFECYCLE_TRANSITION.REOPEN,
    PROJECT_LIFECYCLE_TRANSITION.ARCHIVE
  ],
  [PROJECT_STATUS.ARCHIVED]: [PROJECT_LIFECYCLE_TRANSITION.RESTORE]
};
const transitionTargets = {
  [PROJECT_STATUS.ACTIVE]: {
    [PROJECT_LIFECYCLE_TRANSITION.PAUSE]: PROJECT_STATUS.PAUSED,
    [PROJECT_LIFECYCLE_TRANSITION.CLOSE]: PROJECT_STATUS.CLOSED
  },
  [PROJECT_STATUS.PAUSED]: {
    [PROJECT_LIFECYCLE_TRANSITION.RESUME]: PROJECT_STATUS.ACTIVE,
    [PROJECT_LIFECYCLE_TRANSITION.CLOSE]: PROJECT_STATUS.CLOSED
  },
  [PROJECT_STATUS.CLOSED]: {
    [PROJECT_LIFECYCLE_TRANSITION.REOPEN]: PROJECT_STATUS.ACTIVE,
    [PROJECT_LIFECYCLE_TRANSITION.ARCHIVE]: PROJECT_STATUS.ARCHIVED
  },
  [PROJECT_STATUS.ARCHIVED]: {
    [PROJECT_LIFECYCLE_TRANSITION.RESTORE]: PROJECT_STATUS.CLOSED
  }
};
/* @__PURE__ */ new Set([
  PROJECT_OPERATION_MODE.AUTHENTICATED_READ,
  PROJECT_OPERATION_MODE.CREDENTIAL_REVEAL,
  PROJECT_OPERATION_MODE.SECURITY_REDUCTION,
  PROJECT_OPERATION_MODE.PUBLIC_READ,
  PROJECT_OPERATION_MODE.PUBLIC_CAPABILITY_REVOKE
]);
const decideProjectLifecycleTransition = (state, transition) => {
  const nextState = transitionTargets[state][transition];
  return nextState === void 0 ? { type: "reject", code: "transition_not_allowed", state, transition } : { type: "apply", previousState: state, nextState, transition };
};
const availableProjectLifecycleTransitions = (state) => availableTransitions[state];

const enumValues$3 = (values) => Object.values(values);
const enumValueSql = (value) => sql.raw(`'${value.replaceAll("'", "''")}'`);
const enumSql$3 = (values) => sql.raw(Object.values(values).map((value) => `'${value.replaceAll("'", "''")}'`).join(", "));
const timezoneTimestamp$7 = (name) => timestamp(name, { withTimezone: true });
const projects = pgTable("projects", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  descriptionContent: jsonb("description_content").$type().default({ type: "doc", content: [] }).notNull(),
  status: text("status", { enum: enumValues$3(PROJECT_STATUS) }).default(PROJECT_STATUS.ACTIVE).notNull(),
  createdByUserId: uuid$2("created_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  createdAt: timezoneTimestamp$7("created_at").defaultNow().notNull(),
  updatedAt: timezoneTimestamp$7("updated_at").defaultNow().notNull(),
  archivedAt: timezoneTimestamp$7("archived_at"),
  archivedByUserId: uuid$2("archived_by_user_id").references(() => user.id, { onDelete: "restrict" }),
  lifecycleRevision: integer("lifecycle_revision").default(0).notNull(),
  statusChangedAt: timezoneTimestamp$7("status_changed_at").defaultNow().notNull(),
  statusChangedByUserId: uuid$2("status_changed_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" })
}, (table) => [
  check("projects_status_check", sql`${table.status} in (${enumSql$3(PROJECT_STATUS)})`),
  check("projects_lifecycle_revision_check", sql`${table.lifecycleRevision} >= 0`),
  check("projects_archive_state_check", sql`
    (
      ${table.status} = ${enumValueSql(PROJECT_STATUS.ARCHIVED)}
      and ${table.archivedAt} is not null
      and ${table.archivedByUserId} is not null
    )
    or (
      ${table.status} <> ${enumValueSql(PROJECT_STATUS.ARCHIVED)}
      and ${table.archivedAt} is null
      and ${table.archivedByUserId} is null
    )
  `),
  check("projects_name_check", sql`${table.name} = btrim(${table.name}) and char_length(${table.name}) between 1 and 120`),
  check("projects_description_check", sql`
    ${table.description} is null
    or (${table.description} = btrim(${table.description}) and char_length(${table.description}) <= 2000)
  `),
  index("projects_status_idx").on(table.status),
  index("projects_created_by_user_id_idx").on(table.createdByUserId),
  index("projects_archived_by_user_id_idx").on(table.archivedByUserId),
  index("projects_status_changed_by_user_id_idx").on(table.statusChangedByUserId)
]);
const projectLifecycleEvents = pgTable("project_lifecycle_events", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  projectId: uuid$2("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  transition: text("transition", { enum: enumValues$3(PROJECT_LIFECYCLE_TRANSITION) }).notNull(),
  previousState: text("previous_state", { enum: enumValues$3(PROJECT_STATUS) }).notNull(),
  nextState: text("next_state", { enum: enumValues$3(PROJECT_STATUS) }).notNull(),
  revision: integer("revision").notNull(),
  reason: text("reason"),
  actorUserId: uuid$2("actor_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  channel: text("channel", { enum: enumValues$3(AUDIT_CHANNEL) }).notNull(),
  transitionId: uuid$2("transition_id").notNull(),
  createdAt: timezoneTimestamp$7("created_at").defaultNow().notNull()
}, (table) => [
  check("project_lifecycle_events_transition_check", sql`${table.transition} in (${enumSql$3(PROJECT_LIFECYCLE_TRANSITION)})`),
  check("project_lifecycle_events_previous_state_check", sql`${table.previousState} in (${enumSql$3(PROJECT_STATUS)})`),
  check("project_lifecycle_events_next_state_check", sql`${table.nextState} in (${enumSql$3(PROJECT_STATUS)})`),
  check("project_lifecycle_events_revision_check", sql`${table.revision} > 0`),
  check("project_lifecycle_events_reason_check", sql`
    ${table.reason} is null
    or (
      ${table.reason} = btrim(${table.reason})
      and char_length(${table.reason}) between 1 and ${sql.raw(String(PROJECT_LIFECYCLE_REASON_MAX_LENGTH))}
    )
  `),
  check("project_lifecycle_events_transition_state_check", sql`
    (${table.transition} = ${enumValueSql(PROJECT_LIFECYCLE_TRANSITION.PAUSE)} and ${table.previousState} = ${enumValueSql(PROJECT_STATUS.ACTIVE)} and ${table.nextState} = ${enumValueSql(PROJECT_STATUS.PAUSED)})
    or (${table.transition} = ${enumValueSql(PROJECT_LIFECYCLE_TRANSITION.RESUME)} and ${table.previousState} = ${enumValueSql(PROJECT_STATUS.PAUSED)} and ${table.nextState} = ${enumValueSql(PROJECT_STATUS.ACTIVE)})
    or (${table.transition} = ${enumValueSql(PROJECT_LIFECYCLE_TRANSITION.CLOSE)} and ${table.previousState} in (${enumValueSql(PROJECT_STATUS.ACTIVE)}, ${enumValueSql(PROJECT_STATUS.PAUSED)}) and ${table.nextState} = ${enumValueSql(PROJECT_STATUS.CLOSED)})
    or (${table.transition} = ${enumValueSql(PROJECT_LIFECYCLE_TRANSITION.REOPEN)} and ${table.previousState} = ${enumValueSql(PROJECT_STATUS.CLOSED)} and ${table.nextState} = ${enumValueSql(PROJECT_STATUS.ACTIVE)})
    or (${table.transition} = ${enumValueSql(PROJECT_LIFECYCLE_TRANSITION.ARCHIVE)} and ${table.previousState} = ${enumValueSql(PROJECT_STATUS.CLOSED)} and ${table.nextState} = ${enumValueSql(PROJECT_STATUS.ARCHIVED)})
    or (${table.transition} = ${enumValueSql(PROJECT_LIFECYCLE_TRANSITION.RESTORE)} and ${table.previousState} = ${enumValueSql(PROJECT_STATUS.ARCHIVED)} and ${table.nextState} = ${enumValueSql(PROJECT_STATUS.CLOSED)})
  `),
  check("project_lifecycle_events_channel_check", sql`${table.channel} in (${enumSql$3(AUDIT_CHANNEL)})`),
  unique("project_lifecycle_events_project_id_revision_unique").on(table.projectId, table.revision),
  unique("project_lifecycle_events_project_id_transition_id_unique").on(table.projectId, table.transitionId),
  index("project_lifecycle_events_project_created_at_idx").on(table.projectId, table.createdAt),
  index("project_lifecycle_events_actor_user_id_idx").on(table.actorUserId)
]);
const projectRoles = pgTable("project_roles", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  projectId: uuid$2("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: enumValues$3(PROJECT_ROLE_KIND) }).notNull(),
  builtInKey: text("built_in_key", { enum: enumValues$3(PROJECT_ROLE_KEY) }),
  displayName: text("display_name").notNull(),
  createdAt: timezoneTimestamp$7("created_at").defaultNow().notNull(),
  updatedAt: timezoneTimestamp$7("updated_at").defaultNow().notNull()
}, (table) => [
  check("project_roles_kind_check", sql`${table.kind} in (${enumSql$3(PROJECT_ROLE_KIND)})`),
  check("project_roles_built_in_key_check", sql`${table.builtInKey} is null or ${table.builtInKey} in (${enumSql$3(PROJECT_ROLE_KEY)})`),
  check("project_roles_kind_built_in_key_check", sql`
    (${table.kind} = ${enumValueSql(PROJECT_ROLE_KIND.BUILT_IN)} and ${table.builtInKey} is not null)
    or (${table.kind} = ${enumValueSql(PROJECT_ROLE_KIND.CUSTOM)} and ${table.builtInKey} is null)
  `),
  unique("project_roles_id_project_id_unique").on(table.id, table.projectId),
  uniqueIndex("project_roles_project_id_built_in_key_unique").on(table.projectId, table.builtInKey).where(sql`${table.builtInKey} is not null`),
  index("project_roles_project_id_idx").on(table.projectId)
]);
const projectRolePermissions = pgTable("project_role_permissions", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  roleId: uuid$2("role_id").notNull().references(() => projectRoles.id, { onDelete: "cascade" }),
  permissionCode: text("permission_code", { enum: enumValues$3(PROJECT_PERMISSION) }).notNull(),
  createdAt: timezoneTimestamp$7("created_at").defaultNow().notNull()
}, (table) => [
  check("project_role_permissions_permission_code_check", sql`${table.permissionCode} in (${enumSql$3(PROJECT_PERMISSION)})`),
  unique("project_role_permissions_role_id_permission_code_unique").on(table.roleId, table.permissionCode),
  index("project_role_permissions_role_id_idx").on(table.roleId)
]);
const projectMemberships = pgTable("project_memberships", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  projectId: uuid$2("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid$2("user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  roleId: uuid$2("role_id").notNull(),
  status: text("status", { enum: enumValues$3(MEMBERSHIP_STATUS) }).default(MEMBERSHIP_STATUS.ACTIVE).notNull(),
  joinedAt: timezoneTimestamp$7("joined_at").defaultNow().notNull(),
  updatedAt: timezoneTimestamp$7("updated_at").defaultNow().notNull(),
  removedAt: timezoneTimestamp$7("removed_at"),
  removedByUserId: uuid$2("removed_by_user_id").references(() => user.id, { onDelete: "restrict" })
}, (table) => [
  check("project_memberships_status_check", sql`${table.status} in (${enumSql$3(MEMBERSHIP_STATUS)})`),
  unique("project_memberships_project_id_user_id_unique").on(table.projectId, table.userId),
  unique("project_memberships_id_project_id_unique").on(table.id, table.projectId),
  foreignKey({
    name: "project_memberships_role_id_project_id_project_roles_fk",
    columns: [table.roleId, table.projectId],
    foreignColumns: [projectRoles.id, projectRoles.projectId]
  }).onDelete("restrict"),
  index("project_memberships_project_id_idx").on(table.projectId),
  index("project_memberships_user_id_idx").on(table.userId),
  index("project_memberships_role_id_idx").on(table.roleId),
  index("project_memberships_status_idx").on(table.status),
  index("project_memberships_removed_by_user_id_idx").on(table.removedByUserId)
]);
const auditEvents = pgTable("audit_events", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  createdAt: timezoneTimestamp$7("created_at").defaultNow().notNull(),
  actorUserId: uuid$2("actor_user_id").references(() => user.id, { onDelete: "restrict" }),
  channel: text("channel", { enum: enumValues$3(AUDIT_CHANNEL) }).notNull(),
  action: text("action").notNull(),
  outcome: text("outcome", { enum: enumValues$3(AUDIT_OUTCOME) }).notNull(),
  projectId: uuid$2("project_id").references(() => projects.id, { onDelete: "restrict" }),
  targetType: text("target_type").notNull(),
  targetId: uuid$2("target_id"),
  metadata: jsonb("metadata").default({}).notNull()
}, (table) => [
  check("audit_events_channel_check", sql`${table.channel} in (${enumSql$3(AUDIT_CHANNEL)})`),
  check("audit_events_outcome_check", sql`${table.outcome} in (${enumSql$3(AUDIT_OUTCOME)})`),
  index("audit_events_project_id_idx").on(table.projectId),
  index("audit_events_actor_user_id_idx").on(table.actorUserId),
  index("audit_events_action_idx").on(table.action),
  index("audit_events_created_at_idx").on(table.createdAt)
]);
const projectsRelations = relations(projects, ({ many, one }) => ({
  createdBy: one(user, { fields: [projects.createdByUserId], references: [user.id], relationName: "projectCreator" }),
  archivedBy: one(user, { fields: [projects.archivedByUserId], references: [user.id], relationName: "projectArchiver" }),
  roles: many(projectRoles),
  memberships: many(projectMemberships),
  auditEvents: many(auditEvents),
  lifecycleEvents: many(projectLifecycleEvents)
}));
const projectLifecycleEventsRelations = relations(projectLifecycleEvents, ({ one }) => ({
  project: one(projects, { fields: [projectLifecycleEvents.projectId], references: [projects.id] }),
  actor: one(user, { fields: [projectLifecycleEvents.actorUserId], references: [user.id] })
}));
const projectRolesRelations = relations(projectRoles, ({ many, one }) => ({
  project: one(projects, { fields: [projectRoles.projectId], references: [projects.id] }),
  permissions: many(projectRolePermissions),
  memberships: many(projectMemberships)
}));
const projectRolePermissionsRelations = relations(projectRolePermissions, ({ one }) => ({
  role: one(projectRoles, { fields: [projectRolePermissions.roleId], references: [projectRoles.id] })
}));
const projectMembershipsRelations = relations(projectMemberships, ({ one }) => ({
  project: one(projects, { fields: [projectMemberships.projectId], references: [projects.id] }),
  user: one(user, { fields: [projectMemberships.userId], references: [user.id], relationName: "projectMember" }),
  role: one(projectRoles, { fields: [projectMemberships.roleId], references: [projectRoles.id] }),
  removedBy: one(user, { fields: [projectMemberships.removedByUserId], references: [user.id], relationName: "membershipRemover" })
}));
const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  project: one(projects, { fields: [auditEvents.projectId], references: [projects.id] }),
  actor: one(user, { fields: [auditEvents.actorUserId], references: [user.id] })
}));

const enumValues$2 = (values) => Object.values(values);
const enumSql$2 = (values) => sql.raw(Object.values(values).map((value) => `'${value.replaceAll("'", "''")}'`).join(", "));
const numberSql$1 = (value) => sql.raw(String(value));
const literalSql = (value) => sql.raw(`'${value.replaceAll("'", "''")}'`);
const timezoneTimestamp$6 = (name) => timestamp(name, { withTimezone: true });
const projectAiConnections = pgTable("project_ai_connections", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  projectId: uuid$2("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  provider: text("provider", { enum: enumValues$2(AI_PROVIDER) }).notNull(),
  model: text("model").notNull(),
  apiKeyCiphertext: text("api_key_ciphertext").notNull(),
  apiKeyNonce: text("api_key_nonce").notNull(),
  apiKeyKeyVersion: integer("api_key_key_version").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  status: text("status", { enum: enumValues$2(AI_CONNECTION_STATUS) }).default(AI_CONNECTION_STATUS.UNVERIFIED).notNull(),
  systemInstructions: text("system_instructions"),
  maxOutputTokens: integer("max_output_tokens").default(2048).notNull(),
  requestTimeoutMs: integer("request_timeout_ms").default(3e4).notNull(),
  lastValidatedAt: timezoneTimestamp$6("last_validated_at"),
  createdByUserId: uuid$2("created_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  updatedByUserId: uuid$2("updated_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  createdAt: timezoneTimestamp$6("created_at").defaultNow().notNull(),
  updatedAt: timezoneTimestamp$6("updated_at").defaultNow().notNull()
}, (table) => [
  unique("project_ai_connections_project_id_unique").on(table.projectId),
  check("project_ai_connections_provider_check", sql`${table.provider} in (${enumSql$2(AI_PROVIDER)})`),
  check("project_ai_connections_status_check", sql`${table.status} in (${enumSql$2(AI_CONNECTION_STATUS)})`),
  check("project_ai_connections_model_check", sql`
    ${table.model} = btrim(${table.model})
    and char_length(${table.model}) between 1 and ${numberSql$1(AI_MODEL_MAX_LENGTH)}
  `),
  check("project_ai_connections_api_key_envelope_check", sql`
    char_length(${table.apiKeyCiphertext}) > 0
    and char_length(${table.apiKeyNonce}) > 0
    and ${table.apiKeyKeyVersion} > 0
  `),
  check("project_ai_connections_system_instructions_check", sql`
    ${table.systemInstructions} is null
    or (
      ${table.systemInstructions} = btrim(${table.systemInstructions})
      and char_length(${table.systemInstructions}) between 1 and ${numberSql$1(AI_SYSTEM_INSTRUCTIONS_MAX_LENGTH)}
    )
  `),
  check("project_ai_connections_limits_check", sql`
    ${table.maxOutputTokens} between ${numberSql$1(AI_MAX_OUTPUT_TOKENS_MIN)} and ${numberSql$1(AI_MAX_OUTPUT_TOKENS_MAX)}
    and ${table.requestTimeoutMs} between ${numberSql$1(AI_REQUEST_TIMEOUT_MS_MIN)} and ${numberSql$1(AI_REQUEST_TIMEOUT_MS_MAX)}
  `),
  index("project_ai_connections_status_idx").on(table.status),
  index("project_ai_connections_updated_by_user_id_idx").on(table.updatedByUserId)
]);
const projectAiConnectionsRelations = relations(projectAiConnections, ({ one }) => ({
  project: one(projects, { fields: [projectAiConnections.projectId], references: [projects.id] }),
  createdBy: one(user, {
    fields: [projectAiConnections.createdByUserId],
    references: [user.id],
    relationName: "projectAiConnectionCreator"
  }),
  updatedBy: one(user, {
    fields: [projectAiConnections.updatedByUserId],
    references: [user.id],
    relationName: "projectAiConnectionUpdater"
  })
}));
const projectAiTurnControls = pgTable("project_ai_turn_controls", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  projectId: uuid$2("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid$2("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  rateWindowStartedAt: timezoneTimestamp$6("rate_window_started_at").notNull(),
  rateCount: integer("rate_count").default(0).notNull(),
  leaseToken: uuid$2("lease_token"),
  leaseExpiresAt: timezoneTimestamp$6("lease_expires_at"),
  updatedAt: timezoneTimestamp$6("updated_at").defaultNow().notNull()
}, (table) => [
  unique("project_ai_turn_controls_project_user_unique").on(table.projectId, table.userId),
  check("project_ai_turn_controls_rate_count_check", sql`${table.rateCount} >= 0`),
  check("project_ai_turn_controls_lease_pair_check", sql`
    (${table.leaseToken} is null and ${table.leaseExpiresAt} is null)
    or (${table.leaseToken} is not null and ${table.leaseExpiresAt} is not null)
  `),
  index("project_ai_turn_controls_lease_expires_at_idx").on(table.leaseExpiresAt)
]);
const projectAiUsageEvents = pgTable("project_ai_usage_events", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  projectId: uuid$2("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid$2("user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  connectionId: uuid$2("connection_id").references(() => projectAiConnections.id, { onDelete: "set null" }),
  requestId: uuid$2("request_id").notNull(),
  provider: text("provider", { enum: enumValues$2(AI_PROVIDER) }).notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  durationMs: integer("duration_ms").notNull(),
  outcome: text("outcome", { enum: enumValues$2(AI_TURN_OUTCOME) }).notNull(),
  errorCode: text("error_code"),
  createdAt: timezoneTimestamp$6("created_at").defaultNow().notNull()
}, (table) => [
  unique("project_ai_usage_events_request_id_unique").on(table.requestId),
  check("project_ai_usage_events_provider_check", sql`${table.provider} in (${enumSql$2(AI_PROVIDER)})`),
  check("project_ai_usage_events_outcome_check", sql`${table.outcome} in (${enumSql$2(AI_TURN_OUTCOME)})`),
  check("project_ai_usage_events_model_check", sql`
    ${table.model} = btrim(${table.model})
    and char_length(${table.model}) between 1 and ${numberSql$1(AI_MODEL_MAX_LENGTH)}
  `),
  check("project_ai_usage_events_numbers_check", sql`
    (${table.inputTokens} is null or ${table.inputTokens} >= 0)
    and (${table.outputTokens} is null or ${table.outputTokens} >= 0)
    and ${table.durationMs} >= 0
  `),
  check("project_ai_usage_events_error_code_check", sql`
    ${table.errorCode} is null
    or (
      ${table.errorCode} = btrim(${table.errorCode})
      and char_length(${table.errorCode}) between 1 and ${numberSql$1(AI_TURN_ERROR_CODE_MAX_LENGTH)}
    )
  `),
  index("project_ai_usage_events_project_created_at_idx").on(table.projectId, table.createdAt),
  index("project_ai_usage_events_user_created_at_idx").on(table.userId, table.createdAt)
]);
const projectAiConversations = pgTable("project_ai_conversations", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  projectId: uuid$2("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid$2("user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  expiresAt: timezoneTimestamp$6("expires_at").notNull(),
  deletedAt: timezoneTimestamp$6("deleted_at"),
  purgeAfter: timezoneTimestamp$6("purge_after"),
  createdAt: timezoneTimestamp$6("created_at").defaultNow().notNull(),
  updatedAt: timezoneTimestamp$6("updated_at").defaultNow().notNull()
}, (table) => [
  check("project_ai_conversations_title_check", sql`
    ${table.title} = btrim(${table.title})
    and char_length(${table.title}) between 1 and ${numberSql$1(AI_CONVERSATION_TITLE_MAX_LENGTH)}
  `),
  check("project_ai_conversations_deletion_pair_check", sql`
    (${table.deletedAt} is null and ${table.purgeAfter} is null)
    or (${table.deletedAt} is not null and ${table.purgeAfter} is not null)
  `),
  index("project_ai_conversations_owner_active_idx").on(table.projectId, table.userId, table.deletedAt, table.updatedAt),
  index("project_ai_conversations_cleanup_idx").on(table.purgeAfter, table.expiresAt)
]);
const projectAiConversationMessages = pgTable("project_ai_conversation_messages", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  conversationId: uuid$2("conversation_id").notNull().references(() => projectAiConversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: enumValues$2(AI_CONVERSATION_MESSAGE_ROLE) }).notNull(),
  content: text("content").notNull(),
  citations: jsonb("citations").default([]).notNull(),
  turnRequestId: uuid$2("turn_request_id").notNull(),
  createdAt: timezoneTimestamp$6("created_at").defaultNow().notNull()
}, (table) => [
  check("project_ai_conversation_messages_role_check", sql`
    ${table.role} in (${enumSql$2(AI_CONVERSATION_MESSAGE_ROLE)})
  `),
  check("project_ai_conversation_messages_content_check", sql`
    char_length(${table.content}) between 1 and ${numberSql$1(AI_ASSISTANT_ANSWER_MAX_LENGTH)}
  `),
  check("project_ai_conversation_messages_citations_check", sql`
    jsonb_typeof(${table.citations}) = 'array'
  `),
  uniqueIndex("project_ai_conversation_messages_turn_role_unique").on(table.conversationId, table.turnRequestId, table.role),
  index("project_ai_conversation_messages_conversation_created_idx").on(table.conversationId, table.createdAt, table.id)
]);
const projectAiConversationsRelations = relations(projectAiConversations, ({ many, one }) => ({
  project: one(projects, { fields: [projectAiConversations.projectId], references: [projects.id] }),
  user: one(user, { fields: [projectAiConversations.userId], references: [user.id] }),
  messages: many(projectAiConversationMessages)
}));
const projectAiConversationMessagesRelations = relations(
  projectAiConversationMessages,
  ({ one }) => ({
    conversation: one(projectAiConversations, {
      fields: [projectAiConversationMessages.conversationId],
      references: [projectAiConversations.id]
    })
  })
);
const projectAiDocumentProposals = pgTable("project_ai_document_proposals", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  projectId: uuid$2("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid$2("user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  conversationId: uuid$2("conversation_id").notNull().references(() => projectAiConversations.id, { onDelete: "cascade" }),
  turnRequestId: uuid$2("turn_request_id").notNull(),
  kind: text("kind", { enum: enumValues$2(AI_DOCUMENT_PROPOSAL_KIND) }).notNull(),
  status: text("status", { enum: enumValues$2(AI_DOCUMENT_PROPOSAL_STATUS) }).default(AI_DOCUMENT_PROPOSAL_STATUS.PENDING).notNull(),
  targetDocumentId: uuid$2("target_document_id"),
  requestedParentId: uuid$2("requested_parent_id"),
  expectedDraftRevision: integer("expected_draft_revision"),
  baseTitle: text("base_title"),
  baseContent: jsonb("base_content").$type(),
  proposedTitle: text("proposed_title"),
  proposedContent: jsonb("proposed_content").$type(),
  contentHash: text("content_hash"),
  appliedDocumentId: uuid$2("applied_document_id"),
  appliedDraftRevision: integer("applied_draft_revision"),
  expiresAt: timezoneTimestamp$6("expires_at").notNull(),
  decidedAt: timezoneTimestamp$6("decided_at"),
  purgeAfter: timezoneTimestamp$6("purge_after"),
  createdAt: timezoneTimestamp$6("created_at").defaultNow().notNull(),
  updatedAt: timezoneTimestamp$6("updated_at").defaultNow().notNull()
}, (table) => [
  unique("project_ai_document_proposals_turn_unique").on(table.projectId, table.userId, table.conversationId, table.turnRequestId),
  check("project_ai_document_proposals_kind_check", sql`
    ${table.kind} in (${enumSql$2(AI_DOCUMENT_PROPOSAL_KIND)})
  `),
  check("project_ai_document_proposals_status_check", sql`
    ${table.status} in (${enumSql$2(AI_DOCUMENT_PROPOSAL_STATUS)})
  `),
  check("project_ai_document_proposals_payload_check", sql`
    (
      ${table.status} = ${literalSql(AI_DOCUMENT_PROPOSAL_STATUS.PENDING)}
      and ${table.proposedTitle} is not null
      and ${table.proposedContent} is not null
      and ${table.contentHash} is not null
      and ${table.decidedAt} is null
      and ${table.purgeAfter} is null
      and (
        (
          ${table.kind} = ${literalSql(AI_DOCUMENT_PROPOSAL_KIND.CREATE)}
          and ${table.targetDocumentId} is null
          and ${table.expectedDraftRevision} is null
          and ${table.baseTitle} is null
          and ${table.baseContent} is null
        )
        or (
          ${table.kind} = ${literalSql(AI_DOCUMENT_PROPOSAL_KIND.UPDATE)}
          and ${table.requestedParentId} is null
          and ${table.targetDocumentId} is not null
          and ${table.expectedDraftRevision} >= 0
          and ${table.baseTitle} is not null
          and ${table.baseContent} is not null
        )
      )
    )
    or (
      ${table.status} <> ${literalSql(AI_DOCUMENT_PROPOSAL_STATUS.PENDING)}
      and ${table.targetDocumentId} is null
      and ${table.requestedParentId} is null
      and ${table.expectedDraftRevision} is null
      and ${table.baseTitle} is null
      and ${table.baseContent} is null
      and ${table.proposedTitle} is null
      and ${table.proposedContent} is null
      and ${table.contentHash} is null
      and ${table.decidedAt} is not null
      and ${table.purgeAfter} is not null
    )
  `),
  check("project_ai_document_proposals_content_size_check", sql`
    (${table.baseContent} is null or octet_length(${table.baseContent}::text) <= ${numberSql$1(AI_DOCUMENT_PROPOSAL_CONTENT_MAX_BYTES)})
    and (${table.proposedContent} is null or octet_length(${table.proposedContent}::text) <= ${numberSql$1(AI_DOCUMENT_PROPOSAL_CONTENT_MAX_BYTES)})
    and (${table.baseTitle} is null or (${table.baseTitle} = btrim(${table.baseTitle}) and char_length(${table.baseTitle}) between 1 and 200))
    and (${table.proposedTitle} is null or (${table.proposedTitle} = btrim(${table.proposedTitle}) and char_length(${table.proposedTitle}) between 1 and 200))
    and (${table.contentHash} is null or ${table.contentHash} ~ '^[0-9a-f]{64}$')
  `),
  check("project_ai_document_proposals_receipt_check", sql`
    (
      ${table.status} = ${literalSql(AI_DOCUMENT_PROPOSAL_STATUS.APPLIED)}
      and ${table.appliedDocumentId} is not null
      and ${table.appliedDraftRevision} >= 0
    )
    or (
      ${table.status} <> ${literalSql(AI_DOCUMENT_PROPOSAL_STATUS.APPLIED)}
      and ${table.appliedDocumentId} is null
      and ${table.appliedDraftRevision} is null
    )
  `),
  check("project_ai_document_proposals_time_check", sql`
    ${table.expiresAt} > ${table.createdAt}
    and (${table.purgeAfter} is null or ${table.purgeAfter} > ${table.decidedAt})
  `),
  index("project_ai_document_proposals_owner_status_idx").on(table.projectId, table.userId, table.status, table.createdAt),
  index("project_ai_document_proposals_cleanup_idx").on(table.status, table.expiresAt, table.purgeAfter)
]);

const CREDENTIAL_FIELD_TYPE = {
  TEXT: "text",
  SECRET: "secret",
  URL: "url",
  NOTE: "note"
};

const enumValues$1 = (values) => Object.values(values);
const enumSql$1 = (values) => sql.raw(Object.values(values).map((value) => `'${value.replaceAll("'", "''")}'`).join(", "));
const timezoneTimestamp$5 = (name) => timestamp(name, { withTimezone: true });
const credentialCategories = pgTable("credential_categories", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  projectId: uuid$2("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  description: text("description"),
  position: integer("position").default(0).notNull(),
  createdByUserId: uuid$2("created_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  createdAt: timezoneTimestamp$5("created_at").defaultNow().notNull(),
  updatedAt: timezoneTimestamp$5("updated_at").defaultNow().notNull(),
  archivedAt: timezoneTimestamp$5("archived_at"),
  archivedByUserId: uuid$2("archived_by_user_id").references(() => user.id, { onDelete: "restrict" })
}, (table) => [
  check("credential_categories_name_check", sql`${table.name} = btrim(${table.name}) and char_length(${table.name}) between 1 and 120`),
  check("credential_categories_normalized_name_check", sql`${table.normalizedName} = btrim(${table.normalizedName}) and char_length(${table.normalizedName}) between 1 and 120`),
  check("credential_categories_description_check", sql`${table.description} is null or (${table.description} = btrim(${table.description}) and char_length(${table.description}) <= 2000)`),
  check("credential_categories_position_check", sql`${table.position} >= 0`),
  unique("credential_categories_id_project_id_unique").on(table.id, table.projectId),
  uniqueIndex("credential_categories_active_name_unique").on(table.projectId, table.normalizedName).where(sql`${table.archivedAt} is null`),
  index("credential_categories_project_id_position_idx").on(table.projectId, table.position)
]);
const credentialCategoryRoleGrants = pgTable("credential_category_role_grants", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  projectId: uuid$2("project_id").notNull(),
  categoryId: uuid$2("category_id").notNull(),
  roleId: uuid$2("role_id").notNull(),
  createdByUserId: uuid$2("created_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  createdAt: timezoneTimestamp$5("created_at").defaultNow().notNull()
}, (table) => [
  foreignKey({ columns: [table.categoryId, table.projectId], foreignColumns: [credentialCategories.id, credentialCategories.projectId], name: "credential_category_role_grants_category_project_fk" }).onDelete("cascade"),
  foreignKey({ columns: [table.roleId, table.projectId], foreignColumns: [projectRoles.id, projectRoles.projectId], name: "credential_category_role_grants_role_project_fk" }).onDelete("cascade"),
  unique("credential_category_role_grants_category_role_unique").on(table.categoryId, table.roleId),
  index("credential_category_role_grants_role_id_idx").on(table.roleId)
]);
const credentialCategoryMemberGrants = pgTable("credential_category_member_grants", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  projectId: uuid$2("project_id").notNull(),
  categoryId: uuid$2("category_id").notNull(),
  membershipId: uuid$2("membership_id").notNull(),
  createdByUserId: uuid$2("created_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  createdAt: timezoneTimestamp$5("created_at").defaultNow().notNull()
}, (table) => [
  foreignKey({ columns: [table.categoryId, table.projectId], foreignColumns: [credentialCategories.id, credentialCategories.projectId], name: "credential_category_member_grants_category_project_fk" }).onDelete("cascade"),
  foreignKey({ columns: [table.membershipId, table.projectId], foreignColumns: [projectMemberships.id, projectMemberships.projectId], name: "credential_category_member_grants_membership_project_fk" }).onDelete("cascade"),
  unique("credential_category_member_grants_category_membership_unique").on(table.categoryId, table.membershipId),
  index("credential_category_member_grants_membership_id_idx").on(table.membershipId)
]);
const credentials = pgTable("credentials", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  projectId: uuid$2("project_id").notNull(),
  categoryId: uuid$2("category_id").notNull(),
  title: text("title").notNull(),
  loginCiphertext: text("login_ciphertext"),
  loginNonce: text("login_nonce"),
  loginKeyVersion: integer("login_key_version"),
  passwordCiphertext: text("password_ciphertext"),
  passwordNonce: text("password_nonce"),
  passwordKeyVersion: integer("password_key_version"),
  createdByUserId: uuid$2("created_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  updatedByUserId: uuid$2("updated_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  createdAt: timezoneTimestamp$5("created_at").defaultNow().notNull(),
  updatedAt: timezoneTimestamp$5("updated_at").defaultNow().notNull(),
  archivedAt: timezoneTimestamp$5("archived_at"),
  archivedByUserId: uuid$2("archived_by_user_id").references(() => user.id, { onDelete: "restrict" })
}, (table) => [
  foreignKey({ columns: [table.categoryId, table.projectId], foreignColumns: [credentialCategories.id, credentialCategories.projectId], name: "credentials_category_project_fk" }).onDelete("restrict"),
  check("credentials_title_check", sql`${table.title} = btrim(${table.title}) and char_length(${table.title}) between 1 and 200`),
  check("credentials_login_envelope_check", sql`(${table.loginCiphertext} is null and ${table.loginNonce} is null and ${table.loginKeyVersion} is null) or (${table.loginCiphertext} is not null and ${table.loginNonce} is not null and ${table.loginKeyVersion} > 0)`),
  check("credentials_password_envelope_check", sql`(${table.passwordCiphertext} is null and ${table.passwordNonce} is null and ${table.passwordKeyVersion} is null) or (${table.passwordCiphertext} is not null and ${table.passwordNonce} is not null and ${table.passwordKeyVersion} > 0)`),
  unique("credentials_id_project_id_unique").on(table.id, table.projectId),
  index("credentials_category_id_updated_at_idx").on(table.categoryId, table.updatedAt)
]);
const credentialFields = pgTable("credential_fields", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  credentialId: uuid$2("credential_id").notNull().references(() => credentials.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  type: text("type", { enum: enumValues$1(CREDENTIAL_FIELD_TYPE) }).notNull(),
  position: integer("position").notNull(),
  ciphertext: text("ciphertext").notNull(),
  nonce: text("nonce").notNull(),
  keyVersion: integer("key_version").notNull(),
  createdAt: timezoneTimestamp$5("created_at").defaultNow().notNull(),
  updatedAt: timezoneTimestamp$5("updated_at").defaultNow().notNull()
}, (table) => [
  check("credential_fields_label_check", sql`${table.label} = btrim(${table.label}) and char_length(${table.label}) between 1 and 120`),
  check("credential_fields_type_check", sql`${table.type} in (${enumSql$1(CREDENTIAL_FIELD_TYPE)})`),
  check("credential_fields_position_check", sql`${table.position} >= 0`),
  check("credential_fields_key_version_check", sql`${table.keyVersion} > 0`),
  unique("credential_fields_credential_id_position_unique").on(table.credentialId, table.position),
  index("credential_fields_credential_id_idx").on(table.credentialId)
]);

const DOCUMENT_PUBLICATION_STATE = {
  DRAFT: "draft",
  PUBLISHED: "published"
};
const DOCUMENT_TEMPLATE = {
  BLANK: "blank",
  TECHNICAL_SPECIFICATION: "technical_specification",
  SITE_OVERVIEW: "site_overview",
  SECTION_DESCRIPTION: "section_description",
  TECHNICAL_NOTES: "technical_notes",
  OPERATING_INSTRUCTIONS: "operating_instructions"
};
const DOCUMENT_DRAFT_UPDATE_CODE = {
  DRAFT_CONFLICT: "DRAFT_CONFLICT"
};

const timezoneTimestamp$4 = (name) => timestamp(name, { withTimezone: true });
const documents = pgTable("documents", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  projectId: uuid$2("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  parentId: uuid$2("parent_id"),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  position: integer("position").default(0).notNull(),
  ownerUserId: uuid$2("owner_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  draftRevision: integer("draft_revision").default(0).notNull(),
  draftContent: jsonb("draft_content").$type().default(sql`'{"type":"doc","content":[]}'::jsonb`).notNull(),
  draftSearchText: text("draft_search_text").default("").notNull(),
  draftInternalLinkTargetIds: uuid$2("draft_internal_link_target_ids").array().default(sql`ARRAY[]::uuid[]`).notNull(),
  draftReferencedImageIds: uuid$2("draft_referenced_image_ids").array().default(sql`ARRAY[]::uuid[]`).notNull(),
  publicationState: text("publication_state").$type().default(DOCUMENT_PUBLICATION_STATE.DRAFT).notNull(),
  createdAt: timezoneTimestamp$4("created_at").defaultNow().notNull(),
  updatedAt: timezoneTimestamp$4("updated_at").defaultNow().notNull(),
  archivedAt: timezoneTimestamp$4("archived_at"),
  archivedByUserId: uuid$2("archived_by_user_id").references(() => user.id, { onDelete: "restrict" }),
  archiveBatchId: uuid$2("archive_batch_id")
}, (table) => [
  unique("documents_id_project_id_unique").on(table.id, table.projectId),
  foreignKey({
    columns: [table.parentId, table.projectId],
    foreignColumns: [table.id, table.projectId],
    name: "documents_parent_project_fk"
  }).onDelete("cascade"),
  check("documents_title_check", sql`${table.title} = btrim(${table.title}) and char_length(${table.title}) between 1 and 200`),
  check("documents_slug_check", sql`${table.slug} = lower(btrim(${table.slug})) and ${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(${table.slug}) between 1 and 160`),
  check("documents_position_check", sql`${table.position} >= 0`),
  check("documents_draft_revision_check", sql`${table.draftRevision} >= 0`),
  check("documents_publication_state_check", sql`${table.publicationState} in ('draft', 'published')`),
  check("documents_archive_state_check", sql`(${table.archivedAt} is null and ${table.archiveBatchId} is null) or (${table.archivedAt} is not null and ${table.archiveBatchId} is not null)`),
  uniqueIndex("documents_project_slug_unique").on(table.projectId, table.slug),
  index("documents_project_parent_position_idx").on(table.projectId, table.parentId, table.position),
  index("documents_project_archive_batch_idx").on(table.projectId, table.archiveBatchId),
  index("documents_owner_user_id_idx").on(table.ownerUserId),
  index("documents_archived_by_user_id_idx").on(table.archivedByUserId),
  index("documents_draft_search_idx").using("gin", sql`minerva_document_search_vector(${table.title}, ${table.draftSearchText})`)
]);
const documentVersions = pgTable("document_versions", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  projectId: uuid$2("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  documentId: uuid$2("document_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  sourceDraftRevision: integer("source_draft_revision").notNull(),
  title: text("title").notNull(),
  draftContent: jsonb("draft_content").$type().notNull(),
  searchText: text("search_text").default("").notNull(),
  internalLinkTargetIds: uuid$2("internal_link_target_ids").array().default(sql`ARRAY[]::uuid[]`).notNull(),
  referencedImageIds: uuid$2("referenced_image_ids").array().default(sql`ARRAY[]::uuid[]`).notNull(),
  changeSummary: text("change_summary").notNull(),
  publishedByUserId: uuid$2("published_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  publishedAt: timezoneTimestamp$4("published_at").defaultNow().notNull()
}, (table) => [
  unique("document_versions_document_number_unique").on(table.documentId, table.versionNumber),
  foreignKey({
    columns: [table.documentId, table.projectId],
    foreignColumns: [documents.id, documents.projectId],
    name: "document_versions_document_project_fk"
  }).onDelete("cascade"),
  check("document_versions_number_check", sql`${table.versionNumber} > 0`),
  check("document_versions_source_revision_check", sql`${table.sourceDraftRevision} >= 0`),
  check("document_versions_title_check", sql`${table.title} = btrim(${table.title}) and char_length(${table.title}) between 1 and 200`),
  check("document_versions_change_summary_check", sql`${table.changeSummary} = btrim(${table.changeSummary}) and char_length(${table.changeSummary}) between 0 and 1000`),
  index("document_versions_project_document_idx").on(table.projectId, table.documentId, table.versionNumber),
  index("document_versions_published_by_user_id_idx").on(table.publishedByUserId),
  index("document_versions_search_idx").using("gin", sql`minerva_document_search_vector(${table.title}, ${table.searchText})`)
]);

const DOCUMENT_PUBLIC_SHARE_SCOPE = {
  DOCUMENT: "document",
  BRANCH: "branch"
};
const DOCUMENT_PUBLIC_SHARE_STATUS = {
  ACTIVE: "active",
  REVOKED: "revoked"
};
const DOCUMENT_PUBLIC_SHARE_TOKEN_BYTES = 32;
const DOCUMENT_PUBLIC_SHARE_TOKEN_LENGTH = 43;
const DOCUMENT_PUBLIC_SHARE_TOKEN_HASH_LENGTH = 64;
const DOCUMENT_PUBLIC_SHARE_URL_MAX_LENGTH = 2048;

const enumValues = (values) => Object.values(values);
const enumSql = (values) => sql.raw(Object.values(values).map((value) => `'${value.replaceAll("'", "''")}'`).join(", "));
const numberSql = (value) => sql.raw(String(value));
const timezoneTimestamp$3 = (name) => timestamp(name, { withTimezone: true });
const documentPublicShares = pgTable("document_public_shares", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  projectId: uuid$2("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  rootDocumentId: uuid$2("root_document_id").notNull(),
  scope: text("scope", { enum: enumValues(DOCUMENT_PUBLIC_SHARE_SCOPE) }).notNull(),
  tokenHash: text("token_hash").notNull(),
  tokenCiphertext: text("token_ciphertext").notNull(),
  tokenNonce: text("token_nonce").notNull(),
  tokenKeyVersion: integer("token_key_version").notNull(),
  createdByUserId: uuid$2("created_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  revokedByUserId: uuid$2("revoked_by_user_id").references(() => user.id, { onDelete: "restrict" }),
  createdAt: timezoneTimestamp$3("created_at").defaultNow().notNull(),
  revokedAt: timezoneTimestamp$3("revoked_at"),
  updatedAt: timezoneTimestamp$3("updated_at").defaultNow().notNull()
}, (table) => [
  foreignKey({
    name: "document_public_shares_root_document_project_fk",
    columns: [table.rootDocumentId, table.projectId],
    foreignColumns: [documents.id, documents.projectId]
  }).onDelete("cascade"),
  check("document_public_shares_scope_check", sql`${table.scope} in (${enumSql(DOCUMENT_PUBLIC_SHARE_SCOPE)})`),
  check("document_public_shares_token_hash_check", sql`
    char_length(${table.tokenHash}) = ${numberSql(DOCUMENT_PUBLIC_SHARE_TOKEN_HASH_LENGTH)}
    and ${table.tokenHash} ~ '^[0-9a-f]+$'
  `),
  check("document_public_shares_envelope_check", sql`
    char_length(${table.tokenCiphertext}) > 0
    and char_length(${table.tokenNonce}) > 0
    and ${table.tokenKeyVersion} > 0
  `),
  check("document_public_shares_revocation_check", sql`
    (${table.revokedAt} is null and ${table.revokedByUserId} is null)
    or (${table.revokedAt} is not null and ${table.revokedByUserId} is not null)
  `),
  uniqueIndex("document_public_shares_token_hash_unique").on(table.tokenHash),
  uniqueIndex("document_public_shares_active_scope_unique").on(table.projectId, table.rootDocumentId, table.scope).where(sql`${table.revokedAt} is null`),
  index("document_public_shares_root_idx").on(table.projectId, table.rootDocumentId, table.createdAt),
  index("document_public_shares_revoked_at_idx").on(table.revokedAt)
]);

const timezoneTimestamp$2 = (name) => timestamp(name, { withTimezone: true });
const documentImages = pgTable("document_images", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  projectId: uuid$2("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  objectKey: text("object_key").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").$type().notNull(),
  byteSize: integer("byte_size").notNull(),
  uploadedByUserId: uuid$2("uploaded_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  createdAt: timezoneTimestamp$2("created_at").defaultNow().notNull(),
  archivedAt: timezoneTimestamp$2("archived_at")
}, (table) => [
  unique("document_images_id_project_id_unique").on(table.id, table.projectId),
  unique("document_images_object_key_unique").on(table.objectKey),
  check("document_images_filename_check", sql`${table.filename} = btrim(${table.filename}) and char_length(${table.filename}) between 1 and 200`),
  check("document_images_mime_type_check", sql`${table.mimeType} in ('image/png', 'image/jpeg', 'image/gif', 'image/webp')`),
  check("document_images_byte_size_check", sql`${table.byteSize} between 1 and 10485760`),
  index("document_images_project_created_idx").on(table.projectId, table.createdAt),
  index("document_images_uploaded_by_idx").on(table.uploadedByUserId)
]);
const projectIcons = pgTable("project_icons", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  projectId: uuid$2("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  objectKey: text("object_key").notNull(),
  mimeType: text("mime_type").$type().notNull(),
  byteSize: integer("byte_size").notNull(),
  updatedByUserId: uuid$2("updated_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  createdAt: timezoneTimestamp$2("created_at").defaultNow().notNull(),
  updatedAt: timezoneTimestamp$2("updated_at").defaultNow().notNull()
}, (table) => [
  unique("project_icons_project_id_unique").on(table.projectId),
  unique("project_icons_object_key_unique").on(table.objectKey),
  check("project_icons_mime_type_check", sql`${table.mimeType} in ('image/png', 'image/jpeg', 'image/webp')`),
  check("project_icons_byte_size_check", sql`${table.byteSize} between 1 and 2097152`),
  index("project_icons_updated_by_user_id_idx").on(table.updatedByUserId)
]);

const timezoneTimestamp$1 = (name) => timestamp(name, { withTimezone: true });
const oauthClient = pgTable("oauth_client", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  clientId: text("client_id").notNull().unique(),
  clientSecret: text("client_secret"),
  disabled: boolean("disabled").default(false),
  skipConsent: boolean("skip_consent"),
  enableEndSession: boolean("enable_end_session"),
  subjectType: text("subject_type"),
  scopes: text("scopes").array(),
  userId: uuid$2("user_id").references(() => user.id, { onDelete: "cascade" }),
  createdAt: timezoneTimestamp$1("created_at").defaultNow().notNull(),
  updatedAt: timezoneTimestamp$1("updated_at").defaultNow().notNull(),
  name: text("name"),
  uri: text("uri"),
  icon: text("icon"),
  contacts: text("contacts").array(),
  tos: text("tos"),
  policy: text("policy"),
  softwareId: text("software_id"),
  softwareVersion: text("software_version"),
  softwareStatement: text("software_statement"),
  redirectUris: text("redirect_uris").array().notNull(),
  postLogoutRedirectUris: text("post_logout_redirect_uris").array(),
  tokenEndpointAuthMethod: text("token_endpoint_auth_method"),
  grantTypes: text("grant_types").array(),
  responseTypes: text("response_types").array(),
  public: boolean("public"),
  type: text("type"),
  requirePKCE: boolean("require_pkce"),
  referenceId: text("reference_id"),
  metadata: jsonb("metadata")
}, (table) => [
  index("oauth_client_user_id_idx").on(table.userId)
]);
const oauthGrants = pgTable("oauth_grants", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  userId: uuid$2("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  clientId: text("client_id").notNull().references(() => oauthClient.clientId, { onDelete: "cascade" }),
  resource: text("resource").notNull(),
  scopes: text("scopes").array().notNull(),
  status: text("status", { enum: [OAUTH_GRANT_STATUS.ACTIVE, OAUTH_GRANT_STATUS.REVOKED] }).default(OAUTH_GRANT_STATUS.ACTIVE).notNull(),
  createdAt: timezoneTimestamp$1("created_at").defaultNow().notNull(),
  updatedAt: timezoneTimestamp$1("updated_at").defaultNow().notNull(),
  revokedAt: timezoneTimestamp$1("revoked_at")
}, (table) => [
  check("oauth_grants_status_check", sql`${table.status} in ('active', 'revoked')`),
  check("oauth_grants_resource_check", sql`${table.resource} = btrim(${table.resource}) and char_length(${table.resource}) between 1 and 2048`),
  check("oauth_grants_revocation_check", sql`
    (${table.status} = 'active' and ${table.revokedAt} is null)
    or (${table.status} = 'revoked' and ${table.revokedAt} is not null)
  `),
  uniqueIndex("oauth_grants_active_subject_unique").on(table.userId, table.clientId, table.resource).where(sql`${table.status} = 'active'`),
  index("oauth_grants_user_id_idx").on(table.userId),
  index("oauth_grants_client_id_idx").on(table.clientId),
  index("oauth_grants_status_idx").on(table.status)
]);
const oauthRefreshToken = pgTable("oauth_refresh_token", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  token: text("token").notNull().unique(),
  clientId: text("client_id").notNull().references(() => oauthClient.clientId, { onDelete: "cascade" }),
  sessionId: uuid$2("session_id").references(() => session.id, { onDelete: "set null" }),
  userId: uuid$2("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  referenceId: text("reference_id"),
  expiresAt: timezoneTimestamp$1("expires_at").notNull(),
  createdAt: timezoneTimestamp$1("created_at").defaultNow().notNull(),
  revoked: timezoneTimestamp$1("revoked"),
  authTime: timezoneTimestamp$1("auth_time"),
  scopes: text("scopes").array().notNull()
}, (table) => [
  index("oauth_refresh_token_client_id_idx").on(table.clientId),
  index("oauth_refresh_token_session_id_idx").on(table.sessionId),
  index("oauth_refresh_token_user_id_idx").on(table.userId),
  index("oauth_refresh_token_reference_id_idx").on(table.referenceId)
]);
const oauthAccessToken = pgTable("oauth_access_token", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  token: text("token").notNull().unique(),
  clientId: text("client_id").notNull().references(() => oauthClient.clientId, { onDelete: "cascade" }),
  sessionId: uuid$2("session_id").references(() => session.id, { onDelete: "set null" }),
  userId: uuid$2("user_id").references(() => user.id, { onDelete: "cascade" }),
  referenceId: text("reference_id"),
  refreshId: uuid$2("refresh_id").references(() => oauthRefreshToken.id, { onDelete: "cascade" }),
  expiresAt: timezoneTimestamp$1("expires_at").notNull(),
  createdAt: timezoneTimestamp$1("created_at").defaultNow().notNull(),
  scopes: text("scopes").array().notNull()
}, (table) => [
  index("oauth_access_token_client_id_idx").on(table.clientId),
  index("oauth_access_token_session_id_idx").on(table.sessionId),
  index("oauth_access_token_user_id_idx").on(table.userId),
  index("oauth_access_token_reference_id_idx").on(table.referenceId),
  index("oauth_access_token_refresh_id_idx").on(table.refreshId)
]);
const oauthConsent = pgTable("oauth_consent", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  clientId: text("client_id").notNull().references(() => oauthClient.clientId, { onDelete: "cascade" }),
  userId: uuid$2("user_id").references(() => user.id, { onDelete: "cascade" }),
  referenceId: text("reference_id"),
  scopes: text("scopes").array().notNull(),
  createdAt: timezoneTimestamp$1("created_at").defaultNow().notNull(),
  updatedAt: timezoneTimestamp$1("updated_at").defaultNow().notNull()
}, (table) => [
  index("oauth_consent_client_id_idx").on(table.clientId),
  index("oauth_consent_user_id_idx").on(table.userId),
  index("oauth_consent_reference_id_idx").on(table.referenceId)
]);

const timezoneTimestamp = (name) => timestamp(name, { withTimezone: true });
const mcpIdempotencyRecords = pgTable("mcp_idempotency_records", {
  id: uuid$2("id").defaultRandom().primaryKey(),
  grantId: uuid$2("grant_id").notNull().references(() => oauthGrants.id, { onDelete: "cascade" }),
  toolName: text("tool_name").notNull(),
  projectId: uuid$2("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  idempotencyKey: text("idempotency_key").notNull(),
  requestHash: text("request_hash").notNull(),
  status: text("status", { enum: ["in_progress", "completed"] }).notNull(),
  leaseToken: uuid$2("lease_token"),
  leaseExpiresAt: timezoneTimestamp("lease_expires_at"),
  safeResult: jsonb("safe_result"),
  createdAt: timezoneTimestamp("created_at").defaultNow().notNull(),
  updatedAt: timezoneTimestamp("updated_at").defaultNow().notNull(),
  retentionExpiresAt: timezoneTimestamp("retention_expires_at").notNull()
}, (table) => [
  unique("mcp_idempotency_scope_unique").on(table.grantId, table.toolName, table.projectId, table.idempotencyKey),
  check("mcp_idempotency_tool_name_check", sql`
    ${table.toolName} = btrim(${table.toolName})
    and char_length(${table.toolName}) between 1 and 128
    and ${table.toolName} ~ '^[a-z0-9_]+$'
  `),
  check("mcp_idempotency_key_check", sql`
    ${table.idempotencyKey} = btrim(${table.idempotencyKey})
    and char_length(${table.idempotencyKey}) between 1 and 128
  `),
  check("mcp_idempotency_request_hash_check", sql`${table.requestHash} ~ '^[a-f0-9]{64}$'`),
  check("mcp_idempotency_state_check", sql`
    (${table.status} = 'in_progress'
      and ${table.leaseToken} is not null
      and ${table.leaseExpiresAt} is not null
      and ${table.safeResult} is null)
    or
    (${table.status} = 'completed'
      and ${table.leaseToken} is null
      and ${table.leaseExpiresAt} is null
      and ${table.safeResult} is not null)
  `),
  check("mcp_idempotency_retention_check", sql`
    ${table.retentionExpiresAt} > ${table.createdAt}
    and ${table.retentionExpiresAt} <= ${table.createdAt} + interval '7 days'
    and (${table.leaseExpiresAt} is null or ${table.leaseExpiresAt} <= ${table.retentionExpiresAt})
  `),
  index("mcp_idempotency_retention_idx").on(table.retentionExpiresAt),
  index("mcp_idempotency_grant_idx").on(table.grantId)
]);

const authSchema = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  account: account,
  accountRelations: accountRelations,
  auditEvents: auditEvents,
  auditEventsRelations: auditEventsRelations,
  credentialCategories: credentialCategories,
  credentialCategoryMemberGrants: credentialCategoryMemberGrants,
  credentialCategoryRoleGrants: credentialCategoryRoleGrants,
  credentialFields: credentialFields,
  credentials: credentials,
  documentImages: documentImages,
  documentPublicShares: documentPublicShares,
  documentVersions: documentVersions,
  documents: documents,
  mcpIdempotencyRecords: mcpIdempotencyRecords,
  oauthAccessToken: oauthAccessToken,
  oauthClient: oauthClient,
  oauthConsent: oauthConsent,
  oauthGrants: oauthGrants,
  oauthRefreshToken: oauthRefreshToken,
  projectAiConnections: projectAiConnections,
  projectAiConnectionsRelations: projectAiConnectionsRelations,
  projectAiConversationMessages: projectAiConversationMessages,
  projectAiConversationMessagesRelations: projectAiConversationMessagesRelations,
  projectAiConversations: projectAiConversations,
  projectAiConversationsRelations: projectAiConversationsRelations,
  projectAiDocumentProposals: projectAiDocumentProposals,
  projectAiTurnControls: projectAiTurnControls,
  projectAiUsageEvents: projectAiUsageEvents,
  projectIcons: projectIcons,
  projectLifecycleEvents: projectLifecycleEvents,
  projectLifecycleEventsRelations: projectLifecycleEventsRelations,
  projectMemberships: projectMemberships,
  projectMembershipsRelations: projectMembershipsRelations,
  projectRolePermissions: projectRolePermissions,
  projectRolePermissionsRelations: projectRolePermissionsRelations,
  projectRoles: projectRoles,
  projectRolesRelations: projectRolesRelations,
  projects: projects,
  projectsRelations: projectsRelations,
  rateLimit: rateLimit,
  session: session,
  sessionRelations: sessionRelations,
  user: user,
  userRelations: userRelations,
  verification: verification
}, Symbol.toStringTag, { value: 'Module' }));

const OAUTH_GRANT_REVOCATION_RESULT = {
  REVOKED: "revoked",
  NOT_FOUND: "not_found",
  STALE: "stale",
  ALREADY_REVOKED: "already_revoked",
  ACCOUNT_INACTIVE: "account_inactive"
};
function createOAuthGrantManagement(db) {
  return {
    ensureActive(command) {
      return db.transaction(async (tx) => {
        const [actor] = await tx.select({ status: user.status }).from(user).where(eq(user.id, command.actorUserId)).for("update");
        if ((actor == null ? void 0 : actor.status) !== ACCOUNT_STATUS.ACTIVE) throw new Error("OAuth grant actor is inactive");
        const [existing] = await tx.select({ id: oauthGrants.id, scopes: oauthGrants.scopes }).from(oauthGrants).where(and(
          eq(oauthGrants.userId, command.actorUserId),
          eq(oauthGrants.clientId, command.clientId),
          eq(oauthGrants.resource, command.resource),
          eq(oauthGrants.status, OAUTH_GRANT_STATUS.ACTIVE)
        )).for("update");
        if (existing) {
          if (existing.scopes.join(" ") !== command.scopes.join(" ")) {
            await tx.update(oauthGrants).set({ scopes: [...command.scopes], updatedAt: /* @__PURE__ */ new Date() }).where(eq(oauthGrants.id, existing.id));
          }
          return existing.id;
        }
        const [created] = await tx.insert(oauthGrants).values({
          userId: command.actorUserId,
          clientId: command.clientId,
          resource: command.resource,
          scopes: [...command.scopes]
        }).returning({ id: oauthGrants.id });
        if (!created) throw new Error("OAuth grant insert returned no row");
        return created.id;
      });
    },
    async listActive(actorUserId) {
      const rows = await db.select({
        id: oauthGrants.id,
        clientId: oauthClient.clientId,
        clientName: oauthClient.name,
        resource: oauthGrants.resource,
        scopes: oauthGrants.scopes,
        createdAt: oauthGrants.createdAt,
        updatedAt: oauthGrants.updatedAt
      }).from(oauthGrants).innerJoin(oauthClient, eq(oauthClient.clientId, oauthGrants.clientId)).innerJoin(oauthConsent, sql`${oauthConsent.referenceId} = ${oauthGrants.id}::text`).where(and(
        eq(oauthGrants.userId, actorUserId),
        eq(oauthGrants.status, OAUTH_GRANT_STATUS.ACTIVE)
      )).orderBy(oauthGrants.createdAt);
      return rows.map((row) => {
        var _a;
        return {
          id: row.id,
          client: { id: row.clientId, name: (_a = row.clientName) != null ? _a : row.clientId },
          resource: row.resource,
          scopes: row.scopes,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString()
        };
      });
    },
    revoke(command) {
      return db.transaction(async (tx) => {
        const [actor] = await tx.select({ status: user.status }).from(user).where(eq(user.id, command.actorUserId)).for("update");
        if ((actor == null ? void 0 : actor.status) !== ACCOUNT_STATUS.ACTIVE) {
          return { type: OAUTH_GRANT_REVOCATION_RESULT.ACCOUNT_INACTIVE };
        }
        const [grant] = await tx.select({
          id: oauthGrants.id,
          status: oauthGrants.status,
          updatedAt: oauthGrants.updatedAt
        }).from(oauthGrants).where(and(
          eq(oauthGrants.id, command.grantId),
          eq(oauthGrants.userId, command.actorUserId)
        )).for("update");
        if (!grant) return { type: OAUTH_GRANT_REVOCATION_RESULT.NOT_FOUND };
        if (grant.status === OAUTH_GRANT_STATUS.REVOKED) {
          return { type: OAUTH_GRANT_REVOCATION_RESULT.ALREADY_REVOKED };
        }
        const expectedUpdatedAt = new Date(command.expectedUpdatedAt);
        if (!Number.isFinite(expectedUpdatedAt.getTime()) || expectedUpdatedAt.getTime() !== grant.updatedAt.getTime()) {
          return { type: OAUTH_GRANT_REVOCATION_RESULT.STALE };
        }
        const revokedAt = /* @__PURE__ */ new Date();
        await tx.delete(oauthAccessToken).where(eq(oauthAccessToken.referenceId, grant.id));
        await tx.delete(oauthRefreshToken).where(eq(oauthRefreshToken.referenceId, grant.id));
        await tx.delete(oauthConsent).where(eq(oauthConsent.referenceId, grant.id));
        await tx.update(oauthGrants).set({
          status: OAUTH_GRANT_STATUS.REVOKED,
          revokedAt,
          updatedAt: revokedAt
        }).where(eq(oauthGrants.id, grant.id));
        await tx.insert(auditEvents).values({
          actorUserId: command.actorUserId,
          channel: command.channel,
          action: "oauth.grant_revoked",
          outcome: AUDIT_OUTCOME.SUCCEEDED,
          targetType: "oauth_grant",
          targetId: grant.id,
          metadata: {}
        });
        return { type: OAUTH_GRANT_REVOCATION_RESULT.REVOKED };
      });
    }
  };
}

const MCP_SCOPE = {
  OFFLINE_ACCESS: "offline_access",
  PROJECTS_READ: "projects:read",
  DOCUMENTS_READ: "documents:read",
  DOCUMENTS_WRITE: "documents:write",
  DOCUMENTS_PUBLISH: "documents:publish"
};
const MCP_SCOPES = [
  MCP_SCOPE.OFFLINE_ACCESS,
  MCP_SCOPE.PROJECTS_READ,
  MCP_SCOPE.DOCUMENTS_READ,
  MCP_SCOPE.DOCUMENTS_WRITE,
  MCP_SCOPE.DOCUMENTS_PUBLISH
];

async function resolveOAuthConsentReference({
  state,
  userId,
  scopes,
  canonicalResource,
  ensureActive
}) {
  const clientId = (state == null ? void 0 : state.query) ? new URLSearchParams(state.query).get("client_id") : null;
  if (!clientId) throw new Error("OAuth authorization context is unavailable");
  return ensureActive({
    actorUserId: userId,
    clientId,
    resource: canonicalResource,
    scopes
  });
}

const createMinervaOAuthProvider = ({ resource, ensureActiveGrant }) => oauthProvider({
  loginPage: "/auth",
  consentPage: "/oauth/consent",
  scopes: [...MCP_SCOPES],
  validAudiences: [resource],
  grantTypes: ["authorization_code", "refresh_token"],
  allowDynamicClientRegistration: false,
  allowUnauthenticatedClientRegistration: false,
  disableJwtPlugin: true,
  storeTokens: "hashed",
  ...ensureActiveGrant ? {
    postLogin: {
      page: "/oauth/consent",
      shouldRedirect: () => false,
      async consentReferenceId({ user, scopes }) {
        if (!user) throw new Error("OAuth consent user is unavailable");
        return resolveOAuthConsentReference({
          state: await getOAuthProviderState(),
          userId: user.id,
          scopes,
          canonicalResource: resource,
          ensureActive: ensureActiveGrant
        });
      }
    }
  } : {},
  rateLimit: {
    token: { window: 60, max: 20 },
    authorize: { window: 60, max: 30 },
    introspect: { window: 60, max: 100 },
    revoke: { window: 60, max: 30 },
    register: { window: 60, max: 5 },
    userinfo: { window: 60, max: 60 }
  }
});

function createMinervaAuth({ mode, db, baseURL, trustedOrigins, mailer, oauth }) {
  const grantManagement = oauth ? createOAuthGrantManagement(db) : null;
  return betterAuth({
    baseURL,
    trustedOrigins,
    database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
    advanced: {
      database: { generateId: "uuid" },
      useSecureCookies: new URL(baseURL).protocol === "https:"
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: mode === AUTH_MODE.RUNTIME,
      autoSignIn: false,
      minPasswordLength: 12,
      maxPasswordLength: 256,
      resetPasswordTokenExpiresIn: 1800,
      revokeSessionsOnPasswordReset: true,
      async sendResetPassword({ user, token }) {
        await mailer.sendPasswordReset({
          to: user.email,
          resetUrl: `${baseURL}/auth/reset-password/${encodeURIComponent(token)}`
        });
      }
    },
    verification: { storeIdentifier: "hashed" },
    session: { expiresIn: 604800, updateAge: 86400 },
    user: {
      additionalFields: {
        superAdmin: { type: "boolean", defaultValue: false, input: false },
        status: {
          type: [ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.DISABLED],
          defaultValue: ACCOUNT_STATUS.ACTIVE,
          input: false
        },
        disabledAt: { type: "date", required: false, input: false },
        disabledReason: { type: "string", required: false, input: false },
        lastLoginAt: { type: "date", required: false, input: false }
      }
    },
    disabledPaths: ["/is-username-available"],
    rateLimit: { enabled: true, storage: "database" },
    plugins: [username(), ...oauth ? [createMinervaOAuthProvider({
      ...oauth,
      ensureActiveGrant: (input) => {
        var _a;
        return (_a = grantManagement == null ? void 0 : grantManagement.ensureActive(input)) != null ? _a : Promise.reject(new Error("OAuth grant management is unavailable"));
      }
    })] : []],
    databaseHooks: {
      user: {
        create: {
          async before(user) {
            return;
          }
        }
      },
      session: {
        create: {
          async before(session) {
            var _a;
            const users = await db.execute(sql`
              select status from "user" where id = ${session.userId} limit 1
            `);
            if (((_a = users[0]) == null ? void 0 : _a.status) !== ACCOUNT_STATUS.ACTIVE) {
              throw new APIError("UNAUTHORIZED", {
                code: IDENTITY_CODE.INVALID_CREDENTIALS,
                message: "Invalid credentials"
              });
            }
          },
          async after(session) {
            await db.execute(sql`
              update "user" set last_login_at = now() where id = ${session.userId}
            `);
          }
        }
      }
    }
  });
}

let runtimeAuth;
function getAuth() {
  if (runtimeAuth) return runtimeAuth;
  const env = getServerEnv();
  runtimeAuth = createMinervaAuth({
    mode: AUTH_MODE.RUNTIME,
    db: getDatabase().db,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: env.TRUSTED_ORIGINS,
    oauth: { resource: env.MCP_RESOURCE_URL },
    mailer: createSmtpPasswordResetMailer({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      from: env.MAIL_FROM
    })
  });
  return runtimeAuth;
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const statuses = {
  [IDENTITY_CODE.INVALID_CREDENTIALS]: 401,
  [IDENTITY_CODE.AUTH_REQUIRED]: 401,
  [IDENTITY_CODE.ACCOUNT_DISABLED]: 403,
  [IDENTITY_CODE.RESET_REQUEST_ACCEPTED]: 200,
  [IDENTITY_CODE.RESET_TOKEN_INVALID]: 400,
  [IDENTITY_CODE.RATE_LIMITED]: 429,
  [IDENTITY_CODE.SERVICE_UNAVAILABLE]: 503
};
class IdentityError extends Error {
  constructor(code) {
    super(code);
    __publicField(this, "code", code);
    __publicField(this, "statusCode");
    this.name = "IdentityError";
    this.statusCode = statuses[code];
  }
}

function createRequireSession(getSession2) {
  const requestSessionKey = /* @__PURE__ */ Symbol("minerva.requestSession");
  return async function requireSession2(event) {
    const context = event.context;
    if (Object.prototype.hasOwnProperty.call(context, requestSessionKey)) {
      return context[requestSessionKey];
    }
    const session = await getSession2(event.headers);
    if (session === null) {
      throw new IdentityError(IDENTITY_CODE.AUTH_REQUIRED);
    }
    context[requestSessionKey] = session;
    return session;
  };
}
const requireSession = createRequireSession(
  async (headers) => {
    var _a;
    return (_a = await getAuth().api.getSession({ headers })) != null ? _a : null;
  }
);

function createRequireSuperAdmin(requireAuthenticatedSession) {
  return async function requireSuperAdmin2(event) {
    const session = await requireAuthenticatedSession(event);
    if (session.user.superAdmin !== true) {
      throw new AuthorizationError(AUTHORIZATION_CODE.FORBIDDEN);
    }
    return session;
  };
}
const requireSuperAdmin = createRequireSuperAdmin(requireSession);

function createAuthorizeApi(dependencies) {
  return async function authorizeApi(event) {
    const access = classifyApiAccess(getMethod(event), getRequestURL(event).pathname);
    if (access === API_ACCESS.AUTHENTICATED) {
      await dependencies.requireSession(event);
    } else if (access === API_ACCESS.SUPER_ADMIN) {
      await dependencies.requireSuperAdmin(event);
    }
  };
}
function createAuthorizeApiHandler(authorizeApi) {
  return async function authorizeApiHandler(event) {
    try {
      await authorizeApi(event);
    } catch (error) {
      if (error instanceof IdentityError || error instanceof AuthorizationError) {
        setResponseStatus(event, error.statusCode);
        return { data: { code: error.code } };
      }
      throw error;
    }
  };
}
const _jTrm0W = defineEventHandler(createAuthorizeApiHandler(
  createAuthorizeApi({ requireSession, requireSuperAdmin })
));

const _SxA8c9 = defineEventHandler(() => {});

const _lazy_easnkM = () => import('../routes/api/administration/audit.get.mjs');
const _lazy_oHpjrF = () => import('../routes/api/administration/audit/_id/target.get.mjs');
const _lazy_2RkfPl = () => import('../routes/api/administration/projects.get.mjs');
const _lazy_dDpFfZ = () => import('../routes/api/administration/users.get.mjs');
const _lazy_0c5X7R = () => import('../routes/api/administration/users/_id_.get.mjs');
const _lazy_U3y6GK = () => import('../routes/api/auth/_...all_.mjs');
const _lazy_afLbV3 = () => import('../routes/api/health/database.get.mjs');
const _lazy_RART9Z = () => import('../routes/api/health/live.get.mjs');
const _lazy_mmsPCW = () => import('../routes/api/health/ready.get.mjs');
const _lazy_iQPd6z = () => import('../routes/api/identity/request-password-reset.post.mjs');
const _lazy_JFxJTa = () => import('../routes/api/identity/reset-password.post.mjs');
const _lazy_NUZdhU = () => import('../routes/api/identity/sign-in.post.mjs');
const _lazy_2ASSPc = () => import('../routes/api/mainMenu.get.mjs');
const _lazy_KtSLyD = () => import('../routes/api/oauth/grants/_grantId/revoke.post.mjs');
const _lazy_dzXxQL = () => import('../routes/api/oauth/index.get.mjs');
const _lazy_tTawS_ = () => import('../routes/api/projects/_id_.get.mjs');
const _lazy_FFdyc3 = () => import('../routes/api/projects/_id/ai-assistant/availability.get.mjs');
const _lazy_EvjJgZ = () => import('../routes/api/projects/_id/ai-assistant/connection.delete.mjs');
const _lazy_k1Ff7x = () => import('../routes/api/projects/_id/ai-assistant/connection.get.mjs');
const _lazy_FSTjDZ = () => import('../routes/api/projects/_id/ai-assistant/connection.put.mjs');
const _lazy_tXrEkX = () => import('../routes/api/projects/_id/ai-assistant/connection/test.post.mjs');
const _lazy_9Iquvm = () => import('../routes/api/projects/_id/ai-assistant/conversations/_conversationId_.delete.mjs');
const _lazy_jAgE3R = () => import('../routes/api/projects/_id/ai-assistant/conversations/_conversationId_.get.mjs');
const _lazy_jvNLA6 = () => import('../routes/api/projects/_id/ai-assistant/conversations/_conversationId/restore.post.mjs');
const _lazy_VPy4Zp = () => import('../routes/api/projects/_id/ai-assistant/index.get.mjs');
const _lazy_I7W3Ka = () => import('../routes/api/projects/_id/ai-assistant/index.post.mjs');
const _lazy_RDy7tK = () => import('../routes/api/projects/_id/ai-assistant/turn.post.mjs');
const _lazy_QtcCGU = () => import('../routes/api/projects/_id/ai-assistant/turn/stream.post.mjs');
const _lazy_QVrJdy = () => import('../routes/api/projects/_id/credential-categories/_categoryId_.delete.mjs');
const _lazy_AWqQFP = () => import('../routes/api/projects/_id/credential-categories/_categoryId_.patch.mjs');
const _lazy_mcwD9Q = () => import('../routes/api/projects/_id/credential-categories/_categoryId/grants.put.mjs');
const _lazy_DWsJLw = () => import('../routes/api/projects/_id/index.get.mjs');
const _lazy_K33oNP = () => import('../routes/api/projects/_id/index.post.mjs');
const _lazy_O0ZGiA = () => import('../routes/api/projects/_id/credentials/_credentialId_.delete.mjs');
const _lazy_IWa6CR = () => import('../routes/api/projects/_id/credentials/_credentialId_.patch.mjs');
const _lazy_MzY85_ = () => import('../routes/api/projects/_id/credentials/_credentialId/reveal.post.mjs');
const _lazy_wZAlR4 = () => import('../routes/api/projects/_id/credentials/archive.get.mjs');
const _lazy_46vAAg = () => import('../routes/api/projects/_id/index2.get.mjs');
const _lazy_jBWZfQ = () => import('../routes/api/projects/_id/index2.post.mjs');
const _lazy_CwOWA_ = () => import('../routes/api/projects/_id/credentials/search.post.mjs');
const _lazy_JPR2Ga = () => import('../routes/api/projects/_id/description.patch.mjs');
const _lazy_cSYexR = () => import('../routes/api/projects/_id/documents/_documentId_.delete.mjs');
const _lazy_eNYuAx = () => import('../routes/api/projects/_id/documents/_documentId_.get.mjs');
const _lazy_4htcex = () => import('../routes/api/projects/_id/documents/_documentId/discard.delete.mjs');
const _lazy_28tv8q = () => import('../routes/api/projects/_id/documents/_documentId/draft.patch.mjs');
const _lazy_5jGVWs = () => import('../routes/api/projects/_id/documents/_documentId/move.patch.mjs');
const _lazy_n00bAp = () => import('../routes/api/projects/_id/documents/_documentId/publish.post.mjs');
const _lazy_Bh6p5c = () => import('../routes/api/projects/_id/documents/_documentId/restore.post.mjs');
const _lazy_jBGRD5 = () => import('../routes/api/projects/_id/documents/_documentId/shares/_shareId_.delete.mjs');
const _lazy_Twh18R = () => import('../routes/api/projects/_id/documents/_documentId/shares/_shareId/copy.post.mjs');
const _lazy_P2Basm = () => import('../routes/api/projects/_id/documents/_documentId/shares/_shareId/rotate.post.mjs');
const _lazy_3H2W2H = () => import('../routes/api/projects/_id/documents/_documentId/index.get.mjs');
const _lazy_i3fOXb = () => import('../routes/api/projects/_id/documents/_documentId/index.post.mjs');
const _lazy_1W3mzS = () => import('../routes/api/projects/_id/documents/_documentId/versions.get.mjs');
const _lazy_a8bJ3J = () => import('../routes/api/projects/_id/documents/_documentId/versions/_versionNumber_.get.mjs');
const _lazy_ONP_Nd = () => import('../routes/api/projects/_id/documents/_documentId/versions/_versionNumber/restore.post.mjs');
const _lazy_1P_mGJ = () => import('../routes/api/projects/_id/documents/archive.get.mjs');
const _lazy_D4FJAM = () => import('../routes/api/projects/_id/documents/images/_imageId_.get.mjs');
const _lazy_A8PVNE = () => import('../routes/api/projects/_id/documents/index.post.mjs');
const _lazy_bz1l28 = () => import('../routes/api/projects/_id/index3.get.mjs');
const _lazy_H7WRQR = () => import('../routes/api/projects/_id/index3.post.mjs');
const _lazy_IIndGb = () => import('../routes/api/projects/_id/documents/search.post.mjs');
const _lazy_JopulS = () => import('../routes/api/projects/_id/documents/tree.get.mjs');
const _lazy_Rz8189 = () => import('../routes/api/projects/_id/icon.delete.mjs');
const _lazy_zzVToX = () => import('../routes/api/projects/_id/icon.get.mjs');
const _lazy_kRutV4 = () => import('../routes/api/projects/_id/icon.put.mjs');
const _lazy_r92RRu = () => import('../routes/api/projects/_id/lifecycle-transitions.post.mjs');
const _lazy_HXqUKT = () => import('../routes/api/projects/_id/members.get.mjs');
const _lazy_SncT14 = () => import('../routes/api/index.get.mjs');
const _lazy_O1NWUv = () => import('../routes/api/index.post.mjs');
const _lazy_m40i0F = () => import('../routes/api/public/documentation/_token_.get.mjs');
const _lazy_LZ2CNm = () => import('../routes/api/public/documentation/_token/images/_imageId_.get.mjs');
const _lazy_X7ZZ2q = () => import('../routes/api/public/documentation/_token/pages/_documentId_.get.mjs');
const _lazy_7NaNLg = () => import('../routes/.well-known/oauth-authorization-server/api/auth.get.mjs');
const _lazy_2qz1uK = () => import('../routes/.well-known/oauth-protected-resource/mcp.get.mjs');
const _lazy_ARRP0f = () => import('../routes/mcp.post.mjs');
const _lazy_6RVjpu = () => import('../routes/renderer.mjs');

const handlers = [
  { route: '', handler: _qoihGq, lazy: false, middleware: true, method: undefined },
  { route: '', handler: _7yksNR, lazy: false, middleware: true, method: undefined },
  { route: '', handler: _jTrm0W, lazy: false, middleware: true, method: undefined },
  { route: '/api/administration/audit', handler: _lazy_easnkM, lazy: true, middleware: false, method: "get" },
  { route: '/api/administration/audit/:id/target', handler: _lazy_oHpjrF, lazy: true, middleware: false, method: "get" },
  { route: '/api/administration/projects', handler: _lazy_2RkfPl, lazy: true, middleware: false, method: "get" },
  { route: '/api/administration/users', handler: _lazy_dDpFfZ, lazy: true, middleware: false, method: "get" },
  { route: '/api/administration/users/:id', handler: _lazy_0c5X7R, lazy: true, middleware: false, method: "get" },
  { route: '/api/auth/**:all', handler: _lazy_U3y6GK, lazy: true, middleware: false, method: undefined },
  { route: '/api/health/database', handler: _lazy_afLbV3, lazy: true, middleware: false, method: "get" },
  { route: '/api/health/live', handler: _lazy_RART9Z, lazy: true, middleware: false, method: "get" },
  { route: '/api/health/ready', handler: _lazy_mmsPCW, lazy: true, middleware: false, method: "get" },
  { route: '/api/identity/request-password-reset', handler: _lazy_iQPd6z, lazy: true, middleware: false, method: "post" },
  { route: '/api/identity/reset-password', handler: _lazy_JFxJTa, lazy: true, middleware: false, method: "post" },
  { route: '/api/identity/sign-in', handler: _lazy_NUZdhU, lazy: true, middleware: false, method: "post" },
  { route: '/api/mainMenu', handler: _lazy_2ASSPc, lazy: true, middleware: false, method: "get" },
  { route: '/api/oauth/grants/:grantId/revoke', handler: _lazy_KtSLyD, lazy: true, middleware: false, method: "post" },
  { route: '/api/oauth/grants', handler: _lazy_dzXxQL, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects/:id', handler: _lazy_tTawS_, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects/:id/ai-assistant/availability', handler: _lazy_FFdyc3, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects/:id/ai-assistant/connection', handler: _lazy_EvjJgZ, lazy: true, middleware: false, method: "delete" },
  { route: '/api/projects/:id/ai-assistant/connection', handler: _lazy_k1Ff7x, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects/:id/ai-assistant/connection', handler: _lazy_FSTjDZ, lazy: true, middleware: false, method: "put" },
  { route: '/api/projects/:id/ai-assistant/connection/test', handler: _lazy_tXrEkX, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/ai-assistant/conversations/:conversationId', handler: _lazy_9Iquvm, lazy: true, middleware: false, method: "delete" },
  { route: '/api/projects/:id/ai-assistant/conversations/:conversationId', handler: _lazy_jAgE3R, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects/:id/ai-assistant/conversations/:conversationId/restore', handler: _lazy_jvNLA6, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/ai-assistant/conversations', handler: _lazy_VPy4Zp, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects/:id/ai-assistant/conversations', handler: _lazy_I7W3Ka, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/ai-assistant/turn', handler: _lazy_RDy7tK, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/ai-assistant/turn/stream', handler: _lazy_QtcCGU, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/credential-categories/:categoryId', handler: _lazy_QVrJdy, lazy: true, middleware: false, method: "delete" },
  { route: '/api/projects/:id/credential-categories/:categoryId', handler: _lazy_AWqQFP, lazy: true, middleware: false, method: "patch" },
  { route: '/api/projects/:id/credential-categories/:categoryId/grants', handler: _lazy_mcwD9Q, lazy: true, middleware: false, method: "put" },
  { route: '/api/projects/:id/credential-categories', handler: _lazy_DWsJLw, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects/:id/credential-categories', handler: _lazy_K33oNP, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/credentials/:credentialId', handler: _lazy_O0ZGiA, lazy: true, middleware: false, method: "delete" },
  { route: '/api/projects/:id/credentials/:credentialId', handler: _lazy_IWa6CR, lazy: true, middleware: false, method: "patch" },
  { route: '/api/projects/:id/credentials/:credentialId/reveal', handler: _lazy_MzY85_, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/credentials/archive', handler: _lazy_wZAlR4, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects/:id/credentials', handler: _lazy_46vAAg, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects/:id/credentials', handler: _lazy_jBWZfQ, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/credentials/search', handler: _lazy_CwOWA_, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/description', handler: _lazy_JPR2Ga, lazy: true, middleware: false, method: "patch" },
  { route: '/api/projects/:id/documents/:documentId', handler: _lazy_cSYexR, lazy: true, middleware: false, method: "delete" },
  { route: '/api/projects/:id/documents/:documentId', handler: _lazy_eNYuAx, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects/:id/documents/:documentId/discard', handler: _lazy_4htcex, lazy: true, middleware: false, method: "delete" },
  { route: '/api/projects/:id/documents/:documentId/draft', handler: _lazy_28tv8q, lazy: true, middleware: false, method: "patch" },
  { route: '/api/projects/:id/documents/:documentId/move', handler: _lazy_5jGVWs, lazy: true, middleware: false, method: "patch" },
  { route: '/api/projects/:id/documents/:documentId/publish', handler: _lazy_n00bAp, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/documents/:documentId/restore', handler: _lazy_Bh6p5c, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/documents/:documentId/shares/:shareId', handler: _lazy_jBGRD5, lazy: true, middleware: false, method: "delete" },
  { route: '/api/projects/:id/documents/:documentId/shares/:shareId/copy', handler: _lazy_Twh18R, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/documents/:documentId/shares/:shareId/rotate', handler: _lazy_P2Basm, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/documents/:documentId/shares', handler: _lazy_3H2W2H, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects/:id/documents/:documentId/shares', handler: _lazy_i3fOXb, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/documents/:documentId/versions', handler: _lazy_1W3mzS, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects/:id/documents/:documentId/versions/:versionNumber', handler: _lazy_a8bJ3J, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects/:id/documents/:documentId/versions/:versionNumber/restore', handler: _lazy_ONP_Nd, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/documents/archive', handler: _lazy_1P_mGJ, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects/:id/documents/images/:imageId', handler: _lazy_D4FJAM, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects/:id/documents/images', handler: _lazy_A8PVNE, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/documents', handler: _lazy_bz1l28, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects/:id/documents', handler: _lazy_H7WRQR, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/documents/search', handler: _lazy_IIndGb, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/documents/tree', handler: _lazy_JopulS, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects/:id/icon', handler: _lazy_Rz8189, lazy: true, middleware: false, method: "delete" },
  { route: '/api/projects/:id/icon', handler: _lazy_zzVToX, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects/:id/icon', handler: _lazy_kRutV4, lazy: true, middleware: false, method: "put" },
  { route: '/api/projects/:id/lifecycle-transitions', handler: _lazy_r92RRu, lazy: true, middleware: false, method: "post" },
  { route: '/api/projects/:id/members', handler: _lazy_HXqUKT, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects', handler: _lazy_SncT14, lazy: true, middleware: false, method: "get" },
  { route: '/api/projects', handler: _lazy_O1NWUv, lazy: true, middleware: false, method: "post" },
  { route: '/api/public/documentation/:token', handler: _lazy_m40i0F, lazy: true, middleware: false, method: "get" },
  { route: '/api/public/documentation/:token/images/:imageId', handler: _lazy_LZ2CNm, lazy: true, middleware: false, method: "get" },
  { route: '/api/public/documentation/:token/pages/:documentId', handler: _lazy_X7ZZ2q, lazy: true, middleware: false, method: "get" },
  { route: '/.well-known/oauth-authorization-server/api/auth', handler: _lazy_7NaNLg, lazy: true, middleware: false, method: "get" },
  { route: '/.well-known/oauth-protected-resource/mcp', handler: _lazy_2qz1uK, lazy: true, middleware: false, method: "get" },
  { route: '/mcp', handler: _lazy_ARRP0f, lazy: true, middleware: false, method: "post" },
  { route: '/__nuxt_error', handler: _lazy_6RVjpu, lazy: true, middleware: false, method: undefined },
  { route: '/__nuxt_island/**', handler: _SxA8c9, lazy: false, middleware: false, method: undefined },
  { route: '/**', handler: _lazy_6RVjpu, lazy: true, middleware: false, method: undefined }
];

function createNitroApp() {
  const config = useRuntimeConfig();
  const hooks = createHooks();
  const captureError = (error, context = {}) => {
    const promise = hooks.callHookParallel("error", error, context).catch((error_) => {
      console.error("Error while capturing another error", error_);
    });
    if (context.event && isEvent(context.event)) {
      const errors = context.event.context.nitro?.errors;
      if (errors) {
        errors.push({ error, context });
      }
      if (context.event.waitUntil) {
        context.event.waitUntil(promise);
      }
    }
  };
  const h3App = createApp({
    debug: destr(false),
    onError: (error, event) => {
      captureError(error, { event, tags: ["request"] });
      return errorHandler(error, event);
    },
    onRequest: async (event) => {
      event.context.nitro = event.context.nitro || { errors: [] };
      const fetchContext = event.node.req?.__unenv__;
      if (fetchContext?._platform) {
        event.context = {
          _platform: fetchContext?._platform,
          // #3335
          ...fetchContext._platform,
          ...event.context
        };
      }
      if (!event.context.waitUntil && fetchContext?.waitUntil) {
        event.context.waitUntil = fetchContext.waitUntil;
      }
      event.fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: localFetch });
      event.$fetch = (req, init) => fetchWithEvent(event, req, init, {
        fetch: $fetch
      });
      event.waitUntil = (promise) => {
        if (!event.context.nitro._waitUntilPromises) {
          event.context.nitro._waitUntilPromises = [];
        }
        event.context.nitro._waitUntilPromises.push(promise);
        if (event.context.waitUntil) {
          event.context.waitUntil(promise);
        }
      };
      event.captureError = (error, context) => {
        captureError(error, { event, ...context });
      };
      await nitroApp.hooks.callHook("request", event).catch((error) => {
        captureError(error, { event, tags: ["request"] });
      });
    },
    onBeforeResponse: async (event, response) => {
      await nitroApp.hooks.callHook("beforeResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    },
    onAfterResponse: async (event, response) => {
      await nitroApp.hooks.callHook("afterResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    }
  });
  const router = createRouter({
    preemptive: true
  });
  const nodeHandler = toNodeListener(h3App);
  const localCall = (aRequest) => b(
    nodeHandler,
    aRequest
  );
  const localFetch = (input, init) => {
    if (!input.toString().startsWith("/")) {
      return globalThis.fetch(input, init);
    }
    return C(
      nodeHandler,
      input,
      init
    ).then((response) => normalizeFetchResponse(response));
  };
  const $fetch = createFetch({
    fetch: localFetch,
    Headers: Headers$1,
    defaults: { baseURL: config.app.baseURL }
  });
  globalThis.$fetch = $fetch;
  h3App.use(createRouteRulesHandler({ localFetch }));
  for (const h of handlers) {
    let handler = h.lazy ? lazyEventHandler(h.handler) : h.handler;
    if (h.middleware || !h.route) {
      const middlewareBase = (config.app.baseURL + (h.route || "/")).replace(
        /\/+/g,
        "/"
      );
      h3App.use(middlewareBase, handler);
    } else {
      const routeRules = getRouteRulesForPath(
        h.route.replace(/:\w+|\*\*/g, "_")
      );
      if (routeRules.cache) {
        handler = cachedEventHandler(handler, {
          group: "nitro/routes",
          ...routeRules.cache
        });
      }
      router.use(h.route, handler, h.method);
    }
  }
  h3App.use(config.app.baseURL, router.handler);
  const app = {
    hooks,
    h3App,
    router,
    localCall,
    localFetch,
    captureError
  };
  return app;
}
function runNitroPlugins(nitroApp2) {
  for (const plugin of plugins) {
    try {
      plugin(nitroApp2);
    } catch (error) {
      nitroApp2.captureError(error, { tags: ["plugin"] });
      throw error;
    }
  }
}
const nitroApp = createNitroApp();
function useNitroApp() {
  return nitroApp;
}
runNitroPlugins(nitroApp);

function defineRenderHandler(render) {
  const runtimeConfig = useRuntimeConfig();
  return eventHandler(async (event) => {
    const nitroApp = useNitroApp();
    const ctx = { event, render, response: void 0 };
    await nitroApp.hooks.callHook("render:before", ctx);
    if (!ctx.response) {
      if (event.path === `${runtimeConfig.app.baseURL}favicon.ico`) {
        setResponseHeader(event, "Content-Type", "image/x-icon");
        return send(
          event,
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        );
      }
      ctx.response = await ctx.render(event);
      if (!ctx.response) {
        const _currentStatus = getResponseStatus(event);
        setResponseStatus(event, _currentStatus === 200 ? 500 : _currentStatus);
        return send(
          event,
          "No response returned from render handler: " + event.path
        );
      }
    }
    await nitroApp.hooks.callHook("render:response", ctx.response, ctx);
    if (ctx.response.headers) {
      setResponseHeaders(event, ctx.response.headers);
    }
    if (ctx.response.statusCode || ctx.response.statusMessage) {
      setResponseStatus(
        event,
        ctx.response.statusCode,
        ctx.response.statusMessage
      );
    }
    return ctx.response.body;
  });
}

export { AI_DOCUMENT_PROPOSAL_KIND as $, ACCOUNT_STATUS as A, readValidatedBody as B, getRequestIP as C, IdentityError as D, appendResponseHeader as E, createOAuthGrantManagement as F, createEventStream as G, AI_REQUEST_TIMEOUT_MS_MIN as H, IDENTITY_CODE as I, AI_REQUEST_TIMEOUT_MS_MAX as J, AI_MAX_OUTPUT_TOKENS_MIN as K, LOGIN_IDENTIFIER_KIND as L, AI_MAX_OUTPUT_TOKENS_MAX as M, AI_SYSTEM_INSTRUCTIONS_MAX_LENGTH as N, OAUTH_GRANT_REVOCATION_RESULT as O, AI_API_KEY_MIN_LENGTH as P, AI_API_KEY_MAX_LENGTH as Q, AI_PROVIDER as R, AI_CONVERSATION_PAGE_MAX as S, AI_CONVERSATION_PAGE_DEFAULT as T, AI_CONVERSATION_STATUS as U, AI_QUESTION_MAX_LENGTH as V, AI_ASSISTANT_ANSWER_MAX_LENGTH as W, AI_ASSISTANT_STREAM_EVENT as X, AI_ASSISTANT_STREAM_ERROR as Y, AI_MODEL_MAX_LENGTH as Z, AI_DOCUMENT_PROPOSAL_STATUS as _, user as a, OAUTH_GRANT_STATUS as a$, AI_CONNECTION_STATUS as a0, AI_ASSISTANT_AVAILABILITY as a1, AI_DOCUMENT_PROPOSAL_DECISION as a2, AI_CONVERSATION_TITLE_MAX_LENGTH as a3, AI_CONVERSATION_MESSAGE_ROLE as a4, PROJECT_PERMISSION as a5, AI_TURN_OUTCOME as a6, PROJECT_STATUS as a7, MEMBERSHIP_STATUS as a8, projectRolePermissions as a9, DOCUMENT_PUBLICATION_STATE as aA, DOCUMENT_DRAFT_UPDATE_CODE as aB, PROJECT_ROLE_KIND as aC, documentVersions as aD, credentialCategoryRoleGrants as aE, credentialCategoryMemberGrants as aF, credentialFields as aG, CREDENTIAL_FIELD_TYPE as aH, getQuery as aI, PROJECT_DESCRIPTION_MAX_LENGTH as aJ, DOCUMENT_TEMPLATE as aK, documentImages as aL, DOCUMENT_PUBLIC_SHARE_STATUS as aM, DOCUMENT_PUBLIC_SHARE_SCOPE as aN, DOCUMENT_PUBLIC_SHARE_URL_MAX_LENGTH as aO, DOCUMENT_PUBLIC_SHARE_TOKEN_LENGTH as aP, documentPublicShares as aQ, DOCUMENT_PUBLIC_SHARE_TOKEN_BYTES as aR, send as aS, readMultipartFormData as aT, PROJECT_ICON_MAX_BYTES as aU, PROJECT_ICON_MIME_TYPE as aV, PROJECT_LIFECYCLE_PERMISSION_BY_TRANSITION as aW, projectLifecycleEvents as aX, decideProjectLifecycleTransition as aY, availableProjectLifecycleTransitions as aZ, MCP_SCOPES as a_, projectMemberships as aa, projectAiConnections as ab, AI_TURN_RATE_WINDOW_SECONDS as ac, AI_TURN_RATE_MAX_REQUESTS as ad, AI_TURN_LEASE_GRACE_MS as ae, projectAiTurnControls as af, projectAiUsageEvents as ag, projectAiConversations as ah, projectAiConversationMessages as ai, AI_CONVERSATION_RETENTION_DAYS as aj, AI_CONVERSATION_TRASH_DAYS as ak, getCredentialEncryptionEnv as al, getRouterParam as am, readBody as an, PROJECT_LIST_MAX_LIMIT as ao, PROJECT_LIST_DEFAULT_LIMIT as ap, PROJECT_LIFECYCLE_TRANSITION as aq, PROJECT_LIFECYCLE_REASON_MAX_LENGTH as ar, PROJECT_NAME_MAX_LENGTH as as, PROJECT_ROLE_KEY as at, CREATE_PROJECT_ERROR as au, PROJECT_OPERATION_MODE as av, PROJECT_LIFECYCLE_RECEIPT_OUTCOME as aw, PROJECT_LIFECYCLE_CONFLICT_CODE as ax, projectRoles as ay, projectIcons as az, AuthorizationError as b, MCP_SCOPE as b0, oauthGrants as b1, mcpIdempotencyRecords as b2, oauthAccessToken as b3, sendWebResponse as b4, joinRelativeURL as b5, useRuntimeConfig as b6, encodePath as b7, defineRenderHandler as b8, destr as b9, getRouteRules as ba, getResponseStatusText as bb, getResponseStatus as bc, AUTHORIZATION_CODE as c, auditEvents as d, AUDIT_OUTCOME as e, AUDIT_CHANNEL as f, getDatabase as g, defineEventHandler as h, getValidatedQuery as i, createError$1 as j, documents as k, credentials as l, credentialCategories as m, getValidatedRouterParams as n, requireSession as o, projects as p, getRequestURL as q, requireSuperAdmin as r, setHeader as s, getAuth as t, useNitroApp as u, toWebRequest as v, getServerEnv as w, setResponseStatus as x, initializeRuntimeConfiguration as y, getObjectStorageEnv as z };;globalThis.__timing__.logEnd('Load chunks/_/nitro');
//# sourceMappingURL=nitro.mjs.map
