Write-Output '--- winget ---'
try { Write-Output ('winget version: ' + (winget --version)) } catch { Write-Output 'winget: NOT found' }
Write-Output '--- choco ---'
try { Write-Output ('choco: ' + (choco --version)) } catch { Write-Output 'choco: NOT found' }
Write-Output '--- current user ---'
Write-Output ('user: ' + [Environment]::UserName)
Write-Output '--- is admin? ---'
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
Write-Output ('isAdmin: ' + $isAdmin)
