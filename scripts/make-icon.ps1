# 程序化生成"古籍水墨风"应用图标（线装书 + 朱红印章），输出多尺寸 PNG 到 build/
Add-Type -AssemblyName System.Drawing

function Draw-Icon([int]$size, [string]$outPath) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::Transparent)

  function U([double]$f) { return [single]($f * $size) }

  # 圆角矩形路径
  function RoundRect($x, $y, $w, $h, $r) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $p.AddArc($x, $y, $d, $d, 180, 90)
    $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $p.CloseFigure()
    return $p
  }

  # --- 宣纸底（圆角方形） ---
  $paperIn = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 240, 232, 212))
  $paperDeep = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 227, 216, 190))
  $g.FillRectangle($paperDeep, 0, 0, $size, $size) # 先铺一层略深，做描边感
  $g.Clear([System.Drawing.Color]::Transparent)
  $outer = RoundRect (U 0.04) (U 0.04) (U 0.92) (U 0.92) (U 0.20)
  $g.FillRectangle($paperDeep, (U 0.03), (U 0.03), (U 0.94), (U 0.94)) # 外圈淡墨晕
  $g.FillPath($paperIn, $outer)

  # --- 书页毛边（略错的米白，垫在封面下） ---
  $page = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 249, 246, 238))
  $pageEdge = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 120, 110, 96), [single]([Math]::Max(1, $size * 0.0022)))
  $pf = RoundRect (U 0.225) (U 0.205) (U 0.52) (U 0.55) (U 0.022)
  $g.FillPath($page, $pf); $g.DrawPath($pageEdge, $pf)

  # --- 线装书封面（墨黑） ---
  $ink = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 40, 40, 46))
  $inkSoft = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 20, 20, 24), [single]([Math]::Max(1, $size * 0.002)))
  $cover = RoundRect (U 0.25) (U 0.235) (U 0.52) (U 0.55) (U 0.03)
  $g.FillPath($ink, $cover); $g.DrawPath($inkSoft, $cover)

  # --- 封面左侧的书脊缝（浅米竖线），表现线装装订 ---
  $thread = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(235, 244, 238, 224), [single]([Math]::Max(1.2, $size * 0.004)))
  $spineX = U 0.315
  $g.DrawLine($thread, $spineX, (U 0.275), $spineX, (U 0.745))
  # 装订四眼（小圆点）
  $dot = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 244, 238, 224))
  foreach ($ty in @(0.35, 0.475, 0.60, 0.72)) {
    $d = U 0.018
    $g.FillEllipse($dot, ($spineX - $d / 2), (U $ty - $d / 2), $d, $d)
  }

  # --- 书签题签（封面右上竖条米色，配墨点作字） ---
  $slip = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 240, 232, 210))
  $slipRect = RoundRect (U 0.545) (U 0.285) (U 0.085) (U 0.335) (U 0.012)
  $g.FillPath($slip, $slipRect)
  $glyph = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 60, 58, 62))
  foreach ($gy in @(0.33, 0.40, 0.47, 0.54)) {
    $g.FillRectangle($glyph, (U 0.567), (U $gy), (U 0.041), (U 0.028))
  }

  # --- 封面上一道写意墨笔（横向笔触，起收略见锋芒） ---
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush( `
    (New-Object System.Drawing.PointF((U 0.34), (U 0.66))), (New-Object System.Drawing.PointF((U 0.70), (U 0.70))), `
    ([System.Drawing.Color]::FromArgb(190, 70, 66, 70)), ([System.Drawing.Color]::FromArgb(40, 70, 66, 70)))
  $stroke = New-Object System.Drawing.Drawing2D.GraphicsPath
  $stroke.AddBezier((New-Object System.Drawing.PointF((U 0.345), (U 0.665))), `
    (New-Object System.Drawing.PointF((U 0.47), (U 0.635))), `
    (New-Object System.Drawing.PointF((U 0.60), (U 0.705))), `
    (New-Object System.Drawing.PointF((U 0.71), (U 0.675))))
  $penBrush = New-Object System.Drawing.Pen($brush, [single]([Math]::Max(2, $size * 0.014)))
  $penBrush.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $penBrush.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawPath($penBrush, $stroke)

  # --- 朱红印章（右下角） ---
  $seal = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 176, 58, 47))
  $sealRect = RoundRect (U 0.705) (U 0.70) (U 0.135) (U 0.135) (U 0.02)
  $g.FillPath($seal, $sealRect)
  # 印文：白文（挖出米色笔画）
  $sealMark = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 244, 236, 222), [single]([Math]::Max(1.4, $size * 0.006)))
  $g.DrawLine($sealMark, (U 0.735), (U 0.735), (U 0.812), (U 0.735))
  $g.DrawLine($sealMark, (U 0.7735), (U 0.735), (U 0.7735), (U 0.802))
  $g.DrawLine($sealMark, (U 0.735), (U 0.802), (U 0.812), (U 0.802))

  $g.Dispose()
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "wrote $outPath"
}

$buildDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'build'
if (-not (Test-Path $buildDir)) { New-Item -ItemType Directory -Path $buildDir | Out-Null }
Draw-Icon 1024 (Join-Path $buildDir 'icon.png')
Draw-Icon 512  (Join-Path $buildDir 'icon-512.png')
Draw-Icon 256  (Join-Path $buildDir 'icon-256.png')
