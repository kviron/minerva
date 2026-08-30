globalThis.__timing__.logStart('Load chunks/routes/api/mainMenu.get');import { h as defineEventHandler, o as requireSession } from '../../_/nitro.mjs';
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
import '@better-auth/oauth-provider';

const GLOBAL_NAVIGATION = {
  DASHBOARD: {
    id: "dashboard",
    labelKey: "navigation.dashboard",
    to: "/dashboard",
    icon: "layout-dashboard"
  },
  PROJECTS: {
    id: "projects",
    labelKey: "navigation.projects",
    to: "/projects",
    icon: "folder-kanban"
  },
  SETTINGS: {
    id: "settings",
    labelKey: "navigation.settings",
    to: "/settings",
    icon: "settings"
  },
  ADMINISTRATION: {
    id: "administration",
    labelKey: "navigation.administration",
    to: "/administration",
    icon: "shield-check"
  }
};

function getGlobalNavigation(session) {
  const baseNavigation = [
    { ...GLOBAL_NAVIGATION.DASHBOARD },
    { ...GLOBAL_NAVIGATION.PROJECTS },
    { ...GLOBAL_NAVIGATION.SETTINGS }
  ];
  return session.user.superAdmin === true ? [...baseNavigation, { ...GLOBAL_NAVIGATION.ADMINISTRATION }] : baseNavigation;
}

const mainMenu_get = defineEventHandler(async (event) => {
  const session = await requireSession(event);
  return getGlobalNavigation(session);
});

export { mainMenu_get as default };;globalThis.__timing__.logEnd('Load chunks/routes/api/mainMenu.get');
//# sourceMappingURL=mainMenu.get.mjs.map
