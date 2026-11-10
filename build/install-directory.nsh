; Fix: debugger/debug-002.html — preflight before standard old-version removal.
!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"

Var AvalonDirectoryWritable
Var AvalonProbePath
Var AvalonProbeHandle

Function AvalonCheckInstallDirectory
  StrCpy $AvalonDirectoryWritable "0"
  StrCpy $AvalonProbePath ""
  ClearErrors
  CreateDirectory "$INSTDIR"
  IfErrors avalonProbeDone
  ; GetTempFileName atomically creates a unique file in the chosen directory.
  GetTempFileName $AvalonProbePath "$INSTDIR"
  IfErrors avalonProbeDone
  ClearErrors
  FileOpen $AvalonProbeHandle "$AvalonProbePath" w
  IfErrors avalonProbeCleanup
  FileWrite $AvalonProbeHandle "Avalon installation write check"
  IfErrors avalonProbeClose
  StrCpy $AvalonDirectoryWritable "1"
avalonProbeClose:
  FileClose $AvalonProbeHandle
  IfErrors 0 avalonProbeCleanup
  StrCpy $AvalonDirectoryWritable "0"
avalonProbeCleanup:
  ClearErrors
  Delete "$AvalonProbePath"
  IfErrors 0 avalonProbeDone
  StrCpy $AvalonDirectoryWritable "0"
avalonProbeDone:
FunctionEnd

Function AvalonDirectoryPage
  ; Use the vendor's normalization before probing the final directory.
  Call instFilesPre
  Call AvalonCheckInstallDirectory
  ${If} $AvalonDirectoryWritable == "1"
    Abort ; Skip only this custom page; retain the standard install sequence.
  ${EndIf}
  !insertmacro MUI_HEADER_TEXT "无法写入安装目录" "旧版本尚未卸载，请返回选择其他目录。"
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    MessageBox MB_OK|MB_ICONSTOP "无法写入安装目录：$INSTDIR。请重新运行安装程序并选择可写目录。"
    SetErrorLevel 2
    Quit
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 75u "安装目录无法创建、写入或清理临时文件：$\r$\n$INSTDIR$\r$\n$\r$\n请点击“上一步”选择其他目录，或修复目录权限后点击“安装”重新检查。旧版本尚未卸载。"
  Pop $0
  nsDialogs::Show
FunctionEnd

Function AvalonDirectoryPageLeave
  Call AvalonCheckInstallDirectory
  ${If} $AvalonDirectoryWritable != "1"
    MessageBox MB_OK|MB_ICONEXCLAMATION "仍然无法写入安装目录：$INSTDIR。请点击“上一步”选择其他目录。"
    Abort
  ${EndIf}
FunctionEnd
