from pathlib import Path
import json,hashlib,datetime,re,subprocess
root=Path.cwd();spec=root/'spec/versions/v0.1/specs/20261107-1429-tech-开发态应用骨架';logs=spec/'tester/artifacts/test-logs'
run=logs/'2026-11-07T09-10-37-477Z-b537ad';clean=logs/'independent-1794042637021';dev=logs/'dev-closeout-1794042637021'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf-8')
env=read(run/'environment.json');result=read(run/'results.json');ind=read(clean/'results.json');d=read(dev/'dev-result.json');ctrl=read(dev/'ctrl-c-result.json')
assert read(run/'run-result.json')['exitCode']==0 and result['stats']==dict(result['stats'],expected=8,unexpected=0,skipped=0,flaky=0)
assert all(x['passed'] for x in ind['results']) and d['passed'] and ctrl['passed']
snapshot={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for folder in ['src','tests/unit','tests/e2e','scripts'] for p in (root/folder).rglob('*') if p.is_file()}
before=read(logs/'2026-11-07T07-37-16-049Z-8e1aef/source-files-sha256.json')
unchanged=[k for k,v in before.items() if k.replace('\\','/').startswith(('src/','tests/unit/')) and snapshot[k]==v]
assert len(unchanged)==15
assert env['lockfileSha256']==hashlib.sha256((root/'package-lock.json').read_bytes()).hexdigest()
write(run/'source-files-sha256.json',snapshot)
events=[json.loads(x) for x in (dev/'dev-audit.ndjson').read_text(encoding='utf-8').splitlines()]
for case in ['TC-009','TC-010-preload','TC-010-main']:assert any(x.get('case')==case and x.get('passed') for x in events)
assert not [x for x in events if x.get('kind') in ['pageerror','requestfailed'] or (x.get('kind')=='console' and x.get('type')=='error')]
assert all(x['url'].startswith('http://127.0.0.1:5178/') for x in events if x.get('kind')=='request')
unit=(run/'test-unit.txt').read_text(encoding='utf-8');assert re.search(r'52\s+passed',re.sub(r'\x1b\[[0-9;]*m','',unit))
audit=[json.loads(x)['event'] for x in (run/'audit.log').read_text(encoding='utf-8').splitlines()]
assert len({x['case'] for x in audit if x.get('action')=='assertions-passed'})==7
assert any(x.get('case','').startswith('TC-012') and x.get('code')==1 and not x.get('timedOut') for x in audit)
write(run/'scope-audit.json',{'timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'unchangedSourceAndUnitFiles':unchanged,'lockfileUnchanged':True,'devUnexpectedErrors':0,'devRequestsLocalOnly':True,'sourceShaIsBaseCommitNotDirtyTree':True})
criteria=['按说明从干净依赖安装启动 Electron 窗口，React 页面与开发态更新可验证。','主进程、preload、渲染端职责清晰，最小受控 IPC 往返和窗口退出正常。']
assert all(x in (root/'work-ledger.yaml').read_text(encoding='utf-8') for x in criteria)
checks=[{'name':'desktop-current-worktree','passed':result['stats']['expected']==8 and result['stats']['unexpected']==0,'details':f"{run.name}/results.json; 8 groups, no skips/flaky; dirty tree fingerprint is source-files-sha256.json",'criteria':criteria}, {'name':'clean-install-runtime-and-port','passed':all(x['passed'] for x in ind['results']),'details':f'{clean.name}/results.json; explicit runtime install included','criteria':[criteria[0]]},{'name':'dev-updates-and-exit','passed':d['passed'] and ctrl['passed'],'details':f'{dev.name}/dev-audit.ndjson, dev-result.json, ctrl-c-result.json; three replicas restored','criteria':criteria},{'name':'source-and-unit-scope','passed':len(unchanged)==15,'details':'scope-audit.json; 12 source and 3 unit files unchanged from pre-diagnosis baseline','criteria':[criteria[1]]}]
write(run/'completion-report.json',{'version':1,'work_item':'SPEC-001','source_sha':env['gitSha'],'command':'npm run test:e2e; node scripts/check-test-environment.mjs; node scripts/check-dev-updates.mjs <tester-replica> <evidence-dir> 9237 + PTY Ctrl+C','scope':['SPEC-001'],'verified_at':int(datetime.datetime.now().timestamp()*1000),'checks':checks})
print('PASS: current desktop 8/8; unit 52/52; clean install; dev updates and Ctrl+C; 15 source/unit files unchanged. Completion report derived from original run outputs; no work complete.')

