<#
.SYNOPSIS
  Met à jour .env avec l'IP actuelle du serveur Windows (IP non fixe).
  Équivalent PowerShell de change_ip.sh, sans dépendance à Git Bash.

.DESCRIPTION
  L'application ne dépend pas de l'IP : nginx sert front et API sur la même
  origine, le front appelle l'API en relatif (NEXT_PUBLIC_API_URL vide) et les
  liens des e-mails reprennent l'adresse du visiteur. Un changement d'IP ne
  demande donc AUCUN rebuild ni redémarrage : ce script ne fait que garder
  .env cohérent (valeurs de repli pour le CLI) et afficher la nouvelle URL.

  Lancement (depuis le dossier du projet) :
    .\change_ip.cmd                   # double-clic possible, IP détectée
    .\change_ip.cmd 192.168.1.50      # IP forcée
  ou directement :
    powershell -ExecutionPolicy Bypass -File .\change_ip.ps1 [IP]
#>
param([string]$Ip)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot
$envFile = Join-Path $PSScriptRoot '.env'

if (-not (Test-Path $envFile)) {
    Write-Error ".env introuvable dans $PSScriptRoot (copier .env.docker.example en .env)."
}

# --- IP : celle de la carte réseau active qui a une passerelle par défaut ---
# (écarte les cartes virtuelles WSL / Hyper-V / Docker, qui n'en ont pas)
if (-not $Ip) {
    $Ip = Get-NetIPConfiguration |
        Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } |
        Select-Object -First 1 -ExpandProperty IPv4Address |
        Select-Object -First 1 -ExpandProperty IPAddress
}
if ($Ip -notmatch '^(\d{1,3}\.){3}\d{1,3}$') {
    Write-Error "IP invalide ou non détectée ('$Ip'). Relancer avec l'IP : .\change_ip.cmd 192.168.X.X"
}

# --- Lecture de .env en conservant ses fins de ligne, écriture UTF-8 sans BOM ---
# (un BOM en tête de .env fausserait le nom de la première variable pour Compose)
$raw = [IO.File]::ReadAllText($envFile, [Text.Encoding]::UTF8)
$eol = "`n"
if ($raw.Contains("`r`n")) { $eol = "`r`n" }
$lines = New-Object System.Collections.Generic.List[string]
$lines.AddRange([string[]]($raw -split "`r?`n"))
if ($lines.Count -gt 0 -and $lines[$lines.Count - 1] -eq '') { $lines.RemoveAt($lines.Count - 1) }

function Get-Var([string]$key) {
    foreach ($l in $lines) { if ($l.StartsWith("$key=")) { return $l.Substring($key.Length + 1) } }
    return $null
}

# Remplacement ligne à ligne (pas de regex de remplacement : les valeurs
# contiennent des '$', interprétés par -replace).
function Set-Var([string]$key, [string]$value) {
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i].StartsWith("$key=")) { $lines[$i] = "$key=$value"; return }
    }
    $lines.Add("$key=$value")
}

$httpPort = Get-Var 'HTTP_PORT'
$newUrl = "http://$Ip"
if ($httpPort -and $httpPort -ne '80') { $newUrl = "${newUrl}:$httpPort" }

$oldUrl = Get-Var 'FRONTEND_URL'
$oldApiUrl = Get-Var 'NEXT_PUBLIC_API_URL'

Write-Host "URL dans .env : $(if ($oldUrl) { $oldUrl } else { '<aucune>' })"
Write-Host "IP du serveur : $Ip"
Write-Host ''

if ($oldUrl -ne $newUrl -or $oldApiUrl) {
    Set-Var 'CORS_ALLOW_ORIGIN' ("'^http://" + $Ip + '(:[0-9]+)?$' + "'")
    Set-Var 'FRONTEND_URL' $newUrl
    Set-Var 'DEFAULT_URI' $newUrl
    # Vide = appels relatifs : surtout PAS l'IP, sinon il faudrait rebuilder
    # le front à chaque changement d'IP.
    Set-Var 'NEXT_PUBLIC_API_URL' ''
    [IO.File]::WriteAllText($envFile, ($lines -join $eol) + $eol, (New-Object Text.UTF8Encoding($false)))
    Write-Host '[.env] mis à jour :'
    foreach ($k in 'CORS_ALLOW_ORIGIN', 'FRONTEND_URL', 'DEFAULT_URI', 'NEXT_PUBLIC_API_URL') {
        Write-Host "    $k=$(Get-Var $k)"
    }
} else {
    Write-Host '[.env] déjà à jour'
}

Write-Host ''
if ($oldApiUrl) {
    Write-Host "NEXT_PUBLIC_API_URL valait '$oldApiUrl' (ancienne configuration, inlinée"
    Write-Host 'dans le front) : rebuild du front nécessaire UNE fois (build sans coupure,'
    Write-Host 'puis quelques secondes de coupure du front le temps de le recréer) :'
    Write-Host '  docker compose -f docker-compose.prod.yml build front'
    Write-Host '  docker compose -f docker-compose.prod.yml up -d --no-deps front'
} else {
    Write-Host "Aucun rebuild ni redémarrage nécessaire : l'application ne dépend pas de l'IP."
}

Write-Host ''
Write-Host 'Application accessible sur :'
Write-Host "  Front : $newUrl/"
Write-Host "  API   : $newUrl/api/doc"
