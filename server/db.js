const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'autotrack.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create all tables
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('manager','employee')),
    email TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Assets table
  CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    asset_code TEXT UNIQUE NOT NULL,
    asset_name TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK(asset_type IN ('Vehicle','Tool','Machine')),
    brand TEXT,
    model TEXT,
    purchase_date TEXT,
    purchase_cost REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'In Use' CHECK(status IN ('In Use','Under Repair','Retired')),
    location TEXT,
    assigned_employee_id TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (assigned_employee_id) REFERENCES employees(id) ON DELETE SET NULL
  );

  -- Asset Technical Details (for vehicles)
  CREATE TABLE IF NOT EXISTS asset_technical_details (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL UNIQUE,
    engine_type TEXT,
    engine_capacity TEXT,
    fuel_type TEXT,
    registration_number TEXT,
    chassis_number TEXT,
    mileage REAL DEFAULT 0,
    service_interval INTEGER DEFAULT 5000,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
  );

  -- Asset Parts
  CREATE TABLE IF NOT EXISTS asset_parts (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    part_name TEXT NOT NULL,
    brand TEXT,
    serial_number TEXT,
    install_date TEXT,
    warranty_end_date TEXT,
    cost REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Replaced','Faulty','Retired')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
  );

  -- Part History (full tracking)
  CREATE TABLE IF NOT EXISTS part_history (
    id TEXT PRIMARY KEY,
    part_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    old_status TEXT,
    new_status TEXT,
    old_values TEXT,
    new_values TEXT,
    performed_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (part_id) REFERENCES asset_parts(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
  );

  -- Maintenance Records
  CREATE TABLE IF NOT EXISTS maintenance_records (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL,
    service_type TEXT NOT NULL,
    service_date TEXT NOT NULL,
    cost REAL DEFAULT 0,
    description TEXT,
    next_service_due TEXT,
    performed_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
  );

  -- Employees
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    employee_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Technician',
    department TEXT,
    join_date TEXT,
    salary_type TEXT DEFAULT 'Monthly' CHECK(salary_type IN ('Monthly','Daily','Hourly')),
    base_salary REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Inactive','On Leave')),
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Salary Structure
  CREATE TABLE IF NOT EXISTS salary_structures (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    basic_salary REAL DEFAULT 0,
    hra REAL DEFAULT 0,
    transport_allowance REAL DEFAULT 0,
    medical_allowance REAL DEFAULT 0,
    other_allowances REAL DEFAULT 0,
    pf_deduction REAL DEFAULT 0,
    tax_deduction REAL DEFAULT 0,
    other_deductions REAL DEFAULT 0,
    overtime_rate REAL DEFAULT 0,
    effective_from TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );

  -- Attendance
  CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Present' CHECK(status IN ('Present','Absent','Half Day','Leave')),
    check_in TEXT,
    check_out TEXT,
    overtime_hours REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE(employee_id, date)
  );

  -- Payroll
  CREATE TABLE IF NOT EXISTS payroll (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    working_days INTEGER DEFAULT 0,
    present_days INTEGER DEFAULT 0,
    overtime_hours REAL DEFAULT 0,
    basic_salary REAL DEFAULT 0,
    total_allowances REAL DEFAULT 0,
    total_deductions REAL DEFAULT 0,
    overtime_pay REAL DEFAULT 0,
    gross_salary REAL DEFAULT 0,
    net_salary REAL DEFAULT 0,
    status TEXT DEFAULT 'Generated' CHECK(status IN ('Generated','Approved','Paid')),
    generated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE(employee_id, month, year)
  );

  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
  CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
  CREATE INDEX IF NOT EXISTS idx_assets_assigned ON assets(assigned_employee_id);
  CREATE INDEX IF NOT EXISTS idx_parts_asset ON asset_parts(asset_id);
  CREATE INDEX IF NOT EXISTS idx_part_history_part ON part_history(part_id);
  CREATE INDEX IF NOT EXISTS idx_part_history_asset ON part_history(asset_id);
  CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON maintenance_records(asset_id);
  CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
  CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
  CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll(employee_id);
  CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(month, year);
`);

module.exports = db;
