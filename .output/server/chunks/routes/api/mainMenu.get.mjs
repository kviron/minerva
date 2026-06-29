import { d as defineEventHandler } from '../../_/nitro.mjs';
import { g as getAuth } from '../../_/auth.mjs';
import { I as IdentityError } from '../../_/errors.mjs';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import '../../_/env.mjs';
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

async function requireSession(event) {
  const session = await getAuth().api.getSession({ headers: event.headers });
  if (!session) {
    throw new IdentityError("AUTH_REQUIRED");
  }
  return session;
}

const mainMenu_get = defineEventHandler(async (event) => {
  await requireSession(event);
  return [
    { title: "\u0413\u043B\u0430\u0432\u043D\u0430\u044F", url: "/" },
    { title: "\u041F\u0440\u043E\u0435\u043A\u0442\u044B", url: "/catalog" }
  ];
});

export { mainMenu_get as default };
//# sourceMappingURL=mainMenu.get.mjs.map
