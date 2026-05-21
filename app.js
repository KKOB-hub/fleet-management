// State Management for Fleet Management Web App

async function fetchNextNumber(prefix) {
    var res = await fetch("/api/next-number?prefix=" + prefix);
    if (!res.ok) throw new Error("fetchNextNumber failed: " + prefix);
    var data = await res.json();
    return data.id;
}

// User Database and RBAC Roles
const usersDb = [
    { username: "admin", name: "ผู้ดูแลระบบ", role: "admin", password: "123", avatar: "AD" },
    { username: "dispatcher", name: "สมเกียรติ จัดรถ", role: "dispatcher", password: "123", avatar: "DS" },
    { username: "accountant", name: "วิภา บัญชี", role: "accountant", password: "123", avatar: "AC" },
    { username: "driver", name: "สมชาย ขับรถ", role: "driver", password: "123", avatar: "DR" }
];

const rolePermissions = {
    admin: ["dashboard", "booking", "joborder", "jobstatus", "billing", "receipt", "salary", "subcontractor", "trucks", "customers", "drivermaster", "routemaster", "report-jobs", "report-billing", "report-monthly"],
    dispatcher: ["dashboard", "booking", "joborder", "jobstatus", "salary", "subcontractor", "trucks", "customers", "drivermaster", "routemaster", "report-jobs", "report-monthly"],
    accountant: ["dashboard", "billing", "receipt", "customers", "report-jobs", "report-billing", "report-monthly"],
    driver: ["jobstatus", "salary"]
};

let currentUser = null;

let state = {
    bookings: [],
    jobs: [],
    invoices: [],
    receipts: [],
    trucks: [],
    drivers: [],
    customers: [],
    routeMasters: [],
    routeSort: { field: "customer", dir: 1 },
    bookingSort: { field: "date", dir: -1 },
    jobSort: { field: "id", dir: -1 },
    confirmSort: { field: "id", dir: -1 },
    subcontractors: [
        { id: "sub-001", name: "บจก. ทีเค ทรานสปอร์ต (WWH)", contact: "คุณทวีเกียรติ", phone: "038-111-222", taxId: "0105560123456" },
        { id: "sub-002", name: "บจก. มังกรทอง ขนส่ง", contact: "คุณสุรชัย", phone: "038-333-444", taxId: "0205562098765" },
        { id: "sub-003", name: "บจก. แฟสต์ โลจิสติกส์", contact: "คุณวิเชียร", phone: "038-555-666", taxId: "0305563098761" }
    ]
};

// Default Mock Data if LocalStorage is empty
const defaultMockData = {
    bookings: [
        { id: "BK-001", customer: "ฟงดา", date: "2026-03-01", cargo: "งานขนส่งทั่วไป", shipper: "", origin: "ฮาเลอร์หนองใหญ่", time: "ค้าง 20.30", destination: "ฟงดา+รับงานกลับ", truckType: "6W", price: 6500, status: "Confirmed", driverName: "นายสมชาย ยศเล็ก", truckNo: "72-9988 กทม", subconName: "", subconTruckNo: "" },
        { id: "BK-002", customer: "ฟงดา", date: "2026-03-01", cargo: "งานขนส่งทั่วไป", shipper: "", origin: "ฮาเลอร์หนองใหญ่", time: "ค้าง 20.30", destination: "ฟงดา+รับงานกลับ", truckType: "6W", price: 6500, status: "Confirmed", driverName: "นายวิชัย ภานุวัฒน์", truckNo: "71-1122 กทม", subconName: "", subconTruckNo: "" },
        { id: "BK-003", customer: "ASAHI", date: "2026-03-02", cargo: "สินค้าอุตสาหกรรม", shipper: "AKST", origin: "", time: "13.00", destination: "TPCS", truckType: "6W", price: 7200, status: "Confirmed", driverName: "นายอนันต์ ดีจริง", truckNo: "70-5566 นนทบุรี", subconName: "", subconTruckNo: "" },
        { id: "BK-004", customer: "ASAHI", date: "2026-03-02", cargo: "สินค้าอุตสาหกรรม", shipper: "AKST", origin: "", time: "13.30", destination: "TPCS", truckType: "5W", price: 7200, status: "Confirmed", driverName: "นายจิตรดี รวดเร็ว", truckNo: "70-8888 ชลบุรี", subconName: "", subconTruckNo: "" },
        { id: "BK-005", customer: "ไทยฟูจิ", date: "2026-03-02", cargo: "งานขนส่งทั่วไป", shipper: "ไทยฟูจิ", origin: "", time: "ค้าง28", destination: "เมตะ", truckType: "6W", price: 5000, status: "Confirmed", driverName: "นายอภิวัฒน์ ใจสู้", truckNo: "70-4455 ชลบุรี", subconName: "", subconTruckNo: "" },
        { id: "BK-006", customer: "ฮาเลอร์ที่ส้ม", date: "2026-03-02", cargo: "งานขนส่งทั่วไป", shipper: "ฮาเลอร์หนองใหญ่", origin: "", time: "8.30", destination: "ลาดกระบัง 5,000/15,000 ค่ารอลงงาน", truckType: "5W", price: 15000, status: "Confirmed", driverName: "นายสุทิน แก้วดี", truckNo: "73-0422", subconName: "", subconTruckNo: "" },
        { id: "BK-007", customer: "FAST", date: "2026-03-02", cargo: "งานขนส่งด่วน", shipper: "SWS KM 36", origin: "", time: "", destination: "FLTD", truckType: "6W", price: 8500, status: "Confirmed", driverName: "นายบุญเสือ เสือใหญ่", truckNo: "", subconName: "บจก. ทีเค ทรานสปอร์ต (WWH)", subconTruckNo: "WWH-999" },
        { id: "BK-008", customer: "PIONEER", date: "2026-03-02", cargo: "งานขนส่งทั่วไป", shipper: "SINO", origin: "", time: "8.00", destination: "CHANG HORING", truckType: "6W", price: 9000, status: "Pending", driverName: "", truckNo: "", subconName: "", subconTruckNo: "" }
    ],
    trucks: [
        { plateNo: "72-9988 กทม", type: "6W", ownerType: "own", driverName: "นายสมชาย ยศเล็ก", subconName: "" },
        { plateNo: "71-1122 กทม", type: "6W", ownerType: "own", driverName: "นายวิชัย ภานุวัฒน์", subconName: "" },
        { plateNo: "70-5566 นนทบุรี", type: "6W", ownerType: "own", driverName: "นายอนันต์ ดีจริง", subconName: "" },
        { plateNo: "70-8888 ชลบุรี", type: "6W", ownerType: "own", driverName: "นายจิตรดี รวดเร็ว", subconName: "" },
        { plateNo: "70-4455 ชลบุรี", type: "6W", ownerType: "own", driverName: "นายอภิวัฒน์ ใจสู้", subconName: "" },
        { plateNo: "73-0422", type: "5W", ownerType: "own", driverName: "นายสุทิน แก้วดี", subconName: "" },
        { plateNo: "WWH-999", type: "6W", ownerType: "sub", driverName: "", subconName: "บจก. ทีเค ทรานสปอร์ต (WWH)" }
    ],
    jobs: [
        { id: "JOB-001", bookingId: "BK-001", customer: "ฟงดา", origin: "ฮาเลอร์หนองใหญ่", destination: "ฟงดา+รับงานกลับ", type: "own", driverId: "drv-001", driverName: "นายสมชาย ยศเล็ก", truckNo: "72-9988 กทม", tripAllowance: 1200, subconId: "", subconName: "", subconCost: 0, status: "Completed", fuelExpense: 2100, tollExpense: 300, otherExpense: 0, closeNote: "ปิดงานปกติ", lastLocation: "ถึงปลายทางสำเร็จ", billingStatus: "Invoiced" },
        { id: "JOB-002", bookingId: "BK-002", customer: "ฟงดา", origin: "ฮาเลอร์หนองใหญ่", destination: "ฟงดา+รับงานกลับ", type: "own", driverId: "drv-002", driverName: "นายวิชัย ภานุวัฒน์", truckNo: "71-1122 กทม", tripAllowance: 1200, subconId: "", subconName: "", subconCost: 0, status: "Completed", fuelExpense: 2200, tollExpense: 300, otherExpense: 0, closeNote: "ปิดงานปกติ", lastLocation: "ถึงปลายทางสำเร็จ", billingStatus: "Unbilled" },
        { id: "JOB-003", bookingId: "BK-003", customer: "ASAHI", origin: "AKST", destination: "TPCS", type: "own", driverId: "drv-003", driverName: "นายอนันต์ ดีจริง", truckNo: "70-5566 นนทบุรี", tripAllowance: 1200, subconId: "", subconName: "", subconCost: 0, status: "Completed", fuelExpense: 2400, tollExpense: 400, otherExpense: 50, closeNote: "ส่งเรียบร้อย", lastLocation: "ถึงปลายทางสำเร็จ", billingStatus: "Unbilled" },
        { id: "JOB-004", bookingId: "BK-004", customer: "ASAHI", origin: "AKST", destination: "TPCS", type: "own", driverId: "drv-004", driverName: "นายจิตรดี รวดเร็ว", truckNo: "70-8888 ชลบุรี", tripAllowance: 1200, subconId: "", subconName: "", subconCost: 0, status: "In Progress", fuelExpense: 0, tollExpense: 0, otherExpense: 0, closeNote: "", lastLocation: "กำลังขนส่ง", billingStatus: "Unbilled" },
        { id: "JOB-005", bookingId: "BK-005", customer: "ไทยฟูจิ", origin: "ไทยฟูจิ", destination: "เมตะ", type: "own", driverId: "drv-005", driverName: "นายอภิวัฒน์ ใจสู้", truckNo: "70-4455 ชลบุรี", tripAllowance: 1200, subconId: "", subconName: "", subconCost: 0, status: "Completed", fuelExpense: 1800, tollExpense: 200, otherExpense: 0, closeNote: "ส่งเรียบร้อย", lastLocation: "ถึงปลายทางสำเร็จ", billingStatus: "Unbilled" },
        { id: "JOB-006", bookingId: "BK-006", customer: "ฮาเลอร์ที่ส้ม", origin: "ฮาเลอร์หนองใหญ่", destination: "ลาดกระบัง 5,000/15,000 ค่ารอลงงาน", type: "own", driverId: "drv-006", driverName: "นายสุทิน แก้วดี", truckNo: "73-0422", tripAllowance: 1500, subconId: "", subconName: "", subconCost: 0, status: "Completed", fuelExpense: 4800, tollExpense: 800, otherExpense: 100, closeNote: "ค้างงาน 1 คืน ค่ารอลงงานตามใบงาน", lastLocation: "ถึงปลายทางสำเร็จ", billingStatus: "Unbilled" },
        { id: "JOB-007", bookingId: "BK-007", customer: "FAST", origin: "SWS KM 36", destination: "FLTD", type: "sub", driverId: "", driverName: "นายบุญเสือ เสือใหญ่", truckNo: "WWH-999", tripAllowance: 0, subconId: "sub-001", subconName: "บจก. ทีเค ทรานสปอร์ต (WWH)", subconCost: 6800, status: "Completed", fuelExpense: 0, tollExpense: 0, otherExpense: 0, closeNote: "รับงานซับเรียบร้อย", lastLocation: "ถึงปลายทางสำเร็จ", billingStatus: "Unbilled" }
    ],
    invoices: [
        { id: "INV-2603001", bookingIds: ["BK-001"], jobIds: ["JOB-001"], customer: "ฟงดา", date: "2026-03-02", dueDate: "2026-04-02", subtotal: 6500, vat: 455, withholding: 65, total: 6890, status: "Paid" }
    ],
    receipts: [
        { id: "RCT-2603001", invoiceId: "INV-2603001", customer: "ฟงดา", date: "2026-03-03", subtotal: 6500, vat: 455, withholding: 65, total: 6890, paymentMethod: "โอนผ่านธนาคารไทยพาณิชย์" }
    ],
    customers: [
        { id: "cus-001", name: "ฟงดา", contact: "คุณวิไล", phone: "038-100-001", address: "นิคมอุตสาหกรรมอมตะซิตี้ ชลบุรี", taxId: "", creditDays: 30 },
        { id: "cus-002", name: "ASAHI", contact: "คุณทานาคะ", phone: "038-200-002", address: "นิคมอุตสาหกรรมอมตะซิตี้ ชลบุรี", taxId: "", creditDays: 30 },
        { id: "cus-003", name: "ไทยฟูจิ", contact: "คุณสมศรี", phone: "038-300-003", address: "เขตนิคมอุตสาหกรรม", taxId: "", creditDays: 45 },
        { id: "cus-004", name: "ฮาเลอร์ที่ส้ม", contact: "คุณมานพ", phone: "038-400-004", address: "หนองใหญ่ ชลบุรี", taxId: "", creditDays: 30 },
        { id: "cus-005", name: "FAST", contact: "คุณเร็ว", phone: "038-500-005", address: "", taxId: "", creditDays: 15 },
        { id: "cus-006", name: "PIONEER", contact: "คุณไพโรจน์", phone: "038-600-006", address: "", taxId: "", creditDays: 30 },
        { id: "cus-007", name: "KI Pentaplast (THAILAND) LTD.", contact: "", phone: "", address: "64/48 Moo.4 T.Pluakdaeng A.Pluakdaeng Rayong 21140", taxId: "", creditDays: 30 }
    ],
    routeMasters: [
        { id: "rm-001", customer: "KI Pentaplast (THAILAND) LTD.", shipper: "Kloeckner", origin: "Kloeckner", destination: "Brilliant (Olic)", truckType: "4W", price: 15000, note: "" },
        { id: "rm-002", customer: "KI Pentaplast (THAILAND) LTD.", shipper: "Kloeckner", origin: "Kloeckner", destination: "Mondelez (Samutprakarn)", truckType: "6W", price: 60000, note: "" },
        { id: "rm-003", customer: "KI Pentaplast (THAILAND) LTD.", shipper: "Kloeckner", origin: "Kloeckner", destination: "The Government Pharmaceutical (พระราม 6)", truckType: "จัมโบ้", price: 6000, note: "" },
        { id: "rm-004", customer: "KI Pentaplast (THAILAND) LTD.", shipper: "Kloeckner", origin: "Kloeckner", destination: "Mondelez (Morawan)", truckType: "6W", price: 55555, note: "" },
        { id: "rm-005", customer: "KI Pentaplast (THAILAND) LTD.", shipper: "Kloeckner", origin: "Kloeckner", destination: "Reckitt Benckiser (Samutprakarn)", truckType: "6W", price: 60000, note: "" },
        { id: "rm-006", customer: "KI Pentaplast (THAILAND) LTD.", shipper: "Kloeckner", origin: "Kloeckner", destination: "BG Packaging (Ayuttaya)", truckType: "10W Cool", price: 20000, note: "" },
        { id: "rm-007", customer: "KI Pentaplast (THAILAND) LTD.", shipper: "Kloeckner", origin: "Kloeckner", destination: "BG Packaging (Ayuttaya)", truckType: "6W Cool", price: 95000, note: "" },
        { id: "rm-008", customer: "KI Pentaplast (THAILAND) LTD.", shipper: "Kloeckner", origin: "Kloeckner", destination: "Eastern Plaspack Co.,Ltd.", truckType: "6W Cool", price: 90000, note: "" },
        { id: "rm-009", customer: "KI Pentaplast (THAILAND) LTD.", shipper: "Kloeckner", origin: "Kloeckner", destination: "Klongtoey", truckType: "6W", price: 65000, note: "" },
        { id: "rm-010", customer: "KI Pentaplast (THAILAND) LTD.", shipper: "Kloeckner", origin: "Kloeckner", destination: "Suwannaphum", truckType: "จัมโบ้", price: 6000, note: "" },
        { id: "rm-011", customer: "KI Pentaplast (THAILAND) LTD.", shipper: "Kloeckner", origin: "Kloeckner", destination: "N.Y.S ท่าเรือชายสิ้ง", truckType: "จัมโบ้", price: 6570, note: "" },
        { id: "rm-012", customer: "KI Pentaplast (THAILAND) LTD.", shipper: "Kloeckner", origin: "Kloeckner", destination: "Millimed", truckType: "4W", price: 30000, note: "" },
        { id: "rm-013", customer: "KI Pentaplast (THAILAND) LTD.", shipper: "Kloeckner", origin: "Kloeckner", destination: "Thai Meiji Pharmaceutical Co.,Ltd.", truckType: "จัมโบ้", price: 6000, note: "" },
        { id: "rm-014", customer: "KI Pentaplast (THAILAND) LTD.", shipper: "Kloeckner", origin: "Kloeckner", destination: "Fuji Seal Packaging (Thailand) Co.,", truckType: "10W Cool", price: 20000, note: "" },
        { id: "rm-015", customer: "KI Pentaplast (THAILAND) LTD.", shipper: "Kloeckner", origin: "Kloeckner", destination: "Fuji Seal Packaging (Thailand) Co.,", truckType: "6W Cool", price: 76000, note: "" },
        { id: "rm-016", customer: "KI Pentaplast (THAILAND) LTD.", shipper: "Kloeckner", origin: "Kloeckner", destination: "Fuji Seal Packaging (Thailand) Co.,", truckType: "จัมโบ้ Cool", price: 9999, note: "" }
    ],
    drivers: [
        { id: "drv-001", name: "นายสมชาย ยศเล็ก", phone: "081-234-5678", license: "ท.4-00123/64", baseSalary: 15000, tripAllowanceRate: 1200 },
        { id: "drv-002", name: "นายวิชัย ภานุวัฒน์", phone: "082-345-6789", license: "ท.3-00564/63", baseSalary: 15000, tripAllowanceRate: 1200 },
        { id: "drv-003", name: "นายอนันต์ ดีจริง", phone: "083-456-7890", license: "ท.4-00897/65", baseSalary: 15000, tripAllowanceRate: 1200 },
        { id: "drv-004", name: "นายจิตรดี รวดเร็ว", phone: "084-567-8901", license: "ท.3-00214/64", baseSalary: 15000, tripAllowanceRate: 1200 },
        { id: "drv-005", name: "นายอภิวัฒน์ ใจสู้", phone: "085-678-9012", license: "ท.4-00554/65", baseSalary: 15000, tripAllowanceRate: 1200 },
        { id: "drv-006", name: "นายสุทิน แก้วดี", phone: "086-789-0123", license: "ท.3-00987/63", baseSalary: 15000, tripAllowanceRate: 1200 },
        { id: "drv-007", name: "นายอุดมศักดิ์ ทรงชัย", phone: "087-890-1234", license: "ท.4-00654/66", baseSalary: 15000, tripAllowanceRate: 1200 },
        { id: "drv-008", name: "นายบุญเสือ เสือใหญ่", phone: "088-901-2345", license: "ท.3-00112/62", baseSalary: 15000, tripAllowanceRate: 1200 }
    ]
};

// Global variables for charts
let financeChartInstance = null;
let fleetChartInstance = null;

// Initialize Web App
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupNavigation();
});

// Check if app is running on a web server (served via http/https)
const isServerMode = window.location.protocol.startsWith("http");

// Load state and run
// Load state and run
async function initApp() {
    // Check if user is logged in
    const isLoggedIn = checkUserSession();
    if (isLoggedIn) {
        document.getElementById("login-screen").style.display = "none";
        applyRbacPermissions();
    } else {
        document.getElementById("login-screen").style.display = "flex";
        document.getElementById("header-user-profile").style.display = "none";
    }

    if (isServerMode) {
        try {
            const response = await fetch("/api/state");
            if (response.ok) {
                const dbState = await response.json();
                state.bookings = dbState.bookings || [];
                state.jobs = dbState.jobs || [];
                state.invoices = dbState.invoices || [];
                state.receipts = dbState.receipts || [];
                state.trucks = dbState.trucks || [];
                state.customers = dbState.customers || [];
                state.drivers = dbState.drivers || [];
                state.routeMasters = dbState.routeMasters || [];
                console.log("Loaded state from SQLite Database.");
            } else {
                console.warn("Failed to load from Database API. Falling back to LocalStorage.");
                loadFromLocalStorage();
            }
        } catch (error) {
            console.error("Database connection error. Falling back to LocalStorage:", error);
            loadFromLocalStorage();
        }
    } else {
        loadFromLocalStorage();
    }

    // Populate selects in forms
    populateFormSelects();

    // Check URL hash for routing if logged in
    if (currentUser) {
        handleRouting();
    }
    
    // Add event listeners for searches
    setupSearchListeners();
}

function loadFromLocalStorage() {
    // Check if saved state has the old default mock data (e.g. contains "ซีพี ออลล์") and clear it
    if (localStorage.getItem("fleet_pro_state")) {
        const savedState = JSON.parse(localStorage.getItem("fleet_pro_state"));
        if (savedState.bookings && savedState.bookings.length > 0 && savedState.bookings.some(b => b.customer && b.customer.includes("ซีพี ออลล์"))) {
            localStorage.removeItem("fleet_pro_state");
            console.log("Old state detected. Cleared local storage.");
        }
    }

    // Check localStorage
    if (localStorage.getItem("fleet_pro_state")) {
        const savedState = JSON.parse(localStorage.getItem("fleet_pro_state"));
        state = { ...state, ...savedState };
        state.routeSort = { field: "customer", dir: 1 };
        state.bookingSort = { field: "date", dir: -1 };
        state.jobSort = { field: "id", dir: -1 };
        state.confirmSort = { field: "id", dir: -1 };
        state.bookings = state.bookings.map(b => ({ ...b, truckType: b.truckType || "6W" }));
        state.routeMasters = state.routeMasters || [];
    } else {
        // Load default mock data
        state.bookings = [...defaultMockData.bookings];
        state.jobs = [...defaultMockData.jobs];
        state.invoices = [...defaultMockData.invoices];
        state.receipts = [...defaultMockData.receipts];
        state.trucks = [...defaultMockData.trucks];
        state.customers = [...defaultMockData.customers];
        state.drivers = [...defaultMockData.drivers];
        saveStateToStorage();
    }
}

