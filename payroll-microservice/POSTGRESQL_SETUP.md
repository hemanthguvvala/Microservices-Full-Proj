# PostgreSQL Setup Guide for Payroll Microservice

## ✅ Installation Complete!

PostgreSQL 16 has been successfully installed and configured on your Ubuntu machine.

## 📊 Database Configuration

### Database Details:
- **Database Name**: `payrolldb`
- **Username**: `payroll_user`
- **Password**: `payroll123`
- **Host**: `localhost`
- **Port**: `5432` (default)

### PostgreSQL Service:
```bash
# Check status
sudo systemctl status postgresql

# Start service
sudo systemctl start postgresql

# Stop service
sudo systemctl stop postgresql

# Restart service
sudo systemctl restart postgresql

# Enable auto-start on boot
sudo systemctl enable postgresql
```

## 🔧 Application Configuration

The application is now configured to use PostgreSQL for development:

**File**: `src/main/resources/application.yml`
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/payrolldb
    username: payroll_user
    password: payroll123
    driver-class-name: org.postgresql.Driver
```

## 🗄️ Database Management

### Connect to PostgreSQL:

```bash
# Connect as postgres user (superuser)
sudo -u postgres psql

# Connect to payrolldb
sudo -u postgres psql -d payrolldb

# Connect as payroll_user
psql -U payroll_user -d payrolldb -h localhost
```

### Common PostgreSQL Commands:

```sql
-- List all databases
\l

-- Connect to a database
\c payrolldb

-- List all tables
\dt

-- Describe a table
\d table_name

-- View table data
SELECT * FROM payrolls;

-- Check Flyway migration history
SELECT * FROM flyway_schema_history;

-- Exit psql
\q
```

### Database Backup & Restore:

```bash
# Backup database
pg_dump -U payroll_user -h localhost payrolldb > payroll_backup.sql

# Restore database
psql -U payroll_user -h localhost payrolldb < payroll_backup.sql

# Backup with sudo (as postgres user)
sudo -u postgres pg_dump payrolldb > payroll_backup.sql

# Restore with sudo
sudo -u postgres psql payrolldb < payroll_backup.sql
```

## 🚀 Running the Application

### Start the Application:

```bash
cd /home/hemanth/Documents/LearnFullProductProj/payroll-microservice

# Build
mvn clean install

# Run
mvn spring-boot:run
```

### Flyway Migrations:

The application uses Flyway for database migrations. On startup, it will automatically:
1. Create the schema (tables, indexes, constraints)
2. Insert sample data
3. Track migration history in `flyway_schema_history` table

Migration scripts location: `src/main/resources/db/migration/`
- `V1__Create_payroll_tables.sql` - Creates tables
- `V2__Insert_sample_data.sql` - Inserts sample data

## 🔍 Verify Setup

### 1. Check PostgreSQL is running:
```bash
sudo systemctl status postgresql
```

### 2. Test database connection:
```bash
psql -U payroll_user -d payrolldb -h localhost -c "SELECT version();"
```
Enter password: `payroll123`

### 3. Check if tables exist:
```bash
sudo -u postgres psql -d payrolldb -c "\dt"
```

After running the application once, you should see:
- `payrolls`
- `salary_components`
- `payment_transactions`
- `flyway_schema_history`

## 🛠️ Troubleshooting

### Issue 1: Connection Refused

**Problem**: Application can't connect to PostgreSQL

**Solution**:
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start if not running
sudo systemctl start postgresql

# Check port 5432 is listening
sudo netstat -plnt | grep 5432
```

### Issue 2: Authentication Failed

**Problem**: Password authentication failed for user "payroll_user"

**Solution**:
```bash
# Reset user password
sudo -u postgres psql -c "ALTER USER payroll_user WITH PASSWORD 'payroll123';"

# Check pg_hba.conf allows password authentication
sudo nano /etc/postgresql/16/main/pg_hba.conf
# Ensure this line exists:
# host    all             all             127.0.0.1/32            scram-sha-256

# Restart PostgreSQL after changes
sudo systemctl restart postgresql
```

### Issue 3: Database doesn't exist

**Problem**: FATAL: database "payrolldb" does not exist

**Solution**:
```bash
# Recreate database
sudo -u postgres psql -c "CREATE DATABASE payrolldb;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE payrolldb TO payroll_user;"
sudo -u postgres psql -d payrolldb -c "GRANT ALL ON SCHEMA public TO payroll_user;"
```

### Issue 4: Flyway migration failed

**Problem**: Flyway validation or migration errors

**Solution**:
```bash
# Drop and recreate database (WARNING: This deletes all data!)
sudo -u postgres psql -c "DROP DATABASE IF EXISTS payrolldb;"
sudo -u postgres psql -c "CREATE DATABASE payrolldb;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE payrolldb TO payroll_user;"
sudo -u postgres psql -d payrolldb -c "GRANT ALL ON SCHEMA public TO payroll_user;"

# Or manually clear Flyway history
sudo -u postgres psql -d payrolldb -c "DELETE FROM flyway_schema_history;"
```

## 🔐 Security Considerations

### For Production:

1. **Change default password**:
```bash
sudo -u postgres psql -c "ALTER USER payroll_user WITH PASSWORD 'your-strong-password';"
```

2. **Update application-prod.yml** with secure credentials

3. **Use environment variables**:
```bash
export DB_USERNAME=payroll_user
export DB_PASSWORD=your-strong-password
```

Update `application-prod.yml`:
```yaml
spring:
  datasource:
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
```

4. **Restrict PostgreSQL connections**:
Edit `/etc/postgresql/16/main/pg_hba.conf` to allow only specific IPs

5. **Enable SSL**:
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/payrolldb?ssl=true&sslmode=require
```

## 📊 Monitoring

### Check database size:
```sql
SELECT pg_size_pretty(pg_database_size('payrolldb'));
```

### Active connections:
```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'payrolldb';
```

### Table sizes:
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/16/)
- [Flyway Documentation](https://flywaydb.org/documentation/)
- [Spring Boot Data JPA](https://spring.io/guides/gs/accessing-data-jpa/)

---

**Created**: February 5, 2026  
**PostgreSQL Version**: 16  
**Database**: payrolldb  
**User**: payroll_user
