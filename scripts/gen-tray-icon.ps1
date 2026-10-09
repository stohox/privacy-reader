$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$res = Join-Path $root 'resources'
if (-not (Test-Path $res)) { New-Item -ItemType Directory -Path $res | Out-Null }
$src = Join-Path $root 'build\icon.png'
$orig = [System.Drawing.Image]::FromFile($src)
foreach ($sz in 16,32) {
  $b = New-Object System.Drawing.Bitmap $sz, $sz
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($orig, 0, 0, $sz, $sz)
  $g.Dispose()
  $name = if ($sz -eq 16) { 'tray.png' } else { 'tray@2x.png' }
  $b.Save((Join-Path $res $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $b.Dispose()
}
$orig.Dispose()
Get-ChildItem $res | Select-Object Name, Length | Format-Table -AutoSize
