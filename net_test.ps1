Write-Output '--- test google token certs endpoint ---'
try {
    $r = Invoke-WebRequest -Uri 'https://accounts.google.com/o/oauth2/v3/certs' -Method GET -TimeoutSec 20 -UseBasicParsing
    Write-Output ('accounts.google.com  HTTP ' + $r.StatusCode)
} catch { Write-Output ('accounts.google.com ERR: ' + $_.Exception.Message) }
Write-Output '--- test firestore endpoint ---'
try {
    $r2 = Invoke-WebRequest -Uri 'https://firestore.googleapis.com/' -Method GET -TimeoutSec 20 -UseBasicParsing
    Write-Output ('firestore.googleapis.com  HTTP ' + $r2.StatusCode)
} catch { Write-Output ('firestore ERR: ' + $_.Exception.Message) }
