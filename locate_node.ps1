Write-Output '--- refreshed user+system PATH ---'
$machinePath = [Environment]::GetEnvironmentVariable('Path','Machine')
$userPath = [Environment]::GetEnvironmentVariable('Path','User')
$all = "$machinePath;$userPath"
$all -split ';' | Where-Object { $_ -match 'node' } | ForEach-Object { Write-Output $_.Trim() }
Write-Output '--- C:\Program Files\nodejs dir listing ---'
if (Test-Path 'C:\Program Files\nodejs') { Get-ChildItem 'C:\Program Files\nodejs' -Filter node*.exe | ForEach-Object { $_.FullName } }
Write-Output '--- LOCALAPPDATA nodejs dir ---'
if (Test-Path "$env:LOCALAPPDATA\Programs\nodejs") { Get-ChildItem "$env:LOCALAPPDATA\Programs\nodejs" -Filter node*.exe | ForEach-Object { $_.FullName } }
