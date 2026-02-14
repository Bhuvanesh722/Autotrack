const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

function seed() {
    console.log('🌱 Seeding database...');

    // Check if already seeded
    const existingUser = db.prepare('SELECT id FROM users LIMIT 1').get();
    if (existingUser) {
        console.log('Database already seeded. Skipping.');
        return;
    }

    // Seed Users
    const managerId = uuidv4();
    const employeeUserId = uuidv4();
    const managerHash = bcrypt.hashSync('manager123', 10);
    const employeeHash = bcrypt.hashSync('employee123', 10);

    db.prepare('INSERT INTO users (id, username, password, full_name, role, email) VALUES (?,?,?,?,?,?)').run(
        managerId, 'manager', managerHash, 'Rajesh Kumar', 'manager', 'manager@autotrack.com'
    );
    db.prepare('INSERT INTO users (id, username, password, full_name, role, email) VALUES (?,?,?,?,?,?)').run(
        employeeUserId, 'employee', employeeHash, 'Suresh Patel', 'employee', 'employee@autotrack.com'
    );

    // Seed Employees
    const employees = [
        { id: uuidv4(), employee_id: 'EMP001', name: 'Amit Singh', role: 'Mechanic', department: 'Service', join_date: '2023-01-15', salary_type: 'Monthly', base_salary: 25000, status: 'Active', phone: '9876543210' },
        { id: uuidv4(), employee_id: 'EMP002', name: 'Vikram Joshi', role: 'Technician', department: 'Maintenance', join_date: '2023-03-20', salary_type: 'Monthly', base_salary: 22000, status: 'Active', phone: '9876543211' },
        { id: uuidv4(), employee_id: 'EMP003', name: 'Ravi Verma', role: 'Driver', department: 'Operations', join_date: '2023-06-10', salary_type: 'Monthly', base_salary: 18000, status: 'Active', phone: '9876543212' },
        { id: uuidv4(), employee_id: 'EMP004', name: 'Sunita Devi', role: 'Supervisor', department: 'Operations', join_date: '2022-11-01', salary_type: 'Monthly', base_salary: 30000, status: 'Active', phone: '9876543213' },
        { id: uuidv4(), employee_id: 'EMP005', name: 'Mohan Lal', role: 'Helper', department: 'Service', join_date: '2024-01-05', salary_type: 'Daily', base_salary: 800, status: 'Active', phone: '9876543214' },
        { id: uuidv4(), employee_id: 'EMP006', name: 'Kiran Rao', role: 'Electrician', department: 'Maintenance', join_date: '2023-09-15', salary_type: 'Monthly', base_salary: 20000, status: 'Inactive', phone: '9876543215' },
    ];

    const empStmt = db.prepare('INSERT INTO employees (id, employee_id, name, role, department, join_date, salary_type, base_salary, status, phone) VALUES (?,?,?,?,?,?,?,?,?,?)');
    for (const e of employees) {
        empStmt.run(e.id, e.employee_id, e.name, e.role, e.department, e.join_date, e.salary_type, e.base_salary, e.status, e.phone);
    }

    // Seed salary structures for monthly employees
    const salaryStmt = db.prepare('INSERT INTO salary_structures (id, employee_id, basic_salary, hra, transport_allowance, medical_allowance, other_allowances, pf_deduction, tax_deduction, other_deductions, overtime_rate, effective_from) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
    for (const e of employees) {
        if (e.salary_type === 'Monthly') {
            salaryStmt.run(
                uuidv4(), e.id,
                e.base_salary,
                Math.round(e.base_salary * 0.2),
                1500, 1000, 500,
                Math.round(e.base_salary * 0.12),
                Math.round(e.base_salary * 0.05),
                0,
                Math.round(e.base_salary / 26 / 8 * 1.5),
                '2024-01-01'
            );
        }
    }

    // Seed Assets
    const assets = [
        { id: uuidv4(), asset_code: 'VH-001', asset_name: 'Tata Ace Gold', asset_type: 'Vehicle', brand: 'Tata', model: 'Ace Gold', purchase_date: '2022-06-15', purchase_cost: 650000, status: 'In Use', location: 'Main Yard', assigned_employee_id: employees[2].id },
        { id: uuidv4(), asset_code: 'VH-002', asset_name: 'Mahindra Bolero Pickup', asset_type: 'Vehicle', brand: 'Mahindra', model: 'Bolero Pickup', purchase_date: '2023-01-10', purchase_cost: 850000, status: 'In Use', location: 'Main Yard', assigned_employee_id: null },
        { id: uuidv4(), asset_code: 'VH-003', asset_name: 'Eicher Pro 2049', asset_type: 'Vehicle', brand: 'Eicher', model: 'Pro 2049', purchase_date: '2021-03-20', purchase_cost: 1200000, status: 'Under Repair', location: 'Workshop', assigned_employee_id: employees[2].id },
        { id: uuidv4(), asset_code: 'MC-001', asset_name: 'Hydraulic Lift', asset_type: 'Machine', brand: 'ATS ELGI', model: 'HydroLift 4T', purchase_date: '2022-09-01', purchase_cost: 180000, status: 'In Use', location: 'Workshop', assigned_employee_id: employees[0].id },
        { id: uuidv4(), asset_code: 'MC-002', asset_name: 'Wheel Alignment Machine', asset_type: 'Machine', brand: 'Manatec', model: 'WA-3D', purchase_date: '2023-05-15', purchase_cost: 350000, status: 'In Use', location: 'Workshop', assigned_employee_id: employees[1].id },
        { id: uuidv4(), asset_code: 'TL-001', asset_name: 'Impact Wrench Set', asset_type: 'Tool', brand: 'Bosch', model: 'GDS 18V-1050', purchase_date: '2023-07-20', purchase_cost: 25000, status: 'In Use', location: 'Tool Room', assigned_employee_id: employees[0].id },
        { id: uuidv4(), asset_code: 'TL-002', asset_name: 'Diagnostic Scanner', asset_type: 'Tool', brand: 'Autel', model: 'MaxiSys MS906', purchase_date: '2024-01-10', purchase_cost: 85000, status: 'In Use', location: 'Workshop', assigned_employee_id: employees[1].id },
        { id: uuidv4(), asset_code: 'VH-004', asset_name: 'Ashok Leyland Dost', asset_type: 'Vehicle', brand: 'Ashok Leyland', model: 'Dost Plus', purchase_date: '2020-11-05', purchase_cost: 550000, status: 'Retired', location: 'Scrapyard', assigned_employee_id: null },
    ];

    const assetStmt = db.prepare('INSERT INTO assets (id, asset_code, asset_name, asset_type, brand, model, purchase_date, purchase_cost, status, location, assigned_employee_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    for (const a of assets) {
        assetStmt.run(a.id, a.asset_code, a.asset_name, a.asset_type, a.brand, a.model, a.purchase_date, a.purchase_cost, a.status, a.location, a.assigned_employee_id);
    }

    // Seed Technical Details for vehicles
    const techStmt = db.prepare('INSERT INTO asset_technical_details (id, asset_id, engine_type, engine_capacity, fuel_type, registration_number, chassis_number, mileage, service_interval) VALUES (?,?,?,?,?,?,?,?,?)');
    techStmt.run(uuidv4(), assets[0].id, 'Inline 2-Cylinder', '798cc', 'Diesel', 'MH-12-AB-1234', 'MALA851CCAM123456', 45000, 10000);
    techStmt.run(uuidv4(), assets[1].id, 'Inline 4-Cylinder', '2523cc', 'Diesel', 'MH-12-CD-5678', 'MALB152CDBN789012', 32000, 15000);
    techStmt.run(uuidv4(), assets[2].id, 'Inline 4-Cylinder', '3298cc', 'Diesel', 'MH-12-EF-9012', 'MALC653EFCO345678', 120000, 20000);
    techStmt.run(uuidv4(), assets[7].id, 'Inline 3-Cylinder', '1478cc', 'Diesel', 'MH-12-GH-3456', 'MALD454GHDP567890', 210000, 10000);

    // Seed Asset Parts
    const parts = [
        { id: uuidv4(), asset_id: assets[0].id, part_name: 'Engine Oil Filter', brand: 'Bosch', serial_number: 'BOF-2023-001', install_date: '2024-06-15', warranty_end_date: '2025-06-15', cost: 450, status: 'Active' },
        { id: uuidv4(), asset_id: assets[0].id, part_name: 'Air Filter', brand: 'Mann', serial_number: 'MAF-2024-012', install_date: '2024-08-20', warranty_end_date: '2025-08-20', cost: 800, status: 'Active' },
        { id: uuidv4(), asset_id: assets[0].id, part_name: 'Front Brake Pads', brand: 'Brembo', serial_number: 'BFB-2024-045', install_date: '2024-03-10', warranty_end_date: '2025-03-10', cost: 2500, status: 'Active' },
        { id: uuidv4(), asset_id: assets[0].id, part_name: 'Battery', brand: 'Amaron', serial_number: 'AMR-2023-089', install_date: '2023-12-01', warranty_end_date: '2025-12-01', cost: 5500, status: 'Active' },
        { id: uuidv4(), asset_id: assets[1].id, part_name: 'Clutch Plate', brand: 'Valeo', serial_number: 'VCP-2024-023', install_date: '2024-05-15', warranty_end_date: '2025-05-15', cost: 3200, status: 'Active' },
        { id: uuidv4(), asset_id: assets[1].id, part_name: 'Radiator', brand: 'Delphi', serial_number: 'DRD-2024-067', install_date: '2024-07-10', warranty_end_date: '2026-07-10', cost: 8500, status: 'Active' },
        { id: uuidv4(), asset_id: assets[2].id, part_name: 'Turbocharger', brand: 'Garrett', serial_number: 'GTB-2023-034', install_date: '2023-09-20', warranty_end_date: '2024-09-20', cost: 35000, status: 'Faulty' },
        { id: uuidv4(), asset_id: assets[2].id, part_name: 'Fuel Injector Set', brand: 'Bosch', serial_number: 'BFI-2024-056', install_date: '2024-02-15', warranty_end_date: '2025-02-15', cost: 12000, status: 'Active' },
        { id: uuidv4(), asset_id: assets[3].id, part_name: 'Hydraulic Cylinder', brand: 'Parker', serial_number: 'PHC-2023-012', install_date: '2023-09-01', warranty_end_date: '2025-09-01', cost: 15000, status: 'Active' },
        { id: uuidv4(), asset_id: assets[3].id, part_name: 'Hydraulic Pump', brand: 'Rexroth', serial_number: 'RHP-2023-045', install_date: '2023-09-01', warranty_end_date: '2025-09-01', cost: 22000, status: 'Active' },
    ];

    const partStmt = db.prepare('INSERT INTO asset_parts (id, asset_id, part_name, brand, serial_number, install_date, warranty_end_date, cost, status) VALUES (?,?,?,?,?,?,?,?,?)');
    const historyStmt = db.prepare('INSERT INTO part_history (id, part_id, asset_id, action, description, old_status, new_status, performed_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)');

    for (const p of parts) {
        partStmt.run(p.id, p.asset_id, p.part_name, p.brand, p.serial_number, p.install_date, p.warranty_end_date, p.cost, p.status);
        // Add install history entry
        historyStmt.run(uuidv4(), p.id, p.asset_id, 'Installed', `${p.part_name} (${p.brand}) installed. Serial: ${p.serial_number}`, null, 'Active', 'System', p.install_date);
    }

    // Add some replacement history for the turbocharger
    const turbo = parts[6];
    historyStmt.run(uuidv4(), turbo.id, turbo.asset_id, 'Inspection', 'Turbocharger showing reduced boost pressure. Scheduled for inspection.', 'Active', 'Active', 'Vikram Joshi', '2024-06-15');
    historyStmt.run(uuidv4(), turbo.id, turbo.asset_id, 'Status Changed', 'Turbocharger confirmed faulty. Shaft play detected, wastegate stuck.', 'Active', 'Faulty', 'Vikram Joshi', '2024-07-01');

    // Add battery replacement history
    const oldBatteryId = uuidv4();
    historyStmt.run(uuidv4(), parts[3].id, parts[3].asset_id, 'Replaced Previous', 'Old Exide battery (Serial: EXD-2021-034) replaced due to low cranking power. New Amaron battery installed.', 'Replaced', 'Active', 'Amit Singh', '2023-12-01');

    // Seed Maintenance Records
    const maintRecords = [
        { asset_id: assets[0].id, service_type: 'Oil Change', service_date: '2024-06-15', cost: 2500, description: 'Regular oil change with filter replacement', next_service_due: '2024-12-15' },
        { asset_id: assets[0].id, service_type: 'Brake Service', service_date: '2024-03-10', cost: 4500, description: 'Front brake pad replacement and disc inspection', next_service_due: '2025-03-10' },
        { asset_id: assets[0].id, service_type: 'General Service', service_date: '2024-08-20', cost: 6000, description: 'Complete general service - oil, filters, coolant top-up', next_service_due: '2025-02-20' },
        { asset_id: assets[1].id, service_type: 'Clutch Replacement', service_date: '2024-05-15', cost: 8500, description: 'Clutch plate and pressure plate replacement', next_service_due: '2025-11-15' },
        { asset_id: assets[1].id, service_type: 'Oil Change', service_date: '2024-09-10', cost: 3000, description: 'Regular oil change', next_service_due: '2025-03-10' },
        { asset_id: assets[2].id, service_type: 'Engine Overhaul', service_date: '2024-07-01', cost: 65000, description: 'Partial engine overhaul - turbo issue, injectors serviced', next_service_due: '2025-07-01' },
        { asset_id: assets[3].id, service_type: 'Hydraulic Service', service_date: '2024-04-15', cost: 5000, description: 'Hydraulic fluid change and seal inspection', next_service_due: '2025-04-15' },
        { asset_id: assets[4].id, service_type: 'Calibration', service_date: '2024-10-01', cost: 12000, description: 'Annual calibration and software update', next_service_due: '2025-10-01' },
    ];

    const maintStmt = db.prepare('INSERT INTO maintenance_records (id, asset_id, service_type, service_date, cost, description, next_service_due) VALUES (?,?,?,?,?,?,?)');
    for (const m of maintRecords) {
        maintStmt.run(uuidv4(), m.asset_id, m.service_type, m.service_date, m.cost, m.description, m.next_service_due);
    }

    // Seed Attendance (last 30 days for active employees)
    const attStmt = db.prepare('INSERT INTO attendance (id, employee_id, date, status, check_in, check_out, overtime_hours) VALUES (?,?,?,?,?,?,?)');
    const today = new Date();
    for (const e of employees) {
        if (e.status !== 'Active') continue;
        for (let i = 30; i >= 1; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            if (d.getDay() === 0) continue; // Skip Sundays
            const dateStr = d.toISOString().split('T')[0];
            const rand = Math.random();
            let status = 'Present';
            let overtime = 0;
            if (rand < 0.05) status = 'Absent';
            else if (rand < 0.1) status = 'Half Day';
            else if (rand < 0.15) status = 'Leave';
            if (status === 'Present' && Math.random() < 0.3) {
                overtime = Math.round(Math.random() * 3 * 10) / 10;
            }
            attStmt.run(uuidv4(), e.id, dateStr, status, status !== 'Absent' ? '09:00' : null, status !== 'Absent' ? '18:00' : null, overtime);
        }
    }

    console.log('✅ Seed complete!');
    console.log('   Manager login: manager / manager123');
    console.log('   Employee login: employee / employee123');
}

seed();
