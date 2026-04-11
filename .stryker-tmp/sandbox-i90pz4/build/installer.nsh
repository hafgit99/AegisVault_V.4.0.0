!macro customInstall
  ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File "$INSTDIR\resources\native-host\install-native-host.ps1" -InstallDir "$INSTDIR"'
!macroend

!macro customUnInstall
  ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File "$INSTDIR\resources\native-host\unregister-native-host.ps1"'
!macroend
