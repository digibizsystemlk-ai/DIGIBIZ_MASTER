$nodeDir = 'C:\Users\CHINTHAKA-PC\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.19.0-win-x64'
$nodeExe = Join-Path $nodeDir 'node.exe'
Write-Output ('node exists: ' + (Test-Path $nodeExe))
if (Test-Path $nodeExe) {
    Write-Output ('node version: ' + (& $nodeExe --version))
    Write-Output ('npm version: ' + (& (Join-Path $nodeDir 'npm.cmd') --version))
}
