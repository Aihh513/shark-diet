// Vite 开发插件：将 /api/* 路由到 server/api 下的 handler
// 这样本地开发无需额外启动后端服务
import type { Plugin, ViteDevServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

type HandlerModule = { default: (req: unknown, res: unknown) => void | Promise<void> };

function resolveApiHandler(urlPath: string, root: string): { handlerPath: string; params?: Record<string, string> } | null {
  // urlPath 形如 /api/nutrition/search
  const apiDir = path.join(root, 'server/api');
  const rel = urlPath.replace(/^\/api\//, '').split('?')[0];
  const parts = rel.split('/').filter(Boolean);

  // 精确匹配：server/api/xxx/xxx.ts
  const exactPath = path.join(apiDir, ...parts) + '.ts';
  if (fs.existsSync(exactPath)) {
    return { handlerPath: exactPath };
  }

  // 动态路由匹配：查找 [param].ts
  function findHandler(dir: string, segs: string[], params: Record<string, string>): { handlerPath: string; params: Record<string, string> } | null {
    if (segs.length === 0) {
      const indexPath = path.join(dir, 'index.ts');
      if (fs.existsSync(indexPath)) return { handlerPath: indexPath, params };
      return null;
    }
    const [head, ...rest] = segs;
    // 先精确匹配子目录
    const subDir = path.join(dir, head);
    if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
      const r = findHandler(subDir, rest, params);
      if (r) return r;
    }
    // 再尝试 [param].ts 文件
    if (rest.length === 0) {
      const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
      const dynFile = files.find((f) => f.startsWith('[') && f.endsWith('].ts'));
      if (dynFile) {
        const paramName = dynFile.slice(1, -4);
        return { handlerPath: path.join(dir, dynFile), params: { ...params, [paramName]: head } };
      }
    }
    // [param] 目录
    if (fs.existsSync(dir)) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const dynDir = entries.find((e) => e.isDirectory() && e.name.startsWith('[') && e.name.endsWith(']'));
      if (dynDir) {
        const paramName = dynDir.name.slice(1, -1);
        const r = findHandler(path.join(dir, dynDir.name), rest, { ...params, [paramName]: head });
        if (r) return r;
      }
    }
    return null;
  }

  return findHandler(apiDir, parts, {});
}

export function apiDevPlugin(): Plugin {
  return {
    name: 'shark-diet-api-dev',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/')) {
          next();
          return;
        }
        const root = server.config.root;
        const match = resolveApiHandler(url, root);
        if (!match) {
          next();
          return;
        }

        // 热加载：每次请求都重新 import（开发用）
        try {
          // 用 vite 的 ssrLoadModule 加载 TS 文件
          const mod = (await server.ssrLoadModule(match.handlerPath)) as HandlerModule;
          if (typeof mod.default === 'function') {
            // 注入 params
            if (match.params && Object.keys(match.params).length > 0) {
              (req as unknown as { params: Record<string, string> }).params = match.params;
            }
            await mod.default(req, res);
          } else {
            next();
          }
        } catch (err) {
          process.stderr.write(`[API Dev] handler error: ${String(err)}\n`);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal Server Error', details: String(err) }));
        }
      });
    },
  };
}
