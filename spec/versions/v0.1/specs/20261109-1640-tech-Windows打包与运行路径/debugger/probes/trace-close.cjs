// Diagnostic only: instrument a private package copy; never modify the shipped package.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{createHash}=require('node:crypto');
const asar=require('@electron/asar');
const spec=path.resolve(__dirname,'..');
const run=new Date().toISOString().replace(/[:.]/g,'-');
const evidence=path.join(spec,'artifacts','debug-002',run);
const root=path.resolve('.awr/cache/spec007-debug-'+run);
fs.mkdirSync(evidence,{recursive:true});fs.mkdirSync(root,{recursive:true});
const runtime=path.join(root,'runtime'),expanded=path.join(root,'expanded');
const originalArchive=path.resolve('release/win-unpacked/resources/app.asar');
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const before=hash(originalArchive);
const probe=String.raw`
const {app,dialog}=require('electron'),fs=require('node:fs'),path=require('node:path');
const out=process.env.AVALON_PROBE_TRACE,mode=process.env.AVALON_PROBE_MODE;
const log=(event,detail={})=>fs.appendFileSync(out,JSON.stringify({at:process.hrtime.bigint().toString(),event,...detail})+'\n');
fs.mkdirSync(process.env.AVALON_PROBE_PROFILE,{recursive:true});
app.setPath('appData',process.env.AVALON_PROBE_PROFILE);
log('probe-start',{mode,isPackaged:app.isPackaged});
dialog.showErrorBox=(title,content)=>log('error-box',{title,content});
app.on('window-all-closed',()=>log('window-all-closed'));
app.on('will-quit',()=>log('will-quit'));
app.on('browser-window-created',(_event,window)=>{
  log('window-created');
  const originalDestroyed=window.isDestroyed.bind(window);
  window.isDestroyed=()=>{const value=originalDestroyed();log('isDestroyed',{value});return value;};
  window.on('close',()=>log('close-event',{destroyed:originalDestroyed()}));
  window.on('closed',()=>log('closed-event'));
  window.webContents.on('did-fail-load',(_e,code,description)=>log('did-fail-load',{code,description,destroyed:originalDestroyed()}));
  window.webContents.on('did-finish-load',()=>log('did-finish-load'));
  const originalLoad=window.loadFile.bind(window);
  window.loadFile=(...args)=>{log('loadFile-called');if(mode==='missing')args[0]+='.missing';return originalLoad(...args).then(v=>{log('load-resolved');return v},error=>{log('load-rejected',{message:error.message,destroyed:originalDestroyed()});throw error});};
  const event=mode==='early'?'did-start-loading':'did-finish-load';
  window.webContents.once(event,()=>setImmediate(()=>{log('close-request',{trigger:event,destroyed:originalDestroyed()});if(!originalDestroyed())window.close();}));
});
`;
async function launch(mode,index){
  const trace=path.join(evidence,`${index}-${mode}.ndjson`);
  const env={...process.env,AVALON_PROBE_TRACE:trace,AVALON_PROBE_MODE:mode,AVALON_PROBE_PROFILE:path.join(root,'profiles',String(index))};
  delete env.ELECTRON_RUN_AS_NODE;delete env.ELECTRON_RENDERER_URL;
  return new Promise((resolve,reject)=>{
    const child=spawn(path.join(runtime,'Avalon.exe'),[],{env,cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let timedOut=false;const timer=setTimeout(()=>{timedOut=true;child.kill()},15000);
    for(const stream of [child.stdout,child.stderr])stream.on('data',d=>fs.appendFileSync(path.join(evidence,`${index}-${mode}.txt`),d));
    child.on('error',reject);child.on('exit',exitCode=>{clearTimeout(timer);const events=fs.existsSync(trace)?fs.readFileSync(trace,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];resolve({mode,index,exitCode,timedOut,events});});
  });
}
(async()=>{
fs.cpSync('release/win-unpacked',runtime,{recursive:true});
asar.extractAll(path.join(runtime,'resources/app.asar'),expanded);
const main=path.join(expanded,'out/main/index.cjs');let source=fs.readFileSync(main,'utf8');
assert(source.includes('new electron.BrowserWindow({'));
source="require('./debug-probe.cjs');\n"+source.replace('new electron.BrowserWindow({','new electron.BrowserWindow({ show: false,');
fs.writeFileSync(main,source);fs.writeFileSync(path.join(expanded,'out/main/debug-probe.cjs'),probe);
await asar.createPackage(expanded,path.join(runtime,'resources/app.asar'));
const fixed=process.argv.includes('--expect-fixed');
const results=[];for(const [i,mode] of (fixed?['normal','early','early','missing']:['normal','early','early']).entries())results.push(await launch(mode,i));
const result={timestamp:new Date().toISOString(),hypothesis:'loadFile rejects after close event but before native window destruction; isDestroyed-only check misclassifies cancellation',originalArchiveSha256:before,archiveUnchanged:hash(originalArchive)===before,results};
fs.writeFileSync(path.join(evidence,'result.json'),JSON.stringify(result,null,2));
fs.writeFileSync('.awr/cache/spec007-debug-close-evidence.txt',evidence);
console.log(JSON.stringify(result,null,2));
assert(result.archiveUnchanged);assert(results.every(r=>!r.timedOut));
if(fixed)for(const r of results){assert.equal(r.exitCode,r.mode==='missing'?1:0);assert.equal(r.events.some(e=>e.event==='error-box'),r.mode==='missing');}
})().catch(error=>{console.error(error);process.exitCode=1});
