const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync,execFileSync}=require('node:child_process');
const run=new Date().toISOString().replace(/[:.]/g,'-');
const evidence=path.resolve(__dirname,'../artifacts/debug-002',run),root=path.resolve('.awr/cache/spec007-preflight-'+run);
fs.mkdirSync(root,{recursive:true});fs.mkdirSync(evidence,{recursive:true});
function find(root,name){for(const d of fs.readdirSync(root,{withFileTypes:true})){const p=path.join(root,d.name);if(d.isDirectory()){const r=find(p,name);if(r)return r}else if(d.name===name)return p}}
const compiler=find('C:/Users/35692/AppData/Local/electron-builder/Cache/nsis-3.0.4.1','makensis.exe');
const nsi=path.join(root,'probe.nsi'),exe=path.join(root,'probe.exe');
fs.writeFileSync(nsi,`Unicode true
Name "Avalon preflight test"
OutFile "${exe}"
RequestExecutionLevel user
SilentInstall silent
!addincludedir "${path.resolve('build')}"
!include "installer.nsh"
Function instFilesPre
FunctionEnd
Function .onInit
 ReadEnvStr $INSTDIR "AVALON_PROBE_TARGET"
 !insertmacro customInit
FunctionEnd
Section
 ReadEnvStr $8 "AVALON_PROBE_MARKER"
 FileOpen $9 "$8" w
 FileWrite $9 "standard-install-section-reached"
 FileClose $9
 FileOpen $9 "$INSTDIR\\payload.txt" w
 FileWrite $9 "payload"
 FileClose $9
SectionEnd
`);
const compiled=spawnSync(compiler,['/V2',nsi],{encoding:'utf8',windowsHide:true});fs.writeFileSync(path.join(evidence,'compile.txt'),compiled.stdout+compiled.stderr);assert.equal(compiled.status,0,compiled.stdout+compiled.stderr);
const ps=path.join(root,'run.ps1');fs.writeFileSync(ps,`$ErrorActionPreference='Stop'
$results=@()
foreach($case in @('existing','new','denied','file-block','denied-parent')){
 $target=Join-Path '${root}' ($case+'\\Avalon')
 $parent=Split-Path $target
 New-Item -ItemType Directory -Path $parent | Out-Null
 if($case -eq 'file-block'){Set-Content -LiteralPath $target -Value 'file blocks directory'}elseif($case -ne 'new'){New-Item -ItemType Directory -Path $target | Out-Null}
 $denyTarget=if($case -eq 'denied-parent'){$parent}else{$target}
 $rule=$null
 try{
  if($case -like 'denied*'){
   $identity=[Security.Principal.WindowsIdentity]::GetCurrent().User
   $rule=[Security.AccessControl.FileSystemAccessRule]::new($identity,[Security.AccessControl.FileSystemRights]::Write,[Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit',[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Deny)
   $acl=Get-Acl -LiteralPath $denyTarget;$acl.AddAccessRule($rule);Set-Acl -LiteralPath $denyTarget -AclObject $acl
  }
  $env:AVALON_PROBE_TARGET=$target;$env:AVALON_PROBE_MARKER=Join-Path '${root}' ($case+'.marker')
  $p=Start-Process -FilePath '${exe}' -PassThru -WindowStyle Hidden
  $handle=$p.Handle
  if(-not $p.WaitForExit(10000)){Stop-Process -Id $p.Id;throw 'Preflight timeout'}
  $results+=[ordered]@{case=$case;exitCode=$p.ExitCode;standardInstallReached=(Test-Path -LiteralPath $env:AVALON_PROBE_MARKER);payloadExists=(Test-Path -LiteralPath (Join-Path $target 'payload.txt'));temporaryFiles=@(Get-ChildItem -LiteralPath $parent -Recurse -File -Filter '*.tmp' -ErrorAction SilentlyContinue).Count}
 }finally{if($rule){$acl=Get-Acl -LiteralPath $denyTarget;$acl.RemoveAccessRuleSpecific($rule);Set-Acl -LiteralPath $denyTarget -AclObject $acl}}
}
$results | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath '${path.join(evidence,'result.json')}'
$results | ConvertTo-Json -Depth 4
`);
const pwsh=execFileSync('where.exe',['pwsh.exe'],{encoding:'utf8'}).trim().split(/\r?\n/)[0];
const runResult=spawnSync(pwsh,['-NoProfile','-File',ps],{encoding:'utf8',windowsHide:true,timeout:60000});fs.writeFileSync(path.join(evidence,'run.txt'),runResult.stdout+runResult.stderr);assert.equal(runResult.status,0,runResult.stdout+runResult.stderr);
const results=JSON.parse(fs.readFileSync(path.join(evidence,'result.json'),'utf8').replace(/^\uFEFF/,''));
for(const r of results){const valid=['existing','new'].includes(r.case);assert.equal(r.exitCode,valid?0:2);assert.equal(r.standardInstallReached,valid);assert.equal(r.payloadExists,valid);assert.equal(r.temporaryFiles,0)}
fs.writeFileSync('.awr/cache/spec007-preflight-evidence.txt',evidence);console.log(JSON.stringify({evidence,results},null,2));
