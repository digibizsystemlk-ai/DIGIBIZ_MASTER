param([string]$pattern, [string]$path)

$m = Select-String -Path $path -Pattern $pattern -Encoding UTF8
foreach ($x in $m) {
    $t = $x.Line.Trim()
    if ($t.Length -gt 150) { $t = $t.Substring(0,150) }
    Write-Output ($x.LineNumber.ToString().PadLeft(5) + ': ' + $t)
}
