# Installs a Windows Scheduled Task to run `npm run bridge` at user logon.
# Run from PowerShell; Administrator may be required depending on policy.
$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$taskName = "AkwadFingerprintBridge"

$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npm) {
  Write-Error "npm غير موجود في PATH. ثبّت Node.js وأعد المحاولة."
  exit 1
}

$who = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute $npm.Source -Argument "run bridge" -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $who
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId $who -LogonType Interactive

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "تم تسجيل المهمة '$taskName' لتشغيل الوسيط عند تسجيل الدخول."
Write-Host "المجلد: $projectRoot"
Write-Host "لإزالتها: .\scripts\windows\uninstall-fingerprint-bridge-task.ps1"
