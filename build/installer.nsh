; SPEC-007 writer/plan.html §3.1: retain electron-builder's standard wizard.
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
  StrCpy $isForceMachineInstall "0"
!macroend

!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend

!ifndef BUILD_UNINSTALLER
  !include "install-directory.nsh"
!endif

!macro customPageAfterChangeDir
  Page custom AvalonDirectoryPage AvalonDirectoryPageLeave
!macroend

!macro customInit
  ; Silent installs do not visit wizard pages. Fail before uninstalling anything.
  ${If} ${Silent}
    Call AvalonCheckInstallDirectory
    ${If} $AvalonDirectoryWritable != "1"
      DetailPrint "无法写入安装目录：$INSTDIR。旧版本尚未卸载。"
      SetErrorLevel 2
      Quit
    ${EndIf}
  ${EndIf}
!macroend
