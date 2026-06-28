globalThis.__timing__.logStart('Load chunks/routes/api/mainMenu.get');import { c as defineEventHandler } from '../../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const mainMenu_get = defineEventHandler(async (event) => {
  const user = event.context.user;
  const userRole = (user == null ? void 0 : user.role) || "guest";
  const allMenuItems = [
    { title: "\u0413\u043B\u0430\u0432\u043D\u0430\u044F", url: "/", roles: ["guest", "user", "admin"] },
    { title: "\u041A\u0430\u0442\u0430\u043B\u043E\u0433", url: "/catalog", roles: ["guest", "user", "admin"] },
    { title: "\u041C\u043E\u0438 \u0437\u0430\u043A\u0430\u0437\u044B", url: "/orders", roles: ["user", "admin"] },
    { title: "\u041F\u0430\u043D\u0435\u043B\u044C \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F", url: "/admin", roles: ["admin"] }
  ];
  const allowedMenu = allMenuItems.filter((item) => item.roles.includes(userRole));
  return allowedMenu.map(({ title, url }) => ({ title, url }));
});

export { mainMenu_get as default };;globalThis.__timing__.logEnd('Load chunks/routes/api/mainMenu.get');
//# sourceMappingURL=mainMenu.get.mjs.map
