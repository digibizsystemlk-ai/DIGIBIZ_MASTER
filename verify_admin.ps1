$nodeDir = 'C:\Users\CHINTHAKA-PC\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.19.0-win-x64'
$nodeExe = Join-Path $nodeDir 'node.exe'
Write-Output ('functions firebase-admin dir: ' + (Test-Path 'I:\DIGIBIZ_MASTER\functions\node_modules\firebase-admin'))
Write-Output ('admin package version: ')
if (Test-Path 'I:\DIGIBIZ_MASTER\functions\node_modules\firebase-admin\package.json') {
    (Get-Content 'I:\DIGIBIZ_MASTER\functions\node_modules\firebase-admin\package.json' -Raw | ConvertFrom-Json).version
}
