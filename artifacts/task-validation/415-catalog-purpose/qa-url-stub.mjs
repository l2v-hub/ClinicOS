import {registerHooks} from 'node:module';
// node:test cannot bundle Vite's ?url imports. SSR does not execute PDF effects.
registerHooks({resolve(specifier,context,next){
  if(specifier.endsWith('?url')) return {url:'data:text/javascript,export default "synthetic-test-worker-url"',shortCircuit:true};
  return next(specifier,context);
},load(url,context,next){
  const result=next(url,context);
  if(/\/(entraAuth|config)\.(ts|js)$/.test(url)&&result.source){
    return {...result,source:String(result.source).replaceAll('import.meta.env','({})')};
  }
  return result;
}});
