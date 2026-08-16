#Requires -Version 5.1
# Convert JS var = [...] to JSON (for data with predictable structure)
param([string]$InputFile, [string]$OutputFile)

$ErrorActionPreference = 'Stop'
$content = [System.IO.File]::ReadAllText($InputFile, [System.Text.Encoding]::UTF8)

# Extract the array assignment
$m = [regex]::Match($content, 'var\s+\w+\s*=\s*(\[[\s\S]*?\]);')
if (-not $m) { Write-Error "Array not found"; exit 1 }

$js = $m.Groups[1].Value

# Strategy: split into object blocks, convert each one
# Each object is { ... } at the top level
$objects = [System.Collections.ArrayList]::new()
$i = 0
$len = $js.Length

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
    $objText = $js.Substring($start, $j - $start + 1)
    $objects.Add($objText) | Out-Null
    $i = $j + 1
}

Write-Host "Found $($objects.Count) objects"

function Convert-SingleObject($objText) {
    $pairs = [System.Collections.ArrayList]::new()
    # Match unquoted key followed by : value
    $re = [regex]'(?<=[{,])\s*(\w+)\s*:\s*'
    $m2 = $re.Match($objText)
    while ($m2.Success) {
        $key = $m2.Groups[1].Value
        $valStart = $m2.Index + $m2.Length
        # Extract value — everything until next key or closing }
        # Find the next key pattern
        $nextKey = $re.Match($objText, $valStart)
        if ($nextKey.Success) {
            $valEnd = $nextKey.Index
        } else {
            $valEnd = $objText.LastIndexOf('}')
        }
        $valRaw = $objText.Substring($valStart, $valEnd - $valStart).Trim().TrimEnd(',').Trim()

        # Convert JS value to JSON
        $valJson = Convert-JsValue $valRaw
        $pairs.Add("`"$key`":$valJson") | Out-Null

        $m2 = $re.Match($objText, $valEnd)
    }
    return '{' + ($pairs -join ',') + '}'
}

function Convert-JsValue($val) {
    $val = $val.Trim()
    if ($val.Length -eq 0) { return 'null' }

    # String in single quotes
    if ($val[0] -eq "'") {
        $s = $val.Substring(1, $val.Length - 2)
        # Handle escaped single quotes
        $s = $s -replace "\\'", '"'
        # Escape for JSON
        $s = $s -replace '\\', '\\\\' -replace '"', '\"' -replace "`n", '\n' -replace "`r", '\r' -replace "`t", '\t'
        return "`"$s`""
    }

    # String in double quotes
    if ($val[0] -eq '"') {
        $s = $val.Substring(1, $val.Length - 2)
        $s = $s -replace '\\', '\\\\' -replace '"', '\"'
        return "`"$s`""
    }

    # Boolean
    if ($val -eq 'true') { return 'true' }
    if ($val -eq 'false') { return 'false' }
    if ($val -eq 'null') { return 'null' }

    # Number
    if ($val -match '^[-0-9]') { return $val }

    # Array
    if ($val[0] -eq '[') {
        # For simple arrays like ['a', 'b'], convert directly
        $inner = $val.Substring(1, $val.Length - 2).Trim()
        if ($inner.Length -eq 0) { return '[]' }
        $items = [System.Collections.ArrayList]::new()
        # Split by comma (respecting strings)
        $inStr = $false; $sc = [char]0; $start = 0
        for ($k = 0; $k -lt $inner.Length; $k++) {
            $c = $inner[$k]
            if ($inStr) {
                if ($c -eq '\') { $k++; continue }
                if ($c -eq $sc) { $inStr = $false }
            } else {
                if ($c -eq '"' -or $c -eq "'") { $inStr = $true; $sc = $c }
                elseif ($c -eq ',') {
                    $item = $inner.Substring($start, $k - $start).Trim()
                    $items.Add((Convert-JsValue $item)) | Out-Null
                    $start = $k + 1
                }
            }
        }
        $lastItem = $inner.Substring($start).Trim()
        if ($lastItem.Length -gt 0) { $items.Add((Convert-JsValue $lastItem)) | Out-Null }
        return '[' + ($items -join ',') + ']'
    }

    # Nested object
    if ($val[0] -eq '{') {
        return Convert-SingleObject $val
    }

    # Unknown — return as-is (will be string)
    return "`"$val`""
}

$jsonObjects = [System.Collections.ArrayList]::new()
foreach ($obj in $objects) {
    $jsonObjects.Add((Convert-SingleObject $obj)) | Out-Null
}

$json = '[' + ($jsonObjects -join ',') + ']'

if ($OutputFile) {
    [System.IO.File]::WriteAllText($OutputFile, $json, [System.Text.Encoding]::UTF8)
    Write-Host "Written to $OutputFile"
} else {
    Write-Output $json
}
