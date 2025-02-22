export const publicRoutes = [
  "/",
  "/sign-in",
  "/sign-up",
  "/api/public",
  "/sequences/public(.*)",
];

export const ignoredRoutes = [
  "/api/public(.*)",
  "/_next/static/(.*)",
  "/favicon.ico",
]; 