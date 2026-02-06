# DBeaver Setup Guide for Payroll PostgreSQL Database

## 🎯 DBeaver Installation Complete!

DBeaver Community Edition has been installed on your system.

## 🚀 Quick Start

### 1. Launch DBeaver

```bash
# From terminal
dbeaver

# Or search for "DBeaver" in your applications menu
```

### 2. Create PostgreSQL Connection

#### Step-by-Step Setup:

1. **Open DBeaver** and you'll see the main window

2. **Create New Connection:**
   - Click on "Database" → "New Database Connection" (or press `Ctrl+Shift+N`)
   - Or click the plug icon (🔌) in the toolbar

3. **Select PostgreSQL:**
   - In the connection wizard, select **PostgreSQL**
   - Click **Next**

4. **Enter Connection Details:**

   ```
   Host:          localhost
   Port:          5432
   Database:      payrolldb
   Username:      payroll_user
   Password:      payroll123
   ```

   **Exact Configuration:**
   - **Main Tab:**
     - Connection name: `Payroll DB (Dev)`
     - Host: `localhost`
     - Port: `5432`
     - Database: `payrolldb`
     - Username: `payroll_user`
     - Password: `payroll123`
     - ☑️ Check "Save password"

5. **Download PostgreSQL Driver** (if prompted):
   - Click "Download" when DBeaver asks to download PostgreSQL driver
   - Wait for the download to complete

6. **Test Connection:**
   - Click **"Test Connection..."** button
   - Should show: ✅ "Connected"
   - If successful, click **Finish**

## 📊 Exploring Your Database

### After Connecting:

1. **Navigate Database Tree:**
   ```
   Payroll DB (Dev)
   └── Databases
       └── payrolldb
           └── Schemas
               └── public
                   ├── Tables
                   │   ├── payrolls
                   │   ├── salary_components
                   │   ├── payment_transactions
                   │   └── flyway_schema_history
                   ├── Views
                   ├── Indexes
                   └── Sequences
   ```

2. **View Table Data:**
   - Right-click on any table (e.g., `payrolls`)
   - Select "View Data" or press `F3`
   - Browse the sample data

3. **View Table Structure:**
   - Double-click on a table
   - See columns, data types, constraints, indexes

4. **Run SQL Queries:**
   - Click "SQL Editor" icon or press `Ctrl+]`
   - Type your SQL query:
     ```sql
     SELECT * FROM payrolls;
     SELECT * FROM salary_components;
     SELECT * FROM payment_transactions;
     ```
   - Press `Ctrl+Enter` to execute

## 🎨 DBeaver Features

### Useful Features:

1. **ER Diagram:**
   - Right-click on `public` schema
   - Select "View Diagram"
   - See relationships between tables

2. **Data Export:**
   - Right-click on table → "Export Data"
   - Choose format (CSV, JSON, SQL, etc.)

3. **SQL Editor:**
   - Syntax highlighting
   - Auto-completion
   - Query history

4. **Database Navigator:**
   - Browse all database objects
   - Filter by name
   - Search across schema

5. **Table Editor:**
   - Edit data directly in grid view
   - Add/delete rows
   - Commit or rollback changes

## 📝 Sample Queries to Try

### 1. View All Payrolls with Employee Info
```sql
SELECT 
    id,
    employee_id,
    basic_salary,
    net_salary,
    pay_period_start,
    pay_period_end,
    status
FROM payrolls
ORDER BY created_at DESC;
```

### 2. Calculate Total Payroll by Status
```sql
SELECT 
    status,
    COUNT(*) as count,
    SUM(net_salary) as total_amount
FROM payrolls
GROUP BY status;
```

### 3. View Salary Components Breakdown
```sql
SELECT 
    p.id as payroll_id,
    p.employee_id,
    sc.component_name,
    sc.component_type,
    sc.amount,
    sc.is_taxable
FROM payrolls p
LEFT JOIN salary_components sc ON p.id = sc.payroll_id
ORDER BY p.id, sc.component_type;
```

### 4. Check Flyway Migration History
```sql
SELECT 
    installed_rank,
    version,
    description,
    script,
    installed_on,
    success
FROM flyway_schema_history
ORDER BY installed_rank;
```

### 5. Find Pending Payrolls
```sql
SELECT 
    employee_id,
    basic_salary,
    net_salary,
    pay_period_start,
    pay_period_end
FROM payrolls
WHERE status = 'PENDING'
ORDER BY pay_period_start DESC;
```

## 🔧 Troubleshooting

### Issue 1: Driver Download Fails

**Solution:**
- Go to "Database" → "Driver Manager"
- Find "PostgreSQL"
- Click "Download/Update"
- Select latest driver version

### Issue 2: Connection Refused

**Solution:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Start if needed
sudo systemctl start postgresql
```

### Issue 3: Authentication Failed

**Solution:**
- Double-check username: `payroll_user`
- Double-check password: `payroll123`
- Verify user exists:
  ```bash
  sudo -u postgres psql -c "\du"
  ```

### Issue 4: Database Not Found

**Solution:**
```bash
# Verify database exists
sudo -u postgres psql -c "\l" | grep payrolldb

# If not exists, create it
sudo -u postgres psql -c "CREATE DATABASE payrolldb;"
```

## ⚙️ DBeaver Configuration

### Recommended Settings:

1. **SQL Editor:**
   - Preferences → Editors → SQL Editor
   - ☑️ Enable auto-completion
   - ☑️ Enable syntax highlighting

2. **Data Format:**
   - Preferences → Data Formats
   - Set date format: `yyyy-MM-dd`
   - Set timestamp format: `yyyy-MM-dd HH:mm:ss`

3. **Connections:**
   - Preferences → Connections
   - ☑️ Auto-commit by default (for testing)
   - Set query timeout: 30 seconds

## 🎯 Quick Actions

### Common Operations:

| Action | Shortcut | Menu |
|--------|----------|------|
| New Connection | `Ctrl+Shift+N` | Database → New Connection |
| SQL Editor | `Ctrl+]` | SQL Editor icon |
| Execute Query | `Ctrl+Enter` | Execute icon |
| View Data | `F3` | Right-click → View Data |
| Refresh | `F5` | Right-click → Refresh |
| Commit | `Ctrl+Alt+End` | Transaction → Commit |
| Rollback | `Ctrl+Alt+Shift+End` | Transaction → Rollback |

## 📚 Resources

- [DBeaver Documentation](https://dbeaver.com/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/16/)
- [SQL Tutorial](https://www.postgresql.org/docs/16/tutorial.html)

## ✅ Verification Checklist

After setup, verify:

- [ ] DBeaver connects successfully to `payrolldb`
- [ ] You can see all 4 tables (payrolls, salary_components, payment_transactions, flyway_schema_history)
- [ ] You can view data in the `payrolls` table (should have 4 sample records)
- [ ] You can run SQL queries successfully
- [ ] ER diagram shows table relationships

## 🎨 Alternative: Command Line Verification

If you prefer CLI:

```bash
# Connect to database
PGPASSWORD=payroll123 psql -U payroll_user -h localhost -d payrolldb

# Inside psql:
\dt                    # List tables
\d payrolls           # Describe payrolls table
SELECT COUNT(*) FROM payrolls;  # Count records
SELECT * FROM payrolls LIMIT 5; # View data
\q                    # Exit
```

---

**Next Steps:**
1. Launch DBeaver: `dbeaver`
2. Create connection with the details above
3. Explore your database!
4. Run the sample queries

Enjoy your database management! 🚀
