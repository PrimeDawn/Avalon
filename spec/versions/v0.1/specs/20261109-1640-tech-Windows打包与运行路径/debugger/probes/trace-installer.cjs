// Executes the installed electron-builder extraction macro in a silent isolated NSIS probe.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync,spawnSync}=require('node:child_process');
const run=new Date().toISOString().replace(/[:.]/g,'-');
const evidence=path.resolve(__dirname,'../artifacts/debug-002',run);
const root=path.resolve('.awr/cache/spec007-nsis-probe-'+run);fs.mkdirSync(root,{recursive:true});fs.mkdirSync(evidence,{recursive:true});
const toolRoot='C:/Users/35692/AppData/Local/electron-builder/Cache';
function find(root,name){for(const d of fs.readdirSync(root,{withFileTypes:true})){const p=path.join(root,d.name);if(d.isDirectory()){const r=find(p,name);if(r)return r}else if(d.name===name)return p}}
const compiler=find(path.join(toolRoot,'nsis-3.0.4.1'),'makensis.exe');
const plugin=find(path.join(toolRoot,'nsis-resources-3.4.1'),'nsis7z.dll').replace('x64-unicode','x86-unicode');
const vendor=fs.readFileSync('node_modules/app-builder-lib/templates/nsis/include/extractAppPackage.nsh','utf8');
const branch='MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDRETRY IDCANCEL AbortExtract7za';
assert(vendor.includes(branch));
const instrumented=vendor.replace(branch,'FileWrite $9 "copy-failed;message=appCannotBeClosed;attempt=$R1$\\r$\\n"\n      FileClose $9\n      SetErrorLevel 7\n      Goto AbortExtract7za');
const macro=path.join(root,'extract-traced.nsh');fs.writeFileSync(macro,instrumented);
fs.writeFileSync(path.join(root,'payload.txt'),'test package payload');
const seven=find(path.join(toolRoot,'7zip@1.0.0'),'7za.exe');
execFileSync(seven,['a',path.join(root,'payload.7z'),path.join(root,'payload.txt')],{windowsHide:true});
const nsi=path.join(root,'probe.nsi'),exe=path.join(root,'probe.exe');
fs.writeFileSync(nsi,`Unicode true\nName "Avalon extraction diagnostic"\nOutFile "${exe}"\nRequestExecutionLevel user\nSilentInstall silent\n!include LogicLib.nsh\n!define PRODUCT_NAME "Avalon"\n!addplugindir "${path.dirname(plugin)}"\n!include "${macro}"\nSection\n  ReadEnvStr $INSTDIR "AVALON_PROBE_TARGET"\n  ReadEnvStr $8 "AVALON_PROBE_LOG"\n  FileOpen $9 $8 w\n  InitPluginsDir\n  SetOutPath $PLUGINSDIR\n  File /oname=payload.7z "${path.join(root,'payload.7z')}"\n  SetOutPath $INSTDIR\n  !insertmacro extractUsing7za "$PLUGINSDIR\\payload.7z"\n  FileWrite $9 "copy-succeeded$\\r$\\n"\n  FileClose $9\nSectionEnd\n`);
const compiled=spawnSync(compiler,['/V2',nsi],{encoding:'utf8',windowsHide:true});fs.writeFileSync(path.join(evidence,'compile.txt'),compiled.stdout+compiled.stderr);assert.equal(compiled.status,0);
const ps=path.join(root,'run.ps1');
fs.writeFileSync(ps,`$ErrorActionPreference='Stop'
$results=@()
foreach($case in @('writable','denied-1','denied-2')){
 $target=Join-Path '${root}' $case
 New-Item -ItemType Directory -Path $target | Out-Null
 $acl=Get-Acl -LiteralPath $target
 $saved=$acl.Sddl
 try{
  if($case -like 'denied*'){
   $identity=[Security.Principal.WindowsIdentity]::GetCurrent().User
   $rule=[Security.AccessControl.FileSystemAccessRule]::new($identity,[Security.AccessControl.FileSystemRights]::Write,[Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit',[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Deny)
   $acl.AddAccessRule($rule);Set-Acl -LiteralPath $target -AclObject $acl
  }
  $env:AVALON_PROBE_TARGET=$target
  $env:AVALON_PROBE_LOG=Join-Path '${evidence}' ($case+'.txt')
  $p=Start-Process -FilePath '${exe}' -PassThru -WindowStyle Hidden
  $handle=$p.Handle
  if(-not $p.WaitForExit(20000)){Stop-Process -Id $p.Id;throw 'Probe timed out'}
  $results+= [ordered]@{case=$case;exitCode=$p.ExitCode;payloadExists=(Test-Path -LiteralPath (Join-Path $target 'payload.txt'));output=(Get-Content -LiteralPath $env:AVALON_PROBE_LOG -Raw);avalonProcesses=@(Get-Process Avalon -ErrorAction SilentlyContinue).Count}
 }finally{if($case -like 'denied*'){$acl=Get-Acl -LiteralPath $target;$acl.RemoveAccessRuleSpecific($rule);Set-Acl -LiteralPath $target -AclObject $acl;if(@((Get-Acl -LiteralPath $target).Access | Where-Object {$_.AccessControlType -eq 'Deny' -and -not $_.IsInherited}).Count){throw 'Test deny rule cleanup failed'}}}
}
$results | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath '${path.join(evidence,'result.json')}'
$results | ConvertTo-Json -Depth 4
`);
const psExecutable=execFileSync('where.exe',['pwsh.exe'],{encoding:'utf8',windowsHide:true}).trim().split(/\r?\n/)[0];
const output=spawnSync(psExecutable,['-NoProfile','-File',ps],{encoding:'utf8',windowsHide:true,timeout:70000});fs.writeFileSync(path.join(evidence,'run.txt'),output.stdout+output.stderr);console.log(output.stdout);assert.equal(output.status,0);
const results=JSON.parse(fs.readFileSync(path.join(evidence,'result.json'),'utf8').replace(/^\uFEFF/,''));assert.equal(results[0].exitCode,0);for(const r of results.slice(1)){assert.equal(r.exitCode,7);assert(r.output.includes('appCannotBeClosed'));assert.equal(r.avalonProcesses,0)}
fs.writeFileSync('.awr/cache/spec007-debug-nsis-evidence.txt',evidence);console.log('Evidence: '+evidence);
