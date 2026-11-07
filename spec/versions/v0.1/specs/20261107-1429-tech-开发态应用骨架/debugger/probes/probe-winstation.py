import ctypes as c,json,time
from ctypes import wintypes as w
from pathlib import Path
u=c.WinDLL('user32',use_last_error=True);k=c.WinDLL('kernel32',use_last_error=True)
u.GetProcessWindowStation.restype=w.HANDLE;u.GetThreadDesktop.argtypes=[w.DWORD];u.GetThreadDesktop.restype=w.HANDLE
u.GetUserObjectInformationW.argtypes=[w.HANDLE,c.c_int,c.c_void_p,w.DWORD,c.POINTER(w.DWORD)]
u.GetUserObjectSecurity.argtypes=[w.HANDLE,c.POINTER(w.DWORD),c.c_void_p,w.DWORD,c.POINTER(w.DWORD)]
class SA(c.Structure):_fields_=[('length',w.DWORD),('descriptor',c.c_void_p),('inherit',w.BOOL)]
u.CreateWindowStationW.argtypes=[w.LPCWSTR,w.DWORD,w.DWORD,c.POINTER(SA)];u.CreateWindowStationW.restype=w.HANDLE;u.CloseWindowStation.argtypes=[w.HANDLE]
def name(handle):
 b=c.create_unicode_buffer(1024);n=w.DWORD();ok=u.GetUserObjectInformationW(handle,2,b,c.sizeof(b),c.byref(n));return b.value if ok else f'error {c.get_last_error()}'
station=u.GetProcessWindowStation();desktop=u.GetThreadDesktop(k.GetCurrentThreadId());result={'timestamp':time.time(),'station':name(station),'desktop':name(desktop),'attempts':[]}
security=w.DWORD(4);needed=w.DWORD();u.GetUserObjectSecurity(station,c.byref(security),None,0,c.byref(needed));buf=c.create_string_buffer(needed.value)
ok=u.GetUserObjectSecurity(station,c.byref(security),buf,len(buf),c.byref(needed));result['read_station_dacl']=bool(ok);assert ok,c.get_last_error()
adv=c.WinDLL('advapi32',use_last_error=True)
adv.GetSecurityDescriptorDacl.argtypes=[c.c_void_p,c.POINTER(w.BOOL),c.POINTER(c.c_void_p),c.POINTER(w.BOOL)]
adv.InitializeSecurityDescriptor.argtypes=[c.c_void_p,w.DWORD]
adv.SetSecurityDescriptorDacl.argtypes=[c.c_void_p,w.BOOL,c.c_void_p,w.BOOL]
present=w.BOOL();defaulted=w.BOOL();dacl=c.c_void_p()
assert adv.GetSecurityDescriptorDacl(buf,c.byref(present),c.byref(dacl),c.byref(defaulted))
import struct,hashlib
head=c.string_at(dacl,8);acl=c.string_at(dacl,struct.unpack_from('<H',head,2)[0]);result['dacl']={'sha256':hashlib.sha256(acl).hexdigest(),'size':len(acl),'aces':struct.unpack_from('<H',head,4)[0]}
absolute=c.create_string_buffer(40);assert adv.InitializeSecurityDescriptor(absolute,1)
assert adv.SetSecurityDescriptorDacl(absolute,present,dacl,False)
sa=SA(c.sizeof(SA),c.cast(absolute,c.c_void_p),False)
result['descriptor']='absolute, copied DACL only (Chromium ToAbsolute shape)'
for mask in [0x80000008,0x0a]:
 c.set_last_error(0);handle=u.CreateWindowStationW(None,0,mask,c.byref(sa));error=c.get_last_error()
 result['attempts'].append({'access':hex(mask),'success':bool(handle),'error':error,'message':c.FormatError(error),'name':name(handle) if handle else None})
 if handle:u.CloseWindowStation(handle)
directory=Path('spec/versions/v0.1/specs/20261107-1429-tech-开发态应用骨架/debugger/artifacts')/f'winstation-{int(time.time()*1000)}';directory.mkdir(parents=True);(directory/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=False,indent=2));print(directory)
