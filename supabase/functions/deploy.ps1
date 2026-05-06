# Deploy all AquaSmart Edge Functions to Production and/or Kimbwela Farm
# Usage (run from the aquasmart1 project root in PowerShell or CMD):
#
#   PowerShell:
#     .\supabase\functions\deploy.ps1              # deploy to production
#     .\supabase\functions\deploy.ps1 --all        # deploy to both projects
#     .\supabase\functions\deploy.ps1 --kimbwela   # deploy to Kimbwela Farm only
#     .\supabase\functions\deploy.ps1 -UseDocker   # force local Docker bundling
#
#   CMD (call PowerShell explicitly):
#     powershell -ExecutionPolicy Bypass -File supabase\functions\deploy.ps1 --all
#
# Prerequisites: authenticated Supabase CLI access (run: supabase login or npx supabase login)
# Project refs:
#   Production:    dxihivdoxulrwxdwiemh
#   Kimbwela Farm: zakmibzkuvwlzrkgfmvx

param(
    [switch]$All,
    [switch]$Kimbwela,
    [string]$Project = "",
    [switch]$UseDocker
)

$PROD_REF = "dxihivdoxulrwxdwiemh"
$KF_REF   = "zakmibzkuvwlzrkgfmvx"

$FUNCTIONS = @(
    "parse-preview",
    "normalize",
    "normalize-water",
    "normalize-feeding",
    "normalize-mortality",
    "normalize-sampling",
    "normalize-harvest",
    "normalize-transfer"
)

function Resolve-SupabaseCli {
    $cli = Get-Command "supabase" -ErrorAction SilentlyContinue
    if ($cli) {
        return @{
            Command = $cli.Source
            PrefixArgs = @()
            Description = $cli.Source
        }
    }

    $npx = Get-Command "npx.cmd" -ErrorAction SilentlyContinue
    if ($npx) {
        return @{
            Command = $npx.Source
            PrefixArgs = @("--yes", "supabase@latest")
            Description = "npx.cmd --yes supabase@latest"
        }
    }

    throw "Supabase CLI not found. Install it globally or ensure Node.js/npx is available."
}

function Invoke-SupabaseCli {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $resolved = Resolve-SupabaseCli
    $allArgs = @($resolved.PrefixArgs + $Arguments)
    $output = & $resolved.Command @allArgs 2>&1

    return @{
        Output = $output
        ExitCode = $LASTEXITCODE
        Description = $resolved.Description
    }
}

function Deploy-To {
    param([string]$ProjectRef)

    Write-Host ""
    Write-Host "=== Deploying to project: $ProjectRef ===" -ForegroundColor Cyan

    foreach ($fn in $FUNCTIONS) {
        Write-Host "  -> Deploying $fn..." -NoNewline
        $deployArgs = @(
            "functions",
            "deploy",
            $fn,
            "--project-ref",
            $ProjectRef,
            "--no-verify-jwt"
        )
        if (-not $UseDocker) {
            $deployArgs += "--use-api"
        }
        $result = Invoke-SupabaseCli -Arguments $deployArgs
        if ($result.ExitCode -ne 0) {
            Write-Host " FAILED" -ForegroundColor Red
            Write-Host "     CLI: $($result.Description)" -ForegroundColor DarkRed
            Write-Host "     Error: $($result.Output)" -ForegroundColor Red
            exit 1
        }
        Write-Host " done" -ForegroundColor Green
    }

    Write-Host "=== All functions deployed to $ProjectRef ===" -ForegroundColor Cyan
}

# Dispatch based on flags
if ($All) {
    Deploy-To $PROD_REF
    Deploy-To $KF_REF
} elseif ($Kimbwela) {
    Deploy-To $KF_REF
} elseif ($Project -ne "") {
    Deploy-To $Project
} else {
    Deploy-To $PROD_REF
}