async function saveStateToStorage() {
    // Save to LocalStorage as standalone backup
    localStorage.setItem("fleet_pro_state", JSON.stringify({
        bookings: state.bookings,
        jobs: state.jobs,
        invoices: state.invoices,
        receipts: state.receipts,
        trucks: state.trucks,
        customers: state.customers,
        drivers: state.drivers,
        routeMasters: state.routeMasters
    }));

    // Sync with SQLite Database if in server mode
    if (isServerMode) {
        try {
            const response = await fetch("/api/state", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    bookings: state.bookings,
                    jobs: state.jobs,
                    invoices: state.invoices,
                    receipts: state.receipts,
                    trucks: state.trucks,
                    customers: state.customers,
                    drivers: state.drivers,
                    routeMasters: state.routeMasters
                })
            });
            if (response.ok) {
                console.log("Synced successfully with SQLite Database.");
            } else {
                console.error("Failed to sync with SQLite Database.");
            }
        } catch (error) {
            console.error("Error syncing with SQLite Database:", error);
        }
    }
}

async function resetDemoData() {
    if (confirm("คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้นตามไฟล์ Excel หรือไม่?")) {
        localStorage.removeItem("fleet_pro_state");
        if (isServerMode) {
            try {
                await fetch("/api/state", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(defaultMockData)
                });
            } catch (error) {
                console.error("Error resetting database on server:", error);
            }
        }
        window.location.reload();
    }
}

// Authentication & Role-Based Access Control (RBAC) Functions
function checkUserSession() {
    const sessionUser = sessionStorage.getItem("fleet_current_user");
    if (sessionUser) {
        currentUser = JSON.parse(sessionUser);
        return true;
    }
    return false;
}

function handleLoginSubmit(event) {
    event.preventDefault();
    const usernameInput = document.getElementById("login-username").value.trim().toLowerCase();
    const passwordInput = document.getElementById("login-password").value;
    const errorMsgEl = document.getElementById("login-error-msg");

    const user = usersDb.find(u => u.username === usernameInput && u.password === passwordInput);
    if (user) {
        currentUser = user;
        sessionStorage.setItem("fleet_current_user", JSON.stringify(user));
        
        // Hide login screen
        document.getElementById("login-screen").style.display = "none";
        errorMsgEl.style.display = "none";
        
        // Apply permissions
        applyRbacPermissions();
        
        // Clean routing redirection to their first allowed page
        const allowedPages = rolePermissions[user.role];
        const defaultPage = allowedPages[0] || "dashboard";
        window.location.hash = defaultPage;
        
        // Clear login form fields
        document.getElementById("login-form").reset();
    } else {
        errorMsgEl.style.display = "flex";
    }
}

function logoutUser() {
    currentUser = null;
    sessionStorage.removeItem("fleet_current_user");
    
    // Show login screen
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("header-user-profile").style.display = "none";
    
    // Reset inputs
    document.getElementById("login-username").value = "";
    document.getElementById("login-password").value = "";
    
    window.location.hash = "";
}

function applyRbacPermissions() {
    if (!currentUser) return;
    
    // Show user info in header
    document.getElementById("header-user-profile").style.display = "flex";
    document.getElementById("header-user-avatar").innerText = currentUser.avatar;
    document.getElementById("header-user-name").innerText = currentUser.name;
    
    let roleText = "ผู้ดูแลระบบ";
    if (currentUser.role === "dispatcher") roleText = "เจ้าหน้าที่จัดรถ";
    else if (currentUser.role === "accountant") roleText = "เจ้าหน้าที่บัญชี";
    else if (currentUser.role === "driver") roleText = "คนขับรถ (Driver)";
    document.getElementById("header-user-role").innerText = roleText;

    // Filter sidebar menu items
    const allowedTabs = rolePermissions[currentUser.role] || [];
    const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");
    
    menuItems.forEach(item => {
        const tabId = item.getAttribute("data-tab");
        if (allowedTabs.includes(tabId)) {
            item.style.display = "block";
        } else {
            item.style.display = "none";
        }
    });

    // Run tab content renders if current page is allowed, otherwise redirect to first allowed tab
    const currentHash = window.location.hash.replace("#", "") || "dashboard";
    if (!allowedTabs.includes(currentHash)) {
        const defaultPage = allowedTabs[0] || "dashboard";
        window.location.hash = defaultPage;
    }
}

// Navigation / Tabs router
function setupNavigation() {
    const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");
    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tabId = item.getAttribute("data-tab");
            window.location.hash = tabId;
        });
    });

    window.addEventListener("hashchange", handleRouting);
}

function handleRouting() {
    if (!currentUser) {
        // Force login screen if not authenticated
        document.getElementById("login-screen").style.display = "flex";
        return;
    }

    const allowedTabs = rolePermissions[currentUser.role] || [];
    let hash = window.location.hash.replace("#", "") || "dashboard";
    
    // Guard against unauthorized hash navigation
    if (!allowedTabs.includes(hash)) {
        hash = allowedTabs[0] || "dashboard";
        window.location.hash = hash;
        return;
    }

    const panels = document.querySelectorAll(".page-panel");
    const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");
    
    let activePanelId = `panel-${hash}`;
    let validTab = false;

    panels.forEach(panel => {
        if (panel.id === activePanelId) {
            panel.classList.add("active");
            validTab = true;
        } else {
            panel.classList.remove("active");
        }
    });

    if (!validTab) {
        // Fallback to first allowed tab if invalid hash
        const defaultTab = allowedTabs[0] || "dashboard";
        document.getElementById(`panel-${defaultTab}`).classList.add("active");
        activePanelId = `panel-${defaultTab}`;
        hash = defaultTab;
    }

    menuItems.forEach(item => {
        if (item.getAttribute("data-tab") === hash) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    // Update header page titles
    updateHeaderTitle(hash);

    // Call render functions based on tab
    renderTabContent(hash);
}

function updateHeaderTitle(tab) {
    const titleEl = document.getElementById("page-title");
    const subtitleEl = document.getElementById("page-subtitle");

    switch(tab) {
        case "dashboard":
            titleEl.innerText = "แผงควบคุม (Dashboard)";
            subtitleEl.innerText = "ระบบบริหารจัดการกองรถและบัญชีขนส่งครบวงจร";
            break;
        case "booking":
            titleEl.innerText = "การจองคิวรถ (Booking)";
            subtitleEl.innerText = "บันทึกการจองและอนุมัติคิวงานของลูกค้า";
            break;
        case "joborder":
            titleEl.innerText = "ใบสั่งงาน (Job Order)";
            subtitleEl.innerText = "จ่ายงานให้รถบริษัท หรือผู้รับเหมาช่วง (Sub Contractor)";
            break;
        case "jobstatus":
            titleEl.innerText = "ยืนยันเปิด-ปิดงาน (Confirm Operations)";
            subtitleEl.innerText = "อัปเดตตำแหน่งงาน รายงานค่าน้ำมันและค่าผ่านทาง";
            break;
        case "billing":
            titleEl.innerText = "การตั้งหนี้และวางบิล (Billing & Invoice)";
            subtitleEl.innerText = "คำนวณภาษีมูลค่าเพิ่ม 7% หัก ณ ที่จ่าย 1% และออกใบแจ้งหนี้";
            break;
        case "receipt":
            titleEl.innerText = "ใบเสร็จรับเงิน (Receipt)";
            subtitleEl.innerText = "บันทึกการรับชำระเงินและออกใบเสร็จรับเงินให้ลูกค้า";
            break;
        case "salary":
            titleEl.innerText = "เงินเดือนพนักงานขับรถ (Driver Salary)";
            subtitleEl.innerText = "คำนวณเงินเดือนพื้นฐาน เบี้ยเลี้ยงเที่ยววิ่ง และสรุปจ่ายรายเดือน";
            break;
        case "subcontractor":
            titleEl.innerText = "ค่าจ้างผู้รับเหมาช่วง (Sub Contractor)";
            subtitleEl.innerText = "สรุปบัญชีเจ้าหนี้ ค่าจ้างขนส่ง หักภาษี ณ ที่จ่าย 3%";
            break;
        case "trucks":
            titleEl.innerText = "ทะเบียนรถบรรทุก (Truck Master)";
            subtitleEl.innerText = "จัดการทะเบียนรถและประเภทรถในระบบเพื่อควบคุมคุณภาพข้อมูล ป้องกันสะกดคำผิด";
            break;
        case "customers":
            titleEl.innerText = "ข้อมูลลูกค้า (Customer Master)";
            subtitleEl.innerText = "จัดการรายชื่อลูกค้า เครดิตเทอม และข้อมูลติดต่อ ป้องกันการคีย์ชื่อลูกค้าผิดพลาด";
            break;
        case "drivermaster":
            titleEl.innerText = "ข้อมูลคนขับรถ (Driver Master)";
            subtitleEl.innerText = "จัดการประวัติพนักงานขับรถ อัตราเงินเดือน และเบี้ยเลี้ยงเที่ยววิ่ง";
            break;
        case "routemaster":
            titleEl.innerText = "เส้นทาง & ราคา (Route Master)";
            subtitleEl.innerText = "จัดการเส้นทางและราคาต่อลูกค้า เพื่อให้ Booking auto-fill ราคาได้ทันที";
            break;
        case "report-jobs":
            titleEl.innerText = "รายงานวิ่งรถ (Job Report)";
            subtitleEl.innerText = "ค้นหาและกรองงานขนส่งตามช่วงวันที่ คนขับ เส้นทาง และสถานะ";
            break;
        case "report-billing":
            titleEl.innerText = "รายงานวางบิล (Billing Report)";
            subtitleEl.innerText = "สรุปรายการขนส่งเพื่อวางบิลลูกค้ารายเดือน";
            break;
        case "report-monthly":
            titleEl.innerText = "รายงานวิ่งประจำเดือน";
            subtitleEl.innerText = "สรุปการวิ่งงานและรายได้รายเดือนแยกตามคนขับ";
            break;
    }
}

function renderTabContent(tab) {
    updateDashboardStats();
    
    switch(tab) {
        case "dashboard":
            renderDashboard();
            break;
        case "booking":
            renderBookings();
            break;
        case "joborder":
            renderJobs();
            break;
        case "jobstatus":
            renderJobStatusConfirmations();
            break;
        case "billing":
            renderBillingPage();
            break;
        case "receipt":
            renderReceiptPage();
            break;
        case "salary":
            renderSalaryPage();
            break;
        case "subcontractor":
            renderSubcontractorPage();
            break;
        case "trucks":
            renderTrucksMasterPage();
            break;
        case "customers":
            renderCustomers();
            break;
        case "drivermaster":
            renderDriversMaster();
            break;
        case "routemaster":
            renderRouteMasters();
            break;
        case "report-jobs":
            renderReportJobs();
            break;
        case "report-billing":
            populateBillingCustomerSelect();
            renderReportBilling();
            break;
        case "report-monthly":
            populateMonthlyDriverSelect();
            renderReportMonthly();
            break;
    }
}

// FORMATTERS
const formatMoney = (amount) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
};
const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};

// POPULATE FORMS
function populateFormSelects() {
    const driverSelect = document.getElementById("assign-driver");
    driverSelect.innerHTML = "";
    state.drivers.forEach(drv => {
        driverSelect.innerHTML += `<option value="${drv.id}">${drv.name} (${drv.license || "-"})</option>`;
    });

    const subSelect = document.getElementById("assign-subcontractor");
    subSelect.innerHTML = "";
    state.subcontractors.forEach(sub => {
        subSelect.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
    });

    const bkTruckSelect = document.getElementById("bk-truck-select");
    if (bkTruckSelect) {
        bkTruckSelect.innerHTML = `<option value="manual">-- ป้อนทะเบียนเอง (Manual Input) --</option>`;
        state.trucks.forEach(t => {
            const ownerText = t.ownerType === "own" ? "รถบริษัท" : "รถร่วม";
            const labelText = `${t.plateNo} - [${t.type}] - (${ownerText}: ${t.driverName || t.subconName})`;
            bkTruckSelect.innerHTML += `<option value="${t.plateNo}">${labelText}</option>`;
        });
    }

    // Customer dropdown in booking form
    const bkCustomerSel = document.getElementById("bk-customer-select");
    if (bkCustomerSel) {
        bkCustomerSel.innerHTML = `<option value="">-- เลือกจากรายชื่อ --</option>`;
        state.customers.forEach(c => {
            bkCustomerSel.innerHTML += `<option value="${c.name}">${c.name}</option>`;
        });
    }

    // Customer dropdown in route master form
    const rmCustomerSel = document.getElementById("rm-customer-select");
    if (rmCustomerSel) {
        rmCustomerSel.innerHTML = `<option value="">-- เลือกจากรายชื่อ --</option>`;
        state.customers.forEach(c => {
            rmCustomerSel.innerHTML += `<option value="${c.name}">${c.name}</option>`;
        });
    }

    // Route master filter dropdown
    const rmFilterSel = document.getElementById("route-master-filter-customer");
    if (rmFilterSel) {
        const currentVal = rmFilterSel.value;
        rmFilterSel.innerHTML = `<option value="">ทุกลูกค้า</option>`;
        const uniqueCustomers = [...new Set(state.routeMasters.map(r => r.customer))].sort();
        uniqueCustomers.forEach(name => {
            rmFilterSel.innerHTML += `<option value="${name}"${currentVal===name?' selected':''}>${name}</option>`;
        });
    }
}

// -----------------------------------------
// 10. CUSTOMER MASTER CONTROLLER
// -----------------------------------------
function renderCustomers() {
    const tbody = document.getElementById("customers-tbody");
    if (!tbody) return;
    const search = (document.getElementById("customer-search")?.value || "").toLowerCase();
    const filtered = state.customers.filter(c =>
        c.name.toLowerCase().includes(search) || (c.phone || "").includes(search)
    );
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="color:var(--text-muted);">ไม่มีข้อมูลลูกค้าในระบบ</td></tr>`;
        return;
    }
    tbody.innerHTML = filtered.map(c => `
        <tr>
            <td><span class="badge badge-pending" style="font-size:11px;">${c.id}</span></td>
            <td style="font-weight:600;">${c.name}</td>
            <td>${c.contact || "-"}</td>
            <td>${c.phone || "-"}</td>
            <td style="font-size:12px;color:var(--text-secondary);">${c.address || "-"}</td>
            <td>${c.taxId || "-"}</td>
            <td class="text-center">${c.creditDays ?? 30} วัน</td>
            <td class="text-right">
                <button class="btn btn-secondary btn-sm" onclick="openEditCustomer('${c.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm" style="background:rgba(220,53,69,0.15);color:#ff6b6b;border:1px solid rgba(220,53,69,0.3);" onclick="deleteCustomer('${c.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join("");
}

function openEditCustomer(id) {
    const c = state.customers.find(x => x.id === id);
    if (!c) return;
    document.getElementById("modal-customer-title").innerHTML = `<i class="fa-solid fa-pen"></i> แก้ไขข้อมูลลูกค้า`;
    document.getElementById("cus-edit-id").value = c.id;
    document.getElementById("cus-name").value = c.name;
    document.getElementById("cus-contact").value = c.contact || "";
    document.getElementById("cus-phone").value = c.phone || "";
    document.getElementById("cus-credit").value = c.creditDays ?? 30;
    document.getElementById("cus-address").value = c.address || "";
    document.getElementById("cus-taxid").value = c.taxId || "";
    openModal("modal-add-customer");
}

function submitCustomer(event) {
    event.preventDefault();
    const editId = document.getElementById("cus-edit-id").value;
    const data = {
        id: editId || `cus-${Date.now()}`,
        name: document.getElementById("cus-name").value.trim(),
        contact: document.getElementById("cus-contact").value.trim(),
        phone: document.getElementById("cus-phone").value.trim(),
        creditDays: parseInt(document.getElementById("cus-credit").value) || 30,
        address: document.getElementById("cus-address").value.trim(),
        taxId: document.getElementById("cus-taxid").value.trim()
    };
    if (editId) {
        const idx = state.customers.findIndex(x => x.id === editId);
        if (idx !== -1) state.customers[idx] = data;
    } else {
        state.customers.push(data);
    }
    saveStateToStorage();
    populateFormSelects();
    closeModal("modal-add-customer");
    document.getElementById("form-add-customer").reset();
    document.getElementById("cus-edit-id").value = "";
    document.getElementById("modal-customer-title").innerHTML = `<i class="fa-solid fa-building-user"></i> เพิ่มข้อมูลลูกค้าใหม่`;
    renderCustomers();
}

function deleteCustomer(id) {
    if (!confirm("ต้องการลบลูกค้ารายนี้ออกจากระบบ?")) return;
    state.customers = state.customers.filter(x => x.id !== id);
    saveStateToStorage();
    populateFormSelects();
    renderCustomers();
}

