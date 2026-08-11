try { Write-Output ('pwsh: ' + (pwsh --version)) } catch { Write-Output 'pwsh: NOT found' }
Write-Output ('PSVersion: ' + $PSVersionTable.PSVersion)
