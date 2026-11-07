import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {openSync,closeSync} from 'node:fs';
import {resolve,join} from 'node:path';
const require=createRequire(import.meta.url), exe=require('electron');
const dir=resolve('spec/versions/v0.1/specs/20261107-1429-tech-开发态应用骨架/debugger/artifacts',`stdio-${Date.now()}`);
await mkdir(dir,{recursive:true});
const inherited={...process.env};for(const k of Object.keys(inherited))if(k.toUpperCase()==='ELECTRON_RUN_AS_NODE')delete inherited[k];
const minimal=Object.fromEntries(Object.entries(inherited).filter(([k])=>['SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','PATH','COMSPEC'].includes(k.toUpperCase())));
const results=[];
for(const [name,env,mode] of [['baseline-1',inherited,'pipe'],['baseline-2',inherited,'pipe'],['minimal-env',minimal,'pipe'],['file-stdio',inherited,'file'],['ignore-stdio',inherited,'ignore'],['inherit-stdio',inherited,'inherit']]) {
 let output='';const file=join(dir,`${name}-output.txt`);const fd=mode==='file'?openSync(file,'wx'):undefined;
 const child=spawn(exe,['--version'],{env,windowsHide:true,stdio:mode==='file'?['ignore',fd,fd]:mode==='pipe'?['ignore','pipe','pipe']:mode});
 for(const stream of [child.stdout,child.stderr])stream?.on('data',d=>output+=d);
 const timer=setTimeout(()=>child.kill(),8000);
 const result=await new Promise(done=>{child.on('error',e=>done({error:String(e)}));child.on('close',(code,signal)=>done({code,signal}));});clearTimeout(timer);if(fd!==undefined)closeSync(fd);
 if(mode!=='file')await writeFile(file,output);
 results.push({name,command:[exe,'--version'],time:new Date().toISOString(),pid:child.pid,...result,output:mode==='file'?await readFile(file,'utf8'):output});console.log(results.at(-1));
}
await writeFile(join(dir,'results.json'),JSON.stringify(results,null,2));console.log(dir);
