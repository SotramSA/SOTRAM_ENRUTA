# Script completo para iniciar la aplicacion con base de datos local
Write-Host "Iniciando aplicacion con base de datos local..." -ForegroundColor Green

# 1. Verificar si el tunel SSH esta activo
Write-Host "Verificando conexion a la base de datos..." -ForegroundColor Yellow
$connection = Test-NetConnection -ComputerName "localhost" -Port 5432 -WarningAction SilentlyContinue

if (-not $connection.TcpTestSucceeded) {
    Write-Host "No hay conexion al puerto 5432. Estableciendo tunel SSH..." -ForegroundColor Yellow
    
    # Establecer tunel SSH
    $SERVER_IP = "190.159.9.80"
    $USERNAME = "sotram"
    $LOCAL_PORT = "5432"
    $REMOTE_PORT = "5432"
    
    Write-Host "Estableciendo tunel SSH..." -ForegroundColor Cyan
    $tunnelString = "$LOCAL_PORT`:localhost:$REMOTE_PORT"
    Start-Process -FilePath "ssh" -ArgumentList "-L", $tunnelString, "$USERNAME@$SERVER_IP", "-N" -WindowStyle Hidden
    
    # Esperar a que se establezca la conexion
    Start-Sleep -Seconds 5
    
    # Verificar nuevamente
    $connection = Test-NetConnection -ComputerName "localhost" -Port 5432 -WarningAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "Tunel SSH establecido correctamente" -ForegroundColor Green
    } else {
        Write-Host "Error al establecer el tunel SSH" -ForegroundColor Red
        Write-Host "Verifica que tengas acceso SSH al servidor" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "Conexion a la base de datos ya esta activa" -ForegroundColor Green
}

# 2. Probar conexion a la base de datos
Write-Host "Probando conexion a la base de datos..." -ForegroundColor Yellow
node scripts/test-local-connection.js

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error en la conexion a la base de datos" -ForegroundColor Red
    Write-Host "Verifica la configuracion de PostgreSQL en el servidor" -ForegroundColor Yellow
    exit 1
}

# 3. Generar cliente Prisma
Write-Host "Generando cliente Prisma..." -ForegroundColor Yellow
npx prisma generate

# 4. Iniciar la aplicacion
Write-Host "Iniciando aplicacion Next.js..." -ForegroundColor Green
npm run dev
