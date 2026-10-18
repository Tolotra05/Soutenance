<#
.SYNOPSIS
  Aligne les comptes MySQL (root + MYSQL_USER) sur les mots de passe du .env.
  Équivalent PowerShell de sync_mysql_credentials.sh, sans dépendance à Git Bash.

.DESCRIPTION
  L'image mysql n'applique MYSQL_ROOT_PASSWORD / MYSQL_USER / MYSQL_PASSWORD
  qu'à la TOUTE PREMIÈRE initialisation du volume mysql_data. Si .env change
  ensuite, la base garde les anciens comptes : back reçoit "Access denied",
  sa migration échoue et le conteneur reste unhealthy.

  1. teste root et MYSQL_USER avec les valeurs du .env -> s'ils passent, ne fait rien ;
  2. sinon : arrête back et mysql, relance mysql SANS contrôle des mots de
     passe (--skip-grant-tables --skip-networking : inaccessible du réseau),
     redéfinit les mots de passe depuis .env, puis redémarre mysql et back.
  Données jamais modifiées. Coupure d'environ une minute, seulement si un
  réalignement est nécessaire. Les mots de passe ne doivent pas contenir
  " $ \ ou `.

  Lancement (depuis le dossier du projet) :
    .\sync_mysql_credentials.cmd -Prod                 # la prod (voir ci-dessous)
    .\sync_mysql_credentials.cmd docker-compose.yml    # le dev (.env, projet du dossier)
    .\sync_mysql_credentials.cmd                       # fichier compose détecté
    .\sync_mysql_credentials.cmd docker-compose.prod.yml -EnvFile .env.prod -Project taskmanager-prod

  -Prod = docker-compose.prod.yml + .env.prod s'il existe (sinon .env) + projet
  PROD_PROJECT de jenkins/.env s'il existe (sinon le nom du dossier). Couvre
  la prod séparée du dev (PC Windows : .env.prod, projet taskmanager-prod) comme
  la prod seule d'un serveur (.env, projet du dossier).

  Sans -EnvFile ni -Project, Docker Compose lit .env et prend le nom du dossier
  comme projet. Sur une machine où dev et prod cohabitent, viser la prod ainsi
  toucherait le projet du DEV : utiliser -Prod.
  Sans fichier compose, c'est celui qui a créé le conteneur mysql en place ; à
  défaut docker-compose.prod.yml.
#>
param(
    [string]$File,
    [string]$EnvFile = '.env',
    [string]$Project,
    [switch]$Prod
)

Set-Location -Path $PSScriptRoot
$recovery = 'mysql-recovery'

function Fail([string]$message) {
    Write-Host "Erreur : $message" -ForegroundColor Red
    exit 1
}

# Les scripts shell sont transmis encodés en base64 et décodés dans le
# conteneur. Windows PowerShell 5.1 supprime les guillemets doubles imbriqués
# des arguments passés aux programmes externes (requêtes SQL vides, erreur
# 1064), et ajoute un BOM à ce qu'il envoie sur l'entrée standard (première
# commande illisible) : l'argument base64 n'a ni l'un ni l'autre.
function Invoke-Sh([string[]]$dockerArgs, [string]$script) {
    $bytes = [Text.Encoding]::UTF8.GetBytes(($script -replace "`r`n", "`n") + "`n")
    $b64 = [Convert]::ToBase64String($bytes)
    docker @dockerArgs sh -c "echo $b64 | base64 -d | sh"
}

if ($Prod) {
    if (-not $File) { $File = 'docker-compose.prod.yml' }
    if ($EnvFile -eq '.env' -and (Test-Path .env.prod)) { $EnvFile = '.env.prod' }
    if (-not $Project -and (Test-Path jenkins\.env)) {
        $line = Get-Content jenkins\.env | Where-Object { $_ -match '^PROD_PROJECT=' } | Select-Object -First 1
        if ($line) { $Project = ($line -replace '^PROD_PROJECT=', '').Trim() }
    }
}

if (-not (Test-Path $EnvFile)) { Fail "$EnvFile introuvable dans $PSScriptRoot." }
# Options communes à toutes les commandes Compose : fichier d'environnement et projet visés.
$target = @('--env-file', $EnvFile)
if ($Project) { $target += @('-p', $Project) }

