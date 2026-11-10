param(
    [switch]$Apply,
    [switch]$IncludeLegacyCache
)

# 默认只列出目标；-Apply 才删除。旧共享缓存仅在人工核对后显式加入。
$ErrorActionPreference = 'Stop'
$workspaceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$versionsRoot = Join-Path $workspaceRoot 'spec\versions'
$targets = @()
$activeSpecs = @()
foreach ($version in Get-ChildItem -LiteralPath $versionsRoot -Directory) {
    $specsRoot = Join-Path $version.FullName 'specs'
    if (-not (Test-Path -LiteralPath $specsRoot)) { continue }
    foreach ($spec in Get-ChildItem -LiteralPath $specsRoot -Directory) {
        $ledger = Join-Path $spec.FullName 'lead\team-context.md'
        if (-not (Test-Path -LiteralPath $ledger) -or
            (Get-Content -LiteralPath $ledger -Raw -Encoding UTF8) -notmatch '(?m)^status: archived\s*$') {
            $activeSpecs += $spec.FullName
            continue
        }
        foreach ($role in @('tester', 'executor', 'debugger', 'ender')) {
            $artifactPath = Join-Path $spec.FullName "$role\artifacts"
            if (Test-Path -LiteralPath $artifactPath) { $targets += $artifactPath }
        }
    }
}
if ($IncludeLegacyCache) {
    if ($activeSpecs.Count) { throw '存在未归档 Spec，禁止整体清理共享缓存。' }
    $cache = Join-Path $workspaceRoot '.awr\cache'
    if (Test-Path -LiteralPath $cache) { $targets += $cache }
}

$bytes = 0L
$files = 0L
foreach ($target in $targets) {
    $resolvedTarget = (Resolve-Path -LiteralPath $target).Path
    if (-not $resolvedTarget.StartsWith($workspaceRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw "目标不在项目内：$resolvedTarget"
    }
    # 检查每个祖先，避免目录链接将删除操作引向项目外。
    $ancestor = Get-Item -LiteralPath $resolvedTarget -Force
    while ($ancestor.FullName -ne $workspaceRoot) {
        if ($ancestor.Attributes -band [IO.FileAttributes]::ReparsePoint) {
            throw "目标或祖先是链接：$($ancestor.FullName)"
        }
        $ancestor = $ancestor.Parent
        if (-not $ancestor) { throw '目标路径不在项目中。' }
    }
    $children = @(Get-ChildItem -LiteralPath $resolvedTarget -Recurse -Force)
    if (@($children | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count) {
        throw "目录包含链接，请人工检查：$resolvedTarget"
    }
    foreach ($file in $children | Where-Object { -not $_.PSIsContainer }) {
        $bytes += $file.Length
        $files++
    }
    Write-Output "目标：$resolvedTarget"
}
Write-Output "总计：$files 个文件，$bytes 字节。"
if (-not $Apply) {
    Write-Output '仅预览，未删除。确认测试已结束、机器状态已恢复后，再加 -Apply。'
    return
}
foreach ($target in $targets) { Remove-Item -LiteralPath $target -Recurse -Force }
Write-Output '清理完成。'
