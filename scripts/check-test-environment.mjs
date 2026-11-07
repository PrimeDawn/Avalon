import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, cp, writeFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { once } from 'node:events';
import assert from 'node:assert/strict';
const root=process.cwd();
const require=createRequire(import.meta.url);
const id=`independent-${Date.now()}`;
const evidence=resolve('spec/versions/v0.1/specs/20261107-1429-tech-开发态应用骨架/tester/artifacts/test-logs',id);
const replica=resolve('.awr/cache',id,'中文 空格');
await mkdir(evidence,{recursive:true}); await mkdir(replica,{recursive:true});
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.ELECTRON_RENDERER_URL;
const npmCli=resolve(process.execPath,'../node_modules/npm/bin/npm-cli.js');
const results=[];
async function run(name, args, cwd, expected=0) {
 const log=createWriteStream(join(evidence,`${name}.txt`)); let text='';
 log.write(`Command: node ${args.join(' ')}\nTimestamp: ${new Date().toISOString()}\nWorking directory: ${cwd}\n`);
 const child=spawn(process.execPath,args,{cwd,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
 for(const stream of [child.stdout,child.stderr])stream.on('data',d=>{log.write(d);text+=d;});
 const deadline=setTimeout(()=>child.kill(),name==='clean-runtime'?120000:30000);
 const [code,signal]=await once(child,'close');clearTimeout(deadline);
 await new Promise(done=>log.end(`Exit code: ${code}\nSignal: ${signal}\n`,done));
 assert.equal(code,expected,name);results.push({name,code,passed:true});console.log(name,code);
 return text;
}
try {
 for(const f of ['package.json','package-lock.json','electron.vite.config.ts','vitest.config.ts','tsconfig.json','tsconfig.node.json','tsconfig.web.json']) await cp(join(root,f),join(replica,f));
 for(const d of ['src','tests/unit']) await cp(join(root,d),join(replica,d),{recursive:true});
 for(const [name,args] of [['clean-ci',['ci']],['clean-typecheck',['run','typecheck']],['clean-unit',['run','test:unit']],['clean-build',['run','build']]]) await run(name,[npmCli,...args],replica);
 await run('clean-runtime',[resolve(replica,'node_modules/electron/install.js')],replica);
 for(const f of ['out/main/index.cjs','out/preload/index.cjs','out/renderer/index.html']) assert.ok((await stat(join(replica,f))).size>0);
 const occupied=createServer();occupied.listen(5178,'127.0.0.1');await once(occupied,'listening');
 try {
  const output=await run('TC-013-port-conflict',[resolve(replica,'node_modules/electron-vite/bin/electron-vite.js'),'dev','--watch'],replica,1);
  assert.match(output,/Port 5178 is already in use/);
  assert.doesNotMatch(output,/starting electron app/);
 } finally {await new Promise(resolve=>occupied.close(resolve));}
 results.push({name:'TC-001',passed:true},{name:'TC-013',passed:true});
} catch(error) {results.push({passed:false,error:String(error)});process.exitCode=1;console.error(error);}
await writeFile(join(evidence,'results.json'),JSON.stringify({id,timestamp:new Date().toISOString(),results},null,2));
console.log(evidence);

