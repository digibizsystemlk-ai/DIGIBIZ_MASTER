param([int]$start, [int]$end)


$lines = Get-Content -Path 'I:\DIGIBIZ_MASTER\public\modules\retail\inventory.html' -Encoding UTF8
$end = [Math]::Min($lines.Length-1, $end)
$lines[([Math]::Max(0,$start-1))..$end] -join "`n"
