param([string]$SourcePath)

$ErrorActionPreference = 'Stop'
$web = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$parent = Split-Path -Parent $web
$source = if ($SourcePath) { [System.IO.Path]::GetFullPath($SourcePath) } else { Join-Path $parent 'Musiyo_Bëtsknaté\Build\MuseumWeb' }
$target = [System.IO.Path]::GetFullPath((Join-Path $web 'public\unity'))
if (-not (Test-Path -LiteralPath (Join-Path $source 'unity-build.json'))) {
    throw 'Museum Web build manifest is missing. Build it from Unity first.'
}
if (-not $target.StartsWith($web + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'The target is outside the Web repository.'
}
if ($source.Equals($target, [System.StringComparison]::OrdinalIgnoreCase) -or $source.StartsWith($target + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase) -or $target.StartsWith($source.TrimEnd('\') + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'The build source and Web target must not overlap.'
}
New-Item -ItemType Directory -Force -Path (Join-Path $web 'public') | Out-Null
if (Test-Path -LiteralPath $target) {
    Remove-Item -LiteralPath $target -Recurse -Force
}
Copy-Item -LiteralPath $source -Destination $target -Recurse -Force
Write-Output "Museum Web build copied to $target"
