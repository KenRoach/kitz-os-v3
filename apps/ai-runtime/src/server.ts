import { parseSharedEnv } from '@kitz/config/env';
import { buildApp } from './app.js';

const env = parseSharedEnv(process.env);
const port = Number.parseInt(process.env.PORT ?? '5200', 10);
const host = process.env.HOST ?? '0.0.0.0';

const app = buildApp({ serviceJwtSecret: env.SERVICE_JWT_SECRET });

app.listen({ port, host }).catch((err: unknown) => {
  app.log.error({ err }, 'ai-runtime failed to start');
  process.exit(1);
});
