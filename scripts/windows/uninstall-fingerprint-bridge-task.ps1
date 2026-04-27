$ErrorActionPreference = "Stop"
$taskName = "AkwadFingerprintBridge"
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "تمت إزالة المهمة '$taskName' إن وُجدت."
