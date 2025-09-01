# Configuración de PostgreSQL para Conexiones Remotas

## Pasos para habilitar conexiones externas:

### 1. Acceder al servidor
```bash
ssh sotram@190.159.9.80
```

### 2. Editar postgresql.conf
```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
```

Buscar y modificar:
```
listen_addresses = '*'
port = 5432
```

### 3. Editar pg_hba.conf
```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
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
```

### 5. Verificar que el puerto esté abierto
```bash
sudo netstat -tlnp | grep 5432
```

## Alternativa: Usar SSH Tunnel

Si no puedes modificar la configuración del servidor, puedes usar un túnel SSH:

```bash
ssh -L 5432:localhost:5432 sotram@190.159.9.80
```

Y cambiar la DATABASE_URL a:
```
DATABASE_URL="postgresql://sotram:S0tram.2025@localhost:5432/db_enruta"
```
