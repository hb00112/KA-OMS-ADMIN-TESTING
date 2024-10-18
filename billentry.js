// billentry.js

let parties = {}; // Will store parties fetched from Firebase
let currentEditingBillId = null;

function initializeBillEntry() {
    const sectionContent = document.querySelector('.section-content');
    sectionContent.innerHTML = `
        <div class="bill-entry-container">
            <div class="search-bar-container">
                <input type="text" id="billSearchBar" class="bill-search-bar" placeholder="Search bills...">
            </div>
            <button id="addNewBillBtn" class="add-new-bill-btn">Add New Bill</button>
            <table class="bill-entry-table">
                <thead>
                    <tr>
                        <th>Bill No</th>
                        <th>Bill Date</th>
                        <th>Party Name</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody id="billEntryTableBody">
                    <!-- Bill entries will be dynamically added here -->
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('billSearchBar').addEventListener('input', filterBills);
    // Modified to pass null explicitly for new bills
    document.getElementById('addNewBillBtn').addEventListener('click', () => showBillEntryModal(null));

    loadBillData();
    addModalStyles();

    window.addEventListener('popstate', (event) => {
        if (!event.state || !event.state.section) {
            goBack();
        }
    });
}

function filterBills() {
    // Implement bill filtering logic here
    console.log('Filtering bills...');
}

// Modified loadBillData function
async function loadBillData() {
    try {
        const billsRef = firebase.database().ref('bills');
        const snapshot = await billsRef.once('value');
        const bills = snapshot.val();

        const tableBody = document.getElementById('billEntryTableBody');
        tableBody.innerHTML = '';

        if (bills) {
            Object.entries(bills).forEach(([billId, bill]) => {
                const row = tableBody.insertRow();
                row.dataset.billId = billId; // Store bill ID in the row
                row.className = 'bill-row';
                row.innerHTML = `
                    <td>${bill.billNo}</td>
                    <td>${bill.date}</td>
                    <td>${bill.partyName}</td>
                    <td>${bill.totalAmount.toFixed(2)}</td>
                `;
                // Modified event listener to prevent event propagation and correctly pass billId
                row.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showBillEntryModal(billId); // Pass only the billId
                });
            });
        } else {
            const row = tableBody.insertRow();
            row.innerHTML = '<td colspan="4">No bills found</td>';
        }
    } catch (error) {
        console.error('Error loading bill data:', error);
        const tableBody = document.getElementById('billEntryTableBody');
        tableBody.innerHTML = '<tr><td colspan="4">Error loading bill data. Please try again.</td></tr>';
    }
}


// Modified showBillEntryModal function
async function showBillEntryModal(billId = null) {
    currentEditingBillId = billId;
    const modal = document.createElement('div');
    modal.className = 'bill-entry-modal';
    modal.innerHTML = `
        <div class="bill-entry-modal-content">
            <span class="close-modal">&times;</span>
            <h2>${billId ? 'Edit Bill' : 'Add New Bill'}</h2>
            <div class="bill-entry-form">
                <div class="form-group">
                    <label for="partyName">Party Name:</label>
                    <input type="text" id="partyName" list="partyList" autocomplete="off">
                    <datalist id="partyList"></datalist>
                </div>
                <div class="form-group">
                    <label for="billDate">Date:</label>
                    <input type="date" id="billDate">
                </div>
                <div class="form-group">
                    <label for="billNo">Bill No:</label>
                    <input type="text" id="billNo">
                </div>
                <div class="form-group">
                    <label for="amount">Amount (₹):</label>
                    <input type="number" id="amount" step="0.01">
                </div>
                <div class="form-group">
                    <label for="gst">GST (2.5 + 2.5):</label>
                    <input type="number" id="gst" readonly>
                </div>
                <div class="form-group">
                    <label for="totalAmount">Total Amount (₹):</label>
                    <input type="number" id="totalAmount" readonly>
                </div>
                <button id="saveBill">Save Bill</button>
                ${billId ? '<button id="deleteBill" class="delete-button">Delete Bill</button>' : ''}
                <button id="cancelBill">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    setupModalEvents();
    await initializeFields(billId);
}

function setupModalEvents() {
    document.getElementById('amount').addEventListener('input', calculateTotals);
    document.getElementById('saveBill').addEventListener('click', saveBill);
    document.getElementById('cancelBill').addEventListener('click', closeBillEntryModal);
    document.getElementById('partyName').addEventListener('input', filterParties);

    const deleteButton = document.getElementById('deleteBill');
    if (deleteButton) {
        deleteButton.addEventListener('click', deleteBill);
    }

    const closeButton = document.querySelector('.close-modal');
    if (closeButton) {
        closeButton.addEventListener('click', closeBillEntryModal);
    }
}


async function initializeFields(billId = null) {
    await fetchParties();
    
    if (billId) {
        // Load existing bill data
        const billRef = firebase.database().ref(`bills/${billId}`);
        const snapshot = await billRef.once('value');
        const billData = snapshot.val();

        if (billData) {
            document.getElementById('partyName').value = billData.partyName;
            document.getElementById('billDate').value = billData.date;
            document.getElementById('billNo').value = billData.billNo;
            document.getElementById('amount').value = billData.amount;
            calculateTotals();
        }
    } else {
        // New bill
        document.getElementById('billDate').valueAsDate = new Date();
        fetchLastBillNumber();
    }
}

