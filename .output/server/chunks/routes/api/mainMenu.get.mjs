globalThis.__timing__.logStart('Load chunks/routes/api/mainMenu.get');import { d as defineEventHandler } from '../../_/nitro.mjs';
import { I as IDENTITY_CODE } from '../../_/constants.mjs';
import { g as getAuth } from '../../_/get-auth.mjs';
import { I as IdentityError } from '../../_/identity-error.mjs';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import 'zod';
import 'drizzle-orm/postgres-js';
import 'postgres';
import 'nodemailer';
import '@better-auth/core/error';
import 'better-auth';
import 'better-auth/adapters/drizzle';
import 'better-auth/plugins/username';
import 'drizzle-orm';
import 'drizzle-orm/pg-core';

function createRequireSession(getSession2) {
  return async function requireSession2(event) {
    const session = await getSession2(event.headers);
    if (session === null) {
      throw new IdentityError(IDENTITY_CODE.AUTH_REQUIRED);
    }
    return session;
  };
}
const requireSession = createRequireSession(
  async (headers) => {
    var _a;
    return (_a = await getAuth().api.getSession({ headers })) != null ? _a : null;
  }
);

const mainMenu_get = defineEventHandler(async (event) => {
  await requireSession(event);
  return [
    { title: "\u0413\u043B\u0430\u0432\u043D\u0430\u044F", url: "/" },
    { title: "\u041F\u0440\u043E\u0435\u043A\u0442\u044B", url: "/catalog" }
  ];
});

export { mainMenu_get as default };;globalThis.__timing__.logEnd('Load chunks/routes/api/mainMenu.get');
//# sourceMappingURL=mainMenu.get.mjs.map