if (-not $File) {
    # Fichier compose du conteneur mysql existant de ce projet.
    $project = docker compose @target -f docker-compose.prod.yml config 2>$null |
        Where-Object { $_ -match '^name: ' } | Select-Object -First 1
    if ($project) {
        $project = $project -replace '^name: ', ''
        $id = docker ps -aq --filter "label=com.docker.compose.project=$project" `
            --filter 'label=com.docker.compose.service=mysql' | Select-Object -First 1
        if ($id) {
            # Étiquettes lues en JSON : un format {{.Label "..."}} perdrait ses
            # guillemets en passant par Windows PowerShell 5.1.
            $labels = docker inspect $id --format '{{json .Config.Labels}}' | ConvertFrom-Json
            $configFiles = $labels.'com.docker.compose.project.config_files'
            if ($configFiles) {
                $candidate = Split-Path -Leaf (($configFiles -split ',')[0])
                if (Test-Path $candidate) { $File = $candidate }
            }
        }
    }
}
if (-not $File) { $File = 'docker-compose.prod.yml' }
if (-not (Test-Path $File)) { Fail "$File introuvable dans $PSScriptRoot." }
$dc = @('compose') + $target + @('-f', $File)
$projectName = (docker @dc config 2>$null | Where-Object { $_ -match '^name: ' } | Select-Object -First 1) -replace '^name: ', ''
Write-Host "Fichier compose : $File | environnement : $EnvFile | projet : $projectName"
# Commande à recopier pour consulter ce même projet (messages d'aide).
$hint = 'docker compose ' + (($target + @('-f', $File)) -join ' ')

function Wait-Mysql {
    for ($i = 0; $i -lt 60; $i++) {
        Invoke-Sh ($dc + @('exec', '-T', 'mysql')) 'mysqladmin ping -h 127.0.0.1 --silent >/dev/null 2>&1' | Out-Null
        if ($LASTEXITCODE -eq 0) { return }
        Start-Sleep -Seconds 2
    }
    Fail "MySQL ne répond pas (voir : $hint logs mysql)."
}

function Test-Credentials {
    Invoke-Sh ($dc + @('exec', '-T', 'mysql')) @'
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT 1" >/dev/null 2>&1 &&
mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT 1" >/dev/null 2>&1
'@ | Out-Null
    return ($LASTEXITCODE -eq 0)
}

Write-Host "[1/3] Vérification des accès de $EnvFile..."
docker @dc up -d mysql 2>$null | Out-Null   # (re)crée mysql avec les valeurs actuelles du .env
Wait-Mysql
if (Test-Credentials) {
    Write-Host "      OK : root et MYSQL_USER acceptent déjà les mots de passe de $EnvFile. Rien à faire." -ForegroundColor Green
    exit 0
}
Write-Host "      Les comptes MySQL ne correspondent pas à $EnvFile : réalignement." -ForegroundColor Yellow

Write-Host '[2/3] Réalignement (MySQL temporairement sans contrôle des mots de passe)...'
docker rm -f $recovery 2>$null | Out-Null
docker @dc stop back mysql 2>$null | Out-Null
docker @dc run --rm -d --name $recovery --no-deps mysql --skip-grant-tables --skip-networking 2>$null | Out-Null
$recoveryRunning = $true
$failure = $null

try {
    for ($i = 0; $i -lt 60; $i++) {
        Invoke-Sh @('exec', $recovery) "mysql -uroot -e 'SELECT 1' >/dev/null 2>&1" | Out-Null
        if ($LASTEXITCODE -eq 0) { break }
        Start-Sleep -Seconds 2
    }

    $db = (Invoke-Sh @('exec', $recovery) 'printenv MYSQL_DATABASE' | Select-Object -First 1).Trim()
    $databases = Invoke-Sh @('exec', $recovery) "mysql -uroot -N -e 'SHOW DATABASES'" | ForEach-Object { $_.Trim() }
    if ($databases -notcontains $db) {
        Write-Host "      La base MYSQL_DATABASE='$db' n'existe pas dans ce volume. Bases présentes :" -ForegroundColor Red
        $databases | ForEach-Object { Write-Host "        $_" }
        throw "corrigez MYSQL_DATABASE (et DATABASE_URL) dans .env, puis relancez. Rien n'a été modifié."
    }

    Invoke-Sh @('exec', $recovery) @'
mysql -uroot <<SQL
FLUSH PRIVILEGES;
ALTER USER "root"@"localhost" IDENTIFIED BY "$MYSQL_ROOT_PASSWORD";
ALTER USER IF EXISTS "root"@"%" IDENTIFIED BY "$MYSQL_ROOT_PASSWORD";
CREATE USER IF NOT EXISTS "$MYSQL_USER"@"%" IDENTIFIED BY "$MYSQL_PASSWORD";
ALTER USER "$MYSQL_USER"@"%" IDENTIFIED BY "$MYSQL_PASSWORD";
GRANT ALL PRIVILEGES ON \`$MYSQL_DATABASE\`.* TO "$MYSQL_USER"@"%";
FLUSH PRIVILEGES;
SQL
'@
    if ($LASTEXITCODE -ne 0) { throw 'la mise à jour des comptes a échoué.' }
    Write-Host "      Comptes root et MYSQL_USER mis à jour depuis $EnvFile."
}
catch {
    $failure = $_.Exception.Message
}
finally {
    # Quoi qu'il arrive, ne jamais laisser tourner le MySQL sans mots de passe.
    if ($recoveryRunning) {
        Write-Host '[3/3] Redémarrage de mysql et back...'
        docker stop $recovery 2>$null | Out-Null
        docker @dc up -d mysql back 2>$null | Out-Null
    }
}

if ($failure) { Fail $failure }

Wait-Mysql
if (-not (Test-Credentials)) { Fail "les accès de $EnvFile sont toujours refusés (voir : $hint logs mysql)." }
Write-Host "      OK : MySQL utilise maintenant les accès de $EnvFile." -ForegroundColor Green
Write-Host "      Vérifier back : $hint ps   /   $hint logs back --tail 20"
