$cands = @(
  "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
  "$env:ProgramFiles\nodejs\node.exe",
  "${env:ProgramFiles(x86)}\nodejs\node.exe"
)
foreach ($c in $cands) {
    if (Test-Path $c) { Write-Output ("FOUND: " + $c); & $c --version }
}
if (Test-Path "$env:LOCALAPPDATA\Programs") {
    Get-ChildItem -Path "$env:LOCALAPPDATA\Programs" -Recurse -Filter node.exe -ErrorAction SilentlyContinue | Select-Object -First 5 -ExpandProperty FullName
}
