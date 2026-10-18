<#
.SYNOPSIS
  Met à jour la configuration avec l'IP actuelle du serveur Windows (IP non fixe).
  Équivalent PowerShell de change_ip.sh, sans dépendance à Git Bash.

.DESCRIPTION
  L'application ne dépend pas de l'IP : nginx sert front et API sur la même
  origine, le front appelle l'API en relatif (NEXT_PUBLIC_API_URL vide) et les
  liens des e-mails reprennent l'adresse du visiteur. Un changement d'IP ne
  demande donc AUCUN rebuild ni redémarrage pour que l'application marche : ce
  script garde la configuration cohérente et affiche les nouvelles adresses.

  Fichiers mis à jour (chacun avec son propre port) :
    .env          (obligatoire) : CORS_ALLOW_ORIGIN, FRONTEND_URL, DEFAULT_URI ;
                  NEXT_PUBLIC_API_URL vidé. Sur un PC avec dev + prod : le dev.
    .env.prod     (s'il existe) : mêmes clés, pour la prod déployée par Jenkins.
    jenkins/.env  (s'il existe) : JENKINS_URL (liens absolus produits par Jenkins).
  Puis indique ce qu'il faut éventuellement redémarrer.

  Lancement (depuis le dossier du projet) :
    .\change_ip.cmd                   # double-clic possible, IP détectée
    .\change_ip.cmd 192.168.1.50      # IP forcée
  ou directement :
    powershell -ExecutionPolicy Bypass -File .\change_ip.ps1 [IP]
#>
param([string]$Ip)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot
# UTF-8 sans BOM : un BOM en tête d'un .env fausserait le nom de la première
# variable pour Docker Compose.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

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

# --- Fichiers .env : lus en conservant leurs fins de ligne -------------------
function Read-EnvFile([string]$path) {
    $raw = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
    $eol = "`n"
    if ($raw.Contains("`r`n")) { $eol = "`r`n" }
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.AddRange([string[]]($raw -split "`r?`n"))
    if ($lines.Count -gt 0 -and $lines[$lines.Count - 1] -eq '') { $lines.RemoveAt($lines.Count - 1) }
    return @{ Path = $path; Eol = $eol; Lines = $lines }
}

function Save-EnvFile($file) {
    [IO.File]::WriteAllText($file.Path, ($file.Lines -join $file.Eol) + $file.Eol, $utf8NoBom)
}

function Get-Var($file, [string]$key) {
    foreach ($l in $file.Lines) { if ($l.StartsWith("$key=")) { return $l.Substring($key.Length + 1) } }
    return $null
}

# Remplacement ligne à ligne (pas de regex de remplacement : les valeurs
# contiennent des '$', interprétés par -replace).
function Set-Var($file, [string]$key, [string]$value) {
    for ($i = 0; $i -lt $file.Lines.Count; $i++) {
        if ($file.Lines[$i].StartsWith("$key=")) { $file.Lines[$i] = "$key=$value"; return }
    }
    $file.Lines.Add("$key=$value")
}

# .env d'application (dev ou prod) : URL = IP + son propre HTTP_PORT.
function Update-AppEnv([string]$path, [string]$label) {
    $file = Read-EnvFile $path
    $port = Get-Var $file 'HTTP_PORT'
    $url = "http://$Ip"
    if ($port -and $port -ne '80') { $url = "${url}:$port" }
    $oldApi = Get-Var $file 'NEXT_PUBLIC_API_URL'
    $changed = $false
    if ((Get-Var $file 'FRONTEND_URL') -ne $url -or $oldApi) {
        Set-Var $file 'CORS_ALLOW_ORIGIN' ("'^http://" + $Ip + '(:[0-9]+)?$' + "'")
        Set-Var $file 'FRONTEND_URL' $url
        Set-Var $file 'DEFAULT_URI' $url
        # Vide = appels relatifs : surtout PAS l'IP, sinon il faudrait rebuilder
        # le front à chaque changement d'IP.
        Set-Var $file 'NEXT_PUBLIC_API_URL' ''
        Save-EnvFile $file
        $changed = $true
        Write-Host "[$label] mis à jour :"
        foreach ($k in 'CORS_ALLOW_ORIGIN', 'FRONTEND_URL', 'DEFAULT_URI', 'NEXT_PUBLIC_API_URL') {
            Write-Host "    $k=$(Get-Var $file $k)"
        }
    } else {
        Write-Host "[$label] déjà à jour ($url)"
    }
    return [pscustomobject]@{ Label = $label; Url = $url; OldApi = $oldApi; Changed = $changed }
}

Write-Host "IP du serveur : $Ip"
Write-Host ''

$dev = Update-AppEnv $envFile '.env'

$prod = $null
$prodFile = Join-Path $PSScriptRoot '.env.prod'
if (Test-Path $prodFile) { $prod = Update-AppEnv $prodFile '.env.prod' }

$jenkinsUrl = $null
$jenkinsChanged = $false
$jenkinsFile = Join-Path $PSScriptRoot 'jenkins\.env'
if (Test-Path $jenkinsFile) {
    $j = Read-EnvFile $jenkinsFile
    $jPort = Get-Var $j 'JENKINS_PORT'
    if (-not $jPort) { $jPort = '8080' }
    $jenkinsUrl = "http://${Ip}:$jPort/"
    if ((Get-Var $j 'JENKINS_URL') -ne $jenkinsUrl) {
        Set-Var $j 'JENKINS_URL' $jenkinsUrl
        Save-EnvFile $j
        $jenkinsChanged = $true
        Write-Host '[jenkins/.env] mis à jour :'
        Write-Host "    JENKINS_URL=$jenkinsUrl"
    } else {
        Write-Host "[jenkins/.env] déjà à jour ($jenkinsUrl)"
    }
}

# --- Ce qu'il reste à faire ---------------------------------------------------
Write-Host ''
$todo = @()
if ($dev.OldApi) {
    $todo += "NEXT_PUBLIC_API_URL de .env valait '$($dev.OldApi)' (ancienne configuration, inlinée dans le front) :"
    $todo += '  reconstruire le front UNE fois : docker compose [-f docker-compose.prod.yml] build front'
    $todo += '  puis : docker compose [-f docker-compose.prod.yml] up -d --no-deps front'
}
if ($jenkinsChanged -or ($prod -and $prod.Changed)) {
    $todo += 'Jenkins relit jenkins/.env et .env.prod seulement au démarrage. Pour appliquer'
    $todo += '(facultatif : l''application fonctionne déjà avec la nouvelle IP ; éviter pendant un build) :'
    $todo += '  docker compose -f jenkins/docker-compose.yml up -d --force-recreate'
    if ($prod -and $prod.Changed) {
        $todo += '  puis lancer un build dans Jenkins pour redéployer la prod avec .env.prod à jour'
    }
}
if ($todo.Count -eq 0) {
    Write-Host "Aucun rebuild ni redémarrage nécessaire : l'application ne dépend pas de l'IP."
} else {
    Write-Host 'À faire :'
    $todo | ForEach-Object { Write-Host "  $_" }
}

Write-Host ''
Write-Host 'Adresses :'
Write-Host "  Application (.env)      : $($dev.Url)/"
if ($prod) { Write-Host "  Application (.env.prod) : $($prod.Url)/" }
if ($jenkinsUrl) { Write-Host "  Jenkins                 : $jenkinsUrl" }
