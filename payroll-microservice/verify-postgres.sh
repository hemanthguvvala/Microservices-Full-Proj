#!/bin/bash

echo "==================================="
echo "PostgreSQL Setup Verification"
echo "==================================="
echo ""

# Check PostgreSQL service
echo "1. Checking PostgreSQL service status..."
if sudo systemctl is-active --quiet postgresql; then
    echo "   ✅ PostgreSQL is running"
else
    echo "   ❌ PostgreSQL is not running"
    echo "   Run: sudo systemctl start postgresql"
    exit 1
fi
echo ""

# Check if database exists
echo "2. Checking if payrolldb exists..."
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw payrolldb; then
    echo "   ✅ Database 'payrolldb' exists"
else
    echo "   ❌ Database 'payrolldb' not found"
    exit 1
fi
echo ""

# Check connection
echo "3. Testing database connection..."
if PGPASSWORD=payroll123 psql -U payroll_user -h localhost -d payrolldb -c "SELECT 1;" > /dev/null 2>&1; then
    echo "   ✅ Connection successful"
else
    echo "   ❌ Connection failed"
    echo "   Check username/password"
    exit 1
fi
echo ""

# Check tables
echo "4. Checking database tables..."
TABLE_COUNT=$(sudo -u postgres psql -d payrolldb -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "   ✅ Found $TABLE_COUNT tables"
    echo ""
    echo "   Tables in payrolldb:"
    sudo -u postgres psql -d payrolldb -c "\dt" 2>/dev/null | grep "public" | awk '{print "      - " $3}'
else
    echo "   ⚠️  No tables found yet (Run the application to create tables)"
fi
echo ""

# Database info
echo "5. Database Information:"
echo "   - Host: localhost"
echo "   - Port: 5432"
echo "   - Database: payrolldb"
echo "   - Username: payroll_user"
echo "   - Password: payroll123"
echo ""

# Quick commands
echo "==================================="
echo "Quick Reference Commands:"
echo "==================================="
echo "Connect to DB:"
echo "  PGPASSWORD=payroll123 psql -U payroll_user -h localhost -d payrolldb"
echo ""
echo "Run application:"
echo "  cd /home/hemanth/Documents/LearnFullProductProj/payroll-microservice"
echo "  mvn spring-boot:run"
echo ""
echo "View logs:"
echo "  tail -f /var/log/postgresql/postgresql-16-main.log"
echo ""
echo "==================================="
