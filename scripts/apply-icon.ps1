$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$src = 'D:\code\leo\privacy-reader\export\export\desktop'
$root = Split-Path $PSScriptRoot -Parent
$build = Join-Path $root 'build'
if (-not (Test-Path $build)) { New-Item -ItemType Directory -Path $build | Out-Null }

function Show-Dim($p) {
  $i = [System.Drawing.Image]::FromFile($p)
  Write-Output ("{0} -> {1}x{2}" -f (Split-Path $p -Leaf), $i.Width, $i.Height)
  $i.Dispose()
}

Show-Dim (Join-Path $src 'icon_512x512@2x.png')
Show-Dim (Join-Path $src 'icon_512x512.png')
Show-Dim (Join-Path $src 'icon_256x256.png')

# 1) Copy the supplied multi-size .ico directly for Windows exe/taskbar icon
Copy-Item (Join-Path $src 'app.ico') (Join-Path $build 'icon.ico') -Force

# 2) Rasterize a clean 1024x1024 PNG (build/icon.png) from the largest source
$big = Join-Path $src 'icon_512x512@2x.png'
$orig = [System.Drawing.Image]::FromFile($big)
$bmp = New-Object System.Drawing.Bitmap 1024,1024
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($orig, 0, 0, 1024, 1024)
$g.Dispose(); $orig.Dispose()
$bmp.Save((Join-Path $build 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

# 3) Also emit 512 / 256 png variants
foreach ($sz in 512,256) {
  $b2 = New-Object System.Drawing.Bitmap $sz,$sz
  $g2 = [System.Drawing.Graphics]::FromImage($b2)
  $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $src2 = [System.Drawing.Image]::FromFile((Join-Path $build 'icon.png'))
  $g2.DrawImage($src2, 0, 0, $sz, $sz)
  $g2.Dispose(); $src2.Dispose()
  $b2.Save((Join-Path $build "icon-$sz.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $b2.Dispose()
}

Write-Output '----build dir----'
Get-ChildItem $build | Select-Object Name,Length | Format-Table -AutoSize
