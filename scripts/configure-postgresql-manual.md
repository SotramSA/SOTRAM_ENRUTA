# Configuración Manual de PostgreSQL para Conexiones Externas

## Si tienes acceso al servidor (por panel web, VNC, etc.):

### 1. Acceder al servidor
- Usa el panel de control de tu proveedor de hosting
- O accede por VNC/consola remota
- O usa cualquier método que tengas disponible

### 2. Editar postgresql.conf
```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
# o
sudo nano /var/lib/postgresql/data/postgresql.conf
```

Buscar y cambiar:
```
# Cambiar de:
listen_addresses = 'localhost'
# A:
listen_addresses = '*'
```

### 3. Editar pg_hba.conf
```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
# o
sudo nano /var/lib/postgresql/data/pg_hba.conf
```

Agregar al final:
```
# Permitir conexiones desde cualquier IP
host    all             all             0.0.0.0/0               md5
host    all             all             ::/0                    md5
```

### 4. Reiniciar PostgreSQL
```bash
sudo systemctl restart postgresql
# o
sudo service postgresql restart
```

### 5. Verificar configuración
```bash
sudo netstat -tlnp | grep 5432
```

Deberías ver algo como:
```
tcp        0      0 0.0.0.0:5432            0.0.0.0:*               LISTEN
```

## Después de configurar:

1. Cambia tu DATABASE_URL de vuelta a:
```
DATABASE_URL="postgresql://sotram:S0tram.2025@190.159.9.80:5432/db_enruta"
```

2. Ejecuta:
```bash
npm run db:test-remote
```
