import {build} from 'vite';
import react,{reactCompilerPreset} from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import {resolve} from 'node:path';
const base=resolve('artifacts/task-validation/417-vitals-form/independent-qa417');
await build({configFile:false,root:resolve('frontend'),cacheDir:resolve(base,'cache/build-vite'),plugins:[react(),babel({presets:[reactCompilerPreset()]})],build:{outDir:resolve(base,'build/dist'),emptyOutDir:false}});