// -----------------------------------------
// 11. DRIVER MASTER CONTROLLER
// -----------------------------------------
function renderDriversMaster() {
    const tbody = document.getElementById("drivers-master-tbody");
    if (!tbody) return;
    const search = (document.getElementById("driver-master-search")?.value || "").toLowerCase();
    const filtered = state.drivers.filter(d =>
        d.name.toLowerCase().includes(search) || (d.license || "").toLowerCase().includes(search)
    );
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:var(--text-muted);">ไม่มีข้อมูลคนขับในระบบ</td></tr>`;
        return;
    }
    tbody.innerHTML = filtered.map(d => `
        <tr>
            <td><span class="badge badge-active" style="font-size:11px;">${d.id}</span></td>
            <td style="font-weight:600;">${d.name}</td>
            <td>${d.phone || "-"}</td>
            <td>${d.license || "-"}</td>
            <td class="text-right">${formatMoney(d.baseSalary || 0)}</td>
            <td class="text-right">${formatMoney(d.tripAllowanceRate || 0)}</td>
            <td class="text-right">
                <button class="btn btn-secondary btn-sm" onclick="openEditDriver('${d.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm" style="background:rgba(220,53,69,0.15);color:#ff6b6b;border:1px solid rgba(220,53,69,0.3);" onclick="deleteDriver('${d.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join("");
}

function openEditDriver(id) {
    const d = state.drivers.find(x => x.id === id);
    if (!d) return;
    document.getElementById("modal-driver-title").innerHTML = `<i class="fa-solid fa-pen"></i> แก้ไขข้อมูลคนขับ`;
    document.getElementById("drv-edit-id").value = d.id;
    document.getElementById("drv-name").value = d.name;
    document.getElementById("drv-phone").value = d.phone || "";
    document.getElementById("drv-license").value = d.license || "";
    document.getElementById("drv-salary").value = d.baseSalary || 15000;
    document.getElementById("drv-allowance").value = d.tripAllowanceRate || 1200;
    openModal("modal-add-driver");
}

function submitDriver(event) {
    event.preventDefault();
    const editId = document.getElementById("drv-edit-id").value;
    const data = {
        id: editId || `drv-${Date.now()}`,
        name: document.getElementById("drv-name").value.trim(),
        phone: document.getElementById("drv-phone").value.trim(),
        license: document.getElementById("drv-license").value.trim(),
        baseSalary: parseFloat(document.getElementById("drv-salary").value) || 15000,
        tripAllowanceRate: parseFloat(document.getElementById("drv-allowance").value) || 1200
    };
    if (editId) {
        const idx = state.drivers.findIndex(x => x.id === editId);
        if (idx !== -1) state.drivers[idx] = data;
    } else {
        state.drivers.push(data);
    }
    saveStateToStorage();
    populateFormSelects();
    closeModal("modal-add-driver");
    document.getElementById("form-add-driver").reset();
    document.getElementById("drv-edit-id").value = "";
    document.getElementById("modal-driver-title").innerHTML = `<i class="fa-solid fa-id-card"></i> เพิ่มข้อมูลคนขับใหม่`;
    renderDriversMaster();
}

function deleteDriver(id) {
    if (!confirm("ต้องการลบคนขับรายนี้ออกจากระบบ?")) return;
    state.drivers = state.drivers.filter(x => x.id !== id);
    saveStateToStorage();
    populateFormSelects();
    renderDriversMaster();
}

// -----------------------------------------
// 12. ROUTE MASTER CONTROLLER
// -----------------------------------------
function sortRouteBy(field) {
    if (state.routeSort.field === field) {
        state.routeSort.dir *= -1;
    } else {
        state.routeSort = { field, dir: 1 };
    }
    renderRouteMasters();
}

function _routeSortIcon(field) {
    if (state.routeSort.field !== field) return `<i class="fa-solid fa-sort" style="opacity:0.3;margin-left:4px;font-size:10px;"></i>`;
    return state.routeSort.dir === 1
        ? `<i class="fa-solid fa-sort-up" style="margin-left:4px;font-size:10px;color:var(--color-primary);"></i>`
        : `<i class="fa-solid fa-sort-down" style="margin-left:4px;font-size:10px;color:var(--color-primary);"></i>`;
}

function renderRouteMasters() {
    const tbody = document.getElementById("route-masters-tbody");
    if (!tbody) return;

    // update sortable headers
    const thMap = {
        customer: "th-route-customer",
        shipper: "th-route-shipper",
        origin: "th-route-origin",
        destination: "th-route-destination",
        truckType: "th-route-trucktype"
    };
    Object.entries(thMap).forEach(([f, id]) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = el.dataset.label + _routeSortIcon(f);
    });

    const search = (document.getElementById("route-master-search")?.value || "").toLowerCase();
    const filterCus = document.getElementById("route-master-filter-customer")?.value || "";
    let filtered = state.routeMasters.filter(r =>
        (!filterCus || r.customer === filterCus) &&
        (r.customer.toLowerCase().includes(search) ||
         (r.destination || "").toLowerCase().includes(search) ||
         (r.origin || "").toLowerCase().includes(search))
    );

    const { field, dir } = state.routeSort;
    filtered = filtered.slice().sort((a, b) => {
        const av = (a[field] || "").toString().toLowerCase();
        const bv = (b[field] || "").toString().toLowerCase();
        return av < bv ? -dir : av > bv ? dir : 0;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="color:var(--text-muted);">ไม่มีข้อมูลเส้นทางในระบบ — กด "เพิ่มเส้นทางใหม่" หรือสร้าง Booking แล้วเลือกบันทึกลง Master</td></tr>`;
        return;
    }
    tbody.innerHTML = filtered.map(r => `
        <tr>
            <td style="font-weight:600;">${r.customer}</td>
            <td style="color:var(--text-secondary);">${r.shipper || "-"}</td>
            <td>${r.origin || "-"}</td>
            <td style="font-weight:600;">${r.destination}</td>
            <td><span class="badge" style="background:rgba(255,255,255,0.05);color:var(--text-primary);border:1px solid var(--border-color);">${r.truckType}</span></td>
            <td class="text-right" style="font-weight:600;color:var(--color-primary);">${Number(r.price).toLocaleString()} ฿</td>
            <td style="font-size:12px;color:var(--text-secondary);">${r.note || "-"}</td>
            <td class="text-right">
                <button class="btn btn-secondary btn-sm" onclick="openEditRouteMaster('${r.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm" style="background:rgba(220,53,69,0.15);color:#ff6b6b;border:1px solid rgba(220,53,69,0.3);" onclick="deleteRouteMaster('${r.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join("");
}

function openAddRouteMaster(prefill) {
    document.getElementById("modal-route-master-title").innerHTML = `<i class="fa-solid fa-map-location-dot"></i> เพิ่มเส้นทาง & ราคา`;
    document.getElementById("rm-edit-id").value = "";
    document.getElementById("rm-customer").value = prefill?.customer || "";
    document.getElementById("rm-customer-select").value = prefill?.customer || "";
    document.getElementById("rm-shipper").value = prefill?.shipper || "";
    document.getElementById("rm-origin").value = prefill?.origin || "";
    document.getElementById("rm-destination").value = prefill?.destination || "";
    document.getElementById("rm-truck-type").value = prefill?.truckType || "6W";
    document.getElementById("rm-price").value = prefill?.price || "";
    document.getElementById("rm-note").value = prefill?.note || "";
    openModal("modal-add-route-master");
}

function openEditRouteMaster(id) {
    const r = state.routeMasters.find(x => x.id === id);
    if (!r) return;
    document.getElementById("modal-route-master-title").innerHTML = `<i class="fa-solid fa-pen"></i> แก้ไขเส้นทาง & ราคา`;
    document.getElementById("rm-edit-id").value = r.id;
    document.getElementById("rm-customer").value = r.customer;
    document.getElementById("rm-customer-select").value = r.customer;
    document.getElementById("rm-shipper").value = r.shipper || "";
    document.getElementById("rm-origin").value = r.origin || "";
    document.getElementById("rm-destination").value = r.destination;
    document.getElementById("rm-truck-type").value = r.truckType;
    document.getElementById("rm-price").value = r.price;
    document.getElementById("rm-note").value = r.note || "";
    openModal("modal-add-route-master");
}

function submitRouteMaster(event) {
    event.preventDefault();
    const editId = document.getElementById("rm-edit-id").value;
    const data = {
        id: editId || `rm-${Date.now()}`,
        customer: document.getElementById("rm-customer").value.trim(),
        shipper: document.getElementById("rm-shipper").value.trim(),
        origin: document.getElementById("rm-origin").value.trim(),
        destination: document.getElementById("rm-destination").value.trim(),
        truckType: document.getElementById("rm-truck-type").value,
        price: parseFloat(document.getElementById("rm-price").value) || 0,
        note: document.getElementById("rm-note").value.trim()
    };
    if (editId) {
        const idx = state.routeMasters.findIndex(x => x.id === editId);
        if (idx !== -1) state.routeMasters[idx] = data;
    } else {
        state.routeMasters.push(data);
    }
    saveStateToStorage();
    populateFormSelects();
    closeModal("modal-add-route-master");
    document.getElementById("form-add-route-master").reset();
    document.getElementById("rm-edit-id").value = "";
    document.getElementById("modal-route-master-title").innerHTML = `<i class="fa-solid fa-map-location-dot"></i> เพิ่มเส้นทาง & ราคา`;
    renderRouteMasters();
}

function deleteRouteMaster(id) {
    if (!confirm("ต้องการลบเส้นทางนี้ออกจาก Master Data?")) return;
    state.routeMasters = state.routeMasters.filter(x => x.id !== id);
    saveStateToStorage();
    populateFormSelects();
    renderRouteMasters();
}

// -----------------------------------------
// 1. DASHBOARD CONTROLLER
// -----------------------------------------
function updateDashboardStats() {
    // Total Bookings
    document.getElementById("stat-total-bookings").innerText = state.bookings.length;

    // Active Jobs (In Progress)
    const activeJobs = state.jobs.filter(j => j.status === "In Progress").length;
    document.getElementById("stat-active-jobs").innerText = activeJobs;

    // Unpaid Invoices
    const unpaidInvoicesSum = state.invoices
        .filter(inv => inv.status === "Unpaid")
        .reduce((sum, inv) => sum + inv.total, 0);
    document.getElementById("stat-pending-billing").innerText = formatMoney(unpaidInvoicesSum);

    // Total Revenue (Paid Invoices)
    const totalRev = state.invoices
        .filter(inv => inv.status === "Paid")
        .reduce((sum, inv) => sum + inv.total, 0);
    document.getElementById("stat-total-revenue").innerText = formatMoney(totalRev);
}

function renderDashboard() {
    // Recent Jobs Table
    const tbody = document.getElementById("dashboard-jobs-table").querySelector("tbody");
    tbody.innerHTML = "";
    
    // Sort jobs to show latest / active first
    const sortedJobs = [...state.jobs].reverse().slice(0, 5);
    
    if (sortedJobs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: var(--text-muted);">ไม่มีรายการงานขนส่งในระบบ</td></tr>`;
    } else {
        sortedJobs.forEach(job => {
            const booking = state.bookings.find(b => b.id === job.bookingId);
            const rate = booking ? booking.price : 0;
            const statusBadge = getJobStatusBadge(job.status);
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${job.id}</strong></td>
                    <td>${job.customer}</td>
                    <td><div style="font-size:12px;">${job.origin} <i class="fa-solid fa-arrow-right" style="font-size: 10px; color: var(--text-muted);"></i> ${job.destination}</div></td>
                    <td>
                        <span style="font-size: 13px; font-weight: 500;">
                            ${job.type === 'own' ? '<i class="fa-solid fa-truck" style="color:var(--color-primary);"></i> ' + job.driverName : '<i class="fa-solid fa-handshake" style="color:var(--color-pending);"></i> ' + job.subconName}
                        </span>
                        <div style="font-size: 11px; color: var(--text-secondary);">${job.truckNo}</div>
                    </td>
                    <td>${formatMoney(rate)}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        });
    }

    // Render Notifications (Mock Logistics alerts)
    const notificationArea = document.getElementById("notification-area");
    notificationArea.innerHTML = "";

    const notifications = [
        { type: "info", text: "จองคิวรถใหม่: CP All ขนส่งอาหารแช่แข็ง ชลบุรี - ขอนแก่น รอการออกใบสั่งงาน" },
        { type: "success", text: "ใบแจ้งหนี้ INV-2605001 ได้รับการชำระเงินเรียบร้อยแล้ว" },
        { type: "warning", text: "รถทะเบียน 71-1122 กำลังล่าช้าในโซนบางปะอิน 15 นาที" }
    ];

    notifications.forEach(n => {
        let iconClass = "fa-circle-info text-primary";
        if (n.type === "success") iconClass = "fa-circle-check" ;
        if (n.type === "warning") iconClass = "fa-triangle-exclamation" ;
        
        notificationArea.innerHTML += `
            <div class="flex-gap-sm" style="background: rgba(255, 255, 255, 0.02); padding: 8px 12px; border-radius: var(--border-radius-sm); border-left: 3px solid ${n.type === 'success' ? '#10b981' : n.type === 'warning' ? '#f59e0b' : '#6366f1'}">
                <i class="fa-solid ${iconClass}"></i>
                <span>${n.text}</span>
            </div>
        `;
    });

    // Populate fleet statistics numbers
    const ownCount = state.jobs.filter(j => j.type === 'own').length;
    const subCount = state.jobs.filter(j => j.type === 'sub').length;
    document.getElementById("fleet-own-count").innerText = `${ownCount} เที่ยววิ่ง`;
    document.getElementById("fleet-sub-count").innerText = `${subCount} เที่ยววิ่ง`;

    // Render Charts
    initCharts();
}

function initCharts() {
    const ctxFinance = document.getElementById('financeChart').getContext('2d');
    const ctxFleet = document.getElementById('fleetStatusChart').getContext('2d');

    // Destroy previous instances if they exist
    if (financeChartInstance) financeChartInstance.destroy();
    if (fleetChartInstance) fleetChartInstance.destroy();

    // Financial calculations
    // Sum Client prices (Revenue) and Driver salary slips + Sub contractor fees (Expenses)
    const paidRevenue = state.invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.subtotal, 0);
    const pendingRevenue = state.invoices.filter(i => i.status === "Unpaid").reduce((s, i) => s + i.subtotal, 0);
    const subconCost = state.jobs.filter(j => j.type === "sub" && j.status === "Completed").reduce((s, j) => s + j.subconCost, 0);
    
    // Driver wages = Trip Allowance of completed own jobs
    const driverWages = state.jobs.filter(j => j.type === "own" && j.status === "Completed").reduce((s, j) => s + j.tripAllowance, 0);
    const fuelExpense = state.jobs.filter(j => j.type === "own" && j.status === "Completed").reduce((s, j) => s + j.fuelExpense, 0);
    const tollExpense = state.jobs.filter(j => j.type === "own" && j.status === "Completed").reduce((s, j) => s + j.tollExpense, 0);
    const otherExpense = state.jobs.filter(j => j.type === "own" && j.status === "Completed").reduce((s, j) => s + j.otherExpense, 0);

    const totalExpenses = subconCost + driverWages + fuelExpense + tollExpense + otherExpense;

    // 1. Finance Chart (Bar Chart)
    financeChartInstance = new Chart(ctxFinance, {
        type: 'bar',
        data: {
            labels: ['รายได้ที่รับแล้ว (Paid)', 'รายได้ค้างรับ (Unpaid)', 'ค่าจ้างซับคอน (Subcon Cost)', 'ค่าเที่ยว/สวัสดิการคนขับ', 'ค่าน้ำมันหน้างาน', 'ค่าด่วน/ค่าทางพิเศษ'],
            datasets: [{
                label: 'จำนวนเงิน (บาท)',
                data: [paidRevenue, pendingRevenue, subconCost, driverWages, fuelExpense, tollExpense],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.65)', // Emerald
                    'rgba(59, 130, 246, 0.65)',  // Blue
                    'rgba(245, 158, 11, 0.65)',  // Amber
                    'rgba(168, 85, 247, 0.65)',  // Purple
                    'rgba(239, 68, 68, 0.65)',   // Red
                    'rgba(99, 102, 241, 0.65)'   // Indigo
                ],
                borderColor: [
                    '#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#6366f1'
                ],
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ' ' + context.raw.toLocaleString() + ' บาท';
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                }
            }
        }
    });

    // 2. Fleet allocation chart (Pie chart)
    const completedOwn = state.jobs.filter(j => j.type === 'own' && j.status === 'Completed').length;
    const activeOwn = state.jobs.filter(j => j.type === 'own' && j.status === 'In Progress').length;
    const completedSub = state.jobs.filter(j => j.type === 'sub' && j.status === 'Completed').length;
    const activeSub = state.jobs.filter(j => j.type === 'sub' && j.status === 'In Progress').length;

    fleetChartInstance = new Chart(ctxFleet, {
        type: 'doughnut',
        data: {
            labels: ['รถบริษัท (เสร็จงาน)', 'รถบริษัท (วิ่งงาน)', 'ซับคอน (เสร็จงาน)', 'ซับคอน (วิ่งงาน)'],
            datasets: [{
                data: [completedOwn, activeOwn, completedSub, activeSub],
                backgroundColor: [
                    'rgba(99, 102, 241, 0.7)',
                    'rgba(99, 102, 241, 0.3)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(245, 158, 11, 0.3)'
                ],
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12 }
                }
            },
            cutout: '60%'
        }
    });
}

// Status Badges
function getJobStatusBadge(status) {
    if (status === "Completed") {
        return `<span class="badge badge-completed"><span class="badge-dot"></span>เสร็จสิ้น (Completed)</span>`;
    } else if (status === "In Progress") {
        return `<span class="badge badge-active"><span class="badge-dot"></span>กำลังส่ง (In Progress)</span>`;
    } else {
        return `<span class="badge badge-pending"><span class="badge-dot"></span>กำลังจัดรถ (Assigned)</span>`;
    }
}

// -----------------------------------------
// 2. BOOKING CONTROLLER
// -----------------------------------------
function sortBookingBy(field) {
    if (state.bookingSort.field === field) {
        state.bookingSort.dir *= -1;
    } else {
        state.bookingSort = { field, dir: 1 };
    }
    renderBookings();
}

function _bookingSortIcon(field) {
    if (state.bookingSort.field !== field) return `<i class="fa-solid fa-sort" style="opacity:0.3;margin-left:4px;font-size:10px;"></i>`;
    return state.bookingSort.dir === 1
        ? `<i class="fa-solid fa-sort-up" style="margin-left:4px;font-size:10px;color:var(--color-primary);"></i>`
        : `<i class="fa-solid fa-sort-down" style="margin-left:4px;font-size:10px;color:var(--color-primary);"></i>`;
}

function renderBookings() {
    const tbody = document.getElementById("bookings-table").querySelector("tbody");
    tbody.innerHTML = "";

    // update sortable headers
    const thMap = {
        date: "th-bk-date", customer: "th-bk-customer", shipper: "th-bk-shipper",
        origin: "th-bk-origin", destination: "th-bk-destination", truckType: "th-bk-trucktype"
    };
    Object.entries(thMap).forEach(([f, id]) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = el.dataset.label + _bookingSortIcon(f);
    });

    const searchQuery = document.getElementById("booking-search").value.toLowerCase();
    const filterStatus = document.getElementById("booking-filter-status").value;

    let filteredBookings = state.bookings.filter(bk => {
        const matchesSearch = bk.customer.toLowerCase().includes(searchQuery) ||
                              bk.id.toLowerCase().includes(searchQuery) ||
                              (bk.driverName && bk.driverName.toLowerCase().includes(searchQuery)) ||
                              (bk.subconName && bk.subconName.toLowerCase().includes(searchQuery));
        const matchesStatus = filterStatus === "all" || bk.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const { field, dir } = state.bookingSort;
    filteredBookings = filteredBookings.slice().sort((a, b) => {
        const av = (a[field] || "").toString().toLowerCase();
        const bv = (b[field] || "").toString().toLowerCase();
        return av < bv ? -dir : av > bv ? dir : 0;
    });

    if (filteredBookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="text-center" style="color: var(--text-muted); padding: 40px;">ไม่พบข้อมูลการจองคิวรถ</td></tr>`;
        return;
    }

    filteredBookings.forEach(bk => {
        let statusBadge = "";
        let actionButtons = "";

        if (bk.status === "Pending") {
            statusBadge = `<span class="badge badge-pending"><span class="badge-dot"></span>รอการจัดรถ</span>`;
            actionButtons = `
                <button class="btn btn-success btn-icon-only" title="ออกใบสั่งงาน" onclick="openAssignJobModal('${bk.id}')">
                    <i class="fa-solid fa-truck-ramp-box"></i>
                </button>
                <button class="btn btn-danger btn-icon-only" title="ยกเลิกการจอง" onclick="cancelBooking('${bk.id}')">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
        } else if (bk.status === "Confirmed") {
            statusBadge = `<span class="badge badge-active"><span class="badge-dot"></span>ยืนยันงานแล้ว</span>`;
            actionButtons = `<span style="font-size: 12px; color: var(--text-muted);">จัดรถเรียบร้อย</span>`;
        } else {
            statusBadge = `<span class="badge badge-danger"><span class="badge-dot"></span>ยกเลิกแล้ว</span>`;
            actionButtons = `<span style="font-size: 12px; color: var(--text-muted);">-</span>`;
        }

        tbody.innerHTML += `
            <tr>
                <td><strong>${bk.id}</strong></td>
                <td>${formatDate(bk.date)}</td>
                <td>${bk.customer}</td>
                <td>${bk.shipper || "-"}</td>
                <td>${bk.origin || "-"}</td>
                <td>${bk.time || "-"}</td>
                <td>${bk.destination}</td>
                <td><span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-primary); border: 1px solid var(--border-color);">${bk.truckType}</span></td>
                <td>
                    ${bk.driverName ? `<strong>${bk.driverName}</strong><div style="font-size:11px; color:var(--text-secondary);">${bk.truckNo || "-"}</div>` : `<span style="color:var(--text-muted); font-size:12px;">ไม่ได้กำหนด</span>`}
                </td>
                <td>
                    ${bk.subconName ? `<strong>${bk.subconName}</strong><div style="font-size:11px; color:var(--text-secondary);">${bk.subconTruckNo || "-"}</div>` : `<span style="color:var(--text-muted); font-size:12px;">ไม่ได้กำหนด</span>`}
                </td>
                <td><strong>${formatMoney(bk.price)}</strong></td>
                <td>${statusBadge}</td>
                <td class="text-right"><div class="flex-gap-sm" style="justify-content: flex-end;">${actionButtons}</div></td>
            </tr>
        `;
    });
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add("active");
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove("active");
    if (modalId === "modal-confirm-job") {
        document.getElementById("status-update-action").closest(".form-group").style.display = "block";
    }
}

function onBookingCustomerSelect(val) {
    if (val) document.getElementById("bk-customer").value = val;

    // Populate route master dropdown for this customer
    const routeSection = document.getElementById("bk-route-master-section");
    const routeSelect = document.getElementById("bk-route-select");
    if (!routeSection || !routeSelect) return;

    const routes = state.routeMasters.filter(r => r.customer === val);
    if (routes.length === 0) {
        routeSection.style.display = "none";
        return;
    }

    routeSection.style.display = "block";
    routeSelect.innerHTML = `<option value="">-- เลือกเส้นทาง (หรือระบุเองด้านล่าง) --</option>`;
    routes.forEach(r => {
        const label = `${r.origin || r.shipper || "-"} → ${r.destination} [${r.truckType}] ฿${Number(r.price).toLocaleString()}`;
        routeSelect.innerHTML += `<option value="${r.id}">${label}</option>`;
    });
}

function onBookingRouteSelect(routeId) {
    if (!routeId) return;
    const r = state.routeMasters.find(x => x.id === routeId);
    if (!r) return;
    if (r.shipper) document.getElementById("bk-shipper").value = r.shipper;
    if (r.origin) document.getElementById("bk-origin").value = r.origin;
    document.getElementById("bk-destination").value = r.destination;
    document.getElementById("bk-truck-type").value = r.truckType;
    document.getElementById("bk-price").value = r.price;
}

