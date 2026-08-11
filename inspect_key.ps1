$k = Get-Content -Path 'I:\DIGIBIZ_MASTER\serviceAccountKey.json' -Raw | ConvertFrom-Json
Write-Output ('type: ' + $k.type)
Write-Output ('project_id: ' + $k.project_id)
Write-Output ('private_key_id: ' + $k.private_key_id)
Write-Output ('client_email: ' + $k.client_email)
Write-Output ('client_id: ' + $k.client_id)
Write-Output ('token_uri: ' + $k.token_uri)
Write-Output ('auth_provider_x509_cert_url: ' + $k.auth_provider_x509_cert_url)
if (-not $k.private_key) { Write-Output 'private_key: MISSING' } else {
    $pk = $k.private_key
    Write-Output ('private_key length: ' + $pk.Length)
    Write-Output ('private_key starts with: ' + $pk.Substring(0, [Math]::Min(50, $pk.Length)))
    Write-Output ('private_key ends with: ' + $pk.Substring([Math]::Max(0,$pk.Length-30)))
    Write-Output ('has BEGIN PRIVATE KEY: ' + $pk.Contains('BEGIN PRIVATE KEY'))
    Write-Output ('has END PRIVATE KEY: ' + $pk.Contains('END PRIVATE KEY'))
}
