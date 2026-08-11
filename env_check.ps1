Write-Output ('node: ' + (node --version))
Write-Output ('npm: ' + (npm --version))
try { Write-Output ('firebase: ' + (firebase --version)) } catch { Write-Output 'firebase CLI: NOT installed' }
Write-Output ('functions dir exists: ' + (Test-Path 'I:\DIGIBIZ_MASTER\functions'))
Write-Output ('functions/node_modules/firebase-admin: ' + (Test-Path 'I:\DIGIBIZ_MASTER\functions\node_modules\firebase-admin'))
Write-Output ('root node_modules/firebase-admin: ' + (Test-Path 'I:\DIGIBIZ_MASTER\node_modules\firebase-admin'))
Write-Output ('firebaserc exists: ' + (Test-Path 'I:\DIGIBIZ_MASTER\.firebaserc'))
