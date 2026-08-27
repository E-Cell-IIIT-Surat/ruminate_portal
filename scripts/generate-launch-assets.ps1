Add-Type -AssemblyName System.Drawing

$sourceLogo = [System.Drawing.Image]::FromFile((Join-Path $PSScriptRoot "..\public\ruminate-logo.png"))
$sourceCard = [System.Drawing.Image]::FromFile((Join-Path $PSScriptRoot "..\public\ruminate-social-card.png"))

function Save-ResizedPng([System.Drawing.Image]$source, [int]$width, [int]$height, [string]$path) {
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Black)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $scale = [Math]::Min($width / $source.Width, $height / $source.Height)
  $drawWidth = [int]($source.Width * $scale)
  $drawHeight = [int]($source.Height * $scale)
  $x = [int](($width - $drawWidth) / 2)
  $y = [int](($height - $drawHeight) / 2)
  $graphics.DrawImage($source, $x, $y, $drawWidth, $drawHeight)
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

$public = Join-Path $PSScriptRoot "..\public"
Save-ResizedPng $sourceLogo 512 512 (Join-Path $public "icon.png")
Save-ResizedPng $sourceLogo 180 180 (Join-Path $public "apple-touch-icon.png")
Save-ResizedPng $sourceLogo 192 192 (Join-Path $public "icons\192x192.png")
Save-ResizedPng $sourceLogo 512 512 (Join-Path $public "icons\512x512.png")
Save-ResizedPng $sourceCard 1200 630 (Join-Path $public "og-image.png")

# ICO files can contain PNG payloads. Build a valid single-image 64px ICO from a resized logo.
$tempPng = Join-Path ([System.IO.Path]::GetTempPath()) "ruminate-favicon.png"
Save-ResizedPng $sourceLogo 64 64 $tempPng
$png = [System.IO.File]::ReadAllBytes($tempPng)
$stream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter $stream
$writer.Write([uint16]0)
$writer.Write([uint16]1)
$writer.Write([uint16]1)
$writer.Write([byte]64)
$writer.Write([byte]64)
$writer.Write([byte]0)
$writer.Write([byte]0)
$writer.Write([uint16]1)
$writer.Write([uint16]32)
$writer.Write([uint32]$png.Length)
$writer.Write([uint32]22)
$writer.Write($png)
$writer.Flush()
[System.IO.File]::WriteAllBytes((Join-Path $public "favicon.ico"), $stream.ToArray())
$writer.Dispose()
$stream.Dispose()
Remove-Item -LiteralPath $tempPng -Force
$sourceLogo.Dispose()
$sourceCard.Dispose()
