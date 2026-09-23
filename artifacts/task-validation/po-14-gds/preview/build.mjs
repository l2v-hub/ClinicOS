import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
const root=resolve('artifacts/task-validation/po-14-gds/preview');
await build({root,configFile:false,envDir:false,plugins:[react()],
 define:{'import.meta.env.VITE_API_URL':JSON.stringify('http://127.0.0.1:4195/api')},
 build:{outDir:resolve(root,'build'),emptyOutDir:false}});
