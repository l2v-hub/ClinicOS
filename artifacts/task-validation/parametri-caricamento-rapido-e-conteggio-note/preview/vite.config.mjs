import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('./', import.meta.url));
const repo = fileURLToPath(new URL('../../../../', import.meta.url));
export default {
  root, base: './', cacheDir: `${root}../vite-cache`,
  resolve: { alias: { react: `${repo}node_modules/react`, 'react-dom': `${repo}node_modules/react-dom` } },
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4181/synthetic-api') },
  build: { outDir: `${root}../baseline-preview`, emptyOutDir: true, manifest: true },
};
