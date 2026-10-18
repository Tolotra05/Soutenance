@echo off
rem Lanceur Windows de change_ip.ps1 (double-clic ou .\change_ip.cmd [IP]).
rem -ExecutionPolicy Bypass : evite le blocage des scripts .ps1 par defaut,
rem pour ce seul lancement, sans modifier la politique du poste.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0change_ip.ps1" %*
if "%~1"=="" pause
