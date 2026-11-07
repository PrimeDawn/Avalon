import ctypes as c,struct,json,time,os
from ctypes import wintypes as w
from pathlib import Path
root=Path.cwd();out=root/'spec/versions/v0.1/specs/20261107-1429-tech-开发态应用骨架/debugger/artifacts'/f'native-{int(time.time()*1000)}';out.mkdir(parents=True)
k=c.WinDLL('kernel32',use_last_error=True)
class SI(c.Structure):
 _fields_=[('cb',w.DWORD),('reserved',w.LPWSTR),('desktop',w.LPWSTR),('title',w.LPWSTR),('x',w.DWORD),('y',w.DWORD),('xs',w.DWORD),('ys',w.DWORD),('xc',w.DWORD),('yc',w.DWORD),('fill',w.DWORD),('flags',w.DWORD),('show',w.WORD),('cb2',w.WORD),('res2',c.c_void_p),('stdin',w.HANDLE),('stdout',w.HANDLE),('stderr',w.HANDLE)]
class PI(c.Structure):_fields_=[('process',w.HANDLE),('thread',w.HANDLE),('pid',w.DWORD),('tid',w.DWORD)]
class U(c.Union):_fields_=[('raw',c.c_ubyte*160),('align',c.c_ulonglong)]
class EVENT(c.Structure):_fields_=[('code',w.DWORD),('pid',w.DWORD),('tid',w.DWORD),('u',U)]
k.CreateProcessW.argtypes=[w.LPCWSTR,w.LPWSTR,c.c_void_p,c.c_void_p,w.BOOL,w.DWORD,c.c_void_p,w.LPCWSTR,c.POINTER(SI),c.POINTER(PI)];k.CreateProcessW.restype=w.BOOL
k.WaitForDebugEvent.argtypes=[c.POINTER(EVENT),w.DWORD];k.ContinueDebugEvent.argtypes=[w.DWORD,w.DWORD,w.DWORD]
k.ReadProcessMemory.argtypes=[w.HANDLE,c.c_void_p,c.c_void_p,c.c_size_t,c.POINTER(c.c_size_t)]
k.OpenThread.argtypes=[w.DWORD,w.BOOL,w.DWORD];k.OpenThread.restype=w.HANDLE
k.GetThreadContext.argtypes=[w.HANDLE,c.c_void_p];k.CloseHandle.argtypes=[w.HANDLE]
k.SetThreadContext.argtypes=[w.HANDLE,c.c_void_p]
u=c.WinDLL('user32',use_last_error=True);create_station=c.cast(u.CreateWindowStationW,c.c_void_p).value;watch_return=None
adv=c.WinDLL('advapi32',use_last_error=True)
adv.OpenProcessToken.argtypes=[w.HANDLE,w.DWORD,c.POINTER(w.HANDLE)];adv.GetTokenInformation.argtypes=[w.HANDLE,c.c_int,c.c_void_p,w.DWORD,c.POINTER(w.DWORD)]
adv.OpenThreadToken.argtypes=[w.HANDLE,w.DWORD,w.BOOL,c.POINTER(w.HANDLE)]
k.IsProcessInJob.argtypes=[w.HANDLE,w.HANDLE,c.POINTER(w.BOOL)];k.IsProcessInJob.restype=w.BOOL
k.GetProcessMitigationPolicy.argtypes=[w.HANDLE,c.c_int,c.c_void_p,c.c_size_t];k.GetProcessMitigationPolicy.restype=w.BOOL
def process_restrictions(process):
 inside=w.BOOL();ok=k.IsProcessInJob(process,None,c.byref(inside));result={'job_query_ok':bool(ok),'in_job':bool(inside.value) if ok else None,'job_query_error':0 if ok else c.get_last_error(),'mitigations':{}}
 for label,kind in [('system-call-disable',4),('extension-point-disable',6),('dynamic-code',2),('binary-signature',8),('image-load',10),('child-process',13)]:
  value=w.DWORD();ok=k.GetProcessMitigationPolicy(process,kind,c.byref(value),c.sizeof(value));result['mitigations'][label]={'ok':bool(ok),'flags':hex(value.value) if ok else None,'error':0 if ok else c.get_last_error()}
 return result
