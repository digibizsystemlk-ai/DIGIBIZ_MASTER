param([string]$jsFile)
$nodeDir = 'C:\Users\CHINTHAKA-PC\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.19.0-win-x64'
$nodeExe = Join-Path $nodeDir 'node.exe'
Push-Location 'I:\DIGIBIZ_MASTER\functions'
try {
    & $nodeExe $jsFile
} finally {
    Pop-Location
}
