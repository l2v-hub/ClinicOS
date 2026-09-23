import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
const root=resolve('artifacts/task-validation/moduli-allineamento-topbar/preview');
await build({root,configFile:false,envDir:false,plugins:[react()],build:{outDir:resolve(root,'build'),emptyOutDir:false}});