def tokeninfo(process):
 token=w.HANDLE();assert adv.OpenProcessToken(process,8,c.byref(token));result={}
 for label,kind in [('statistics',10),('restricted-sids',11),('session',12),('elevation-type',18),('mandatory-policy',27),('appcontainer',29)]:
  needed=w.DWORD();adv.GetTokenInformation(token,kind,None,0,c.byref(needed));b=c.create_string_buffer(max(needed.value,4))
  if adv.GetTokenInformation(token,kind,b,len(b),c.byref(needed)):
   result[label]=b.raw[:56].hex() if kind==10 else struct.unpack_from('<I',b.raw)[0]
 import hashlib
 def sid_hash(address):
  if not address:return None
  head=c.string_at(address,8);return hashlib.sha256(c.string_at(address,8+4*head[1])).hexdigest()
 for label,kind in [('user',1),('groups',2),('privileges',3),('integrity',25)]:
  needed=w.DWORD();adv.GetTokenInformation(token,kind,None,0,c.byref(needed));b=c.create_string_buffer(max(needed.value,4))
  if not adv.GetTokenInformation(token,kind,b,len(b),c.byref(needed)):result[label]={'error':c.get_last_error()};continue
  if kind==3:result[label]=b.raw.hex()
  elif kind==2:
   result[label]=[{'sid_hash':sid_hash(struct.unpack_from('<Q',b.raw,8+16*i)[0]),'attributes':hex(struct.unpack_from('<I',b.raw,16+16*i)[0])} for i in range(struct.unpack_from('<I',b.raw)[0])]
  else:
   sid=struct.unpack_from('<Q',b.raw)[0];result[label]={'sid_hash':sid_hash(sid),'attributes':hex(struct.unpack_from('<I',b.raw,8)[0])}
   if kind==25:result[label]['rid']=struct.unpack('<I',c.string_at(sid+8,4))[0]
 k.CloseHandle(token);return result
nt=c.WinDLL('ntdll');nt.NtQueryInformationThread.argtypes=[w.HANDLE,c.c_int,c.c_void_p,w.ULONG,c.c_void_p]
k.GetFinalPathNameByHandleW.argtypes=[w.HANDLE,w.LPWSTR,w.DWORD,w.DWORD]
k.TerminateProcess.argtypes=[w.HANDLE,w.UINT]
si=SI();si.cb=c.sizeof(si);pi=PI();cmd=c.create_unicode_buffer(str(root/'node_modules/electron/dist/electron.exe')+' --version')
# Inherit only non-sensitive environment values; native environment experiment already failed.
env={key:value for key,value in os.environ.items() if key.upper() in ['SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','PATH','COMSPEC']}
block=c.create_unicode_buffer('\0'.join(f'{key}={value}' for key,value in sorted(env.items()))+'\0\0')
assert k.CreateProcessW(None,cmd,None,None,False,0x2|0x400,block,str(root),c.byref(si),c.byref(pi)),c.get_last_error()
records=[];modules=[];end=time.monotonic()+12;breaks=0
def read(addr,size):
 b=c.create_string_buffer(size);n=c.c_size_t();k.ReadProcessMemory(pi.process,addr,b,size,c.byref(n));return b.raw[:n.value]
def name(handle):
 b=c.create_unicode_buffer(32768);k.GetFinalPathNameByHandleW(handle,b,len(b),0);return b.value
