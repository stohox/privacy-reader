$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$exe = Join-Path $PSScriptRoot '..\dist\win-unpacked\浮生观止.exe'
$ico = [System.Drawing.Icon]::ExtractAssociatedIcon($exe)
$bmp = $ico.ToBitmap()
$out = Join-Path $PSScriptRoot '..\build\_exeicon.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$ico.Dispose(); $bmp.Dispose()
Write-Output ("saved {0}" -f $out)
