#Requires -Version 5.1
<#
.SYNOPSIS
  Generates HTML pages for games, races and faiths from data files.

.PARAMETER Target
  games | races | faiths | all (default: all)

.EXAMPLE
  .\scripts\build.ps1 games
  .\scripts\build.ps1 all
#>
param(
    [ValidateSet('games','races','faiths','all')]
    [string]$Target = 'all'
)

$ErrorActionPreference = 'Stop'
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent

function Read-File($relPath) {
    [System.IO.File]::ReadAllText((Join-Path $ROOT $relPath), [System.Text.Encoding]::UTF8)
}
function Write-File($relPath, $content) {
    $fullPath = Join-Path $ROOT $relPath
    $dir = Split-Path $fullPath -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($fullPath, $content, [System.Text.Encoding]::UTF8)
}
function XmlEscape($s) { [System.Security.SecurityElement]::Escape($s) }

# ── JS → JSON converter ──
function JsToJson($jsArrayText) {
    $js = $jsArrayText

    $objects = [System.Collections.ArrayList]::new()
    $i = 0; $len = $js.Length
    while ($i -lt $len) {
        $start = $js.IndexOf('{', $i)
        if ($start -eq -1) { break }
        $depth = 0; $inStr = $false; $sc = [char]0; $j = $start
        while ($j -lt $len) {
            $c = $js[$j]
            if ($inStr) {
                if ($c -eq '\') { $j += 2; continue }
                if ($c -eq $sc) { $inStr = $false }
            } else {
                if ($c -eq '"' -or $c -eq "'") { $inStr = $true; $sc = $c }
                elseif ($c -eq '{') { $depth++ }
                elseif ($c -eq '}') { $depth--; if ($depth -eq 0) { break } }
            }
            $j++
        }
        $objects.Add($js.Substring($start, $j - $start + 1)) | Out-Null
        $i = $j + 1
    }

    $jsonObjs = [System.Collections.ArrayList]::new()
    foreach ($obj in $objects) { $jsonObjs.Add((Convert-OneObject $obj)) | Out-Null }
    return '[' + ($jsonObjs -join ',') + ']'
}

function Convert-OneObject($objText) {
    $pairs = [System.Collections.ArrayList]::new()
    $re = [regex]'(?<=[{,])\s*(\w+)\s*:\s*'
    $m = $re.Match($objText)
    while ($m.Success) {
        $key = $m.Groups[1].Value
        $vs = $m.Index + $m.Length
        $next = $re.Match($objText, $vs)
        $ve = if ($next.Success) { $next.Index } else { $objText.LastIndexOf('}') }
        $raw = $objText.Substring($vs, $ve - $vs).Trim().TrimEnd(',').Trim()
        $pairs.Add("`"$key`":$(Convert-OneValue $raw)") | Out-Null
        $m = $re.Match($objText, $ve)
    }
    return '{' + ($pairs -join ',') + '}'
}

function Convert-OneValue($val) {
    $val = $val.Trim()
    if ($val.Length -eq 0) { return 'null' }

    if ($val[0] -eq "'") {
        $s = $val.Substring(1, $val.Length - 2) -replace "\\''", '"'
        $s = $s -replace '\\', '\\\\' -replace '"', '\"' -replace "`n", '\n' -replace "`r", '\r' -replace "`t", '\t'
        return "`"$s`""
    }
    if ($val[0] -eq '"') { return $val }
    if ($val -eq 'true' -or $val -eq 'false' -or $val -eq 'null') { return $val }
    if ($val -match '^[-0-9]') { return $val }

    if ($val[0] -eq '[') {
        $inner = $val.Substring(1, $val.Length - 2).Trim()
        if ($inner.Length -eq 0) { return '[]' }
        $items = [System.Collections.ArrayList]::new()
        $inStr = $false; $sc = [char]0; $st = 0
        for ($k = 0; $k -lt $inner.Length; $k++) {
            $c = $inner[$k]
            if ($inStr) { if ($c -eq '\') { $k++; continue }; if ($c -eq $sc) { $inStr = $false } }
            else {
                if ($c -eq '"' -or $c -eq "'") { $inStr = $true; $sc = $c }
                elseif ($c -eq ',') { $items.Add((Convert-OneValue $inner.Substring($st, $k - $st).Trim())) | Out-Null; $st = $k + 1 }
            }
        }
        $last = $inner.Substring($st).Trim()
        if ($last.Length -gt 0) { $items.Add((Convert-OneValue $last)) | Out-Null }
        return '[' + ($items -join ',') + ']'
    }

    if ($val[0] -eq '{') { return (Convert-OneObject $val) }
    return "`"$val`""
}

function Load-JsArray($file, $varName) {
    $src = Read-File $file
    $m = [regex]::Match($src, "var\s+$varName\s*=\s*\[")
    if (-not $m) { throw "$varName not found in $file" }
    $start = $m.Index + $m.Length - 1
    $depth = 1; $inStr = $false; $sc = [char]0; $i = $start + 1
    while ($i -lt $src.Length) {
        $c = $src[$i]
        if ($inStr) {
            if ($c -eq '\') { $i += 2; continue }
            if ($c -eq $sc) { $inStr = $false }
        } else {
            if ($c -eq '"' -or $c -eq "'") { $inStr = $true; $sc = $c }
            elseif ($c -eq '[') { $depth++ }
            elseif ($c -eq ']') { $depth--; if ($depth -eq 0) { break } }
        }
        $i++
    }
    $arrText = $src.Substring($start, $i - $start + 1)
    $tmpJs = Join-Path $env:TEMP "build_$varName.js"
    $tmpJson = Join-Path $env:TEMP "build_$varName.json"
    $bom = [byte[]]@(0xEF, 0xBB, 0xBF)
    [System.IO.File]::WriteAllBytes($tmpJs, $bom + [System.Text.Encoding]::UTF8.GetBytes("var $varName = $arrText;"))
    $scriptDir = Split-Path (Join-Path $ROOT "scripts\build.ps1") -Parent
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & cscript //nologo "$scriptDir\js2json.js" "$tmpJs" "$tmpJson" 2>&1 | Out-Null
    $ErrorActionPreference = $prevEAP
    $json = [System.IO.File]::ReadAllText($tmpJson, [System.Text.Encoding]::UTF8)
    return ($json | ConvertFrom-Json)
}

# ── Extract body from wiki HTML pages ──
function Extract-Body($html) {
    $m = [regex]::Match($html, '(?s)<div id="raceContent">(.+?)</div>\s*</div>\s*</div>')
    if ($m.Success) { return $m.Groups[1].Value.Trim() }
    return ''
}

# ══════════════════════════════════════════════════════════════════
#  GAME PAGES
# ══════════════════════════════════════════════════════════════════
function Build-Games {
    Write-Host "`n--- Games ---" -ForegroundColor Yellow
    $GAMES = Load-JsArray 'js/games.js' 'GAMES'
    Write-Host "  Loaded $($GAMES.Count) games"

    $SITE = 'https://example.com/tavern'
    $count = 0
    foreach ($g in $GAMES) {
        $slug = $g.slug
        $title = if ($g.title) { $g.title } else { $slug }
        $desc = if ($g.longdesc) { $g.longdesc } elseif ($g.desc) { $g.desc } else { '' }
        $metaDesc = ($desc -replace '<[^>]*>','' -replace '\s+',' ').Trim()
        $url = "$SITE/games/$slug.html"

        $html =
'<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>' + (XmlEscape $title) + ' - Игры Таверны | Карточная Буря</title>
  <meta name="description" content="' + (XmlEscape $metaDesc) + '">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Таверна «Карточная Буря»">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:title" content="' + (XmlEscape $title) + ' - Игры Таверны | Карточная Буря">
  <meta property="og:description" content="' + (XmlEscape $metaDesc) + '">
  <meta property="og:url" content="' + $url + '">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="' + (XmlEscape $title) + ' - Игры Таверны | Карточная Буря">
  <meta name="twitter:description" content="' + (XmlEscape $metaDesc) + '">
  <meta name="theme-color" content="#17100a">
  <link rel="canonical" href="' + $url + '">
  <link rel="apple-touch-icon" href="../img/favicon.png">
  <link rel="stylesheet" href="../fonts/fonts.css">
  <link rel="stylesheet" href="../css/style.css">
  <link rel="icon" type="image/png" href="../img/favicon.png">
  <link rel="icon" type="image/x-icon" href="../img/favicon.ico">
  <script defer src="../js/layout.js"></script>
</head>
<body data-layout="tavern" data-root="../">

  <main id="top">
    <div id="gamePage"></div>
  </main>

  <script src="../js/games.js"></script>
  <script src="../js/game-page.js"></script>
  <script src="../js/script.js"></script>

</body>
</html>'
        Write-File "games\$slug.html" $html
        $count++
    }
    Write-Host "  OK: $count game pages" -ForegroundColor Green
}

# ══════════════════════════════════════════════════════════════════
#  WIKI PAGES (races + faiths)
# ══════════════════════════════════════════════════════════════════
function Build-Wiki {
    Write-Host "`n--- Wiki pages ---" -ForegroundColor Yellow
    $RACES = Load-JsArray 'wiki/js/data.js' 'RACES'

    # FAITHS from the same file
    $dataSrc = Read-File 'wiki/js/data.js'
    $faithsM = [regex]::Match($dataSrc, 'var FAITHS = (\[[\s\S]*?\]);')
    $FAITHS = @()
    if ($faithsM.Success) {
        $FAITHS = (JsToJson $faithsM.Groups[1].Value) | ConvertFrom-Json
    }

    # Generate race pages (body is already in data.js)
    $n = Build-WikiPages $RACES 'wiki\races' 'Расы Орвея' 'title'
    Write-Host "  OK: $n race pages" -ForegroundColor Green

    # Generate faith pages
    $n = Build-WikiPages $FAITHS 'wiki\faiths' 'Верования Орвея' 'title'
    Write-Host "  OK: $n faith pages" -ForegroundColor Green
}

function Build-WikiPages($items, $dir, $suffix, $titleField) {
    $count = 0
    foreach ($item in $items) {
        $slug = $item.slug
        $title = if ($item.$titleField) { "$($item.$titleField) — $suffix" } else { $slug }
        $meta = if ($item.meta) { $item.meta } else { '' }

        $html =
'<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>' + (XmlEscape $title) + '</title>
    <meta name="description" content="' + (XmlEscape $meta) + '">
    <link rel="stylesheet" href="../static/style_wiki.css">
    <script defer src="../../js/layout.js"></script>
    <script defer src="../js/main.js"></script>
</head>
<body data-layout="wiki" data-root="../">
    <div class="wiki-page">
        <div class="wiki-container">
            <div id="raceContent"></div>
        </div>
    </div>
    <script src="../js/data.js"></script>
    <script src="../js/race-page.js"></script>
</body>
</html>'
        Write-File "$dir\$slug.html" $html
        $count++
    }
    return $count
}

# ══════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════
Write-Host "=== TavernCardTempest Build ===" -ForegroundColor Cyan

if ($Target -eq 'games' -or $Target -eq 'all') { Build-Games }
if ($Target -eq 'races' -or $Target -eq 'faiths' -or $Target -eq 'all') { Build-Wiki }

Write-Host "`nDone!" -ForegroundColor Green
