Write-Output '--- .firebaserc ---'
if (Test-Path 'I:\DIGIBIZ_MASTER\.firebaserc') { Get-Content 'I:\DIGIBIZ_MASTER\.firebaserc' -Raw }
Write-Output '--- looking for node ---'
$cands = @(
  "$env:ProgramFiles\nodejs\node.exe",
  "${env:ProgramFiles(x86)}\nodejs\node.exe",
  "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
  "$env:APPDATA\npm\node.exe",
  "C:\Program Files\nodejs\node.exe"
)
foreach ($c in $cands) { if (Test-Path $c) { Write-Output ("FOUND: " + $c) } }
Write-Output '--- functions package.json deps ---'
if (Test-Path 'I:\DIGIBIZ_MASTER\functions\package.json') { (Get-Content 'I:\DIGIBIZ_MASTER\functions\package.json' -Raw) | Select-String -Pattern 'firebase-admin|"dependencies"' }
