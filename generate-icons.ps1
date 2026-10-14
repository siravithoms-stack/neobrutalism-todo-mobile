Add-Type -AssemblyName System.Drawing

function Create-RoundedRectanglePath {
    param(
        [float]$x,
        [float]$y,
        [float]$width,
        [float]$height,
        [float]$radius
    )
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $radius * 2
    
    $arc = New-Object System.Drawing.RectangleF($x, $y, $diameter, $diameter)
    $path.AddArc($arc, 180, 90)
    
    $arc.X = $x + $width - $diameter
    $path.AddArc($arc, 270, 90)
    
    $arc.Y = $y + $height - $diameter
    $path.AddArc($arc, 0, 90)
    
    $arc.X = $x
    $path.AddArc($arc, 90, 90)
    
    $path.CloseFigure()
    return $path
}

function Generate-TodoIcon {
    param(
        [int]$size,
        [string]$outputPath,
        [bool]$isMaskable = $false
    )

    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bitmap)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Background canvas
    $bgColor = [System.Drawing.ColorTranslator]::FromHtml("#F6F4EE")
    $bgBrush = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)
    $bgBrush.Dispose()

    # Scale factor based on 512 base size
    $scale = $size / 512.0
    if ($isMaskable) {
        # Maskable icon safe zone: scale down slightly (80%)
        $scale = $scale * 0.8
        $offsetX = ($size - (512.0 * $scale)) / 2.0
        $offsetY = ($size - (512.0 * $scale)) / 2.0
    } else {
        $offsetX = 0.0
        $offsetY = 0.0
    }

    # Shadow
    $shadowX = $offsetX + (96.0 * $scale)
    $shadowY = $offsetY + (96.0 * $scale)
    $cardW = 336.0 * $scale
    $cardH = 336.0 * $scale
    $radius = 64.0 * $scale

    $shadowPath = Create-RoundedRectanglePath $shadowX $shadowY $cardW $cardH $radius
    $blackBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
    $g.FillPath($blackBrush, $shadowPath)
    $shadowPath.Dispose()

    # Main Card
    $cardX = $offsetX + (80.0 * $scale)
    $cardY = $offsetY + (80.0 * $scale)
    $cardPath = Create-RoundedRectanglePath $cardX $cardY $cardW $cardH $radius

    $indigoColor = [System.Drawing.ColorTranslator]::FromHtml("#312E81")
    $indigoBrush = New-Object System.Drawing.SolidBrush($indigoColor)
    $g.FillPath($indigoBrush, $cardPath)
    $indigoBrush.Dispose()

    # Card Border
    $borderW = [Math]::Max(2.0, (16.0 * $scale))
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, $borderW)
    $borderPen.Alignment = [System.Drawing.Drawing2D.PenAlignment]::Center
    $g.DrawPath($borderPen, $cardPath)
    $borderPen.Dispose()
    $cardPath.Dispose()

    # Accent Dot (Top-Right)
    $dotCenterX = $offsetX + (345.0 * $scale)
    $dotCenterY = $offsetY + (115.0 * $scale)
    $dotR = 18.0 * $scale

    # Dot Shadow
    $g.FillEllipse($blackBrush, ($dotCenterX - $dotR + 2.0 * $scale), ($dotCenterY - $dotR + 2.0 * $scale), ($dotR * 2.0), ($dotR * 2.0))
    # Dot Yellow
    $yellowColor = [System.Drawing.ColorTranslator]::FromHtml("#FFE500")
    $yellowBrush = New-Object System.Drawing.SolidBrush($yellowColor)
    $g.FillEllipse($yellowBrush, ($dotCenterX - $dotR), ($dotCenterY - $dotR), ($dotR * 2.0), ($dotR * 2.0))
    $yellowBrush.Dispose()
    # Dot Border
    $dotBorderW = [Math]::Max(1.0, (5.0 * $scale))
    $dotPen = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, $dotBorderW)
    $g.DrawEllipse($dotPen, ($dotCenterX - $dotR), ($dotCenterY - $dotR), ($dotR * 2.0), ($dotR * 2.0))
    $dotPen.Dispose()
    $blackBrush.Dispose()

    # Checkmark Polyline
    $checkW = [Math]::Max(2.5, (38.0 * $scale))
    $checkPen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $checkW)
    $checkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $checkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $checkPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $p1 = New-Object System.Drawing.PointF(($offsetX + 160.0 * $scale), ($offsetY + 250.0 * $scale))
    $p2 = New-Object System.Drawing.PointF(($offsetX + 225.0 * $scale), ($offsetY + 315.0 * $scale))
    $p3 = New-Object System.Drawing.PointF(($offsetX + 338.0 * $scale), ($offsetY + 190.0 * $scale))

    $pts = [System.Drawing.PointF[]]@($p1, $p2, $p3)
    $g.DrawLines($checkPen, $pts)
    $checkPen.Dispose()

    $g.Dispose()

    # Save PNG
    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    Write-Output "Generated: $outputPath ($size x $size)"
}

$iconsDir = Join-Path $PSScriptRoot "icons"
if (!(Test-Path $iconsDir)) { New-Item -ItemType Directory -Path $iconsDir | Out-Null }

Generate-TodoIcon -size 512 -outputPath (Join-Path $iconsDir "icon-512.png")
Generate-TodoIcon -size 512 -outputPath (Join-Path $iconsDir "icon-maskable.png") -isMaskable $true
Generate-TodoIcon -size 192 -outputPath (Join-Path $iconsDir "icon-192.png")
Generate-TodoIcon -size 180 -outputPath (Join-Path $iconsDir "apple-touch-icon.png")
Generate-TodoIcon -size 48  -outputPath (Join-Path $iconsDir "favicon.png")

Write-Output "All icons generated successfully!"
