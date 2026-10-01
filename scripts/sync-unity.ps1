$ErrorActionPreference = 'Stop'
$web = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$parent = Split-Path -Parent $web
$source = Join-Path $parent 'Musiyo_Bëtsknaté\Build\RecorridoPruebaWebGL'
$target = [System.IO.Path]::GetFullPath((Join-Path $web 'public\unity'))
if (-not (Test-Path -LiteralPath (Join-Path $source 'index.html'))) {
    throw 'Falta el build WebGL. Genéralo primero desde Unity.'
}
if (-not $target.StartsWith($web + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Destino fuera del repositorio web.'
}
New-Item -ItemType Directory -Force -Path (Join-Path $web 'public') | Out-Null
if (Test-Path -LiteralPath $target) {
    Remove-Item -LiteralPath $target -Recurse -Force
}
Copy-Item -LiteralPath $source -Destination $target -Recurse -Force
Write-Output "Build WebGL copiado a $target"
