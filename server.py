import http.server
import socketserver
import json
import sqlite3
import os
from datetime import datetime
from urllib.parse import urlparse, parse_qs

PORT = int(os.environ.get("PORT", 8000))
DB_FILE = "fleet_management.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        customer TEXT,
        date TEXT,
        cargo TEXT,
        shipper TEXT,
        origin TEXT,
        time TEXT,
        destination TEXT,
        truckType TEXT,
        price REAL,
        status TEXT,
        driverName TEXT,
        truckNo TEXT,
        subconName TEXT,
        subconTruckNo TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        bookingId TEXT,
        customer TEXT,
        origin TEXT,
        destination TEXT,
        type TEXT,
        driverId TEXT,
        driverName TEXT,
        truckNo TEXT,
        tripAllowance REAL,
        subconId TEXT,
        subconName TEXT,
        subconCost REAL,
        status TEXT,
        fuelExpense REAL,
        tollExpense REAL,
        otherExpense REAL,
        closeNote TEXT,
        lastLocation TEXT,
        billingStatus TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        customer TEXT,
        date TEXT,
        dueDate TEXT,
        subtotal REAL,
        vat REAL,
        withholding REAL,
        total REAL,
        status TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS invoice_items (
        invoiceId TEXT,
        bookingId TEXT,
        jobId TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        invoiceId TEXT,
        customer TEXT,
        date TEXT,
        subtotal REAL,
        vat REAL,
        withholding REAL,
        total REAL,
        paymentMethod TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trucks (
        plateNo TEXT PRIMARY KEY,
        type TEXT,
        ownerType TEXT,
        driverName TEXT,
        subconName TEXT,
        repairStatus TEXT DEFAULT ''
    )
    """)
    # Migrate: add repairStatus column if not exists
    try:
        cursor.execute("ALTER TABLE trucks ADD COLUMN repairStatus TEXT DEFAULT ''")
    except Exception:
        pass

    # Migrate: add photo/note columns to jobs if not exists
    for col, definition in [
        ("openPhoto", "TEXT DEFAULT ''"),
        ("closePhoto", "TEXT DEFAULT ''"),
        ("openNote",  "TEXT DEFAULT ''"),
    ]:
        try:
            cursor.execute(f"ALTER TABLE jobs ADD COLUMN {col} {definition}")
        except Exception:
            pass

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT,
        contact TEXT,
        phone TEXT,
        address TEXT,
        taxId TEXT,
        creditDays INTEGER
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT,
        license TEXT,
        baseSalary REAL,
        tripAllowanceRate REAL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS route_masters (
        id TEXT PRIMARY KEY,
        customer TEXT,
        shipper TEXT,
        origin TEXT,
        destination TEXT,
        truckType TEXT,
        price REAL,
        note TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sequence_control (
        prefix       TEXT PRIMARY KEY,
        year         INTEGER,
        last_seq     INTEGER,
        reset_policy TEXT
    )
    """)
    # Seed sequence rows if not exist
    for prefix, policy in [("BK", "yearly"), ("JOB", "yearly"), ("INV", "monthly"), ("RCT", "monthly")]:
        cursor.execute("INSERT OR IGNORE INTO sequence_control VALUES (?,?,?,?)",
                       (prefix, datetime.now().year, 0, policy))
    
    # Migrate: seed customers/drivers if tables are empty
    cursor.execute("SELECT COUNT(*) FROM customers")
    if cursor.fetchone()[0] == 0:
        customers = [
            ("cus-001", "ฟงดา", "คุณวิไล", "038-100-001", "นิคมอุตสาหกรรมอมตะซิตี้ ชลบุรี", "", 30),
            ("cus-002", "ASAHI", "คุณทานาคะ", "038-200-002", "นิคมอุตสาหกรรมอมตะซิตี้ ชลบุรี", "", 30),
            ("cus-003", "ไทยฟูจิ", "คุณสมศรี", "038-300-003", "เขตนิคมอุตสาหกรรม", "", 45),
            ("cus-004", "ฮาเลอร์ที่ส้ม", "คุณมานพ", "038-400-004", "หนองใหญ่ ชลบุรี", "", 30),
            ("cus-005", "FAST", "คุณเร็ว", "038-500-005", "", "", 15),
            ("cus-006", "PIONEER", "คุณไพโรจน์", "038-600-006", "", "", 30),
            ("cus-007", "KI Pentaplast (THAILAND) LTD.", "", "", "64/48 Moo.4 T.Pluakdaeng A.Pluakdaeng Rayong 21140", "", 30),
        ]
        cursor.executemany("INSERT INTO customers VALUES (?,?,?,?,?,?,?)", customers)

    cursor.execute("SELECT COUNT(*) FROM drivers")
    if cursor.fetchone()[0] == 0:
        drivers = [
            ("drv-001", "นายสมชาย ยศเล็ก", "081-234-5678", "ท.4-00123/64", 15000.0, 1200.0),
            ("drv-002", "นายวิชัย ภานุวัฒน์", "082-345-6789", "ท.3-00564/63", 15000.0, 1200.0),
            ("drv-003", "นายอนันต์ ดีจริง", "083-456-7890", "ท.4-00897/65", 15000.0, 1200.0),
            ("drv-004", "นายจิตรดี รวดเร็ว", "084-567-8901", "ท.3-00214/64", 15000.0, 1200.0),
            ("drv-005", "นายอภิวัฒน์ ใจสู้", "085-678-9012", "ท.4-00554/65", 15000.0, 1200.0),
            ("drv-006", "นายสุทิน แก้วดี", "086-789-0123", "ท.3-00987/63", 15000.0, 1200.0),
            ("drv-007", "นายอุดมศักดิ์ ทรงชัย", "087-890-1234", "ท.4-00654/66", 15000.0, 1200.0),
            ("drv-008", "นายบุญเสือ เสือใหญ่", "088-901-2345", "ท.3-00112/62", 15000.0, 1200.0)
        ]
        cursor.executemany("INSERT INTO drivers VALUES (?,?,?,?,?,?)", drivers)

    # Seed route_masters if empty
    cursor.execute("SELECT COUNT(*) FROM route_masters")
    if cursor.fetchone()[0] == 0:
        route_masters = [
            ("rm-001", "KI Pentaplast (THAILAND) LTD.", "Kloeckner", "Kloeckner", "Brilliant (Olic)", "4W", 15000.0, ""),
            ("rm-002", "KI Pentaplast (THAILAND) LTD.", "Kloeckner", "Kloeckner", "Mondelez (Samutprakarn)", "6W", 60000.0, ""),
            ("rm-003", "KI Pentaplast (THAILAND) LTD.", "Kloeckner", "Kloeckner", "The Government Pharmaceutical (พระราม 6)", "จัมโบ้", 6000.0, ""),
            ("rm-004", "KI Pentaplast (THAILAND) LTD.", "Kloeckner", "Kloeckner", "Mondelez (Morawan)", "6W", 55555.0, ""),
            ("rm-005", "KI Pentaplast (THAILAND) LTD.", "Kloeckner", "Kloeckner", "Reckitt Benckiser (Samutprakarn)", "6W", 60000.0, ""),
            ("rm-006", "KI Pentaplast (THAILAND) LTD.", "Kloeckner", "Kloeckner", "BG Packaging (Ayuttaya)", "10W Cool", 20000.0, ""),
            ("rm-007", "KI Pentaplast (THAILAND) LTD.", "Kloeckner", "Kloeckner", "BG Packaging (Ayuttaya)", "6W Cool", 95000.0, ""),
            ("rm-008", "KI Pentaplast (THAILAND) LTD.", "Kloeckner", "Kloeckner", "Eastern Plaspack Co.,Ltd.", "6W Cool", 90000.0, ""),
            ("rm-009", "KI Pentaplast (THAILAND) LTD.", "Kloeckner", "Kloeckner", "Klongtoey", "6W", 65000.0, ""),
            ("rm-010", "KI Pentaplast (THAILAND) LTD.", "Kloeckner", "Kloeckner", "Suwannaphum", "จัมโบ้", 6000.0, ""),
            ("rm-011", "KI Pentaplast (THAILAND) LTD.", "Kloeckner", "Kloeckner", "N.Y.S ท่าเรือชายสิ้ง", "จัมโบ้", 6570.0, ""),
            ("rm-012", "KI Pentaplast (THAILAND) LTD.", "Kloeckner", "Kloeckner", "Millimed", "4W", 30000.0, ""),
            ("rm-013", "KI Pentaplast (THAILAND) LTD.", "Kloeckner", "Kloeckner", "Thai Meiji Pharmaceutical Co.,Ltd.", "จัมโบ้", 6000.0, ""),
            ("rm-014", "KI Pentaplast (THAILAND) LTD.", "Kloeckner", "Kloeckner", "Fuji Seal Packaging (Thailand) Co.,", "10W Cool", 20000.0, ""),
            ("rm-015", "KI Pentaplast (THAILAND) LTD.", "Kloeckner", "Kloeckner", "Fuji Seal Packaging (Thailand) Co.,", "6W Cool", 76000.0, ""),
            ("rm-016", "KI Pentaplast (THAILAND) LTD.", "Kloeckner", "Kloeckner", "Fuji Seal Packaging (Thailand) Co.,", "จัมโบ้ Cool", 9999.0, ""),
        ]
        cursor.executemany("INSERT INTO route_masters VALUES (?,?,?,?,?,?,?,?)", route_masters)

    # Seed default data if database is empty
    cursor.execute("SELECT COUNT(*) FROM bookings")
    if cursor.fetchone()[0] == 0:
        # Default mock data matching the Excel spreadsheet
        bookings = [
            ("BK-001", "ฟงดา", "2026-03-01", "งานขนส่งทั่วไป", "", "ฮาเลอร์หนองใหญ่", "ค้าง 20.30", "ฟงดา+รับงานกลับ", "6W", 6500.0, "Confirmed", "นายสมชาย ยศเล็ก", "72-9988 กทม", "", ""),
            ("BK-002", "ฟงดา", "2026-03-01", "งานขนส่งทั่วไป", "", "ฮาเลอร์หนองใหญ่", "ค้าง 20.30", "ฟงดา+รับงานกลับ", "6W", 6500.0, "Confirmed", "นายวิชัย ภานุวัฒน์", "71-1122 กทม", "", ""),
            ("BK-003", "ASAHI", "2026-03-02", "สินค้าอุตสาหกรรม", "AKST", "", "13.00", "TPCS", "6W", 7200.0, "Confirmed", "นายอนันต์ ดีจริง", "70-5566 นนทบุรี", "", ""),
            ("BK-004", "ASAHI", "2026-03-02", "สินค้าอุตสาหกรรม", "AKST", "", "13.30", "TPCS", "5W", 7200.0, "Confirmed", "นายจิตรดี รวดเร็ว", "70-8888 ชลบุรี", "", ""),
            ("BK-005", "ไทยฟูจิ", "2026-03-02", "งานขนส่งทั่วไป", "ไทยฟูจิ", "", "ค้าง28", "เมตะ", "6W", 5000.0, "Confirmed", "นายอภิวัฒน์ ใจสู้", "70-4455 ชลบุรี", "", ""),
            ("BK-006", "ฮาเลอร์ที่ส้ม", "2026-03-02", "งานขนส่งทั่วไป", "ฮาเลอร์หนองใหญ่", "", "8.30", "ลาดกระบัง 5,000/15,000 ค่ารอลงงาน", "5W", 15000.0, "Confirmed", "นายสุทิน แก้วดี", "73-0422", "", ""),
            ("BK-007", "FAST", "2026-03-02", "งานขนส่งด่วน", "SWS KM 36", "", "", "FLTD", "6W", 8500.0, "Confirmed", "นายบุญเสือ เสือใหญ่", "", "บจก. ทีเค ทรานสปอร์ต (WWH)", "WWH-999"),
            ("BK-008", "PIONEER", "2026-03-02", "งานขนส่งทั่วไป", "SINO", "", "8.00", "CHANG HORING", "6W", 9000.0, "Pending", "", "", "", "")
        ]
        cursor.executemany("INSERT INTO bookings VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", bookings)
        
        jobs = [
            ("JOB-001", "BK-001", "ฟงดา", "ฮาเลอร์หนองใหญ่", "ฟงดา+รับงานกลับ", "own", "drv-001", "นายสมชาย ยศเล็ก", "72-9988 กทม", 1200.0, "", "", 0.0, "Completed", 2100.0, 300.0, 0.0, "ปิดงานปกติ", "ถึงปลายทางสำเร็จ", "Invoiced"),
            ("JOB-002", "BK-002", "ฟงดา", "ฮาเลอร์หนองใหญ่", "ฟงดา+รับงานกลับ", "own", "drv-002", "นายวิชัย ภานุวัฒน์", "71-1122 กทม", 1200.0, "", "", 0.0, "Completed", 2200.0, 300.0, 0.0, "ปิดงานปกติ", "ถึงปลายทางสำเร็จ", "Unbilled"),
            ("JOB-003", "BK-003", "ASAHI", "AKST", "TPCS", "own", "drv-003", "นายอนันต์ ดีจริง", "70-5566 นนทบุรี", 1200.0, "", "", 0.0, "Completed", 2400.0, 400.0, 50.0, "ส่งเรียบร้อย", "ถึงปลายทางสำเร็จ", "Unbilled"),
            ("JOB-004", "BK-004", "ASAHI", "AKST", "TPCS", "own", "drv-004", "นายจิตรดี รวดเร็ว", "70-8888 ชลบุรี", 1200.0, "", "", 0.0, "In Progress", 0.0, 0.0, 0.0, "", "กำลังขนส่ง", "Unbilled"),
            ("JOB-005", "BK-005", "ไทยฟูจิ", "ไทยฟูจิ", "เมตะ", "own", "drv-005", "นายอภิวัฒน์ ใจสู้", "70-4455 ชลบุรี", 1200.0, "", "", 0.0, "Completed", 1800.0, 200.0, 0.0, "ส่งเรียบร้อย", "ถึงปลายทางสำเร็จ", "Unbilled"),
            ("JOB-006", "BK-006", "ฮาเลอร์ที่ส้ม", "ฮาเลอร์หนองใหญ่", "ลาดกระบัง 5,000/15,000 ค่ารอลงงาน", "own", "drv-006", "นายสุทิน แก้วดี", "73-0422", 1500.0, "", "", 0.0, "Completed", 4800.0, 800.0, 100.0, "ค้างงาน 1 คืน ค่ารอลงงานตามใบงาน", "ถึงปลายทางสำเร็จ", "Unbilled"),
            ("JOB-007", "BK-007", "FAST", "SWS KM 36", "FLTD", "sub", "", "นายบุญเสือ เสือใหญ่", "WWH-999", 0.0, "sub-001", "บจก. ทีเค ทรานสปอร์ต (WWH)", 6800.0, "Completed", 0.0, 0.0, 0.0, "รับงานซับเรียบร้อย", "ถึงปลายทางสำเร็จ", "Unbilled")
        ]
        cursor.executemany("INSERT INTO jobs VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [j + ("", "", "") for j in jobs])
        
        invoices = [
            ("INV-2603001", "ฟงดา", "2026-03-02", "2026-04-02", 6500.0, 455.0, 65.0, 6890.0, "Paid")
        ]
        cursor.executemany("INSERT INTO invoices VALUES (?,?,?,?,?,?,?,?,?)", invoices)
        
        invoice_items = [
            ("INV-2603001", "BK-001", "JOB-001")
        ]
        cursor.executemany("INSERT INTO invoice_items VALUES (?,?,?)", invoice_items)
        
        receipts = [
            ("RCT-2603001", "INV-2603001", "ฟงดา", "2026-03-03", 6500.0, 455.0, 65.0, 6890.0, "โอนผ่านธนาคารไทยพาณิชย์")
        ]
        cursor.executemany("INSERT INTO receipts VALUES (?,?,?,?,?,?,?,?,?)", receipts)
        
        trucks = [
            ("72-9988 กทม", "6W", "own", "นายสมชาย ยศเล็ก", ""),
            ("71-1122 กทม", "6W", "own", "นายวิชัย ภานุวัฒน์", ""),
            ("70-5566 นนทบุรี", "6W", "own", "นายอนันต์ ดีจริง", ""),
            ("70-8888 ชลบุรี", "5W", "own", "นายจิตรดี รวดเร็ว", ""),
            ("70-4455 ชลบุรี", "6W", "own", "นายอภิวัฒน์ ใจสู้", ""),
            ("73-0422", "5W", "own", "นายสุทิน แก้วดี", ""),
            ("WWH-999", "6W", "sub", "", "บจก. ทีเค ทรานสปอร์ต (WWH)")
        ]
        cursor.executemany("INSERT INTO trucks VALUES (?,?,?,?,?)", trucks)

    conn.commit()
    conn.close()

def get_next_number(prefix):
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    now = datetime.now()
    cur_year = now.year
    cur_month = now.month
    try:
        cur.execute("SELECT year, last_seq, reset_policy FROM sequence_control WHERE prefix=?", (prefix,))
        row = cur.fetchone()
        if row is None:
            next_seq = 1
            cur.execute("INSERT INTO sequence_control VALUES (?,?,?,?)", (prefix, cur_year, 1, "yearly"))
        else:
            saved_year, last_seq, reset_policy = row
            if reset_policy == "yearly" and saved_year < cur_year:
                next_seq = 1
                cur.execute("UPDATE sequence_control SET year=?, last_seq=1 WHERE prefix=?", (cur_year, prefix))
            else:
                next_seq = last_seq + 1
                cur.execute("UPDATE sequence_control SET last_seq=? WHERE prefix=?", (next_seq, prefix))
        conn.commit()
        yy = str(cur_year)[2:]
        mm = f"{cur_month:02d}"
        if prefix in ("INV", "RCT"):
            result = f"{prefix}-{yy}{mm}{next_seq:03d}"
        else:
            result = f"{prefix}-{yy}{mm}-{next_seq:03d}"
        return result
    finally:
        conn.close()


def get_state():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # 1. Fetch Bookings
    cursor.execute("SELECT * FROM bookings")
    bookings = [dict(row) for row in cursor.fetchall()]
    
    # 2. Fetch Jobs
    cursor.execute("SELECT * FROM jobs")
    jobs = [dict(row) for row in cursor.fetchall()]
    
    # 3. Fetch Invoices
    cursor.execute("SELECT * FROM invoices")
    invoices = []
    for row in cursor.fetchall():
        inv = dict(row)
        cursor.execute("SELECT bookingId, jobId FROM invoice_items WHERE invoiceId = ?", (inv["id"],))
        items = cursor.fetchall()
        inv["bookingIds"] = list(set([item["bookingId"] for item in items if item["bookingId"]]))
        inv["jobIds"] = list(set([item["jobId"] for item in items if item["jobId"]]))
        invoices.append(inv)
        
    # 4. Fetch Receipts
    cursor.execute("SELECT * FROM receipts")
    receipts = [dict(row) for row in cursor.fetchall()]
    
    # 5. Fetch Trucks
    try:
        cursor.execute("SELECT * FROM trucks")
        trucks = [dict(row) for row in cursor.fetchall()]
    except Exception:
        trucks = []

    # 6. Fetch Customers
    try:
        cursor.execute("SELECT * FROM customers")
        customers = [dict(row) for row in cursor.fetchall()]
    except Exception:
        customers = []

    # 7. Fetch Drivers
    try:
        cursor.execute("SELECT * FROM drivers")
        drivers = [dict(row) for row in cursor.fetchall()]
    except Exception:
        drivers = []

    # 8. Fetch Route Masters
    try:
        cursor.execute("SELECT * FROM route_masters")
        route_masters = [dict(row) for row in cursor.fetchall()]
    except Exception:
        route_masters = []

    conn.close()

    return {
        "bookings": bookings,
        "jobs": jobs,
        "invoices": invoices,
        "receipts": receipts,
        "trucks": trucks,
        "customers": customers,
        "drivers": drivers,
        "routeMasters": route_masters
    }

def save_state(state):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        try:
            pass  # no pre-delete; use INSERT OR REPLACE to preserve existing data
        except Exception:
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS trucks (
                plateNo TEXT PRIMARY KEY,
                type TEXT,
                ownerType TEXT,
                driverName TEXT,
                subconName TEXT
            )
            """)
        
        # Insert Bookings
        for bk in state.get("bookings", []):
            cursor.execute("""
            INSERT OR REPLACE INTO bookings VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                bk.get("id"), bk.get("customer"), bk.get("date"), bk.get("cargo"),
                bk.get("shipper"), bk.get("origin"), bk.get("time"), bk.get("destination"),
                bk.get("truckType"), bk.get("price"), bk.get("status"),
                bk.get("driverName"), bk.get("truckNo"), bk.get("subconName"), bk.get("subconTruckNo")
            ))
            
        # Insert Jobs
        for job in state.get("jobs", []):
            cursor.execute("""
            INSERT OR REPLACE INTO jobs VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                job.get("id"), job.get("bookingId"), job.get("customer"),
                job.get("origin"), job.get("destination"), job.get("type"),
                job.get("driverId"), job.get("driverName"), job.get("truckNo"),
                job.get("tripAllowance"), job.get("subconId"), job.get("subconName"),
                job.get("subconCost"), job.get("status"), job.get("fuelExpense"),
                job.get("tollExpense"), job.get("otherExpense"), job.get("closeNote"),
                job.get("lastLocation"), job.get("billingStatus"),
                job.get("openPhoto", ""), job.get("closePhoto", ""), job.get("openNote", "")
            ))
            
        # Insert Invoices
        for inv in state.get("invoices", []):
            cursor.execute("""
            INSERT OR REPLACE INTO invoices VALUES (?,?,?,?,?,?,?,?,?)
            """, (
                inv.get("id"), inv.get("customer"), inv.get("date"), inv.get("dueDate"),
                inv.get("subtotal"), inv.get("vat"), inv.get("withholding"), inv.get("total"),
                inv.get("status")
            ))
            booking_ids = inv.get("bookingIds", [])
            job_ids = inv.get("jobIds", [])
            max_len = max(len(booking_ids), len(job_ids))
            cursor.execute("DELETE FROM invoice_items WHERE invoiceId=?", (inv.get("id"),))
            for i in range(max_len):
                b_id = booking_ids[i] if i < len(booking_ids) else ""
                j_id = job_ids[i] if i < len(job_ids) else ""
                cursor.execute("""
                INSERT INTO invoice_items VALUES (?,?,?)
                """, (inv.get("id"), b_id, j_id))
                
        # Insert Receipts
        for rct in state.get("receipts", []):
            cursor.execute("""
            INSERT OR REPLACE INTO receipts VALUES (?,?,?,?,?,?,?,?,?)
            """, (
                rct.get("id"), rct.get("invoiceId"), rct.get("customer"), rct.get("date"),
                rct.get("subtotal"), rct.get("vat"), rct.get("withholding"), rct.get("total"),
                rct.get("paymentMethod")
            ))
            
        # Insert Trucks
        for trk in state.get("trucks", []):
            cursor.execute("""
            INSERT OR REPLACE INTO trucks VALUES (?,?,?,?,?,?)
            """, (
                trk.get("plateNo"), trk.get("type"), trk.get("ownerType"),
                trk.get("driverName"), trk.get("subconName"),
                trk.get("repairStatus", "")
            ))

        # Insert Customers
        try:
            pass  # preserve existing; INSERT OR REPLACE handles updates
        except Exception:
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY, name TEXT, contact TEXT,
                phone TEXT, address TEXT, taxId TEXT, creditDays INTEGER
            )
            """)
        for cus in state.get("customers", []):
            cursor.execute("INSERT OR REPLACE INTO customers VALUES (?,?,?,?,?,?,?)", (
                cus.get("id"), cus.get("name"), cus.get("contact"),
                cus.get("phone"), cus.get("address"), cus.get("taxId"),
                cus.get("creditDays")
            ))

        # Insert Drivers
        try:
            pass  # preserve existing; INSERT OR REPLACE handles updates
        except Exception:
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS drivers (
                id TEXT PRIMARY KEY, name TEXT, phone TEXT,
                license TEXT, baseSalary REAL, tripAllowanceRate REAL
            )
            """)
        for drv in state.get("drivers", []):
            cursor.execute("INSERT OR REPLACE INTO drivers VALUES (?,?,?,?,?,?)", (
                drv.get("id"), drv.get("name"), drv.get("phone"),
                drv.get("license"), drv.get("baseSalary"), drv.get("tripAllowanceRate")
            ))

        # Insert Route Masters
        try:
            pass  # preserve existing; INSERT OR REPLACE handles updates
        except Exception:
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS route_masters (
                id TEXT PRIMARY KEY, customer TEXT, shipper TEXT,
                origin TEXT, destination TEXT, truckType TEXT, price REAL, note TEXT
            )
            """)
        for rm in state.get("routeMasters", []):
            cursor.execute("INSERT OR REPLACE INTO route_masters VALUES (?,?,?,?,?,?,?,?)", (
                rm.get("id"), rm.get("customer"), rm.get("shipper", ""),
                rm.get("origin", ""), rm.get("destination"), rm.get("truckType"),
                rm.get("price"), rm.get("note", "")
            ))

        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print("Error saving state to database:", e)
        return False
    finally:
        conn.close()

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        if parsed.path == "/api/next-number":
            prefix = qs.get("prefix", [None])[0]
            if not prefix or prefix not in ("BK", "JOB", "INV", "RCT"):
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Invalid prefix")
                return
            result = get_next_number(prefix)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"id": result}).encode("utf-8"))
        elif self.path == "/api/state":
            try:
                state_data = get_state()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(state_data).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
        else:
            super().do_GET()
            
    def do_POST(self):
        if self.path == "/api/state":
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                state_data = json.loads(post_data.decode("utf-8"))
                success = save_state(state_data)
                if success:
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success"}).encode("utf-8"))
                else:
                    self.send_response(500)
                    self.end_headers()
                    self.wfile.write(b"Failed to save state to SQLite database")
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()
            
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
    
    handler = MyHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Server started on http://localhost:{PORT}")
        print("To stop the server, press Ctrl+C")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
