# Example: run the site-vision worker at user logon (edit paths, then run in PowerShell as Administrator).
# This is NOT installed by default — copy, customize, and run once per machine.
#
# Prerequisites: Python venv at $VenvPython with dependencies installed; main.py in $WorkerDir

$TaskName = "UjenziXform-SiteVisionWorker"
$WorkerDir = "E:\Projects\UjenziXform\Ujenzixform.org\workers\site-vision"
$VenvPython = "$WorkerDir\.venv\Scripts\python.exe"
$Script = "$WorkerDir\main.py"

$Action = New-ScheduledTaskAction -Execute $VenvPython -Argument "`"$Script`"" -WorkingDirectory $WorkerDir
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "UjenziXform site vision worker (example)" -Force
Write-Host "Registered scheduled task: $TaskName"
