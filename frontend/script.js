// Katre Cycle Stand - Dynamic Smart Parking Management System
// Full-Stack / Standalone Hybrid Engine

const API_BASE_URL = 'http://localhost:8080/api';
const LOCAL_STORAGE_KEY = 'katre_parking_records_v2';
const SLOTS_STORAGE_KEY = 'katre_parking_slots_v2';
const BACKUP_DATABASE_NAME = 'katre_parking_offline_backup';
const BACKUP_STORE_NAME = 'parking_records';
const BACKUP_RECORD_KEY = 'latest_records';

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. DOM REFERENCES
    // ==========================================
    const parkingForm = document.getElementById('parkingForm');
    const vehicleTypeSelect = document.getElementById('vehicleType');
    const vehicleNumberInput = document.getElementById('vehicleNumber');
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');
    const printBtn = document.getElementById('printBtn');
    
    // Checkout
    const scanInput = document.getElementById('scanInput');
    const findTicketBtn = document.getElementById('findTicketBtn');
    const checkoutResult = document.getElementById('checkoutResult');
    const completeCheckoutBtn = document.getElementById('completeCheckoutBtn');
    const coVehicle = document.getElementById('coVehicle');
    const coType = document.getElementById('coType');
    const coSlot = document.getElementById('coSlot');
    const coEntry = document.getElementById('coEntry');
    const coExit = document.getElementById('coExit');
    const coDuration = document.getElementById('coDuration');
    const coPrice = document.getElementById('coPrice');
    
    // Modal & Records
    const viewRecordsBtn = document.getElementById('viewRecordsBtn');
    const recordsModal = document.getElementById('recordsModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const filterDate = document.getElementById('filterDate');
    const filterStatus = document.getElementById('filterStatus');
    const filterSearch = document.getElementById('filterSearch');
    const recordsTbody = document.getElementById('recordsTbody');
    const noRecordsMsg = document.getElementById('noRecordsMsg');
    const recordsTable = document.querySelector('.records-table');
    const clearRecordsBtn = document.getElementById('clearRecordsBtn');
    const dashboardStats = document.getElementById('dashboardStats');
    const bikeAvailability = document.getElementById('bikeAvailability');
    const carAvailability = document.getElementById('carAvailability');
    const bikeOccupancy = document.getElementById('bikeOccupancy');
    const carOccupancy = document.getElementById('carOccupancy');
    const bikeMeter = document.getElementById('bikeMeter');
    const carMeter = document.getElementById('carMeter');
    const activeParkingValue = document.getElementById('activeParkingValue');
    const todayEntriesValue = document.getElementById('todayEntriesValue');
    const todayExitsValue = document.getElementById('todayExitsValue');
    const railEntriesValue = document.getElementById('railEntriesValue');
    const railExitsValue = document.getElementById('railExitsValue');
    const railRevenueValue = document.getElementById('railRevenueValue');
    const railRecordsBtn = document.getElementById('railRecordsBtn');
    const mobileRecordsBtn = document.getElementById('mobileRecordsBtn');
    const vehicleChoices = document.querySelectorAll('[data-vehicle-choice]');
    const liveDate = document.getElementById('liveDate');
    const liveClock = document.getElementById('liveClock');
    const timeGreeting = document.getElementById('timeGreeting');
    
    // Status & Toast
    const systemStatusText = document.getElementById('systemStatusText');
    const statusDot = document.getElementById('statusDot');
    const toastContainer = document.getElementById('toastContainer');
    
    // Tabs
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    let isBackendConnected = false;
    let pendingCheckoutRecord = null;
    let localRecordsCache = [];

    // ==========================================
    // 2. TOAST NOTIFICATIONS & FEEDBACK
    // ==========================================
    function showToast(message, type = 'info') {
        if (!toastContainer) {
            alert(message);
            return;
        }
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // ==========================================
    // 3. DATE/TIME UTILITIES
    // ==========================================
    function getCurrentDateTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        return {
            dateStr: `${year}-${month}-${day}`,
            timeStr: `${hours}:${minutes}`,
            iso: now.toISOString(),
            timestamp: now.getTime(),
            dateObj: now
        };
    }

    function refreshDateTimeInputs() {
        const current = getCurrentDateTime();
        if (dateInput) dateInput.value = current.dateStr;
        if (timeInput) timeInput.value = current.timeStr;
    }

    function updateLiveTime() {
        const now = new Date();
        const hour = now.getHours();
        const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

        if (timeGreeting) timeGreeting.textContent = greeting;
        if (liveDate) {
            liveDate.textContent = now.toLocaleDateString('en-IN', {
                weekday: 'short', month: 'short', day: 'numeric'
            });
        }
        if (liveClock) {
            liveClock.textContent = now.toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit'
            });
        }
    }

    function selectVehicleType(vehicleType) {
        if (vehicleTypeSelect) vehicleTypeSelect.value = vehicleType;
        vehicleChoices.forEach(choice => {
            const isSelected = choice.dataset.vehicleChoice === vehicleType;
            choice.classList.toggle('selected', isSelected);
            const radio = choice.querySelector('input');
            if (radio) radio.checked = isSelected;
        });
    }
    
    function formatDateTimeDisplay(dateInput) {
        if (!dateInput) return "--";
        let d;
        if (Array.isArray(dateInput)) {
            // [year, month, day, hour, minute]
            const [y, m, day, h, min] = dateInput;
            d = new Date(y, m - 1, day, h, min);
        } else {
            d = new Date(dateInput);
        }
        if (isNaN(d.getTime())) return "--";
        
        const dayStr = String(d.getDate()).padStart(2, '0');
        const monthStr = String(d.getMonth() + 1).padStart(2, '0');
        const yearStr = d.getFullYear();
        let h = d.getHours();
        const minStr = String(d.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        const hStr = String(h).padStart(2, '0');
        
        return `${dayStr}/${monthStr}/${yearStr}, ${hStr}:${minStr} ${ampm}`;
    }

    function formatDateOnly(dateInput) {
        if (!dateInput) return "--";
        let d = Array.isArray(dateInput) ? new Date(dateInput[0], dateInput[1]-1, dateInput[2]) : new Date(dateInput);
        if (isNaN(d.getTime())) return "--";
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    }

    function formatTimeOnly(dateInput) {
        if (!dateInput) return "--";
        let d = Array.isArray(dateInput) ? new Date(dateInput[0], dateInput[1]-1, dateInput[2], dateInput[3]||0, dateInput[4]||0) : new Date(dateInput);
        if (isNaN(d.getTime())) return "--";
        let h = d.getHours();
        const min = String(d.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${String(h).padStart(2,'0')}:${min} ${ampm}`;
    }

    function formatDurationText(totalMinutes) {
        if (totalMinutes < 0) totalMinutes = 0;
        const days = Math.floor(totalMinutes / (24 * 60));
        const remAfterDays = totalMinutes % (24 * 60);
        const hours = Math.floor(remAfterDays / 60);
        const mins = totalMinutes % 60;

        const dayStr = days === 1 ? '1 day' : `${days} days`;
        return `${dayStr}, ${hours} hrs, ${mins} min`;
    }

    // ==========================================
    // 4. BUSINESS LOGIC & FEE CALCULATION
    // ==========================================
    function normalizeVehicleNumber(number) {
        if (!number) return '';
        return number.replace(/[\s-]/g, '').toUpperCase();
    }

    function isValidVehicleNumber(normalizedNumber) {
        const regex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,2}[0-9]{4}$/;
        return regex.test(normalizedNumber);
    }

    function calculateParkingFee(vehicleType, durationMinutes) {
        // User rule:
        // <=12h: ₹10 (Bike), ₹30 (Car)
        // 12h-24h (up to 24 hrs): ₹20 (Bike), ₹60 (Car)
        // 24h-36h: ₹30 (Bike), ₹90 (Car)
        // 36h-48h: ₹40 (Bike), ₹120 (Car)
        // Each 12-hour block (or fraction) = ₹10 (Bike), ₹30 (Car)
        let blocks = Math.ceil(durationMinutes / (12 * 60));
        if (blocks <= 0) blocks = 1;

        if (vehicleType === 'Bike') {
            return blocks * 10;
        } else if (vehicleType === 'Car') {
            return blocks * 30;
        }
        return blocks * 10;
    }

    // ==========================================
    // 5. LOCAL STORAGE REPOSITORY
    // ==========================================
    function getStoredRecords() {
        try {
            const data = localStorage.getItem(LOCAL_STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Error reading localStorage records:", e);
            return [];
        }
    }

    function saveStoredRecords(records) {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
        } catch (e) {
            console.error("Error saving localStorage records:", e);
        }
        saveOfflineBackup(records);
    }

    // IndexedDB is a more durable browser store than localStorage. It acts as a
    // recovery copy when a browser clears the localStorage cache for this page.
    function openOfflineBackup() {
        return new Promise(resolve => {
            if (!('indexedDB' in window)) {
                resolve(null);
                return;
            }

            const request = indexedDB.open(BACKUP_DATABASE_NAME, 1);
            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(BACKUP_STORE_NAME)) {
                    database.createObjectStore(BACKUP_STORE_NAME, { keyPath: 'id' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });
    }

    async function saveOfflineBackup(records) {
        const database = await openOfflineBackup();
        if (!database) return;

        try {
            const transaction = database.transaction(BACKUP_STORE_NAME, 'readwrite');
            transaction.objectStore(BACKUP_STORE_NAME).put({
                id: BACKUP_RECORD_KEY,
                records,
                savedAt: new Date().toISOString()
            });
        } catch (e) {
            console.warn('Offline backup could not be updated:', e);
        } finally {
            database.close();
        }
    }

    async function readOfflineBackup() {
        const database = await openOfflineBackup();
        if (!database) return [];

        return new Promise(resolve => {
            try {
                const transaction = database.transaction(BACKUP_STORE_NAME, 'readonly');
                const request = transaction.objectStore(BACKUP_STORE_NAME).get(BACKUP_RECORD_KEY);
                let records = [];

                request.onsuccess = () => {
                    records = Array.isArray(request.result?.records) ? request.result.records : [];
                };
                request.onerror = () => {
                    records = [];
                };
                transaction.oncomplete = () => {
                    database.close();
                    resolve(records);
                };
                transaction.onerror = () => {
                    database.close();
                    resolve([]);
                };
            } catch (e) {
                database.close();
                resolve([]);
            }
        });
    }

    async function clearOfflineBackup() {
        const database = await openOfflineBackup();
        if (!database) return;

        try {
            const transaction = database.transaction(BACKUP_STORE_NAME, 'readwrite');
            transaction.objectStore(BACKUP_STORE_NAME).delete(BACKUP_RECORD_KEY);
        } catch (e) {
            console.warn('Offline backup could not be cleared:', e);
        } finally {
            database.close();
        }
    }

    async function requestPersistentBrowserStorage() {
        if (!navigator.storage?.persist) return false;

        try {
            return await navigator.storage.persist();
        } catch (e) {
            return false;
        }
    }

    async function restoreRecordsFromOfflineBackup() {
        const localRecords = getStoredRecords();
        if (localRecords.length > 0) {
            saveOfflineBackup(localRecords);
            return false;
        }

        const backupRecords = await readOfflineBackup();
        if (backupRecords.length === 0) return false;

        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(backupRecords));
            return true;
        } catch (e) {
            console.warn('Offline backup was found but could not be restored:', e);
            return false;
        }
    }

    function getOccupiedSlots() {
        const records = getStoredRecords();
        const occupied = new Set();
        records.forEach(r => {
            if (r.status === 'ACTIVE' && r.slotNumber) {
                occupied.add(r.slotNumber);
            }
        });
        return occupied;
    }

    function allocateSlotLocally(vehicleType) {
        const occupied = getOccupiedSlots();
        if (vehicleType === 'Bike') {
            for (let i = 1; i <= 50; i++) {
                const slot = `B-${String(i).padStart(2, '0')}`;
                if (!occupied.has(slot)) return slot;
            }
        } else {
            for (let i = 1; i <= 20; i++) {
                const slot = `C-${String(i).padStart(2, '0')}`;
                if (!occupied.has(slot)) return slot;
            }
        }
        return null; // Full
    }

    function generateUniqueTicketCode() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `KCS-${year}${month}${day}-${hours}${minutes}-${randomHex}`;
    }

    // ==========================================
    // 6. DUAL-MODE API LAYER
    // ==========================================
    async function checkBackendHealth() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1200);
            const res = await fetch(`${API_BASE_URL}/dashboard/stats`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                isBackendConnected = true;
                if (systemStatusText) systemStatusText.textContent = "Server connected";
                if (statusDot) {
                    statusDot.style.background = "#10b981";
                    statusDot.style.boxShadow = "0 0 8px #10b981";
                }
                return true;
            }
        } catch (e) {
            // Backend offline, fallback to standalone local storage
        }
        isBackendConnected = false;
        if (systemStatusText) systemStatusText.textContent = "Local browser mode";
        if (statusDot) {
            statusDot.style.background = "#3b82f6";
            statusDot.style.boxShadow = "0 0 8px #3b82f6";
        }
        return false;
    }

    async function apiRequest(endpoint, method = 'GET', body = null) {
        if (!isBackendConnected) {
            throw new Error('BACKEND_OFFLINE');
        }
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || data.message || 'An error occurred on the server.');
        }
        return data;
    }

    // ==========================================
    // 7. ENTRY PROCESSING
    // ==========================================
    printBtn.addEventListener('click', async () => {
        const rawNumber = vehicleNumberInput.value.trim();
        if (!rawNumber) {
            showToast('Please enter a vehicle registration number.', 'error');
            vehicleNumberInput.focus();
            return;
        }

        const normalizedNumber = normalizeVehicleNumber(rawNumber);
        if (!isValidVehicleNumber(normalizedNumber)) {
            showToast('Invalid vehicle number. Format: MH12AB1234', 'error');
            vehicleNumberInput.focus();
            return;
        }

        const vType = vehicleTypeSelect.value;
        const selectedDate = dateInput.value;
        const selectedTime = timeInput.value;

        let ticket = null;

        if (isBackendConnected) {
            try {
                ticket = await apiRequest('/parking/entry', 'POST', {
                    vehicleNumber: normalizedNumber,
                    vehicleType: vType
                });
            } catch (err) {
                showToast(err.message, 'error');
                return;
            }
        } else {
            // Standalone LocalStorage Engine
            const records = getStoredRecords();
            const existingActive = records.find(r => r.vehicleNumber === normalizedNumber && r.status === 'ACTIVE');
            if (existingActive) {
                showToast(`Vehicle ${normalizedNumber} is already parked in slot ${existingActive.slotNumber}!`, 'error');
                return;
            }

            const slot = allocateSlotLocally(vType);
            if (!slot) {
                showToast(`No parking slots available for ${vType}!`, 'error');
                return;
            }

            // Create timestamp using form inputs or current time
            let entryDateTime = new Date();
            if (selectedDate && selectedTime) {
                const [y, m, d] = selectedDate.split('-').map(Number);
                const [h, min] = selectedTime.split(':').map(Number);
                entryDateTime = new Date(y, m - 1, d, h, min);
            }

            ticket = {
                id: Date.now(),
                ticketCode: generateUniqueTicketCode(),
                vehicleNumber: normalizedNumber,
                vehicleType: vType,
                slotNumber: slot,
                entryTime: entryDateTime.toISOString(),
                exitTime: null,
                durationMinutes: 0,
                durationText: null,
                fee: null,
                status: 'ACTIVE'
            };

            records.push(ticket);
            saveStoredRecords(records);
        }

        // Render Slip
        renderPrintSlip(ticket);

        // Notify and trigger print
        showToast(`Vehicle entered successfully! Slot: ${ticket.slotNumber}`, 'success');

        try {
            window.print();
        } catch (e) {
            console.log("Print preview triggered");
        }

        // Reset Inputs
        vehicleNumberInput.value = '';
        refreshDateTimeInputs();
        selectVehicleType('Bike');
        updateDashboardStats();
    });

    function renderPrintSlip(ticket) {
        document.getElementById('slipType').textContent = ticket.vehicleType;
        document.getElementById('slipNumber').textContent = ticket.vehicleNumber;
        document.getElementById('slipTicketId').textContent = ticket.ticketCode;
        
        const slipSlotEl = document.getElementById('slipSlot');
        if (slipSlotEl) slipSlotEl.textContent = ticket.slotNumber || '--';

        const entryDate = ticket.entryTime ? new Date(ticket.entryTime) : new Date();
        const d = String(entryDate.getDate()).padStart(2, '0');
        const m = String(entryDate.getMonth() + 1).padStart(2, '0');
        const y = entryDate.getFullYear();
        document.getElementById('slipDate').textContent = `${d}-${m}-${y}`;

        let h = entryDate.getHours();
        const min = String(entryDate.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        document.getElementById('slipTime').textContent = `${String(h).padStart(2, '0')}:${min} ${ampm}`;

        // QR Code Generation
        const qrcodeContainer = document.getElementById('qrcode');
        qrcodeContainer.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrcodeContainer, {
                text: ticket.ticketCode,
                width: 128,
                height: 128,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.L
            });
        }
    }

    // ==========================================
    // 8. CHECKOUT PROCESSING
    // ==========================================
    scanInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchTicketForCheckout(scanInput.value.trim());
        }
    });

    if (findTicketBtn) {
        findTicketBtn.addEventListener('click', () => {
            searchTicketForCheckout(scanInput.value.trim());
        });
    }

    async function searchTicketForCheckout(inputVal) {
        if (!inputVal) {
            showToast('Please enter a ticket code or vehicle number.', 'info');
            return;
        }

        const normalizedInput = inputVal.trim();
        const searchUpper = normalizedInput.replace(/[\s-]/g, '').toUpperCase();

        if (isBackendConnected) {
            try {
                // Request checkout calculation from backend
                const reqBody = normalizedInput.startsWith('KCS') ? 
                    { ticketCode: normalizedInput, paymentMethod: "CASH" } : 
                    { vehicleNumber: searchUpper, paymentMethod: "CASH" };

                const completed = await apiRequest('/parking/checkout', 'POST', reqBody);
                displayCheckoutSummary(completed);
                showToast(`Checkout complete! Fee: ₹${completed.fee}`, 'success');
                updateDashboardStats();
            } catch (err) {
                showToast(err.message, 'error');
                checkoutResult.classList.add('hidden');
            }
            return;
        }

        // Standalone LocalStorage Engine Checkout Lookup
        const records = getStoredRecords();
        const found = records.find(r => 
            r.status === 'ACTIVE' && 
            (r.ticketCode.toUpperCase() === normalizedInput.toUpperCase() || 
             r.vehicleNumber === searchUpper)
        );

        if (!found) {
            showToast('No active parking ticket found for this code or vehicle.', 'error');
            checkoutResult.classList.add('hidden');
            pendingCheckoutRecord = null;
            return;
        }

        const now = new Date();
        const entryDate = new Date(found.entryTime);
        const durationMs = Math.max(0, now.getTime() - entryDate.getTime());
        const totalMinutes = Math.max(1, Math.ceil(durationMs / (1000 * 60)));
        const fee = calculateParkingFee(found.vehicleType, totalMinutes);
        const durationText = formatDurationText(totalMinutes);

        pendingCheckoutRecord = {
            ...found,
            exitTime: now.toISOString(),
            durationMinutes: totalMinutes,
            durationText: durationText,
            fee: fee
        };

        displayCheckoutSummary(pendingCheckoutRecord);
    }

    function displayCheckoutSummary(record) {
        coVehicle.textContent = record.vehicleNumber;
        coType.textContent = record.vehicleType;
        if (coSlot) coSlot.textContent = record.slotNumber || '--';
        coEntry.textContent = formatDateTimeDisplay(record.entryTime);
        coExit.textContent = formatDateTimeDisplay(record.exitTime || new Date());
        coDuration.textContent = record.durationText;
        coPrice.textContent = `₹${record.fee}`;

        checkoutResult.classList.remove('hidden');
    }

    completeCheckoutBtn.addEventListener('click', async () => {
        if (isBackendConnected) {
            // Already finalized by server
            checkoutResult.classList.add('hidden');
            scanInput.value = '';
            scanInput.focus();
            showToast('Checkout transaction closed.', 'info');
            return;
        }

        if (!pendingCheckoutRecord) {
            checkoutResult.classList.add('hidden');
            return;
        }

        // Commit in LocalStorage
        const records = getStoredRecords();
        const index = records.findIndex(r => r.id === pendingCheckoutRecord.id);
        if (index !== -1) {
            records[index].status = 'COMPLETED';
            records[index].exitTime = pendingCheckoutRecord.exitTime;
            records[index].durationMinutes = pendingCheckoutRecord.durationMinutes;
            records[index].durationText = pendingCheckoutRecord.durationText;
            records[index].fee = pendingCheckoutRecord.fee;
            saveStoredRecords(records);

            showToast(`Checkout completed! ₹${pendingCheckoutRecord.fee} collected. Slot ${pendingCheckoutRecord.slotNumber} freed.`, 'success');
        }

        pendingCheckoutRecord = null;
        checkoutResult.classList.add('hidden');
        scanInput.value = '';
        scanInput.focus();
        updateDashboardStats();
    });

    // ==========================================
    // 9. DASHBOARD & STATS
    // ==========================================
    async function updateDashboardStats() {
        if (!dashboardStats) return;

        if (isBackendConnected) {
            try {
                const stats = await apiRequest('/dashboard/stats');
                renderDashboardHtml({
                    todayEntries: stats.todayEntries,
                    activeParking: stats.activeParking,
                    todayExits: stats.todayExits,
                    bikeCount: stats.bikeCount,
                    carCount: stats.carCount,
                    todayRevenue: stats.todayRevenue
                });
                return;
            } catch (err) {
                console.warn('Could not fetch backend stats, falling back to local calculation');
            }
        }

        // Local Stats Calculation
        const records = getStoredRecords();
        const todayStr = getCurrentDateTime().dateStr;

        let todayEntries = 0;
        let activeParking = 0;
        let todayExits = 0;
        let bikeCount = 0;
        let carCount = 0;
        let todayRevenue = 0;

        records.forEach(r => {
            const entryDateStr = r.entryTime ? r.entryTime.split('T')[0] : '';
            const exitDateStr = r.exitTime ? r.exitTime.split('T')[0] : '';

            if (entryDateStr === todayStr) {
                todayEntries++;
            }

            if (r.status === 'ACTIVE') {
                activeParking++;
                if (r.vehicleType === 'Bike') bikeCount++;
                if (r.vehicleType === 'Car') carCount++;
            }

            if (r.status === 'COMPLETED' && exitDateStr === todayStr) {
                todayExits++;
                todayRevenue += (r.fee || 0);
            }
        });

        renderDashboardHtml({
            todayEntries,
            activeParking,
            todayExits,
            bikeCount,
            carCount,
            todayRevenue
        });
    }

    function renderDashboardHtml(stats) {
        renderWorkspaceStats(stats);
        dashboardStats.innerHTML = `
            <div class="stat-card">
                <div class="stat-card-title">Today's Entries</div>
                <div class="stat-card-value">${stats.todayEntries}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-title">Currently Parked</div>
                <div class="stat-card-value">${stats.activeParking}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-title">Completed</div>
                <div class="stat-card-value">${stats.todayExits}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-title">Bikes Parked</div>
                <div class="stat-card-value">${stats.bikeCount}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-title">Cars Parked</div>
                <div class="stat-card-value">${stats.carCount}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-title">Today's Collection</div>
                <div class="stat-card-value income">₹${stats.todayRevenue}</div>
            </div>
        `;
    }

    function renderWorkspaceStats(stats) {
        const bikeUsed = Math.min(50, Number(stats.bikeCount) || 0);
        const carUsed = Math.min(20, Number(stats.carCount) || 0);
        const bikeFree = Math.max(0, 50 - bikeUsed);
        const carFree = Math.max(0, 20 - carUsed);
        const setText = (element, value) => {
            if (element) element.textContent = value;
        };

        setText(bikeAvailability, bikeFree);
        setText(carAvailability, carFree);
        setText(bikeOccupancy, bikeUsed);
        setText(carOccupancy, carUsed);
        setText(activeParkingValue, stats.activeParking || 0);
        setText(todayEntriesValue, stats.todayEntries || 0);
        setText(todayExitsValue, stats.todayExits || 0);
        setText(railEntriesValue, stats.todayEntries || 0);
        setText(railExitsValue, stats.todayExits || 0);
        setText(railRevenueValue, `₹${stats.todayRevenue || 0}`);

        if (bikeMeter) bikeMeter.style.width = `${bikeUsed * 2}%`;
        if (carMeter) carMeter.style.width = `${carUsed * 5}%`;
    }

    // ==========================================
    // 10. RECORDS MODAL & FILTERS
    // ==========================================
    async function fetchRecords() {
        if (isBackendConnected) {
            try {
                localRecordsCache = await apiRequest('/parking/records');
                renderRecords();
                return;
            } catch (err) {
                console.warn('Backend records fetch failed, falling back to local records');
            }
        }
        localRecordsCache = getStoredRecords();
        renderRecords();
    }

    function renderRecords() {
        const fDate = filterDate.value;
        const fStatus = filterStatus.value;
        const fSearch = normalizeVehicleNumber(filterSearch.value);

        const filtered = localRecordsCache.filter(r => {
            let entryDateStr = '';
            let exitDateStr = '';

            if (Array.isArray(r.entryTime)) {
                entryDateStr = `${r.entryTime[0]}-${String(r.entryTime[1]).padStart(2,'0')}-${String(r.entryTime[2]).padStart(2,'0')}`;
            } else if (r.entryTime) {
                entryDateStr = r.entryTime.split('T')[0];
            }

            if (Array.isArray(r.exitTime)) {
                exitDateStr = `${r.exitTime[0]}-${String(r.exitTime[1]).padStart(2,'0')}-${String(r.exitTime[2]).padStart(2,'0')}`;
            } else if (r.exitTime) {
                exitDateStr = r.exitTime.split('T')[0];
            }

            const matchDate = fDate ? (entryDateStr === fDate || exitDateStr === fDate) : true;
            const matchStatus = fStatus === 'All' ? true : r.status === fStatus;
            const matchSearch = fSearch ? (
                (r.vehicleNumber && r.vehicleNumber.includes(fSearch)) || 
                (r.ticketCode && r.ticketCode.includes(fSearch))
            ) : true;

            return matchDate && matchStatus && matchSearch;
        });

        recordsTbody.innerHTML = '';

        if (filtered.length === 0) {
            recordsTable.classList.add('hidden');
            noRecordsMsg.classList.remove('hidden');
        } else {
            recordsTable.classList.remove('hidden');
            noRecordsMsg.classList.add('hidden');

            filtered.slice().reverse().forEach(r => {
                const tr = document.createElement('tr');
                const badgeClass = r.status === 'ACTIVE' ? 'status-active' : 'status-completed';

                tr.innerHTML = `
                    <td>${r.ticketCode}</td>
                    <td><strong>${r.vehicleNumber}</strong></td>
                    <td>${r.vehicleType}</td>
                    <td><span style="font-weight:600; color:var(--primary);">${r.slotNumber || '--'}</span></td>
                    <td>${formatTimeOnly(r.entryTime)}<br><small style="color:var(--text-muted)">${formatDateOnly(r.entryTime)}</small></td>
                    <td>${r.exitTime ? formatTimeOnly(r.exitTime) : '--'}<br><small style="color:var(--text-muted)">${r.exitTime ? formatDateOnly(r.exitTime) : ''}</small></td>
                    <td>${r.durationText ? r.durationText : '--'}</td>
                    <td>${r.fee !== null && r.fee !== undefined ? `₹${r.fee}` : '--'}</td>
                    <td><span class="status-badge ${badgeClass}">${r.status}</span></td>
                `;
                recordsTbody.appendChild(tr);
            });
        }
    }

    function openRecords() {
        filterDate.value = '';
        filterStatus.value = 'All';
        filterSearch.value = '';
        fetchRecords();
        recordsModal.classList.remove('hidden');
    }

    viewRecordsBtn.addEventListener('click', openRecords);
    if (railRecordsBtn) railRecordsBtn.addEventListener('click', openRecords);
    if (mobileRecordsBtn) mobileRecordsBtn.addEventListener('click', openRecords);

    closeModalBtn.addEventListener('click', () => {
        recordsModal.classList.add('hidden');
    });

    recordsModal.addEventListener('click', (event) => {
        if (event.target === recordsModal) recordsModal.classList.add('hidden');
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') recordsModal.classList.add('hidden');
    });

    filterDate.addEventListener('change', renderRecords);
    filterStatus.addEventListener('change', renderRecords);
    filterSearch.addEventListener('input', renderRecords);

    clearRecordsBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear all local parking records?")) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            clearOfflineBackup();
            showToast("Records successfully cleared.", "info");
            fetchRecords();
            updateDashboardStats();
        }
    });

    // ==========================================
    // 11. TABS MANAGEMENT
    // ==========================================
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.add('hidden'));

            tab.classList.add('active');
            const target = document.getElementById(tab.dataset.tab);
            if (target) target.classList.remove('hidden');

            if (tab.dataset.tab === 'checkoutTab') {
                scanInput.focus();
            } else {
                refreshDateTimeInputs();
                vehicleNumberInput.focus();
            }
        });
    });

    vehicleChoices.forEach(choice => {
        choice.addEventListener('click', () => {
            selectVehicleType(choice.dataset.vehicleChoice);
        });
    });

    // ==========================================
    // 12. INITIALIZATION
    // ==========================================
    refreshDateTimeInputs();
    updateLiveTime();
    setInterval(updateLiveTime, 30000);
    selectVehicleType('Bike');
    requestPersistentBrowserStorage();
    restoreRecordsFromOfflineBackup().then(restored => {
        if (restored) {
            showToast('Previous local parking records were restored.', 'info');
        }
        return checkBackendHealth();
    }).then(() => {
        updateDashboardStats();
    });
});
