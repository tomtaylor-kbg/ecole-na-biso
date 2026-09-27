const appPromise = import('../apps/api/src/server.js').then((module) => module.default);

export default async function handler(req: any, res: any) {
  const app = await appPromise;
  return app(req, res);
}
