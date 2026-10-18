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
    .\sync_mysql_credentials.cmd                       # fichier compose détecté
    .\sync_mysql_credentials.cmd docker-compose.yml    # ou imposé
  Sans argument, le fichier compose est celui qui a créé le conteneur mysql en
  place (dev et prod partagent le même nom de projet : viser le mauvais
  recréerait mysql avec l'autre configuration) ; à défaut docker-compose.prod.yml.
#>
param([string]$File)

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

if (-not (Test-Path .env)) { Fail ".env introuvable dans $PSScriptRoot." }

if (-not $File) {
    # Fichier compose du conteneur mysql existant de ce projet.
    $project = docker compose -f docker-compose.prod.yml config 2>$null |
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
$dc = @('compose', '-f', $File)
Write-Host "Fichier compose : $File"

function Wait-Mysql {
    for ($i = 0; $i -lt 60; $i++) {
        Invoke-Sh ($dc + @('exec', '-T', 'mysql')) 'mysqladmin ping -h 127.0.0.1 --silent >/dev/null 2>&1' | Out-Null
        if ($LASTEXITCODE -eq 0) { return }
        Start-Sleep -Seconds 2
    }
    Fail "MySQL ne répond pas (voir : docker compose -f $File logs mysql)."
}

function Test-Credentials {
    Invoke-Sh ($dc + @('exec', '-T', 'mysql')) @'
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT 1" >/dev/null 2>&1 &&
mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT 1" >/dev/null 2>&1
'@ | Out-Null
    return ($LASTEXITCODE -eq 0)
}

Write-Host '[1/3] Vérification des accès du .env...'
docker @dc up -d mysql 2>$null | Out-Null   # (re)crée mysql avec les valeurs actuelles du .env
Wait-Mysql
if (Test-Credentials) {
    Write-Host '      OK : root et MYSQL_USER acceptent déjà les mots de passe du .env. Rien à faire.' -ForegroundColor Green
    exit 0
}
Write-Host '      Les comptes MySQL ne correspondent pas au .env : réalignement.' -ForegroundColor Yellow

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
    Write-Host '      Comptes root et MYSQL_USER mis à jour depuis .env.'
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
if (-not (Test-Credentials)) { Fail "les accès du .env sont toujours refusés (voir : docker compose -f $File logs mysql)." }
Write-Host '      OK : MySQL utilise maintenant les accès du .env.' -ForegroundColor Green
Write-Host "      Vérifier back : docker compose -f $File ps   /   docker compose -f $File logs back --tail 20"
