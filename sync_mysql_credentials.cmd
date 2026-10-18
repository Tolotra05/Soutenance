@echo off
rem Lanceur Windows de sync_mysql_credentials.ps1 (double-clic ou
rem .\sync_mysql_credentials.cmd [fichier compose]).
rem -ExecutionPolicy Bypass : evite le blocage des scripts .ps1 par defaut,
rem pour ce seul lancement, sans modifier la politique du poste.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync_mysql_credentials.ps1" %*
if "%~1"=="" pause