async function submitBooking(event) {
    event.preventDefault();
    const customer = document.getElementById("bk-customer").value;
    const date = document.getElementById("bk-date").value;
    const shipper = document.getElementById("bk-shipper").value;
    const origin = document.getElementById("bk-origin").value;
    const time = document.getElementById("bk-time").value;
    const destination = document.getElementById("bk-destination").value;
    const truckType = document.getElementById("bk-truck-type").value;
    const price = parseFloat(document.getElementById("bk-price").value) || 0;

    // Optional pre-assignments
    const driverName = document.getElementById("bk-driver-name").value;
    const truckNo = document.getElementById("bk-truck-no").value;
    const subconName = document.getElementById("bk-subcon-name").value;
    const subconTruckNo = document.getElementById("bk-subcon-truck-no").value;

    const bookingId = await fetchNextNumber("BK");

    const isPreAssigned = (driverName || subconName);
    const status = isPreAssigned ? "Confirmed" : "Pending";

    const newBooking = {
        id: bookingId,
        customer,
        date,
        cargo: "งานขนส่งจากระบบจอง",
        shipper,
        origin,
        time,
        destination,
        truckType,
        price,
        status,
        driverName,
        truckNo,
        subconName,
        subconTruckNo
    };

    state.bookings.push(newBooking);

    // Ask to save route to master if not already there
    const routeExists = state.routeMasters.some(r =>
        r.customer === customer &&
        r.destination === destination &&
        r.truckType === truckType
    );
    if (!routeExists && destination && truckType && price > 0) {
        if (confirm(`บันทึกเส้นทาง "${destination}" [${truckType}] ฿${price.toLocaleString()} ลง Route Master สำหรับลูกค้า "${customer}" หรือไม่?`)) {
            state.routeMasters.push({
                id: `rm-${Date.now()}`,
                customer,
                shipper,
                origin,
                destination,
                truckType,
                price,
                note: ""
            });
        }
    }

    // If pre-assigned, automatically spawn a Job Order!
    if (isPreAssigned) {
        const jobId = await fetchNextNumber("JOB");

        const isSub = !!subconName;
        
        let newJob = {
            id: jobId,
            bookingId: bookingId,
            customer: customer,
            origin: origin || shipper || "ต้นทาง",
            destination: destination,
            type: isSub ? "sub" : "own",
            status: "Assigned",
            billingStatus: "Unbilled",
            fuelExpense: 0,
            tollExpense: 0,
            otherExpense: 0,
            closeNote: "",
            lastLocation: "กำลังจัดรถขนส่ง (Pre-assigned)"
        };

        if (isSub) {
            newJob.driverId = "";
            newJob.driverName = driverName || "คนขับร่วม";
            newJob.truckNo = subconTruckNo || truckNo || "ทะเบียนร่วม";
            newJob.tripAllowance = 0;
            
            // Search or assign default subcon
            const foundSub = state.subcontractors.find(s => s.name.includes(subconName));
            newJob.subconId = foundSub ? foundSub.id : "sub-001";
            newJob.subconName = foundSub ? foundSub.name : subconName;
            newJob.subconCost = price * 0.8; // default 80% cost
        } else {
            const foundDriver = state.drivers.find(d => d.name.includes(driverName));
            newJob.driverId = foundDriver ? foundDriver.id : "drv-001";
            newJob.driverName = foundDriver ? foundDriver.name : driverName;
            newJob.truckNo = truckNo || "ทะเบียนบริษัท";
            newJob.tripAllowance = foundDriver ? foundDriver.tripAllowanceRate : 1200;
            newJob.subconId = "";
            newJob.subconName = "";
            newJob.subconCost = 0;
        }

        state.jobs.push(newJob);
    }

    saveStateToStorage();
    closeModal("modal-add-booking");
    document.getElementById("form-add-booking").reset();
    renderBookings();
    updateDashboardStats();
}

function cancelBooking(id) {
    if (confirm(`คุณต้องการยกเลิกใบจอง ${id} หรือไม่?`)) {
        const bkIndex = state.bookings.findIndex(b => b.id === id);
        if (bkIndex > -1) {
            state.bookings[bkIndex].status = "Cancelled";
            saveStateToStorage();
            renderBookings();
            updateDashboardStats();
        }
    }
}

// -----------------------------------------
// 3. JOB ORDER CONTROLLER
// -----------------------------------------
function sortJobBy(field) {
    if (state.jobSort.field === field) {
        state.jobSort.dir *= -1;
    } else {
        state.jobSort = { field, dir: 1 };
    }
    renderJobs();
}

function _jobSortIcon(field) {
    if (state.jobSort.field !== field) return `<i class="fa-solid fa-sort" style="opacity:0.3;margin-left:4px;font-size:10px;"></i>`;
    return state.jobSort.dir === 1
        ? `<i class="fa-solid fa-sort-up" style="margin-left:4px;font-size:10px;color:var(--color-primary);"></i>`
        : `<i class="fa-solid fa-sort-down" style="margin-left:4px;font-size:10px;color:var(--color-primary);"></i>`;
}

function renderJobs() {
    const tbody = document.getElementById("jobs-table").querySelector("tbody");
    tbody.innerHTML = "";

    const thMap = {
        id: "th-job-id", customer: "th-job-customer",
        truckType: "th-job-trucktype", route: "th-job-route", status: "th-job-status"
    };
    Object.entries(thMap).forEach(([f, id]) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = el.dataset.label + _jobSortIcon(f);
    });

    const searchQuery = document.getElementById("job-search").value.toLowerCase();
    const filterType = document.getElementById("job-filter-type").value;
    const filterStatus = document.getElementById("job-filter-status").value;

    let filteredJobs = state.jobs.filter(job => {
        const matchesSearch = job.customer.toLowerCase().includes(searchQuery) ||
                              job.id.toLowerCase().includes(searchQuery) ||
                              job.driverName.toLowerCase().includes(searchQuery) ||
                              job.subconName.toLowerCase().includes(searchQuery);
        const matchesType = filterType === "all" || job.type === filterType;
        const matchesStatus = filterStatus === "all" || job.status === filterStatus;
        return matchesSearch && matchesType && matchesStatus;
    });

    const { field, dir } = state.jobSort;
    filteredJobs = filteredJobs.slice().sort((a, b) => {
        let av, bv;
        if (field === "truckType") {
            const bkA = state.bookings.find(bk => bk.id === a.bookingId);
            const bkB = state.bookings.find(bk => bk.id === b.bookingId);
            av = (bkA?.truckType || "").toLowerCase();
            bv = (bkB?.truckType || "").toLowerCase();
        } else if (field === "route") {
            av = ((a.origin || "") + (a.destination || "")).toLowerCase();
            bv = ((b.origin || "") + (b.destination || "")).toLowerCase();
        } else {
            av = (a[field] || "").toString().toLowerCase();
            bv = (b[field] || "").toString().toLowerCase();
        }
        return av < bv ? -dir : av > bv ? dir : 0;
    });

    if (filteredJobs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center" style="color: var(--text-muted); padding: 40px;">ไม่พบข้อมูลใบสั่งงานขนส่ง</td></tr>`;
        return;
    }

    filteredJobs.forEach(job => {
        const statusBadge = getJobStatusBadge(job.status);
        let vendorText = "";
        let detailsText = "";
        let costText = "";

        if (job.type === "own") {
            vendorText = `<span class="badge badge-active">รถบริษัท (Own)</span>`;
            detailsText = `<div><strong>คนขับ:</strong> ${job.driverName}</div><div><strong>ทะเบียน:</strong> ${job.truckNo}</div>`;
            costText = `<div><strong>เบี้ยเลี้ยง:</strong> ${formatMoney(job.tripAllowance)}</div>`;
        } else {
            vendorText = `<span class="badge badge-pending">ซับคอน (Sub)</span>`;
            detailsText = `<div><strong>บริษัท:</strong> ${job.subconName}</div><div><strong>คนขับ:</strong> ${job.driverName} (${job.truckNo})</div>`;
            costText = `<div><strong>ค่าจ้าง:</strong> ${formatMoney(job.subconCost)}</div>`;
        }

        tbody.innerHTML += `
            <tr>
                <td><strong>${job.id}</strong></td>
                <td>${job.bookingId}</td>
                <td>${job.customer}</td>
                <td>${state.bookings.find(b => b.id === job.bookingId)?.truckType || "-"}</td>
                <td><div style="font-size:12px;">${job.origin} <i class="fa-solid fa-arrow-right" style="font-size:10px; color:var(--text-muted);"></i> ${job.destination}</div></td>
                <td>${vendorText}</td>
                <td><div style="font-size: 13px;">${detailsText}</div></td>
                <td><div style="font-size: 13px;">${costText}</div></td>
                <td>${statusBadge}</td>
                <td class="text-right" style="white-space:nowrap;">
                    <button class="btn btn-secondary btn-icon-only" title="ดูใบปฏิบัติงาน" onclick="viewJobOrder('${job.id}')">
                        <i class="fa-solid fa-file-lines"></i>
                    </button>
                    ${job.status !== "Completed" ? `
                        <button class="btn btn-secondary btn-icon-only" title="อัปเดตหน้างาน" onclick="openConfirmJobModal('${job.id}')" style="margin-left:4px;">
                            <i class="fa-solid fa-location-crosshairs"></i>
                        </button>
                    ` : ""}
                </td>
            </tr>
        `;
    });
}

function togglePreviewPanel(prefix) {
    const layout = document.getElementById(`${prefix}-layout`) || document.getElementById("job-order-layout");
    const panel = document.getElementById(`${prefix}-preview-panel`);
    const body = document.getElementById(`${prefix}-preview-body`);
    const title = document.getElementById(`${prefix}-preview-title`);
    const printBtn = document.getElementById(`${prefix}-print-btn`);
    const icon = document.querySelector(`#${prefix}-toggle-btn i`);
    if (!panel) return;
    const collapsed = panel.dataset.collapsed === "1";
    if (collapsed) {
        if (layout) layout.style.gridTemplateColumns = "2fr 1fr";
        body.style.display = "block";
        title.style.display = "";
        if (printBtn) printBtn.style.display = "";
        icon.className = "fa-solid fa-chevron-right";
        panel.dataset.collapsed = "0";
    } else {
        if (layout) layout.style.gridTemplateColumns = "1fr 44px";
        body.style.display = "none";
        title.style.display = "none";
        if (printBtn) printBtn.style.display = "none";
        icon.className = "fa-solid fa-chevron-left";
        panel.dataset.collapsed = "1";
    }
}

function toggleJobOrderPreview() { togglePreviewPanel("job-order"); }

function viewJobOrder(jobId) {
    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;
    const booking = state.bookings.find(b => b.id === job.bookingId);

    const previewEl = document.getElementById("job-order-preview-area");
    const placeholderEl = document.getElementById("job-order-preview-placeholder");
    if (!previewEl) return;

    // Auto-expand preview panel if collapsed
    const panel = document.getElementById("job-order-preview-panel");
    if (panel && panel.dataset.collapsed === "1") toggleJobOrderPreview();

    placeholderEl.style.display = "none";
    previewEl.style.display = "block";

    const truckType = booking?.truckType || job.truckType || "";
    const truckTypes = [
        { label: "4 ล้อ", val: "4W" },
        { label: "6 ล้อ", val: "6W" },
        { label: "10 ล้อ", val: "10W" },
        { label: "ตู้เย็น", val: "Reefer" },
        { label: "จัมโบ้", val: "จัมโบ้" },
        { label: "18 ล้อ", val: "18W" },
        { label: "22 ล้อ", val: "22W" },
    ];
    const checkboxes = truckTypes.map(t =>
        `<span style="margin-right:10px;white-space:nowrap;">
            <span style="display:inline-block;width:13px;height:13px;border:1.5px solid #000;border-radius:50%;vertical-align:middle;background:${truckType===t.val?'#000':'transparent'};margin-right:3px;"></span>${t.label}
        </span>`
    ).join("");

    const driver = state.drivers?.find(d => d.name === job.driverName);
    const driverTel = driver?.tel || "033-123458 / 085-xxxxxxx";
    const bookingDate = booking?.date ? new Date(booking.date).toLocaleDateString("th-TH", { day:"2-digit", month:"2-digit", year:"2-digit" }) : "";

    previewEl.innerHTML = `
        <div style="font-family:'Sarabun','Kanit',sans-serif;font-size:13px;color:#000;padding:4px;">
            <!-- Header -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px;">
                <div>
                    <div style="font-size:15px;font-weight:800;line-height:1.3;">บริษัท พรมณี 24 เอช ทรานสปอร์ต จำกัด</div>
                    <div style="font-size:10px;color:#475569;">PORNMANEE 24 H TRANSPORT COMPANY LIMITED</div>
                    <div style="font-size:10px;color:#475569;">333/123 ม.11 ต.หนองขาม อ.ศรีราชา จ.ชลบุรี 20110</div>
                    <div style="font-size:10px;color:#475569;">Tel. 085-3883716, 091-0053696 Fax. 033-123458</div>
                    <div style="font-size:10px;color:#475569;">E-mail: pmn-24h@hotmail.com</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:16px;font-weight:800;">ใบปฏิบัติงาน</div>
                    <div style="font-size:13px;font-weight:600;">JOB ORDER</div>
                    <div style="margin-top:6px;font-size:12px;"><strong>เลขที่:</strong> ${job.id}</div>
                    <div style="font-size:12px;"><strong>วันที่:</strong> ${bookingDate}</div>
                </div>
            </div>

            <!-- Body fields -->
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <tr>
                    <td style="width:35%;padding:5px 4px;border-bottom:1px solid #ddd;"><strong>ผู้ว่าจ้าง/ลูกค้า:</strong></td>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;">${job.customer}</td>
                </tr>
                <tr>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;"><strong>ต้นทาง (Start):</strong></td>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;">${job.origin}</td>
                </tr>
                <tr>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;"><strong>ปลายทาง (Destination):</strong></td>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;">${job.destination}</td>
                </tr>
                <tr>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;"><strong>อัดสินค้าเวลา:</strong></td>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
                </tr>
                <tr>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;"><strong>อัดสินค้าสำเร็จเวลา:</strong></td>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;">&nbsp;</td>
                </tr>
                <tr>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;"><strong>รับสินค้าสำเร็จเวลา:</strong></td>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;">&nbsp;</td>
                </tr>
                <tr>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;"><strong>จบงานเวลา:</strong></td>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;">&nbsp;</td>
                </tr>
                <tr>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;"><strong>ทะเบียนรถ:</strong></td>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;">${job.truckNo || "-"}</td>
                </tr>
                <tr>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;"><strong>ประเภทรถ:</strong></td>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;">${checkboxes}</td>
                </tr>
                <tr>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;"><strong>พนักงานขับรถ:</strong></td>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;">${job.driverName || (job.subconName || "-")}</td>
                </tr>
                <tr>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;"><strong>โทร.:</strong></td>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;">${driverTel}</td>
                </tr>
                <tr>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;"><strong>หมายเหตุ:</strong></td>
                    <td style="padding:5px 4px;border-bottom:1px solid #ddd;">&nbsp;</td>
                </tr>
            </table>

            <!-- Signatures -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:24px;text-align:center;">
                <div>
                    <div style="border-bottom:1px solid #000;height:44px;margin-bottom:6px;"></div>
                    <div style="font-size:11px;">ลายเซ็นหัวหน้า / ผู้ว่าจ้าง</div>
                    <div style="font-size:10px;color:#64748b;">CUSTOMER SIGNATURE</div>
                </div>
                <div>
                    <div style="border-bottom:1px solid #000;height:44px;margin-bottom:6px;"></div>
                    <div style="font-size:11px;">ผู้ขนงาน</div>
                    <div style="font-size:10px;color:#64748b;">LOADING</div>
                </div>
                <div>
                    <div style="border-bottom:1px solid #000;height:44px;margin-bottom:6px;"></div>
                    <div style="font-size:11px;">ผู้ปฏิบัติงาน</div>
                    <div style="font-size:10px;color:#64748b;">DRIVER</div>
                </div>
            </div>
        </div>
    `;
}

function openAssignJobModal(bookingId) {
    const booking = state.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    document.getElementById("assign-booking-id").value = bookingId;
    document.getElementById("assign-bk-id-text").innerText = booking.id;
    document.getElementById("assign-bk-customer-text").innerText = booking.customer;
    document.getElementById("assign-bk-route-text").innerText = `${booking.origin || booking.shipper || "ต้นทาง"} -> ${booking.destination}`;
    document.getElementById("assign-bk-trucktype-text").innerText = booking.truckType && booking.truckType.trim() ? booking.truckType : "-";
    document.getElementById("assign-bk-price-text").innerText = booking.price.toLocaleString();

    // Trucks busy on the same booking date (Assigned or In Progress)
    const busyTruckNos = new Set(
        state.jobs
            .filter(j => {
                const jBk = state.bookings.find(b => b.id === j.bookingId);
                return jBk && jBk.date === booking.date && ["Assigned", "In Progress"].includes(j.status);
            })
            .map(j => j.truckNo)
    );

    // Populate Own Truck select — same type + available
    const ownTruckSelect = document.getElementById("assign-own-truck-select");
    if (ownTruckSelect) {
        ownTruckSelect.innerHTML = "";
        const ownTrucks = state.trucks.filter(t =>
            t.ownerType === "own" &&
            t.type === booking.truckType &&
            !busyTruckNos.has(t.plateNo)
        );
        if (ownTrucks.length === 0) {
            ownTruckSelect.innerHTML = `<option value="">-- ไม่มีรถว่าง (${booking.truckType}) ในวันนี้ --</option>`;
        } else {
            ownTrucks.forEach(t => {
                ownTruckSelect.innerHTML += `<option value="${t.plateNo}">${t.plateNo} (${t.driverName})</option>`;
            });
            ownTruckSelect.value = ownTrucks[0].plateNo;
            autoFillAssignOwnTruck(ownTrucks[0].plateNo);
        }
    }

    // Populate Subcontractors select
    const subconSelect = document.getElementById("assign-subcontractor");
    if (subconSelect && subconSelect.value) {
        filterSubTruckSelect(subconSelect.value);
    }

    // Default view
    toggleAssignType("own");
    document.getElementById("assign-type").value = "own";

    openModal("modal-assign-job");
}

function toggleAssignType(type) {
    if (type === "own") {
        document.getElementById("assign-own-fields").style.display = "block";
        document.getElementById("assign-sub-fields").style.display = "none";
    } else {
        document.getElementById("assign-own-fields").style.display = "none";
        document.getElementById("assign-sub-fields").style.display = "block";
        // Initialize sub truck select on toggle
        const subconSelect = document.getElementById("assign-subcontractor");
        if (subconSelect && subconSelect.value) {
            filterSubTruckSelect(subconSelect.value);
        }
    }
}

async function submitJobAssignment(event) {
    event.preventDefault();
    const bookingId = document.getElementById("assign-booking-id").value;
    const type = document.getElementById("assign-type").value;
    const booking = state.bookings.find(b => b.id === bookingId);

    if (!booking) return;

    const jobId = await fetchNextNumber("JOB");
    let jobData = {
        id: jobId,
        bookingId: bookingId,
        customer: booking.customer,
        origin: booking.origin || booking.shipper || "ต้นทาง",
        destination: booking.destination,
        type: type,
        status: "Assigned",
        billingStatus: "Unbilled",
        fuelExpense: 0,
        tollExpense: 0,
        otherExpense: 0,
        closeNote: "",
        lastLocation: "กำลังจัดเตรียมรถและพนักงานขับรถ"
    };

    if (type === "own") {
        const truckPlate = document.getElementById("assign-own-truck-select").value;
        const driverId = document.getElementById("assign-driver").value;
        const driver = state.drivers.find(d => d.id === driverId);
        const tripAllowance = parseFloat(document.getElementById("assign-driver-trip-allowance").value) || 0;

        jobData.driverId = driverId;
        jobData.driverName = driver ? driver.name : "ไม่ระบุคนขับ";
        jobData.truckNo = truckPlate;
        jobData.tripAllowance = tripAllowance;
        jobData.subconId = "";
        jobData.subconName = "";
        jobData.subconCost = 0;
    } else {
        const subconId = document.getElementById("assign-subcontractor").value;
        const subcon = state.subcontractors.find(s => s.id === subconId);
        const subconCost = parseFloat(document.getElementById("assign-sub-cost").value) || 0;
        const subDriverName = document.getElementById("assign-sub-driver").value || "คนขับของซับคอนแทรคเตอร์";
        const subTruckNo = document.getElementById("assign-sub-truck").value || "ทะเบียนซับคอน";

        jobData.driverId = "";
        jobData.driverName = subDriverName;
        jobData.truckNo = subTruckNo;
        jobData.tripAllowance = 0;
        jobData.subconId = subconId;
        jobData.subconName = subcon ? subcon.name : "ผู้รับเหมาช่วง";
        jobData.subconCost = subconCost;
    }

    // Push to jobs
    state.jobs.push(jobData);
    
    // Update booking status to Confirmed
    booking.status = "Confirmed";
    booking.driverName = jobData.driverName;
    booking.truckNo = jobData.truckNo;
    booking.subconName = jobData.subconName;
    booking.subconTruckNo = jobData.truckNo;

    saveStateToStorage();
    closeModal("modal-assign-job");
    renderJobs();
    
    // If we're on booking tab, refresh bookings table
    if (window.location.hash === "#booking" || window.location.hash === "booking") {
        renderBookings();
    }
    updateDashboardStats();
}

// -----------------------------------------
// 4. OPERATION / STATUS CONFIRMATION CONTROLLER
// -----------------------------------------
function sortConfirmBy(field) {
    if (state.confirmSort.field === field) {
        state.confirmSort.dir *= -1;
    } else {
        state.confirmSort = { field, dir: 1 };
    }
    renderJobStatusConfirmations();
}

function _confirmSortIcon(field) {
    if (state.confirmSort.field !== field) return `<i class="fa-solid fa-sort" style="opacity:0.3;margin-left:4px;font-size:10px;"></i>`;
    return state.confirmSort.dir === 1
        ? `<i class="fa-solid fa-sort-up" style="margin-left:4px;font-size:10px;color:var(--color-primary);"></i>`
        : `<i class="fa-solid fa-sort-down" style="margin-left:4px;font-size:10px;color:var(--color-primary);"></i>`;
}