try:
 while time.monotonic()<end:
  ev=EVENT()
  if not k.WaitForDebugEvent(c.byref(ev),1000):continue
  raw=bytes(ev.u.raw);status=0x10002;rec={'event':ev.code,'pid':ev.pid,'tid':ev.tid}
  if ev.code in (3,6):
   fh=struct.unpack_from('<Q',raw,0)[0];base=struct.unpack_from('<Q',raw,24 if ev.code==3 else 8)[0];path=name(fh) if fh else ''
   modules.append({'base':base,'path':path});rec.update(base=hex(base),path=path)
   if ev.code==3:rec['initial_child_token']=tokeninfo(pi.process);rec['initial_parent_token']=tokeninfo(c.c_void_p(-1))
   if fh:k.CloseHandle(fh)
   if path.lower().endswith('user32.dll'):
    thread=k.OpenThread(0x8|0x10|0x40,False,ev.tid);buf=c.create_string_buffer(1248);ptr=(c.addressof(buf)+15)&~15;c.c_uint32.from_address(ptr+48).value=0x10001f
    assert k.GetThreadContext(thread,ptr)
    c.c_uint64.from_address(ptr+72).value=create_station;c.c_uint64.from_address(ptr+112).value=1
    assert k.SetThreadContext(thread,ptr);k.CloseHandle(thread)
  elif ev.code==8:
   addr,unicode,length=struct.unpack_from('<QHH',raw);b=read(addr,length*(2 if unicode else 1));rec['text']=b.decode('utf-16-le' if unicode else 'utf-8',errors='replace')
  elif ev.code==1:
   code=struct.unpack_from('<I',raw)[0];addr=struct.unpack_from('<Q',raw,16)[0];first=struct.unpack_from('<I',raw,152)[0]
   mod=max((m for m in modules if m['base']<=addr),key=lambda m:m['base'],default={'base':0,'path':''})
   rec.update(exception=hex(code),address=hex(addr),first_chance=first,module=mod['path'],rva=hex(addr-mod['base']))
   if code==0x80000003:breaks+=1
   if breaks>1 or code!=0x80000003:
    thread=k.OpenThread(0x8|0x10|0x40,False,ev.tid);buf=c.create_string_buffer(1248);ptr=(c.addressof(buf)+15)&~15;c.c_uint32.from_address(ptr+48).value=0x10001f
    if k.GetThreadContext(thread,ptr):
     basic=c.create_string_buffer(48);nt.NtQueryInformationThread(thread,0,basic,48,None);teb=struct.unpack_from('<Q',basic.raw,8)[0];last=read(teb+0x68,4);rec['thread_last_error']=struct.unpack('<I',last)[0] if len(last)==4 else None
     data=c.string_at(ptr,1232);rsp=struct.unpack_from('<Q',data,152)[0];stack=read(rsp,4096);rec['stack_qwords']=[hex(x[0]) for x in struct.iter_unpack('<Q',stack[:len(stack)//8*8])]
     rec['registers']={n:hex(struct.unpack_from('<Q',data,o)[0]) for n,o in [('rax',120),('rsi',168),('rdi',176),('rcx',128),('rdx',136),('rsp',152),('r8',184),('r9',192),('rip',248)]}
     rec['instruction_bytes']=read(addr-32,64).hex()
     rsi=struct.unpack_from('<Q',data,168)[0];vtable=read(rsi,8)
     if len(vtable)==8:rec['rsi_vtable']=read(struct.unpack('<Q',vtable)[0],64).hex()
     if code==0x80000004:
      if watch_return is None:
       rec['api']='CreateWindowStationW entry';watch_return=struct.unpack('<Q',read(rsp,8))[0];next_break=watch_return
       rec['child_token']=tokeninfo(pi.process);rec['probe_parent_token']=tokeninfo(c.c_void_p(-1))
       rec['child_restrictions']=process_restrictions(pi.process);rec['probe_parent_restrictions']=process_restrictions(c.c_void_p(-1))
       tt=w.HANDLE();has_token=adv.OpenThreadToken(thread,8,True,c.byref(tt));rec['thread_token']={'present':bool(has_token),'error':c.get_last_error() if not has_token else 0}
       if has_token:k.CloseHandle(tt)
       import hashlib
       sap=struct.unpack_from('<Q',data,192)[0];sa=read(sap,24);sdp=struct.unpack_from('<Q',sa,8)[0];sd=read(sdp,40);dacl=struct.unpack_from('<Q',sd,32)[0];aclhead=read(dacl,8);acl=read(dacl,struct.unpack_from('<H',aclhead,2)[0])
       rec['security_descriptor']={'revision':sd[0],'control':hex(struct.unpack_from('<H',sd,2)[0]),'dacl_sha256':hashlib.sha256(acl).hexdigest(),'acl_size':len(acl),'ace_count':struct.unpack_from('<H',aclhead,4)[0],'owner_present':bool(struct.unpack_from('<Q',sd,8)[0]),'group_present':bool(struct.unpack_from('<Q',sd,16)[0]),'sacl_present':bool(struct.unpack_from('<Q',sd,24)[0]),'sa_length':struct.unpack_from('<I',sa)[0],'inherit_handle':struct.unpack_from('<I',sa,16)[0]}
      else:
       rec['api']='CreateWindowStationW return';watch_return=None;next_break=create_station
      c.c_uint64.from_address(ptr+72).value=next_break;c.c_uint64.from_address(ptr+104).value=0;c.c_uint32.from_address(ptr+68).value|=0x10000
      assert k.SetThreadContext(thread,ptr)
     import re
     rec['stack_strings']=[b.decode('ascii') for b in re.findall(rb'[\x20-\x7e]{8,}',stack)]
    k.CloseHandle(thread);status=0x10002 if code==0x80000004 else 0x80010001
  elif ev.code==5:rec['exit']=hex(struct.unpack_from('<I',raw)[0])
  if ev.code in (1,3,5,6,8):records.append(rec);print(json.dumps(rec,ensure_ascii=False)[:2500],flush=True)
  k.ContinueDebugEvent(ev.pid,ev.tid,status)
  if ev.code==5:break
 else:k.TerminateProcess(pi.process,1)
finally:
 k.CloseHandle(pi.thread);k.CloseHandle(pi.process)
 (out/'events.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8');print(out)