function calculateTotals() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const gst = amount * 0.05; // 2.5% + 2.5% = 5%
    const total = amount + gst;

    document.getElementById('gst').value = gst.toFixed(2);
    document.getElementById('totalAmount').value = total.toFixed(2);
}

async function fetchParties() {
    try {
        const partiesRef = firebase.database().ref('parties');
        const snapshot = await partiesRef.once('value');
        parties = snapshot.val() || {};
        updatePartyList();
    } catch (error) {
        console.error('Error fetching parties:', error);
    }
}

function updatePartyList() {
    const datalist = document.getElementById('partyList');
    datalist.innerHTML = '';
    Object.values(parties).forEach(party => {
        const option = document.createElement('option');
        option.value = party.name;
        datalist.appendChild(option);
    });
}

function filterParties() {
    const input = document.getElementById('partyName').value.toLowerCase();
    const filteredParties = Object.values(parties).filter(party => 
        party.name.toLowerCase().includes(input)
    );
    updatePartyList(filteredParties);
}

async function fetchLastBillNumber() {
    try {
        const billsRef = firebase.database().ref('bills');
        const snapshot = await billsRef.orderByChild('billNo').limitToLast(1).once('value');
        const lastBill = snapshot.val();
        const lastBillNo = lastBill ? Object.values(lastBill)[0].billNo : 'K0';
        const newBillNo = incrementBillNumber(lastBillNo);
        document.getElementById('billNo').value = newBillNo;
    } catch (error) {
        console.error('Error fetching last bill number:', error);
    }
}

function incrementBillNumber(lastBillNo) {
    const prefix = lastBillNo.match(/^[A-Za-z]+/)[0];
    const number = parseInt(lastBillNo.match(/\d+/)[0]);
    return `${prefix}${number + 1}`;
}

// Modified saveBill function
async function saveBill() {
    const billData = {
        partyName: document.getElementById('partyName').value,
        date: document.getElementById('billDate').value,
        billNo: document.getElementById('billNo').value,
        amount: parseFloat(document.getElementById('amount').value),
        gst: parseFloat(document.getElementById('gst').value),
        totalAmount: parseFloat(document.getElementById('totalAmount').value),
        type: 'dr',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    try {
        const partyKey = Object.keys(parties).find(key => parties[key].name === billData.partyName);
        
        if (!partyKey) {
            throw new Error('Party not found');
        }

        let billRef;
        if (currentEditingBillId) {
            // Update existing bill
            billRef = firebase.database().ref(`bills/${currentEditingBillId}`);
            await billRef.update({ ...billData, partyKey });
            console.log('Bill updated successfully');
        } else {
            // Create new bill
            billRef = firebase.database().ref('bills').push();
            await billRef.set({ ...billData, partyKey });
            console.log('Bill saved successfully');
        }

        closeBillEntryModal();
        loadBillData();
    } catch (error) {
        console.error('Error saving bill:', error);
        alert('Error saving bill. Please try again.');
    }
}

// New deleteBill function
async function deleteBill() {
    if (!currentEditingBillId) return;

    if (confirm('Are you sure you want to delete this bill?')) {
        try {
            await firebase.database().ref(`bills/${currentEditingBillId}`).remove();
            console.log('Bill deleted successfully');
            closeBillEntryModal();
            loadBillData();
        } catch (error) {
            console.error('Error deleting bill:', error);
            alert('Error deleting bill. Please try again.');
        }
    }
}

function closeBillEntryModal() {
    const modal = document.querySelector('.bill-entry-modal');
    if (modal) {
        modal.remove();
    }
}

function addModalStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .bill-entry-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
.bill-row {
                cursor: pointer;
            }
            .bill-row:hover {
                background-color: #f5f5f5;
            }
            .delete-button {
                background-color: #dc3545 !important;
                margin-top: 10px;
            }
            .delete-button:hover {
                background-color: #c82333 !important;
            }
        .bill-entry-modal-content {
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            width: 80%;
            max-width: 500px;
        }

        .bill-entry-form {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .bill-entry-form .form-group {
            display: flex;
            flex-direction: column;
        }

        .bill-entry-form label {
            margin-bottom: 5px;
            font-weight: bold;
        }

        .bill-entry-form input {
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }

        .bill-entry-form input[readonly] {
            background-color: #f0f0f0;
        }

        .bill-entry-form button {
            padding: 10px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        .bill-entry-form button:hover {
            background-color: #45a049;
        }

        .bill-entry-form #cancelBill {
            background-color: #f44336;
        }

        .bill-entry-form #cancelBill:hover {
            background-color: #d32f2f;
        }

        .close-modal {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
    position: absolute;
    top: 130px;
    right: 40px;
}
.close-modal:hover,
.close-modal:focus {
    color: #000;
    text-decoration: none;
    cursor: pointer;
}
    `;
    document.head.appendChild(styleElement);
}

// Make initializeBillEntry globally accessible
window.initializeBillEntry = initializeBillEntry;