function renderJobStatusConfirmations() {
    const tbody = document.getElementById("confirm-jobs-table").querySelector("tbody");
    tbody.innerHTML = "";

    const thMap = {
        id: "th-cj-id", customer: "th-cj-customer",
        driverName: "th-cj-driver", status: "th-cj-status"
    };
    Object.entries(thMap).forEach(([f, id]) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = el.dataset.label + _confirmSortIcon(f);
    });

    const searchQuery = document.getElementById("confirm-job-search").value.toLowerCase();
    const filterStatus = document.getElementById("confirm-job-filter-status").value;

    let filteredJobs = state.jobs.filter(job => {
        const matchesSearch = job.id.toLowerCase().includes(searchQuery) ||
               job.customer.toLowerCase().includes(searchQuery) ||
               job.driverName.toLowerCase().includes(searchQuery) ||
               job.truckNo.toLowerCase().includes(searchQuery);
        const matchesStatus = filterStatus === "all" || job.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const { field, dir } = state.confirmSort;
    filteredJobs = filteredJobs.slice().sort((a, b) => {
        const av = (a[field] || "").toString().toLowerCase();
        const bv = (b[field] || "").toString().toLowerCase();
        return av < bv ? -dir : av > bv ? dir : 0;
    });

    if (filteredJobs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="color: var(--text-muted); padding: 40px;">ไม่พบรายการใบสั่งงานขนส่งที่ค้นหา</td></tr>`;
        return;
    }

    filteredJobs.forEach(job => {
        let statusBadge = "";
        let actionButtons = "";
        let actualExpensesSum = job.fuelExpense + job.tollExpense + job.otherExpense;

        if (job.status === "Assigned") {
            statusBadge = `<span class="badge badge-pending"><span class="badge-dot"></span>จัดงานรถแล้ว</span>`;
        } else if (job.status === "In Progress") {
            statusBadge = `<span class="badge badge-active"><span class="badge-dot"></span>อยู่ระหว่างส่ง</span>`;
        } else {
            statusBadge = `<span class="badge badge-completed"><span class="badge-dot"></span>เสร็จสิ้น (Closed)</span>`;
        }

        const hasPhoto = job.openPhoto || job.closePhoto;
        const photoBtn = hasPhoto
            ? `<button class="btn btn-sm" style="background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3);" onclick="viewJobPhotos('${job.id}')"><i class="fa-solid fa-images"></i></button>`
            : "";

        if (job.status === "Assigned") {
            actionButtons = `
                <div style="display:flex;gap:6px;justify-content:flex-end;align-items:center;">
                    ${photoBtn}
                    <button class="btn btn-sm" style="background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid rgba(34,197,94,0.3);" onclick="openJobDirect('${job.id}')">
                        <i class="fa-solid fa-play"></i> เปิดงาน
                    </button>
                </div>
            `;
        } else if (job.status === "In Progress") {
            actionButtons = `
                <div style="display:flex;gap:6px;justify-content:flex-end;align-items:center;">
                    ${photoBtn}
                    <button class="btn btn-sm" style="background:rgba(220,53,69,0.15);color:#ff6b6b;border:1px solid rgba(220,53,69,0.3);" onclick="openCloseJobModal('${job.id}')">
                        <i class="fa-solid fa-flag-checkered"></i> ปิดงาน
                    </button>
                </div>
            `;
        } else {
            actionButtons = `
                <div style="display:flex;gap:6px;justify-content:flex-end;align-items:center;">
                    ${photoBtn}
                    <span style="font-weight:500;font-size:12px;color:var(--color-completed);"><i class="fa-solid fa-circle-check"></i> ตรวจสอบแล้ว</span>
                </div>
            `;
        }

        tbody.innerHTML += `
            <tr>
                <td><strong>${job.id}</strong></td>
                <td>${job.customer}</td>
                <td><div style="font-size:12px;">${job.origin} -> ${job.destination}</div></td>
                <td>
                    <strong>${job.driverName}</strong>
                    <div style="font-size:11px; color:var(--text-secondary);">${job.truckNo} (${job.type === 'own' ? 'รถบริษัท' : 'ซับคอน'})</div>
                </td>
                <td>${job.type === 'own' ? formatMoney(job.tripAllowance) : '-'}</td>
                <td>
                    ${job.type === 'own' ? `<strong>${formatMoney(actualExpensesSum)}</strong><div style="font-size: 10px; color: var(--text-muted);">น้ำมัน: ${job.fuelExpense} ทางด่วน: ${job.tollExpense}</div>` : '<span style="color:var(--text-muted);">เหมาจ่ายซับคอน</span>'}
                </td>
                <td>
                    <div style="font-weight:600; font-size: 13px;">${job.status}</div>
                    <div style="font-size: 11px; color: var(--text-secondary);">${job.lastLocation}</div>
                </td>
                <td class="text-right">${actionButtons}</td>
            </tr>
        `;
    });
}

function openConfirmJobModal(jobId) {
    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;

    document.getElementById("status-job-id").value = jobId;
    document.getElementById("status-job-id-text").innerText = job.id;
    document.getElementById("status-customer-text").innerText = job.customer;
    document.getElementById("status-type-text").innerText = job.type === "own" ? "รถบริษัท (Own Fleet)" : "ผู้รับเหมาช่วง (Sub Contractor)";
    document.getElementById("status-driver-text").innerText = `${job.driverName} (${job.truckNo})`;

    // Reset fields
    document.getElementById("status-update-action").value = "In Progress";
    document.getElementById("status-current-loc").value = job.lastLocation;
    document.getElementById("status-fuel-cost").value = job.fuelExpense || 0;
    document.getElementById("status-toll-cost").value = job.tollExpense || 0;
    document.getElementById("status-other-cost").value = job.otherExpense || 0;
    document.getElementById("status-close-note").value = job.closeNote || "";

    toggleStatusActionFields("In Progress");

    openModal("modal-confirm-job");
}

function openJobDirect(jobId) {
    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;

    document.getElementById("open-job-id").value = jobId;
    document.getElementById("open-job-id-text").innerText = job.id;
    document.getElementById("open-job-customer-text").innerText = job.customer;
    document.getElementById("open-job-driver-text").innerText = `${job.driverName} (${job.truckNo})`;

    // reset form
    document.getElementById("open-job-photo").value = "";
    document.getElementById("open-job-preview").style.display = "none";
    document.getElementById("open-job-note-preset").value = "บรรจุเรียบร้อย";
    document.getElementById("open-job-note-custom-wrap").style.display = "none";
    document.getElementById("open-job-note-custom").value = "";

    openModal("modal-open-job");
}

function onOpenJobPresetChange(val) {
    document.getElementById("open-job-note-custom-wrap").style.display = val === "other" ? "block" : "none";
}

function submitOpenJob(event) {
    event.preventDefault();
    const jobId = document.getElementById("open-job-id").value;
    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;

    const preset = document.getElementById("open-job-note-preset").value;
    const note = preset === "other"
        ? (document.getElementById("open-job-note-custom").value || "อื่นๆ")
        : preset;

    job.status = "In Progress";
    job.lastLocation = "เริ่มออกปฏิบัติงาน";
    job.openNote = note;

    // save compressed photo if provided
    const photoInput = document.getElementById("open-job-photo");
    if (photoInput._compressedData) {
        job.openPhoto = photoInput._compressedData;
        photoInput._compressedData = null;
    }
    saveStateToStorage();

    closeModal("modal-open-job");
    renderJobStatusConfirmations();
    updateDashboardStats();
}

function previewPhoto(input, previewId) {
    const wrap = document.getElementById(previewId);
    const img = document.getElementById(previewId + "-img");
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = e => {
        const original = new Image();
        original.onload = () => {
            // resize to max 1024px wide, compress to 0.7 quality JPEG
            const MAX = 1024;
            let w = original.width;
            let h = original.height;
            if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }

            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            canvas.getContext("2d").drawImage(original, 0, 0, w, h);

            const compressed = canvas.toDataURL("image/jpeg", 0.7);
            img.src = compressed;
            wrap.style.display = "block";

            // store compressed on input element for submitOpenJob / submitJobStatusUpdate to read
            input._compressedData = compressed;
        };
        original.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function setCloseNote(text) {
    document.getElementById("status-close-note").value = text;
}

function viewJobPhotos(jobId) {
    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;

    document.getElementById("view-photos-job-id").innerText = job.id;

    const hasOpen = !!job.openPhoto;
    const hasClose = !!job.closePhoto;
    const hasAny = hasOpen || hasClose;

    document.getElementById("view-photos-empty").style.display = hasAny ? "none" : "block";

    const openWrap = document.getElementById("view-photos-open");
    openWrap.style.display = hasOpen ? "block" : "none";
    if (hasOpen) {
        document.getElementById("view-open-photo-img").src = job.openPhoto;
        document.getElementById("view-open-note").innerText = job.openNote ? `หมายเหตุ: ${job.openNote}` : "";
    }

    const closeWrap = document.getElementById("view-photos-close");
    closeWrap.style.display = hasClose ? "block" : "none";
    if (hasClose) {
        document.getElementById("view-close-photo-img").src = job.closePhoto;
        document.getElementById("view-close-note").innerText = job.closeNote ? `หมายเหตุ: ${job.closeNote}` : "";
    }

    openModal("modal-view-photos");
}

function openCloseJobModal(jobId) {
    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;

    document.getElementById("status-job-id").value = jobId;
    document.getElementById("status-job-id-text").innerText = job.id;
    document.getElementById("status-customer-text").innerText = job.customer;
    document.getElementById("status-type-text").innerText = job.type === "own" ? "รถบริษัท (Own Fleet)" : "ผู้รับเหมาช่วง (Sub Contractor)";
    document.getElementById("status-driver-text").innerText = `${job.driverName} (${job.truckNo})`;

    document.getElementById("status-update-action").value = "Completed";
    document.getElementById("status-fuel-cost").value = job.fuelExpense || 0;
    document.getElementById("status-toll-cost").value = job.tollExpense || 0;
    document.getElementById("status-other-cost").value = job.otherExpense || 0;
    document.getElementById("status-close-note").value = job.closeNote || "";

    // Hide action dropdown — fixed to Completed
    document.getElementById("status-update-action").closest(".form-group").style.display = "none";
    toggleStatusActionFields("Completed");

    openModal("modal-confirm-job");
}

function toggleStatusActionFields(action) {
    const jobType = document.getElementById("status-type-text").innerText;
    
    if (action === "In Progress") {
        document.getElementById("status-progress-fields").style.display = "block";
        document.getElementById("status-close-fields").style.display = "none";
    } else {
        document.getElementById("status-progress-fields").style.display = "none";
        // Show close job expenses details only if it is OWN company truck
        if (jobType.includes("รถบริษัท")) {
            document.getElementById("status-close-fields").style.display = "block";
        } else {
            // Subcontractor close has only status close note, no fuel/toll logged in our dashboard
            document.getElementById("status-close-fields").style.display = "block";
            document.getElementById("status-fuel-cost").parentElement.parentElement.style.display = "none";
            document.getElementById("status-toll-cost").parentElement.parentElement.style.display = "none";
        }
    }
}

function submitJobStatusUpdate(event) {
    event.preventDefault();
    const jobId = document.getElementById("status-job-id").value;
    const job = state.jobs.find(j => j.id === jobId);

    if (!job) return;

    const action = document.getElementById("status-update-action").value;

    if (action === "In Progress") {
        job.status = "In Progress";
        job.lastLocation = document.getElementById("status-current-loc").value;
    } else {
        job.status = "Completed";
        job.closeNote = document.getElementById("status-close-note").value || "ส่งสมบูรณ์";
        job.lastLocation = "ถึงปลายทางและส่งมอบสินค้าเรียบร้อย (Closed)";

        if (job.type === "own") {
            job.fuelExpense = parseFloat(document.getElementById("status-fuel-cost").value) || 0;
            job.tollExpense = parseFloat(document.getElementById("status-toll-cost").value) || 0;
            job.otherExpense = parseFloat(document.getElementById("status-other-cost").value) || 0;
        }

        // save compressed close photo
        const closePhotoInput = document.getElementById("close-job-photo");
        if (closePhotoInput && closePhotoInput._compressedData) {
            job.closePhoto = closePhotoInput._compressedData;
            closePhotoInput._compressedData = null;
            closePhotoInput.value = "";
            document.getElementById("close-job-preview").style.display = "none";
        }
    }

    saveStateToStorage();
    // Restore hidden dropdown before closing
    document.getElementById("status-update-action").closest(".form-group").style.display = "block";
    closeModal("modal-confirm-job");

    // Refresh page table
    if (window.location.hash === "#jobstatus") {
        renderJobStatusConfirmations();
    } else if (window.location.hash === "#joborder") {
        renderJobs();
    }
    updateDashboardStats();
}

// -----------------------------------------
// 5. BILLING & INVOICE CONTROLLER
// -----------------------------------------
function renderBillingPage() {
    // 1. Closed jobs table ready for billing
    const jobsTbody = document.getElementById("closed-jobs-billing-table").querySelector("tbody");
    jobsTbody.innerHTML = "";

    const unbilledClosedJobs = state.jobs.filter(j => j.status === "Completed" && j.billingStatus === "Unbilled");

    if (unbilledClosedJobs.length === 0) {
        jobsTbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color: var(--text-muted); padding: 24px;">ไม่มีรายการงานที่รอดำเนินการวางบิล</td></tr>`;
    } else {
        unbilledClosedJobs.forEach(job => {
            const booking = state.bookings.find(b => b.id === job.bookingId);
            const price = booking ? booking.price : 0;
            
            jobsTbody.innerHTML += `
                <tr>
                    <td><input type="checkbox" class="billing-checkbox" value="${job.id}" data-customer="${job.customer}"></td>
                    <td><strong>${job.id}</strong></td>
                    <td>${formatDate(booking ? booking.date : '')}</td>
                    <td>${job.customer}</td>
                    <td><div style="font-size:12px;">${job.origin} -> ${job.destination}</div></td>
                    <td class="text-right"><strong>${formatMoney(price)}</strong></td>
                    <td><span class="badge badge-pending">รอการดึงข้อมูล</span></td>
                </tr>
            `;
        });
    }

    // 2. Already generated invoices table
    const invTbody = document.getElementById("invoices-table").querySelector("tbody");
    invTbody.innerHTML = "";

    if (state.invoices.length === 0) {
        invTbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color: var(--text-muted); padding: 24px;">ยังไม่มีการออกใบแจ้งหนี้</td></tr>`;
    } else {
        [...state.invoices].reverse().forEach(inv => {
            let statusBadge = inv.status === "Paid" ? 
                `<span class="badge badge-completed"><span class="badge-dot"></span>ชำระแล้ว</span>` : 
                `<span class="badge badge-danger"><span class="badge-dot"></span>ค้างรับชำระ</span>`;

            invTbody.innerHTML += `
                <tr>
                    <td><strong>${inv.id}</strong></td>
                    <td>${inv.customer}</td>
                    <td>${formatDate(inv.date)}</td>
                    <td>${formatDate(inv.dueDate)}</td>
                    <td class="text-right"><strong>${formatMoney(inv.total)}</strong></td>
                    <td>${statusBadge}</td>
                    <td class="text-right">
                        <button class="btn btn-secondary btn-sm" onclick="viewInvoice('${inv.id}')">
                            <i class="fa-solid fa-file-pdf"></i> ดูเอกสาร
                        </button>
                    </td>
                </tr>
            `;
        });
    }
}

function toggleSelectAllBilling(master) {
    const checkboxes = document.querySelectorAll(".billing-checkbox");
    checkboxes.forEach(cb => {
        cb.checked = master.checked;
    });
}

async function generateInvoiceFromSelected() {
    const checkboxes = document.querySelectorAll(".billing-checkbox:checked");
    if (checkboxes.length === 0) {
        alert("กรุณาเลือกงานขนส่งที่ปิดแล้วอย่างน้อย 1 รายการเพื่อออกใบแจ้งหนี้");
        return;
    }

    // Group selected jobs by customer. Invoicing must be done per customer.
    let selectedJobIds = [];
    let customerName = "";
    let isSameCustomer = true;

    checkboxes.forEach((cb, idx) => {
        const jobId = cb.value;
        const jobCust = cb.getAttribute("data-customer");
        selectedJobIds.push(jobId);

        if (idx === 0) {
            customerName = jobCust;
        } else if (customerName !== jobCust) {
            isSameCustomer = false;
        }
    });

    if (!isSameCustomer) {
        alert("ขออภัย: ไม่สามารถรวมรายการของลูกค้าที่ต่างกันมาออกใบแจ้งหนี้ใบเดียวกันได้! กรุณาเลือกเฉพาะของลูกค้ารายเดียวกัน");
        return;
    }

    // Calculate invoice totals
    let subtotal = 0;
    let bookingIds = [];

    selectedJobIds.forEach(jobId => {
        const job = state.jobs.find(j => j.id === jobId);
        if (job) {
            const booking = state.bookings.find(b => b.id === job.bookingId);
            if (booking) {
                subtotal += booking.price;
                bookingIds.push(booking.id);
            }
            // Mark job status
            job.billingStatus = "Invoiced";
        }
    });

    // Invoicing calculations
    const vat = subtotal * 0.07; // VAT 7%
    const withholding = subtotal * 0.01; // Withholding Tax 1%
    const total = subtotal + vat - withholding; // Grand Total

    const invoiceId = await fetchNextNumber("INV");
    const today = new Date().toISOString().split('T')[0];
    
    // Due date = 30 days credit term
    let due = new Date();
    due.setDate(due.getDate() + 30);
    const dueDate = due.toISOString().split('T')[0];

    const newInvoice = {
        id: invoiceId,
        bookingIds: bookingIds,
        jobIds: selectedJobIds,
        customer: customerName,
        date: today,
        dueDate: dueDate,
        subtotal: subtotal,
        vat: vat,
        withholding: withholding,
        total: total,
        status: "Unpaid"
    };

    state.invoices.push(newInvoice);
    saveStateToStorage();
    renderBillingPage();
    updateDashboardStats();
    
    // View generated invoice
    viewInvoice(invoiceId);
}

function viewInvoice(invoiceId) {
    const invoice = state.invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    const previewEl = document.getElementById("billing-preview-area");
    const placeholderEl = document.getElementById("billing-preview-placeholder");

    const billingPanel = document.getElementById("billing-preview-panel");
    if (billingPanel && billingPanel.dataset.collapsed === "1") togglePreviewPanel("billing");

    placeholderEl.style.display = "none";
    previewEl.style.display = "block";

    let jobRows = "";
    invoice.jobIds.forEach((jobId, index) => {
        const job = state.jobs.find(j => j.id === jobId);
        const booking = state.bookings.find(b => b.id === job.bookingId);
        jobRows += `
            <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td>
                    <strong>รหัสงาน: ${job.id}</strong> (${booking.cargo})<br>
                    <span style="font-size:11px; color:#475569;">ต้นทาง: ${job.origin} -> ปลายทาง: ${job.destination}</span><br>
                    <span style="font-size:11px; color:#475569;">ทะเบียนรถ: ${job.truckNo}</span>
                </td>
                <td style="text-align: right;">${formatMoney(booking.price)}</td>
            </tr>
        `;
    });

    previewEl.innerHTML = `
        <div class="doc-header">
            <div class="company-info">
                <h2>PornManee 24h Transport.</h2>
                <p>Tambon Nong Kham, Si Racha, Chon Buri 20110</p>
                <p>เลขประจำตัวผู้เสียภาษี: XXXXX</p>
                <p>โทร. 038-xxxxxx | Email: pm-24h@hotmail.com</p>
            </div>
            <div class="doc-title-area">
                <h2>ใบแจ้งหนี้ / ใบวางบิล</h2>
                <h3 style="color:#64748b;">INVOICE / BILLING</h3>
                <p style="margin-top:10px;"><strong>เลขที่เอกสาร:</strong> ${invoice.id}</p>
                <p><strong>วันที่ออก:</strong> ${formatDate(invoice.date)}</p>
                <p><strong>ครบกำหนดชำระ:</strong> ${formatDate(invoice.dueDate)}</p>
            </div>
        </div>

        <div class="doc-details-grid">
            <div class="doc-party">
                <h4>ลูกค้า (Customer Address)</h4>
                <p><strong>${invoice.customer}</strong></p>
                <p>สำนักงานใหญ่ / สาขาตามทะเบียน</p>
                <p>เลขประจำตัวผู้เสียภาษี: 01055xxxxxxxx</p>
            </div>
            <div class="doc-party" style="text-align: right;">
                <h4>การจ่ายชำระ (Payment Details)</h4>
                <p>โอนเงินเข้าบัญชี:</p>
                <p><strong>ธนาคารไทยพาณิชย์ (SCB)</strong></p>
                <p>ชื่อบัญชี: PornManee 24h Transport.</p>
                <p>เลขที่บัญชี: 123-4-56789-0</p>
            </div>
        </div>

        <table class="doc-table">
            <thead>
                <tr>
                    <th width="40">ลำดับ</th>
                    <th>รายการรายละเอียดการขนส่ง (Job Details)</th>
                    <th width="120" style="text-align: right;">ค่าขนส่งเสนอ (บาท)</th>
                </tr>
            </thead>
            <tbody>
                ${jobRows}
            </tbody>
        </table>

        <div class="doc-summary">
            <div class="summary-box">
                <div class="summary-row">
                    <span>ยอดรวมค่าบริการ (Subtotal):</span>
                    <span>${formatMoney(invoice.subtotal)}</span>
                </div>
                <div class="summary-row">
                    <span>ภาษีมูลค่าเพิ่ม 7% (VAT):</span>
                    <span>${formatMoney(invoice.vat)}</span>
                </div>
                <div class="summary-row" style="color: #b91c1c;">
                    <span>หักภาษี ณ ที่จ่าย 1% (WHT):</span>
                    <span>-${formatMoney(invoice.withholding)}</span>
                </div>
                <div class="summary-row total">
                    <span>ยอดรวมสุทธิ (Grand Total):</span>
                    <span>${formatMoney(invoice.total)}</span>
                </div>
            </div>
        </div>

        <div class="doc-signatures">
            <div>
                <div class="sig-line"></div>
                <p>ผู้รับวางบิล / ลูกค้า</p>
                <p>วันที่ ...../...../.....</p>
            </div>
            <div>
                <div class="sig-line"></div>
                <p>ผู้จัดทำเอกสาร</p>
                <p>แผนกบัญชีและการเงิน</p>
            </div>
            <div>
                <div class="sig-line"></div>
                <p>ผู้มีอำนาจลงนาม</p>
                <p>ในนาม PornManee 24h Transport.</p>
            </div>
        </div>
    `;
}

// -----------------------------------------
// 6. RECEIPT CONTROLLER
// -----------------------------------------
function renderReceiptPage() {
    // 1. Invoices unpaid list
    const unpaidTbody = document.getElementById("unpaid-invoices-table").querySelector("tbody");
    unpaidTbody.innerHTML = "";

    const unpaidInvoices = state.invoices.filter(i => i.status === "Unpaid");

    if (unpaidInvoices.length === 0) {
        unpaidTbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color: var(--text-muted); padding: 20px;">ไม่มีใบแจ้งหนี้ค้างรับชำระ</td></tr>`;
    } else {
        unpaidInvoices.forEach(inv => {
            unpaidTbody.innerHTML += `
                <tr>
                    <td><strong>${inv.id}</strong></td>
                    <td>${inv.customer}</td>
                    <td>${formatDate(inv.dueDate)}</td>
                    <td class="text-right"><strong>${formatMoney(inv.total)}</strong></td>
                    <td>
                        <button class="btn btn-success btn-sm" onclick="payInvoice('${inv.id}')">
                            <i class="fa-solid fa-circle-dollar-to-slot"></i> รับชำระเงิน
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    // 2. Receipt database table
    const rctTbody = document.getElementById("receipts-table").querySelector("tbody");
    rctTbody.innerHTML = "";

    if (state.receipts.length === 0) {
        rctTbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: var(--text-muted); padding: 20px;">ยังไม่มีการออกใบเสร็จรับเงิน</td></tr>`;
    } else {
        [...state.receipts].reverse().forEach(rct => {
            rctTbody.innerHTML += `
                <tr>
                    <td><strong>${rct.id}</strong></td>
                    <td>${rct.invoiceId}</td>
                    <td>${rct.customer}</td>
                    <td>${formatDate(rct.date)}</td>
                    <td class="text-right"><strong>${formatMoney(rct.total)}</strong></td>
                    <td class="text-right">
                        <button class="btn btn-secondary btn-sm" onclick="viewReceipt('${rct.id}')">
                            <i class="fa-solid fa-file-pdf"></i> ดูใบเสร็จ
                        </button>
                    </td>
                </tr>
            `;
        });
    }
}

async function payInvoice(invoiceId) {
    const invoice = state.invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    if (confirm(`กรุณายืนยันการรับชำระเงินสำหรับเอกสาร ${invoice.id} เป็นจำนวนเงิน ${formatMoney(invoice.total)}`)) {
        // Update Invoice status to Paid
        invoice.status = "Paid";

        const receiptId = await fetchNextNumber("RCT");
        const today = new Date().toISOString().split('T')[0];

        const newReceipt = {
            id: receiptId,
            invoiceId: invoice.id,
            customer: invoice.customer,
            date: today,
            subtotal: invoice.subtotal,
            vat: invoice.vat,
            withholding: invoice.withholding,
            total: invoice.total,
            paymentMethod: "โอนผ่านธนาคาร (เงินฝากกระแสรายวัน)"
        };

        state.receipts.push(newReceipt);
        saveStateToStorage();
        renderReceiptPage();
        updateDashboardStats();

        // Render receipt view in the sidebar
        viewReceipt(receiptId);
    }
}

function viewReceipt(receiptId) {
    const receipt = state.receipts.find(r => r.id === receiptId);
    if (!receipt) return;

    const previewEl = document.getElementById("receipt-preview-area");
    const placeholderEl = document.getElementById("receipt-preview-placeholder");

    const receiptPanel = document.getElementById("receipt-preview-panel");
    if (receiptPanel && receiptPanel.dataset.collapsed === "1") togglePreviewPanel("receipt");

    placeholderEl.style.display = "none";
    previewEl.style.display = "block";

    previewEl.innerHTML = `
        <div class="doc-header">
            <div class="company-info">
                <h2>PornManee 24h Transport.</h2>
                <p>Tambon Nong Kham, Si Racha, Chon Buri 20110</p>
                <p>เลขประจำตัวผู้เสียภาษี: XXXXX</p>
            </div>
            <div class="doc-title-area">
                <h2 style="color:#10b981;">ใบเสร็จรับเงิน</h2>
                <h3 style="color:#64748b;">RECEIPT / TAX INVOICE</h3>
                <p style="margin-top:10px;"><strong>เลขที่ใบเสร็จ:</strong> ${receipt.id}</p>
                <p><strong>อ้างอิงใบแจ้งหนี้:</strong> ${receipt.invoiceId}</p>
                <p><strong>วันที่รับเงิน:</strong> ${formatDate(receipt.date)}</p>
            </div>
        </div>

        <div class="doc-details-grid">
            <div class="doc-party">
                <h4>ลูกค้า (Customer Information)</h4>
                <p><strong>${receipt.customer}</strong></p>
                <p>เลขประจำตัวผู้เสียภาษี: 01055xxxxxxxx</p>
            </div>
            <div class="doc-party" style="text-align: right;">
                <h4>วิธีรับชำระเงิน (Method of Payment)</h4>
                <p>${receipt.paymentMethod}</p>
                <p>ชำระยอดเงินเสร็จสมบูรณ์เรียบร้อยแล้ว</p>
            </div>
        </div>

        <table class="doc-table">
            <thead>
                <tr>
                    <th width="40">ลำดับ</th>
                    <th>คำอธิบายรายการรับชำระเงิน</th>
                    <th width="120" style="text-align: right;">จำนวนเงินรับ (บาท)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="text-align: center;">1</td>
                    <td>รับชำระหนี้ตามใบวางบิลเลขที่ ${receipt.invoiceId} บริการขนส่งตู้สินค้าปลายทาง</td>
                    <td style="text-align: right;">${formatMoney(receipt.subtotal)}</td>
                </tr>
            </tbody>
        </table>

        <div class="doc-summary">
            <div class="summary-box">
                <div class="summary-row">
                    <span>มูลค่าบริการ (Charge Amount):</span>
                    <span>${formatMoney(receipt.subtotal)}</span>
                </div>
                <div class="summary-row">
                    <span>ภาษีมูลค่าเพิ่ม 7% (VAT):</span>
                    <span>${formatMoney(receipt.vat)}</span>
                </div>
                <div class="summary-row" style="color: #b91c1c;">
                    <span>หัก ณ ที่จ่าย 1% (WHT):</span>
                    <span>-${formatMoney(receipt.withholding)}</span>
                </div>
                <div class="summary-row total">
                    <span>ยอดรับชำระสุทธิ (Net Received):</span>
                    <span>${formatMoney(receipt.total)}</span>
                </div>
            </div>
        </div>

        <div class="doc-signatures">
            <div>
                <p style="margin-top:20px; font-weight:bold; color:var(--color-completed);"><i class="fa-solid fa-circle-check"></i> PAID IN FULL</p>
            </div>
            <div>
                <div class="sig-line"></div>
                <p>ผู้รับเงิน</p>
                <p>แผนกการเงิน</p>
            </div>
            <div>
                <div class="sig-line"></div>
                <p>ผู้มีอำนาจรับชำระเงิน</p>
                <p>ในนาม PornManee 24h Transport.</p>
            </div>
        </div>
    `;
}

// -----------------------------------------
// 7. DRIVER SALARY payroll CONTROLLER
// -----------------------------------------
function renderSalaryPage() {
    const tbody = document.getElementById("drivers-payroll-table").querySelector("tbody");
    tbody.innerHTML = "";

    let totalPayrollEstimate = 0;
    let totalTripFee = 0;

    state.drivers.forEach(driver => {
        // Calculate trips completed by this driver
        const completedJobs = state.jobs.filter(j => j.driverId === driver.id && j.status === "Completed");
        const tripCount = completedJobs.length;
        
        // Sum driver trip allowance rates
        const tripAllowances = completedJobs.reduce((sum, j) => sum + j.tripAllowance, 0);
        
        // Deductions (Mocking standard deductions for demo)
        const deductions = tripCount > 0 ? 500 : 0; // Social security or advances
        const netPay = driver.baseSalary + tripAllowances - deductions;

        totalTripFee += tripAllowances;
        totalPayrollEstimate += netPay;

        tbody.innerHTML += `
            <tr>
                <td>
                    <strong>${driver.name}</strong>
                    <div style="font-size:11px; color:var(--text-secondary);">${driver.license}</div>
                </td>
                <td>${formatMoney(driver.baseSalary)}</td>
                <td class="text-center"><span class="badge badge-active">${tripCount} เที่ยว</span></td>
                <td>${formatMoney(tripAllowances)}</td>
                <td style="color: var(--color-danger);">${formatMoney(deductions)}</td>
                <td class="text-right"><strong>${formatMoney(netPay)}</strong></td>
                <td><span class="badge badge-completed"><span class="badge-dot"></span>พร้อมทำจ่าย</span></td>
                <td class="text-right">
                    <button class="btn btn-secondary btn-sm" onclick="viewSalarySlip('${driver.id}', ${tripCount}, ${tripAllowances}, ${deductions}, ${netPay})">
                        <i class="fa-solid fa-file-invoice-dollar"></i> สลิปเงินเดือน
                    </button>
                </td>
            </tr>
        `;
    });

    document.getElementById("salary-driver-count").innerText = `${state.drivers.length} คน`;
    document.getElementById("salary-total-trip-fee").innerText = formatMoney(totalTripFee);
    document.getElementById("salary-total-estimate").innerText = formatMoney(totalPayrollEstimate);
}

function viewSalarySlip(driverId, trips, tripAllowances, deductions, netPay) {
    const driver = state.drivers.find(d => d.id === driverId);
    if (!driver) return;

    const previewEl = document.getElementById("salary-slip-area");
    const placeholderEl = document.getElementById("salary-slip-placeholder");

    const salaryPanel = document.getElementById("salary-preview-panel");
    if (salaryPanel && salaryPanel.dataset.collapsed === "1") togglePreviewPanel("salary");

    placeholderEl.style.display = "none";
    previewEl.style.display = "block";

    const date = new Date();
    const period = `${date.toLocaleString('th-TH', { month: 'long' })} ${date.getFullYear() + 543}`;

    previewEl.innerHTML = `
        <div class="company-info" style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px;">
            <h2>PornManee 24h Transport. (ใบจ่ายเงินเดือนพนักงาน)</h2>
            <p style="font-size:11px; color:var(--text-muted);">PORNMANEE 24H TRANSPORT SALARY SLIP PERIOD: ${period}</p>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; font-size:12px; margin-bottom: 15px; background:#f8fafc; padding: 10px; border-radius: 6px; border:1px solid #cbd5e1;">
            <div>
                <p><strong>ชื่อพนักงาน:</strong> ${driver.name}</p>
                <p><strong>รหัสคนขับ:</strong> ${driver.id}</p>
            </div>
            <div>
                <p><strong>ประเภทใบขับขี่:</strong> ${driver.license}</p>
                <p><strong>ติดต่อ:</strong> ${driver.phone}</p>
            </div>
        </div>

        <div class="slip-calc-details" style="color: #000; border-color:#cbd5e1;">
            <h4 style="border-bottom:1px solid #cbd5e1; padding-bottom: 4px; margin-bottom:8px;">1. รายได้ (Earnings)</h4>
            <div class="slip-row" style="border-color:#e2e8f0;">
                <span>เงินเดือนพื้นฐาน (Base Salary):</span>
                <strong>${formatMoney(driver.baseSalary)}</strong>
            </div>
            <div class="slip-row" style="border-color:#e2e8f0;">
                <span>เบี้ยเลี้ยงเที่ยววิ่ง (${trips} เที่ยว):</span>
                <strong>${formatMoney(tripAllowances)}</strong>
            </div>
            
            <h4 style="margin-top:14px; border-bottom:1px solid #cbd5e1; padding-bottom: 4px; margin-bottom:8px;">2. รายการหัก (Deductions)</h4>
            <div class="slip-row" style="color:#b91c1c; border-color:#e2e8f0;">
                <span>หักประกันสังคม / สำรองสะสม:</span>
                <strong>-${formatMoney(deductions)}</strong>
            </div>

            <div class="slip-row total" style="margin-top:14px; border-top: 2px solid #0f172a; padding-top:10px;">
                <span>เงินได้สุทธิ (Net Pay Salary):</span>
                <strong>${formatMoney(netPay)}</strong>
            </div>
        </div>

        <div style="font-size: 11px; margin-top:20px; color:#475569; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
            <p>หมายเหตุ: บริษัทได้โอนเงินเดือนเข้าบัญชีธนาคารกสิกรไทยของท่านเรียบร้อยแล้ว ในวันที่ 30 ของเดือนปัจจุบัน</p>
        </div>

        <div class="doc-signatures" style="margin-top:30px;">
            <div>
                <div class="sig-line" style="border-color:#475569;"></div>
                <p style="font-size:11px;">ลงชื่อพนักงานรับเงิน</p>
            </div>
            <div></div>
            <div>
                <div class="sig-line" style="border-color:#475569;"></div>
                <p style="font-size:11px;">ผู้อนุมัติทำจ่าย</p>
            </div>
        </div>
    `;
}

// -----------------------------------------
// 8. SUBCONTRACTOR Payout CONTROLLER
// -----------------------------------------
function renderSubcontractorPage() {
    const tbody = document.getElementById("subcontractors-table").querySelector("tbody");
    tbody.innerHTML = "";

    let totalSubconCost = 0;
    let totalPendingWht = 0;
    let totalCompletedJobs = 0;

    state.subcontractors.forEach(sub => {
        // Get completed jobs assigned to this subcontractor
        const completedJobs = state.jobs.filter(j => j.subconId === sub.id && j.status === "Completed");
        const jobCount = completedJobs.length;
        
        // Total costs
        const subCostTotal = completedJobs.reduce((sum, j) => sum + j.subconCost, 0);
        // Withholding tax 3% for services / contractor hire in Thailand
        const wht3 = subCostTotal * 0.03;
        const netPay = subCostTotal - wht3;

        totalSubconCost += subCostTotal;
        totalPendingWht += wht3;
        totalCompletedJobs += jobCount;

        tbody.innerHTML += `
            <tr>
                <td>
                    <strong>${sub.name}</strong>
                    <div style="font-size:11px; color:var(--text-secondary);">เลขผู้เสียภาษี: ${sub.taxId}</div>
                </td>
                <td class="text-center"><span class="badge badge-pending">${jobCount} งาน</span></td>
                <td><strong>${formatMoney(subCostTotal)}</strong></td>
                <td style="color: var(--color-danger);">${formatMoney(wht3)}</td>
                <td class="text-right"><strong>${formatMoney(netPay)}</strong></td>
                <td><span class="badge badge-completed"><span class="badge-dot"></span>วางบิลสำเร็จ</span></td>
                <td class="text-right">
                    <button class="btn btn-secondary btn-sm" onclick="viewSubconSlip('${sub.id}', ${jobCount}, ${subCostTotal}, ${wht3}, ${netPay})">
                        <i class="fa-solid fa-receipt"></i> สั่งจ่าย (Voucher)
                    </button>
                </td>
            </tr>
        `;
    });

    document.getElementById("subcon-total-count").innerText = `${state.subcontractors.length} ราย`;
    document.getElementById("subcon-total-jobs").innerText = `${totalCompletedJobs} เที่ยว`;
    document.getElementById("subcon-pending-payout").innerText = formatMoney(totalSubconCost - totalPendingWht);
}

function viewSubconSlip(subconId, jobCount, subCostTotal, wht3, netPay) {
    const subcon = state.subcontractors.find(s => s.id === subconId);
    if (!subcon) return;

    const previewEl = document.getElementById("subcon-slip-area");
    const placeholderEl = document.getElementById("subcon-slip-placeholder");

    const subconPanel = document.getElementById("subcon-preview-panel");
    if (subconPanel && subconPanel.dataset.collapsed === "1") togglePreviewPanel("subcon");

    placeholderEl.style.display = "none";
    previewEl.style.display = "block";

    // Gather subcon job records
    const completedJobs = state.jobs.filter(j => j.subconId === subcon.id && j.status === "Completed");
    let jobListHtml = "";
    completedJobs.forEach((job, index) => {
        jobListHtml += `
            <div class="slip-row" style="font-size:11px; border-color:#e2e8f0; color:#475569;">
                <span>${index+1}. ใบงาน ${job.id} (${job.origin} -> ${job.destination})</span>
                <span>${formatMoney(job.subconCost)}</span>
            </div>
        `;
    });

    previewEl.innerHTML = `
        <div class="company-info" style="border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px;">
            <h2>ใบสำคัญสั่งจ่ายผู้รับเหมาช่วง (Payment Voucher)</h2>
            <p>จัดทำโดย PornManee 24h Transport. | โทร. 038-xxxxxx</p>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; font-size:12px; margin-bottom: 15px; background:#f8fafc; padding: 10px; border-radius: 6px; border:1px solid #cbd5e1;">
            <div>
                <p><strong>ผู้รับเงิน:</strong> ${subcon.name}</p>
                <p><strong>เลขผู้เสียภาษี:</strong> ${subcon.taxId}</p>
            </div>
            <div>
                <p><strong>ผู้ติดต่อ:</strong> ${subcon.contact}</p>
                <p><strong>เบอร์โทร:</strong> ${subcon.phone}</p>
            </div>
        </div>

        <div class="slip-calc-details" style="color: #000; border-color:#cbd5e1;">
            <h4 style="border-bottom:1px solid #cbd5e1; padding-bottom: 4px; margin-bottom:8px;">รายการงานที่ทำเสร็จสิ้น (${jobCount} งาน)</h4>
            ${jobListHtml}
            
            <div class="slip-row" style="margin-top:14px; border-top: 1px solid #cbd5e1; padding-top: 6px;">
                <span>ยอดเงินก่อนหักภาษี (Gross Cost):</span>
                <strong>${formatMoney(subCostTotal)}</strong>
            </div>
            <div class="slip-row" style="color:#b91c1c;">
                <span>หักภาษี ณ ที่จ่าย 3% (WHT 3% ค่าจ้างขนส่ง):</span>
                <strong>-${formatMoney(wht3)}</strong>
            </div>

            <div class="slip-row total" style="margin-top:10px; border-top: 2px solid #0f172a; padding-top:8px;">
                <span>ยอดสั่งจ่ายสุทธิ (Net Payment):</span>
                <strong>${formatMoney(netPay)}</strong>
            </div>
        </div>

        <div style="font-size: 11px; margin-top:20px; color:#475569; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
            <p>หมายเหตุ: ภาษีหัก ณ ที่จ่าย 3% จะถูกยื่นแบบกับสรรพากรตามประมวลรัษฎากร บริษัทจะออกหนังสือรับรองการหัก ณ ที่จ่าย (50 ทวิ) ให้แก่ท่านทางอีเมล</p>
        </div>

        <div class="doc-signatures" style="margin-top:30px;">
            <div>
                <div class="sig-line" style="border-color:#475569;"></div>
                <p style="font-size:11px;">ผู้รับเช็ค / ผู้รับเงิน</p>
                <p style="font-size:10px; color:var(--text-muted);">วันที่ ...../...../.....</p>
            </div>
            <div>
                <div class="sig-line" style="border-color:#475569;"></div>
                <p style="font-size:11px;">ผู้จ่ายเงิน</p>
            </div>
            <div>
                <div class="sig-line" style="border-color:#475569;"></div>
                <p style="font-size:11px;">ผู้อนุมัติสั่งจ่าย</p>
            </div>
        </div>
    `;
}

// -----------------------------------------
// OTHER APP-WIDE HANDLERS AND LISTENERS
// -----------------------------------------
function setupSearchListeners() {
    // Bookings Search & Filter
    document.getElementById("booking-search").addEventListener("input", renderBookings);
    document.getElementById("booking-filter-status").addEventListener("change", renderBookings);

    // Jobs Search & Filter
    document.getElementById("job-search").addEventListener("input", renderJobs);
    document.getElementById("job-filter-type").addEventListener("change", renderJobs);
    document.getElementById("job-filter-status").addEventListener("change", renderJobs);

    // Confirm jobs search & filter
    document.getElementById("confirm-job-search").addEventListener("input", renderJobStatusConfirmations);
    document.getElementById("confirm-job-filter-status").addEventListener("change", renderJobStatusConfirmations);

    // Customer Master search
    document.getElementById("customer-search").addEventListener("input", renderCustomers);

    // Driver Master search
    document.getElementById("driver-master-search").addEventListener("input", renderDriversMaster);
}

// Global print document function
function printDoc(elementId) {
    const printContent = document.getElementById(elementId).innerHTML;
    const originalContent = document.body.innerHTML;
    
    // Create temporary print window style
    const printWindow = window.open('', '', 'height=800,width=1000');
    printWindow.document.write('<html><head><title>พิมพ์เอกสาร</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
        body { font-family: 'Sarabun', 'Kanit', sans-serif; padding: 40px; color: #000; font-size: 13px; line-height: 1.5; }
        .doc-header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
        .company-info h2 { font-size: 22px; font-weight: 700; margin: 0 0 5px 0; }
        .company-info p { margin: 0 0 3px 0; color: #475569; }
        .doc-title-area { text-align: right; }
        .doc-title-area h2 { font-size: 24px; color: #6366f1; margin: 0 0 5px 0; }
        .doc-title-area h3 { font-size: 14px; margin: 0 0 10px 0; color: #64748b; }
        .doc-title-area p { margin: 0 0 4px 0; }
        .doc-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
        .doc-party h4 { font-size: 14px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; margin-top: 0; }
        .doc-party p { margin: 0 0 4px 0; }
        .doc-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .doc-table th { background: #f1f5f9; padding: 10px 12px; font-weight: 600; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; text-align: left; }
        .doc-table td { padding: 10px 12px; border-bottom: 1px solid #cbd5e1; }
        .doc-summary { display: flex; justify-content: flex-end; }
        .summary-box { width: 300px; }
        .summary-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #cbd5e1; }
        .summary-row.total { border-bottom: 2px double #000; font-weight: 700; font-size: 15px; }
        .doc-signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 50px; text-align: center; }
        .sig-line { border-bottom: 1px solid #000; margin-bottom: 8px; height: 50px; }
        .slip-calc-details { border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .slip-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #cbd5e1; }
        .slip-row.total { font-weight: 700; color: #10b981; font-size: 16px; border-bottom: none; }
        h4 { margin: 0 0 10px 0; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `);
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    // Delay to let fonts load slightly
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

// -----------------------------------------
// 9. TRUCKS MASTER CONTROLLER
// -----------------------------------------
let truckStatusFilter = "all";

function getTruckLiveStatus(plateNo) {
    const truck = state.trucks.find(t => t.plateNo === plateNo);
    if (truck && truck.repairStatus === "repair") return "repair";
    const activeJob = state.jobs.find(j =>
        j.truckNo === plateNo && (j.status === "Assigned" || j.status === "In Progress")
    );
    return activeJob ? "busy" : "available";
}

function setTruckFilter(filter) {
    truckStatusFilter = filter;
    // update button styles
    ["all", "available", "busy", "repair"].forEach(f => {
        const btn = document.getElementById(`truck-filter-${f}`);
        if (btn) btn.style.opacity = f === filter ? "1" : "0.45";
    });
    renderTrucksMasterPage();
}

function toggleTruckRepair(plateNo) {
    const truck = state.trucks.find(t => t.plateNo === plateNo);
    if (!truck) return;
    truck.repairStatus = truck.repairStatus === "repair" ? "" : "repair";
    saveStateToStorage();
    renderTrucksMasterPage();
}

function renderTrucksMasterPage() {
    const tbody = document.getElementById("trucks-master-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!state.trucks || state.trucks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px 10px;"><i class="fa-solid fa-truck" style="font-size:36px;margin-bottom:12px;display:block;opacity:0.5;"></i>ไม่พบข้อมูลทะเบียนรถในระบบ</td></tr>`;
        return;
    }

    // Summary counts
    const counts = { available: 0, busy: 0, repair: 0 };
    state.trucks.forEach(t => counts[getTruckLiveStatus(t.plateNo)]++);
    const summaryEl = document.getElementById("truck-status-summary");
    if (summaryEl) {
        summaryEl.innerHTML = `
            <span id="truck-filter-all" onclick="setTruckFilter('all')" style="cursor:pointer;padding:6px 14px;border-radius:20px;background:rgba(255,255,255,0.07);border:1px solid var(--border-color);font-size:12px;font-weight:600;opacity:${truckStatusFilter==='all'?'1':'0.45'};">ทั้งหมด (${state.trucks.length})</span>
            <span id="truck-filter-available" onclick="setTruckFilter('available')" style="cursor:pointer;padding:6px 14px;border-radius:20px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);color:#4ade80;font-size:12px;font-weight:600;opacity:${truckStatusFilter==='available'?'1':'0.45'};">🟢 ว่าง (${counts.available})</span>
            <span id="truck-filter-busy" onclick="setTruckFilter('busy')" style="cursor:pointer;padding:6px 14px;border-radius:20px;background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.3);color:#facc15;font-size:12px;font-weight:600;opacity:${truckStatusFilter==='busy'?'1':'0.45'};">🟡 ติดงาน (${counts.busy})</span>
            <span id="truck-filter-repair" onclick="setTruckFilter('repair')" style="cursor:pointer;padding:6px 14px;border-radius:20px;background:rgba(220,53,69,0.12);border:1px solid rgba(220,53,69,0.3);color:#ff6b6b;font-size:12px;font-weight:600;opacity:${truckStatusFilter==='repair'?'1':'0.45'};">🔴 ซ่อมแซม (${counts.repair})</span>
        `;
    }

    const filtered = state.trucks.filter(t => {
        if (truckStatusFilter === "all") return true;
        return getTruckLiveStatus(t.plateNo) === truckStatusFilter;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--text-muted);padding:30px;">ไม่มีรถในสถานะที่เลือก</td></tr>`;
        return;
    }

    filtered.forEach(t => {
        const liveStatus = getTruckLiveStatus(t.plateNo);
        const activeJob = state.jobs.find(j => j.truckNo === t.plateNo && (j.status === "Assigned" || j.status === "In Progress"));

        let statusBadge, repairBtnLabel;
        if (liveStatus === "repair") {
            statusBadge = `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;background:rgba(220,53,69,0.15);border:1px solid rgba(220,53,69,0.35);color:#ff6b6b;font-size:11px;font-weight:700;">🔴 ซ่อมแซม</span>`;
            repairBtnLabel = `<i class="fa-solid fa-wrench"></i> ยกเลิกซ่อม`;
        } else if (liveStatus === "busy") {
            const jobLabel = activeJob ? `${activeJob.id} (${activeJob.status === "Assigned" ? "รอเปิดงาน" : "กำลังวิ่ง"})` : "";
            statusBadge = `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;background:rgba(234,179,8,0.15);border:1px solid rgba(234,179,8,0.35);color:#facc15;font-size:11px;font-weight:700;">🟡 ติดงาน</span><div style="font-size:10px;color:var(--text-muted);margin-top:3px;">${jobLabel}</div>`;
            repairBtnLabel = `<i class="fa-solid fa-wrench"></i> แจ้งซ่อม`;
        } else {
            statusBadge = `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.35);color:#4ade80;font-size:11px;font-weight:700;">🟢 ว่าง</span>`;
            repairBtnLabel = `<i class="fa-solid fa-wrench"></i> แจ้งซ่อม`;
        }

        const ownerText = t.ownerType === "own"
            ? '<span class="badge badge-active">รถบริษัท (Own)</span>'
            : '<span class="badge badge-pending">รถร่วม (Sub)</span>';
        const partnerText = t.ownerType === "own"
            ? (t.driverName || "ไม่ได้กำหนดคนขับ")
            : (t.subconName || "ไม่ได้กำหนดซับคอน");

        tbody.innerHTML += `
            <tr>
                <td><strong>${t.plateNo}</strong></td>
                <td><span class="badge" style="background:rgba(255,255,255,0.05);color:var(--text-primary);border:1px solid var(--border-color);">${t.type}</span></td>
                <td>${ownerText}</td>
                <td>${partnerText}</td>
                <td>${statusBadge}</td>
                <td class="text-right" style="display:flex;gap:6px;justify-content:flex-end;">
                    <button class="btn btn-sm" style="background:rgba(234,179,8,0.1);color:#facc15;border:1px solid rgba(234,179,8,0.3);font-size:11px;" onclick="toggleTruckRepair('${t.plateNo}')">${repairBtnLabel}</button>
                    <button class="btn btn-secondary btn-sm" onclick="deleteTruck('${t.plateNo}')" style="padding:6px 10px;">
                        <i class="fa-solid fa-trash-can"></i> ลบ
                    </button>
                </td>
            </tr>
        `;
    });
}

function openAddTruckModal() {
    document.getElementById("form-add-truck").reset();
    
    // Populate driver select
    const drvSelect = document.getElementById("trk-driver-select");
    if (drvSelect) {
        drvSelect.innerHTML = '<option value="">-- ไม่ระบุ / ให้ระบุภายหลัง --</option>';
        state.drivers.forEach(drv => {
            drvSelect.innerHTML += `<option value="${drv.name}">${drv.name}</option>`;
        });
    }

    // Populate sub select
    const subSelect = document.getElementById("trk-sub-select");
    if (subSelect) {
        subSelect.innerHTML = "";
        state.subcontractors.forEach(sub => {
            subSelect.innerHTML += `<option value="${sub.name}">${sub.name}</option>`;
        });
    }

    toggleAddTruckOwnerFields("own");
    openModal("modal-add-truck");
}

function toggleAddTruckOwnerFields(value) {
    if (value === "own") {
        document.getElementById("trk-own-driver-group").style.display = "block";
        document.getElementById("trk-sub-name-group").style.display = "none";
    } else {
        document.getElementById("trk-own-driver-group").style.display = "none";
        document.getElementById("trk-sub-name-group").style.display = "block";
    }
}

function submitAddTruck(event) {
    event.preventDefault();
    const plateNo = document.getElementById("trk-plate").value.trim();
    const type = document.getElementById("trk-type").value;
    const ownerType = document.getElementById("trk-owner-type").value;
    
    let driverName = "";
    let subconName = "";

    if (ownerType === "own") {
        driverName = document.getElementById("trk-driver-select").value;
    } else {
        subconName = document.getElementById("trk-sub-select").value;
    }

    if (!plateNo) {
        alert("กรุณากรอกเลขทะเบียนรถ");
        return;
    }

    // Check for duplicate plate number
    if (state.trucks.some(t => t.plateNo.toLowerCase() === plateNo.toLowerCase())) {
        alert(`ทะเบียนรถ "${plateNo}" มีอยู่ในระบบแล้ว! ป้องกันการบันทึกซ้ำซ้อน`);
        return;
    }

    const newTruck = {
        plateNo,
        type,
        ownerType,
        driverName,
        subconName
    };

    state.trucks.push(newTruck);
    saveStateToStorage();
    closeModal("modal-add-truck");
    renderTrucksMasterPage();
    populateFormSelects();
    alert("บันทึกข้อมูลรถสำเร็จ!");
}

function deleteTruck(plateNo) {
    if (confirm(`คุณต้องการลบทะเบียนรถ "${plateNo}" ออกจาก Master Data หรือไม่?`)) {
        state.trucks = state.trucks.filter(t => t.plateNo !== plateNo);
        saveStateToStorage();
        renderTrucksMasterPage();
        populateFormSelects();
    }
}

// Auto-fill logic for booking modal
function autoFillBookingTruckDetails(plateNo) {
    const driverInput = document.getElementById("bk-driver-name");
    const plateInput = document.getElementById("bk-truck-no");
    const subconInput = document.getElementById("bk-subcon-name");
    const subTruckInput = document.getElementById("bk-subcon-truck-no");
    const typeSelect = document.getElementById("bk-truck-type");

    if (plateNo === "manual") {
        // Unlock fields for manual inputs
        driverInput.readOnly = false;
        plateInput.readOnly = false;
        subconInput.readOnly = false;
        subTruckInput.readOnly = false;
        
        driverInput.style.background = "";
        plateInput.style.background = "";
        subconInput.style.background = "";
        subTruckInput.style.background = "";

        driverInput.value = "";
        plateInput.value = "";
        subconInput.value = "";
        subTruckInput.value = "";
    } else {
        // Find selected truck details
        const truck = state.trucks.find(t => t.plateNo === plateNo);
        if (truck) {
            // Lock and color code fields
            driverInput.readOnly = true;
            plateInput.readOnly = true;
            subconInput.readOnly = true;
            subTruckInput.readOnly = true;

            driverInput.style.background = "var(--bg-card)";
            plateInput.style.background = "var(--bg-card)";
            subconInput.style.background = "var(--bg-card)";
            subTruckInput.style.background = "var(--bg-card)";

            // Update type select to match master type
            if (typeSelect) {
                // Find matching value or default to first
                for (let option of typeSelect.options) {
                    if (option.value.includes(truck.type) || truck.type.includes(option.value)) {
                        typeSelect.value = option.value;
                        break;
                    }
                }
            }

            if (truck.ownerType === "own") {
                driverInput.value = truck.driverName || "";
                plateInput.value = truck.plateNo;
                subconInput.value = "";
                subTruckInput.value = "";
            } else {
                driverInput.value = "";
                plateInput.value = "";
                subconInput.value = truck.subconName || "";
                subTruckInput.value = truck.plateNo;
            }
        }
    }
}

// Auto-fill logic for job assignment own fleet
function autoFillAssignOwnTruck(plateNo) {
    const truck = state.trucks.find(t => t.plateNo === plateNo);
    const driverSelect = document.getElementById("assign-driver");
    const allowanceInput = document.getElementById("assign-driver-trip-allowance");

    if (truck && driverSelect) {
        // Match driver by name
        const driver = state.drivers.find(d => d.name === truck.driverName);
        if (driver) {
            driverSelect.value = driver.id;
            allowanceInput.value = driver.tripAllowanceRate || 1200;
        } else {
            // Pick first driver as fallback
            if (state.drivers.length > 0) {
                driverSelect.value = state.drivers[0].id;
                allowanceInput.value = state.drivers[0].tripAllowanceRate || 1200;
            }
        }
    }
}

// Auto-fill logic for job assignment sub fleet
function autoFillAssignSubTruck(plateNo) {
    const subTruckInput = document.getElementById("assign-sub-truck");
    if (plateNo === "manual") {
        subTruckInput.readOnly = false;
        subTruckInput.style.background = "";
        subTruckInput.value = "";
    } else {
        subTruckInput.readOnly = true;
        subTruckInput.style.background = "var(--bg-card)";
        subTruckInput.value = plateNo;
    }
}

// Filter sub trucks by subcon name
function filterSubTruckSelect(subconId) {
    const subcon = state.subcontractors.find(s => s.id === subconId);
    const subTruckSelect = document.getElementById("assign-sub-truck-select");
    
    if (!subTruckSelect) return;
    subTruckSelect.innerHTML = '<option value="manual">-- ป้อนทะเบียนเอง (Manual Input) --</option>';

    if (subcon) {
        const matchingTrucks = state.trucks.filter(t => t.ownerType === "sub" && t.subconName === subcon.name);
        matchingTrucks.forEach(t => {
            subTruckSelect.innerHTML += `<option value="${t.plateNo}">${t.plateNo} - [${t.type}]</option>`;
        });
        
        if (matchingTrucks.length > 0) {
            subTruckSelect.value = matchingTrucks[0].plateNo;
            autoFillAssignSubTruck(matchingTrucks[0].plateNo);
        } else {
            subTruckSelect.value = "manual";
            autoFillAssignSubTruck("manual");
        }
    } else {
        subTruckSelect.value = "manual";
        autoFillAssignSubTruck("manual");
    }
}

// -----------------------------------------
// REPORT: วิ่งรถ (Job Report)
// -----------------------------------------
function _populateReportJobsDropdowns() {
    var bookingSel = document.getElementById("rpt-jobs-booking");
    var jobSel     = document.getElementById("rpt-jobs-jobno");
    var driverSel  = document.getElementById("rpt-jobs-driver");
    var statusSel  = document.getElementById("rpt-jobs-status");
    if (!bookingSel) return;

    var fromEl = document.getElementById("rpt-jobs-from");
    var toEl   = document.getElementById("rpt-jobs-to");
    var fromVal = fromEl ? fromEl.value : "";
    var toVal   = toEl   ? toEl.value   : "";

    // preserve current selections
    var curBk  = bookingSel.value, curJob = jobSel.value;
    var curDrv = driverSel.value,  curSt  = statusSel ? statusSel.value : "";

    // filter jobs to date range first
    var filtered = state.jobs.filter(function(j) {
        var bk = state.bookings.find(function(b) { return b.id === j.bookingId; });
        var d = bk ? bk.date : "";
        if (fromVal && d < fromVal) return false;
        if (toVal   && d > toVal)   return false;
        return true;
    });

    var bkIds = [], jobIds = [], drvNames = [], statuses = [];
    filtered.forEach(function(j) {
        if (bkIds.indexOf(j.bookingId) === -1 && j.bookingId) bkIds.push(j.bookingId);
        if (jobIds.indexOf(j.id) === -1) jobIds.push(j.id);
        var n = j.driverName || j.subconName;
        if (n && drvNames.indexOf(n) === -1) drvNames.push(n);
        if (j.status && statuses.indexOf(j.status) === -1) statuses.push(j.status);
    });
    bkIds.sort(); jobIds.sort(); drvNames.sort(); statuses.sort();

    bookingSel.innerHTML = '<option value="">ทั้งหมด</option>';
    bkIds.forEach(function(id) {
        bookingSel.innerHTML += '<option value="' + id + '"' + (id === curBk ? " selected" : "") + '>' + id + '</option>';
    });

    jobSel.innerHTML = '<option value="">ทั้งหมด</option>';
    jobIds.forEach(function(id) {
        jobSel.innerHTML += '<option value="' + id + '"' + (id === curJob ? " selected" : "") + '>' + id + '</option>';
    });

    driverSel.innerHTML = '<option value="">ทั้งหมด</option>';
    drvNames.forEach(function(n) {
        driverSel.innerHTML += '<option value="' + n + '"' + (n === curDrv ? " selected" : "") + '>' + n + '</option>';
    });

    if (statusSel) {
        var allStatuses = ["Pending","Confirmed","In Progress","Completed","Cancelled"];
        statusSel.innerHTML = '<option value="">ทั้งหมด</option>';
        allStatuses.forEach(function(s) {
            var exists = statuses.indexOf(s) !== -1;
            statusSel.innerHTML += '<option value="' + s + '"' + (s === curSt ? " selected" : "") + (exists ? "" : ' style="color:var(--text-muted);"') + '>' + s + (exists ? "" : " (ไม่มีข้อมูล)") + '</option>';
        });
    }
}

function clearReportJobsFilters() {
    ["rpt-jobs-booking","rpt-jobs-jobno","rpt-jobs-driver","rpt-jobs-route","rpt-jobs-status"].forEach(function(id) {
        var el = document.getElementById(id); if (el) el.value = "";
    });
    var fromEl = document.getElementById("rpt-jobs-from");
    var toEl   = document.getElementById("rpt-jobs-to");
    if (fromEl && toEl) {
        var now = new Date(), y = now.getFullYear(), m = now.getMonth();
        fromEl.value = y + "-" + String(m + 1).padStart(2, "0") + "-01";
        var lastDay = new Date(y, m + 1, 0).getDate();
        toEl.value   = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(lastDay).padStart(2, "0");
    }
    renderReportJobs();
}

function renderReportJobs() {
    _populateReportJobsDropdowns();
    var fromEl = document.getElementById("rpt-jobs-from");
    var toEl   = document.getElementById("rpt-jobs-to");
    if (fromEl && !fromEl.value) {
        var now = new Date();
        var y = now.getFullYear(), m = now.getMonth();
        fromEl.value = y + "-" + String(m + 1).padStart(2, "0") + "-01";
        var lastDay = new Date(y, m + 1, 0).getDate();
        toEl.value   = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(lastDay).padStart(2, "0");
    }
    var fromVal    = fromEl ? fromEl.value : "";
    var toVal      = toEl ? toEl.value : "";
    var bookingVal = document.getElementById("rpt-jobs-booking") ? document.getElementById("rpt-jobs-booking").value : "";
    var jobNoVal   = document.getElementById("rpt-jobs-jobno")   ? document.getElementById("rpt-jobs-jobno").value   : "";
    var driverVal  = document.getElementById("rpt-jobs-driver")  ? document.getElementById("rpt-jobs-driver").value  : "";
    var routeVal   = (document.getElementById("rpt-jobs-route")  ? document.getElementById("rpt-jobs-route").value   : "").toLowerCase().trim();
    var statusVal  = document.getElementById("rpt-jobs-status")  ? document.getElementById("rpt-jobs-status").value  : "";
    var tbody      = document.getElementById("rpt-jobs-tbody");
    var summaryEl  = document.getElementById("rpt-jobs-summary");
    if (!tbody) return;

    var rows = [];
    state.jobs.forEach(function(job) {
        var bk = state.bookings.find(function(b) { return b.id === job.bookingId; });
        var dateStr = bk ? bk.date : "";
        if (fromVal    && dateStr < fromVal) return;
        if (toVal      && dateStr > toVal)   return;
        if (bookingVal && job.bookingId !== bookingVal) return;
        if (jobNoVal   && job.id !== jobNoVal)          return;
        var drvLabel = job.driverName || job.subconName || "";
        if (driverVal  && drvLabel !== driverVal) return;
        if (routeVal) {
            var routeText = ((job.origin || "") + " " + (job.destination || "")).toLowerCase();
            if (routeText.indexOf(routeVal) === -1) return;
        }
        if (statusVal  && job.status !== statusVal) return;
        rows.push({ job: job, bk: bk });
    });

    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="text-center" style="color:var(--text-muted);padding:32px;">ไม่พบข้อมูลในช่วงที่เลือก</td></tr>';
        summaryEl.style.display = "none";
        return;
    }

    var statusBadge = function(s) {
        var map = { "Completed": "badge-success", "In Progress": "badge-info", "Pending": "badge-warning", "Confirmed": "badge-primary", "Cancelled": "badge-danger" };
        return '<span class="badge ' + (map[s] || "") + '">' + s + '</span>';
    };

    var totalPrice = 0;
    tbody.innerHTML = rows.map(function(r, idx) {
        var job = r.job, bk = r.bk;
        var price = bk ? (bk.price || 0) : 0;
        totalPrice += price;
        return '<tr>' +
            '<td>' + (idx + 1) + '</td>' +
            '<td>' + formatDate(bk ? bk.date : "") + '</td>' +
            '<td><span class="badge badge-info">' + (bk ? bk.id : "-") + '</span></td>' +
            '<td><span class="badge badge-primary">' + job.id + '</span></td>' +
            '<td>' + job.customer + '</td>' +
            '<td style="font-size:12px;">' + (job.origin || "-") + '</td>' +
            '<td style="font-size:12px;">' + (job.destination || "-") + '</td>' +
            '<td>' + (bk ? bk.truckType : "-") + '</td>' +
            '<td>' + (job.driverName || (job.subconName || "-")) + '</td>' +
            '<td style="font-size:12px;">' + (job.truckNo || "-") + '</td>' +
            '<td style="text-align:right;">' + price.toLocaleString('th-TH') + '</td>' +
            '<td>' + statusBadge(job.status) + '</td>' +
            '</tr>';
    }).join("");

    summaryEl.style.display = "flex";
    summaryEl.style.justifyContent = "space-between";
    summaryEl.innerHTML = '<span>รวมทั้งหมด <strong>' + rows.length + '</strong> รายการ</span>' +
        '<span>รวมค่าขนส่ง: <strong style="color:var(--accent-green);">฿' + totalPrice.toLocaleString('th-TH', {minimumFractionDigits:2}) + '</strong></span>';
}

function exportReportJobsCsv() {
    var rows = document.querySelectorAll("#rpt-jobs-tbody tr");
    if (!rows.length || rows[0].cells.length < 3) return;
    var headers = ["#","วันที่","Booking","Job No.","ลูกค้า","ต้นทาง","ปลายทาง","ประเภทรถ","คนขับ","ทะเบียน","ค่าขนส่ง","สถานะ"];
    var csv = headers.join(",") + "\n";
    rows.forEach(function(tr) {
        var cells = Array.from(tr.cells).map(function(td) { return '"' + td.innerText.replace(/"/g, '""') + '"'; });
        csv += cells.join(",") + "\n";
    });
    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = "job_report.csv"; a.click();
}

// -----------------------------------------
// REPORT: วางบิล (Billing Report)
// -----------------------------------------
function populateBillingCustomerSelect() {
    var sel = document.getElementById("rpt-bill-customer");
    if (!sel) return;
    var current = sel.value;
    sel.innerHTML = '<option value="">-- เลือกลูกค้า --</option>';
    var names = state.customers.map(function(c) { return c.name; });
    names = names.filter(function(v, i, a) { return a.indexOf(v) === i; }).sort();
    names.forEach(function(n) {
        sel.innerHTML += '<option value="' + n + '"' + (n === current ? " selected" : "") + '>' + n + '</option>';
    });
}

function renderReportBilling() {
    var customer = document.getElementById("rpt-bill-customer") ? document.getElementById("rpt-bill-customer").value : "";
    var monthVal = document.getElementById("rpt-bill-month") ? document.getElementById("rpt-bill-month").value : "";
    var out = document.getElementById("rpt-bill-output");
    if (!out) return;

    if (!customer) {
        out.innerHTML = '<div class="card" style="padding:40px;text-align:center;color:var(--text-muted);">เลือกลูกค้าเพื่อดูรายงานวางบิล</div>';
        return;
    }

    var jobs = state.jobs.filter(function(j) { return j.customer === customer; });
    if (monthVal) {
        jobs = jobs.filter(function(j) {
            var bk = state.bookings.find(function(b) { return b.id === j.bookingId; });
            return bk && bk.date && bk.date.startsWith(monthVal);
        });
    }

    var cusObj = state.customers.find(function(c) { return c.name === customer; }) || {};
    var invoicesByCustomer = state.invoices.filter(function(inv) { return inv.customer === customer; });

    var dateLabel = "ทั้งหมด";
    if (monthVal) {
        var parts = monthVal.split("-");
        var y = parts[0], m = parts[1];
        var months = ["","มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
        dateLabel = "เดือน" + months[parseInt(m)] + " ปี " + (parseInt(y) + 543);
    }

    var totalPrice = 0, totalManpower = 0, totalOther = 0;
    var rowsHtml = jobs.map(function(job, idx) {
        var bk = state.bookings.find(function(b) { return b.id === job.bookingId; }) || {};
        var price = bk.price || 0;
        var totalRow = price;
        totalPrice += price;
        var inv = invoicesByCustomer.find(function(inv) { return inv.jobIds && inv.jobIds.indexOf(job.id) !== -1; });
        var invNo = inv ? inv.id : "";
        return '<tr>' +
            '<td style="text-align:center;">' + (idx + 1) + '</td>' +
            '<td>' + formatDate(bk.date) + '</td>' +
            '<td>' + (bk.shipper || bk.origin || "-") + '</td>' +
            '<td>' + (job.destination || "-") + '</td>' +
            '<td>' + (bk.truckType || "-") + '</td>' +
            '<td style="text-align:right;">' + price.toLocaleString('th-TH') + '</td>' +
            '<td></td><td></td><td></td><td></td>' +
            '<td style="text-align:right;font-weight:600;">' + totalRow.toLocaleString('th-TH') + '</td>' +
            '<td style="font-size:11px;">' + invNo + '</td>' +
            '<td>' + job.id + '</td>' +
            '<td style="font-size:11px;">' + (job.truckNo || "-") + '</td>' +
            '<td style="font-size:11px;color:var(--text-muted);">' + (bk.cargo || "") + '</td>' +
            '</tr>';
    }).join("");

    if (!rowsHtml) {
        rowsHtml = '<tr><td colspan="15" class="text-center" style="padding:24px;color:var(--text-muted);">ไม่พบข้อมูลงาน</td></tr>';
    }

    var grandTotal = totalPrice + totalManpower + totalOther;
    var withholding = Math.round(grandTotal * 0.01);
    var net = grandTotal - withholding;

    out.innerHTML = '<div class="card" id="billing-report-printable" style="padding:0;overflow:hidden;">' +
        '<div style="padding:20px 24px;border-bottom:1px solid var(--border-color);">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">' +
                '<div>' +
                    '<div style="font-size:13px;font-weight:700;color:var(--accent-blue);">บริษัท พรมณี 24เอช ทรานสปอร์ต จำกัด</div>' +
                    '<div style="font-size:11px;color:var(--text-muted);">PORNMANEE 24H TRANSPORT CO.,LTD.</div>' +
                    '<div style="font-size:11px;color:var(--text-muted);">เลขที่ 333/123 หมู่11 ต.หนองขาม อ.ศรีราชา จ.ชลบุรี</div>' +
                    '<div style="font-size:11px;color:var(--text-muted);">Tel.085-3883716 | 091-0053696 | Fax.033-123458</div>' +
                '</div>' +
                '<div style="text-align:right;">' +
                    '<div style="font-size:13px;font-weight:700;">วางบิล ' + dateLabel + '</div>' +
                    '<div style="font-size:12px;color:var(--text-muted);">ลูกค้า: <strong>' + customer + '</strong></div>' +
                    (cusObj.address ? '<div style="font-size:11px;color:var(--text-muted);">' + cusObj.address + '</div>' : "") +
                    '<div style="font-size:11px;margin-top:4px;">วันที่พิมพ์: ' + formatDate(new Date().toISOString().slice(0,10)) + '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div style="overflow-x:auto;">' +
        '<table class="data-table" style="font-size:12px;">' +
            '<thead><tr>' +
                '<th style="text-align:center;">จำนวน</th>' +
                '<th>Job date</th><th>From</th><th>To</th><th>Truck Size</th>' +
                '<th style="text-align:right;">Price</th>' +
                '<th style="text-align:right;">Return trip</th>' +
                '<th style="text-align:right;">Add Point</th>' +
                '<th style="text-align:right;">Manpower</th>' +
                '<th style="text-align:right;">Other</th>' +
                '<th style="text-align:right;">Total price</th>' +
                '<th>เลข Invoice</th><th>Job No.</th><th>No Truck</th><th>Remark</th>' +
            '</tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
            '<tfoot>' +
                '<tr style="font-weight:700;">' +
                    '<td colspan="5" style="text-align:right;padding-right:12px;">ยอดรวม หน้า 1/1</td>' +
                    '<td style="text-align:right;">' + totalPrice.toLocaleString('th-TH') + '</td>' +
                    '<td></td><td></td><td></td><td></td>' +
                    '<td style="text-align:right;">' + grandTotal.toLocaleString('th-TH') + '</td>' +
                    '<td colspan="4"></td>' +
                '</tr>' +
                '<tr>' +
                    '<td colspan="10" style="text-align:right;padding-right:12px;font-size:12px;">หัก ณ ที่จ่าย 1%</td>' +
                    '<td style="text-align:right;color:var(--accent-red);">-' + withholding.toLocaleString('th-TH') + '</td>' +
                    '<td colspan="4"></td>' +
                '</tr>' +
                '<tr style="font-weight:800;font-size:14px;">' +
                    '<td colspan="10" style="text-align:right;padding-right:12px;">ยอดสุทธิ</td>' +
                    '<td style="text-align:right;color:var(--accent-green);">' + net.toLocaleString('th-TH', {minimumFractionDigits:2}) + '</td>' +
                    '<td colspan="4"></td>' +
                '</tr>' +
            '</tfoot>' +
        '</table></div></div>';
}

function printBillingReport() {
    var el = document.getElementById("billing-report-printable");
    if (!el) { alert("ยังไม่มีข้อมูลรายงาน"); return; }
    var w = window.open("", "_blank");
    w.document.write('<html><head><title>Billing Report</title>' +
        '<style>body{font-family:sans-serif;padding:20px;color:#000;}' +
        'table{border-collapse:collapse;width:100%;font-size:11px;}' +
        'th,td{border:1px solid #ccc;padding:4px 6px;}' +
        'th{background:#f0f0f0;}tfoot td{font-weight:bold;}' +
        '@media print{body{padding:0;}}</style></head><body>' +
        el.outerHTML + '</body></html>');
    w.document.close();
    w.focus();
    w.print();
}

// -----------------------------------------
// REPORT: วิ่งประจำเดือน (Monthly Driver Report)
// -----------------------------------------
function populateMonthlyDriverSelect() {
    var sel = document.getElementById("rpt-monthly-driver");
    if (!sel) return;
    var cur = sel.value;
    sel.innerHTML = '<option value="">-- เลือกคนขับ --</option>';
    state.drivers.forEach(function(d) {
        sel.innerHTML += '<option value="' + d.id + '"' + (d.id === cur ? " selected" : "") + '>' + d.name + '</option>';
    });
}

function renderReportMonthly() {
    var driverId = document.getElementById("rpt-monthly-driver") ? document.getElementById("rpt-monthly-driver").value : "";
    var monthVal = document.getElementById("rpt-monthly-month") ? document.getElementById("rpt-monthly-month").value : "";
    var out = document.getElementById("rpt-monthly-output");
    if (!out) return;

    if (!driverId || !monthVal) {
        out.innerHTML = '<div class="card" style="padding:40px;text-align:center;color:var(--text-muted);">เลือกคนขับและเดือนเพื่อดูรายงาน</div>';
        return;
    }

    var drv = state.drivers.find(function(d) { return d.id === driverId; }) || {};
    var truck = state.trucks.find(function(t) { return t.driverName === drv.name; }) || {};

    var jobs = state.jobs.filter(function(j) {
        if (j.driverId !== driverId && j.driverName !== drv.name) return false;
        var bk = state.bookings.find(function(b) { return b.id === j.bookingId; });
        return bk && bk.date && bk.date.startsWith(monthVal);
    });

    var parts = monthVal.split("-");
    var y = parseInt(parts[0]), m = parseInt(parts[1]);
    var thMonths = ["","มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
    var monthLabel = "เดือน" + thMonths[m] + " ปี " + (y + 543);

    var totalTripAllowance = 0;
    var rowsHtml = jobs.map(function(job, idx) {
        var bk = state.bookings.find(function(b) { return b.id === job.bookingId; }) || {};
        var price = bk.price || 0;
        var tripAllow = job.tripAllowance || 0;
        totalTripAllowance += tripAllow;
        var isReturn = bk.destination && (bk.destination.indexOf("กลับ") !== -1 || bk.destination.indexOf("Return") !== -1) ? "มีงานกลับ" : "";
        return '<tr>' +
            '<td style="text-align:center;">' + (idx + 1) + '</td>' +
            '<td>' + formatDate(bk.date) + '</td>' +
            '<td>' + (bk.shipper || bk.origin || "-") + '</td>' +
            '<td>' + (job.destination || "-") + '</td>' +
            '<td>' + (bk.truckType || "-") + '</td>' +
            '<td style="text-align:center;font-size:12px;">' + isReturn + '</td>' +
            '<td style="text-align:right;">' + (tripAllow > 0 ? tripAllow.toLocaleString('th-TH') : "") + '</td>' +
            '<td style="text-align:right;"></td>' +
            '<td style="text-align:right;"></td>' +
            '<td style="font-size:11px;color:var(--text-muted);">' + (job.closeNote || "") + '</td>' +
            '<td style="text-align:right;font-weight:600;">' + price.toLocaleString('th-TH') + '</td>' +
            '<td style="text-align:right;"></td>' +
            '</tr>';
    }).join("");

    if (!rowsHtml) {
        rowsHtml = '<tr><td colspan="12" class="text-center" style="padding:24px;color:var(--text-muted);">ไม่พบข้อมูลงานในเดือนนี้</td></tr>';
    }

    var baseSalary = drv.baseSalary || 0;
    var phoneAllow = 200;
    var diligence = 1000;
    var totalIncome = baseSalary + totalTripAllowance + phoneAllow + diligence;
    var socialSec = 250;
    var netTotal = totalIncome - socialSec;

    out.innerHTML = '<div class="card" id="monthly-report-printable" style="padding:0;overflow:hidden;">' +
        '<div style="padding:16px 20px;border-bottom:1px solid var(--border-color);">' +
            '<div style="font-size:13px;font-weight:700;margin-bottom:6px;">รูปการรับประจำเดือน</div>' +
            '<div style="display:flex;gap:32px;flex-wrap:wrap;font-size:12px;">' +
                '<div><span style="color:var(--text-muted);">ชื่อพนักงานขับรถ: </span><strong>' + (drv.name || "-") + '</strong></div>' +
                '<div><span style="color:var(--text-muted);">ทะเบียน: </span><strong>' + (truck.plateNo || "-") + '</strong></div>' +
                '<div><span style="color:var(--text-muted);">รถประเภท: </span><strong>' + (truck.type || "-") + '</strong></div>' +
                '<div style="margin-left:auto;"><span style="color:var(--text-muted);">วันที่พิมพ์: </span>' + formatDate(new Date().toISOString().slice(0,10)) + '</div>' +
            '</div>' +
            '<div style="font-size:12px;margin-top:4px;"><span style="color:var(--text-muted);">' + monthLabel + '</span></div>' +
        '</div>' +
        '<div style="overflow-x:auto;">' +
        '<table class="data-table" style="font-size:12px;">' +
            '<thead><tr>' +
                '<th style="text-align:center;width:40px;">ลำดับ</th>' +
                '<th>วันที่</th><th>เริ่มต้น</th><th>ปลายทาง</th><th>ประเภท</th>' +
                '<th>งานกลับ</th>' +
                '<th style="text-align:right;">ค่าเที่ยว</th>' +
                '<th style="text-align:right;">ค่าเดินรถ</th>' +
                '<th style="text-align:right;">เวลาทำงาน</th>' +
                '<th>หมายเหตุ</th>' +
                '<th style="text-align:right;">ราคาจ้าง</th>' +
                '<th style="text-align:right;">OT</th>' +
            '</tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
            '<tfoot>' +
                '<tr style="font-weight:700;"><td colspan="6" style="text-align:right;padding-right:8px;">รวม</td>' +
                    '<td style="text-align:right;">' + totalTripAllowance.toLocaleString('th-TH') + '</td>' +
                    '<td colspan="5"></td></tr>' +
            '</tfoot>' +
        '</table></div>' +
        '<div style="display:flex;gap:24px;flex-wrap:wrap;padding:16px 20px;border-top:1px solid var(--border-color);">' +
            '<div style="min-width:200px;">' +
                '<table style="font-size:12px;width:100%;border-collapse:collapse;">' +
                    '<tr style="border-bottom:1px solid var(--border-color);"><td style="padding:4px 0;">เงินเดือน</td><td style="text-align:right;padding:4px 0;">' + baseSalary.toLocaleString('th-TH') + '</td></tr>' +
                    '<tr style="border-bottom:1px solid var(--border-color);"><td style="padding:4px 0;">ค่าตุแลธ (เที่ยว)</td><td style="text-align:right;padding:4px 0;">' + totalTripAllowance.toLocaleString('th-TH') + '</td></tr>' +
                    '<tr style="border-bottom:1px solid var(--border-color);"><td style="padding:4px 0;">ค่าโทรศัพท์</td><td style="text-align:right;padding:4px 0;">' + phoneAllow.toLocaleString('th-TH') + '</td></tr>' +
                    '<tr style="border-bottom:1px solid var(--border-color);"><td style="padding:4px 0;">เบี้ยขยัน</td><td style="text-align:right;padding:4px 0;">' + diligence.toLocaleString('th-TH') + '</td></tr>' +
                    '<tr style="font-weight:700;"><td style="padding:6px 0;">รวม</td><td style="text-align:right;padding:6px 0;color:var(--accent-green);">' + totalIncome.toLocaleString('th-TH') + '</td></tr>' +
                '</table>' +
            '</div>' +
            '<div style="min-width:200px;">' +
                '<table style="font-size:12px;width:100%;border-collapse:collapse;">' +
                    '<tr style="border-bottom:1px solid var(--border-color);"><td style="padding:4px 0;">คนค่าเที่ยว/พิเศษ</td><td style="text-align:right;padding:4px 0;">' + socialSec.toLocaleString('th-TH') + '</td></tr>' +
                    '<tr style="border-bottom:1px solid var(--border-color);"><td style="padding:4px 0;">เงินค่าเที่ยว</td><td style="text-align:right;padding:4px 0;">' + totalTripAllowance.toLocaleString('th-TH') + '</td></tr>' +
                    '<tr style="font-weight:700;"><td style="padding:6px 0;">ยอดรวมสุทธิ</td><td style="text-align:right;padding:6px 0;color:var(--accent-green);">' + netTotal.toLocaleString('th-TH') + '</td></tr>' +
                '</table>' +
            '</div>' +
            '<div style="min-width:200px;">' +
                '<table style="font-size:12px;width:100%;border-collapse:collapse;">' +
                    '<tr style="border-bottom:1px solid var(--border-color);"><td style="padding:4px 0;">รายการหัก</td><td style="text-align:right;padding:4px 0;">' + socialSec.toLocaleString('th-TH') + '</td></tr>' +
                    '<tr style="font-weight:800;font-size:13px;background:rgba(0,200,100,0.07);"><td style="padding:6px 0;">คงเหลือ</td><td style="text-align:right;padding:6px 0;color:var(--accent-green);">' + netTotal.toLocaleString('th-TH') + '</td></tr>' +
                '</table>' +
            '</div>' +
        '</div>' +
        '</div>';
}

function printMonthlyReport() {
    var el = document.getElementById("monthly-report-printable");
    if (!el) { alert("ยังไม่มีข้อมูลรายงาน"); return; }
    var w = window.open("", "_blank");
    w.document.write('<html><head><title>Monthly Driver Report</title>' +
        '<style>body{font-family:sans-serif;padding:20px;color:#000;font-size:12px;}' +
        'table{border-collapse:collapse;width:100%;}' +
        'th,td{border:1px solid #ccc;padding:4px 6px;}' +
        'th{background:#f0f0f0;}' +
        'tfoot td{font-weight:bold;}' +
        '.summary-wrap{display:flex;gap:24px;flex-wrap:wrap;padding:12px 0;}' +
        '@media print{body{padding:0;}}</style></head><body>' +
        el.outerHTML + '</body></html>');
    w.document.close();
    w.focus();
    w.print();
}
