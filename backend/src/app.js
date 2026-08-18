import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { config } from './config.js';
import apiRouter from './routes/api.js';
import demoApiRouter from './routes/demoApi.js';

export function createApp() {
  const app = express();
  const router = config.demoMode ? demoApiRouter : apiRouter;
  if (config.demoMode) {
    console.log('Running in DEMO_MODE (no PostgreSQL required)');
  }

  const allowed = new Set([
    config.publicUrl,
    config.webAppUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...config.corsOrigins,
  ]);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      originAgentCluster: false,
      frameguard: false,
    })
  );
  app.use((_req, res, next) => {
    res.removeHeader('Origin-Agent-Cluster');
    res.removeHeader('Cross-Origin-Opener-Policy');
    res.removeHeader('Cross-Origin-Resource-Policy');
    next();
  });
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || allowed.has(origin)) return cb(null, true);
        return cb(null, true); // Telegram WebView origins vary; tighten later if needed
      },
      credentials: true,
    })
  );
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', router);

  if (fs.existsSync(config.frontendDist)) {
    app.use(express.static(config.frontendDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
      res.sendFile(path.join(config.frontendDist, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res.json({
        service: 'Get Rewards',
        message: 'API is running. Build frontend into frontend_dist/ for the Mini App.',
      });
    });
  }

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ detail: 'Internal server error' });
  });

  return app;
}
