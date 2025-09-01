# Script para establecer tunel SSH a la base de datos PostgreSQL
# Ejecutar este script antes de iniciar la aplicacion

Write-Host "Estableciendo tunel SSH a la base de datos..." -ForegroundColor Green

# Parametros de conexion
$SERVER_IP = "190.159.9.80"
$USERNAME = "sotram"
$LOCAL_PORT = "5432"
$REMOTE_PORT = "5432"

# Verificar si ya existe un proceso SSH en el puerto
$existingProcess = Get-NetTCPConnection -LocalPort $LOCAL_PORT -ErrorAction SilentlyContinue
if ($existingProcess) {
    Write-Host "Ya existe una conexion en el puerto $LOCAL_PORT" -ForegroundColor Yellow
    Write-Host "Deteniendo conexion existente..." -ForegroundColor Yellow
    Stop-Process -Id $existingProcess.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Establecer tunel SSH
Write-Host "Iniciando tunel SSH..." -ForegroundColor Green
Write-Host "Puerto local: $LOCAL_PORT -> Servidor: $SERVER_IP:$REMOTE_PORT" -ForegroundColor Cyan

# Iniciar SSH en background
$tunnelString = "$LOCAL_PORT`:localhost:$REMOTE_PORT"
Start-Process -FilePath "ssh" -ArgumentList "-L", $tunnelString, "$USERNAME@$SERVER_IP", "-N" -WindowStyle Hidden

# Esperar un momento para que se establezca la conexion
Start-Sleep -Seconds 3

# Verificar si el tunel se establecio correctamente
try {
    $connection = Test-NetConnection -ComputerName "localhost" -Port $LOCAL_PORT -WarningAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "Tunel SSH establecido correctamente" -ForegroundColor Green
        Write-Host "Puedes ahora ejecutar tu aplicacion" -ForegroundColor Green
        Write-Host "DATABASE_URL: postgresql://sotram:S0tram.2025@localhost:5432/db_enruta" -ForegroundColor Cyan
    } else {
        Write-Host "Error al establecer el tunel SSH" -ForegroundColor Red
    }
} catch {
    Write-Host "Error al verificar la conexion: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Para detener el tunel, ejecuta: Get-Process ssh | Stop-Process" -ForegroundColor Yellow
