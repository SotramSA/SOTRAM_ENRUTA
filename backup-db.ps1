# Script para hacer backup de la base de datos
# Ejecutar antes de cualquier migración peligrosa

$env:DATABASE_URL = Get-Content .env | Where-Object { $_ -match "DATABASE_URL" } | ForEach-Object { $_.Split("=")[1] }

Write-Host "Creando backup de la base de datos..."
$fecha = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backup_$fecha.sql"

# Usar pg_dump para crear backup
pg_dump $env:DATABASE_URL > $backupFile

Write-Host "Backup creado: $backupFile"
