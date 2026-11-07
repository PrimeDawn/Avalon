import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { appendFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { once } from 'node:events';

// Attach to a tester-owned npm run dev terminal; source edits stay in its disposable replica.
const root=process.cwd(), replica=resolve(process.argv[2]), evidence=resolve(process.argv[3]);
const port=Number(process.argv[4]);
assert(replica.startsWith(resolve(root,'.awr/cache')+'\\') && Number.isInteger(port));
await mkdir(evidence,{recursive:true});
const log=event=>appendFileSync(join(evidence,'dev-audit.ndjson'),JSON.stringify({time:new Date().toISOString(),...event})+'\n');
const hash=value=>createHash('sha256').update(value).digest('hex');
const files=['src/renderer/src/App.tsx','src/preload/index.ts','src/main/window.ts'];
const originals=new Map(await Promise.all(files.map(async f=>[f,await readFile(join(replica,f),'utf8')])));
const modified=new Map();const pids=new Set();const errors=[];
let browser,page,cdp,sequence=0;
const powershell=command=>execFileSync('pwsh.exe',['-NoProfile','-Command',command],{encoding:'utf8',windowsHide:true}).trim();
async function connect() {
  browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context=browser.contexts()[0];
  page=context.pages().find(p=>p.url().startsWith('http://127.0.0.1:5178'))??await context.waitForEvent('page');
  page.on('console',m=>log({kind:'console',type:m.type(),text:m.text()}));
  page.on('pageerror',e=>{errors.push(e.message);log({kind:'pageerror',message:e.message});});
  context.on('request',r=>log({kind:'request',method:r.method(),url:r.url().split('?')[0]}));
  context.on('requestfailed',r=>log({kind:'requestfailed',url:r.url().split('?')[0],failure:r.failure()}));
  cdp=await browser.newBrowserCDPSession();
  const result=await cdp.send('SystemInfo.getProcessInfo');
  for(const process of result.processInfo)pids.add(process.id);
  const pid=result.processInfo.find(p=>p.type==='browser').id;
  const ancestors=JSON.parse(powershell(`$idValue=${pid}; $items=@(); for($i=0;$i -lt 4;$i++){ $p=Get-CimInstance Win32_Process -Filter "ProcessId=$idValue"; if(-not $p){break}; $items+=@{pid=[int]$p.ProcessId;name=$p.Name}; $idValue=$p.ParentProcessId }; ConvertTo-Json -InputObject $items -Compress`));
  for(const p of ancestors)pids.add(p.pid);
  log({kind:'attached',pid,processes:result.processInfo,ancestors});
  await expect(page.getByText('工作台已启动')).toBeVisible();
  return pid;
}
async function edit(file,text){await writeFile(join(replica,file),text);modified.set(file,text);log({kind:'edit-replica',file,sha256:hash(text)});}
async function restore(file){if(!modified.has(file))return;assert.equal(await readFile(join(replica,file),'utf8'),modified.get(file),'Do not overwrite concurrent changes');await writeFile(join(replica,file),originals.get(file));modified.delete(file);log({kind:'restored',file,sha256:hash(originals.get(file))});}
async function screenshot(label){await page.screenshot({path:join(evidence,`${++sequence}-${label}.png`)});}
async function reconnect(oldPid){await expect.poll(async()=>{try{const json=await fetch(`http://127.0.0.1:${port}/json/version`).then(r=>r.json());return json.webSocketDebuggerUrl;}catch{return '';}},{timeout:15000}).not.toBe('');const newPid=await connect();assert.notEqual(newPid,oldPid);return newPid;}
try {
  let pid=await connect();assert.equal(page.url(),'http://127.0.0.1:5178/');
  await page.getByRole('button',{name:'检查连接'}).click();await expect(page.getByRole('status')).toHaveText('连接正常 · Avalon 0.1.0');await screenshot('baseline');
  const marker='开发热更新已验证';
  await edit(files[0],originals.get(files[0]).replace('工作台已启动',marker));
  await expect(page.getByText(marker)).toBeVisible();await screenshot('renderer-hmr');
  const samePid=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.find(p=>p.type==='browser').id;assert.equal(samePid,pid);
  await restore(files[0]);await expect(page.getByText('工作台已启动')).toBeVisible();log({case:'TC-009',passed:true,pid});
  await edit(files[1],originals.get(files[1]).replace('version: info.version','version: info.version + "-preload-probe"'));
  await expect.poll(()=>page.evaluate(()=>window.avalon.getAppInfo().then(x=>x.version)).catch(()=>''),{timeout:15000}).toBe('0.1.0-preload-probe');
  await page.getByRole('button',{name:'检查连接'}).click();await expect(page.getByRole('status')).toHaveText('连接正常 · Avalon 0.1.0-preload-probe');await screenshot('preload-reload');
  await restore(files[1]);await expect.poll(()=>page.evaluate(()=>window.avalon.getAppInfo().then(x=>x.version)).catch(()=>''),{timeout:15000}).toBe('0.1.0');
  log({case:'TC-010-preload',passed:true,pid});
  const disconnected=once(browser,'disconnected',{signal:AbortSignal.timeout(15000)});
  await edit(files[2],originals.get(files[2]).replace('  return window;','  window.setTitle("Avalon main probe");\n  return window;'));
  await disconnected;pid=await reconnect(pid);
  await expect.poll(()=>powershell(`(Get-Process -Id ${pid}).MainWindowTitle`),{timeout:8000}).toBe('Avalon main probe');
  await page.getByRole('button',{name:'检查连接'}).click();await expect(page.getByRole('status')).toHaveText('连接正常 · Avalon 0.1.0');await screenshot('main-restart');
  log({case:'TC-010-main',passed:true,pid,title:'Avalon main probe'});
  const disconnectedAgain=once(browser,'disconnected',{signal:AbortSignal.timeout(15000)});await restore(files[2]);await disconnectedAgain;pid=await reconnect(pid);
  await expect.poll(()=>powershell(`(Get-Process -Id ${pid}).MainWindowTitle`)).toBe('Avalon');
  assert.deepEqual(errors,[]);
  for(const [file,original] of originals)assert.equal(await readFile(join(replica,file),'utf8'),original);
  await writeFile(join(evidence,'ready-for-ctrl-c.json'),JSON.stringify({passed:true,pids:[...pids],restored:files,time:new Date().toISOString()},null,2));
  console.log('UPDATE CHECKS PASSED; send Ctrl+C to the tester-owned dev terminal now.');
  await once(browser,'disconnected',{signal:AbortSignal.timeout(120000)});
  log({case:'TC-011',event:'browser-disconnected-after-terminal-interrupt'});
  await writeFile(join(evidence,'dev-result.json'),JSON.stringify({passed:true,errors,pids:[...pids],timestamp:new Date().toISOString()},null,2));
} catch(error){log({kind:'failed',error:String(error)});await writeFile(join(evidence,'dev-result.json'),JSON.stringify({passed:false,error:String(error),pids:[...pids]},null,2));process.exitCode=1;}
finally{for(const file of [...modified.keys()])await restore(file);await cdp?.detach().catch(()=>{});}
if(process.exitCode)process.exit(process.exitCode);
