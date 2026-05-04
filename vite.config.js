import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'api-counts',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = req.url.split('?')[0];
            if (url === '/api/counts') {
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');

              try {
                const isConfigured = env.VITE_SUPABASE_URL && env.VITE_SUPABASE_URL !== 'YOUR_SUPABASE_URL';
                
                if (!isConfigured) {
                  // Return fallback data if credentials are not set
                  res.end(JSON.stringify({ creators: 63, hosts: 22 }));
                  return;
                }

                const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
                
                const { count: creators, error: cErr } = await supabase
                  .from('profiles')
                  .select('*', { count: 'exact', head: true })
                  .eq('role', 'creator');

                const { count: hosts, error: hErr } = await supabase
                  .from('profiles')
                  .select('*', { count: 'exact', head: true })
                  .eq('role', 'host');

                if (cErr || hErr) throw (cErr || hErr);

                res.end(JSON.stringify({ 
                  creators: creators || 0, 
                  hosts: hosts || 0 
                }));
              } catch (err) {
                console.warn('API Fallback triggered (check Supabase credentials):', err.message);
                res.end(JSON.stringify({ creators: 63, hosts: 22 }));
              }
              return;
            }
            next();
          });
        }
      }
    ],
    base: '/',
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          about: resolve(__dirname, 'about.html'),
          how: resolve(__dirname, 'how-it-works.html'),
          faq: resolve(__dirname, 'faq.html'),
          join: resolve(__dirname, 'join.html'),
          login: resolve(__dirname, 'login.html'),
          profile: resolve(__dirname, 'profile.html'),
          pricing: resolve(__dirname, 'pricing/index.html'),
        },
      },
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});
