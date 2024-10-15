// billentry.js

let parties = {}; // Will store parties fetched from Firebase

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

    // Add event listener for the search bar
    document.getElementById('billSearchBar').addEventListener('input', filterBills);

    // Add event listener for the Add New Bill button
    document.getElementById('addNewBillBtn').addEventListener('click', showBillEntryModal);

    // Load initial bill data
    loadBillData();

    // Add styles for the modal
    addModalStyles();
}

function filterBills() {
    // Implement bill filtering logic here
    console.log('Filtering bills...');
}

async function loadBillData() {
    try {
        const billsRef = firebase.database().ref('bills');
        const snapshot = await billsRef.once('value');
        const bills = snapshot.val();

        const tableBody = document.getElementById('billEntryTableBody');
        tableBody.innerHTML = ''; // Clear existing rows

        if (bills) {
            Object.entries(bills).forEach(([key, bill]) => {
                const row = tableBody.insertRow();
                row.innerHTML = `
                    <td>${bill.billNo}</td>
                    <td>${bill.date}</td>
                    <td>${bill.partyName}</td>
                    <td>${bill.totalAmount.toFixed(2)}</td>
                `;
            });
        } else {
            // If no bills are found, display a message
            const row = tableBody.insertRow();
            row.innerHTML = '<td colspan="4">No bills found</td>';
        }
    } catch (error) {
        console.error('Error loading bill data:', error);
        // Display error message to the user
        const tableBody = document.getElementById('billEntryTableBody');
        tableBody.innerHTML = '<tr><td colspan="4">Error loading bill data. Please try again.</td></tr>';
    }
}
function showBillEntryModal() {
    const modal = document.createElement('div');
    modal.className = 'bill-entry-modal';
    modal.innerHTML = `
        <div class="bill-entry-modal-content">
            <h2>Add New Bill</h2>
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
                <button id="cancelBill">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Set up event listeners and initialize fields
    setupModalEvents();
    initializeFields();
}

function setupModalEvents() {
    document.getElementById('amount').addEventListener('input', calculateTotals);
    document.getElementById('saveBill').addEventListener('click', saveBill);
    document.getElementById('cancelBill').addEventListener('click', closeBillEntryModal);
    document.getElementById('partyName').addEventListener('input', filterParties);
}

function initializeFields() {
    document.getElementById('billDate').valueAsDate = new Date();
    fetchParties();
    fetchLastBillNumber();
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
        // Find the party key
        const partyKey = Object.keys(parties).find(key => parties[key].name === billData.partyName);
        
        if (!partyKey) {
            throw new Error('Party not found');
        }

        // Save bill in the separate 'bills' node
        const billRef = firebase.database().ref('bills').push();
        await billRef.set({ ...billData, partyKey });

        console.log('Bill saved successfully');
        closeBillEntryModal();
        loadBillData(); // Refresh the bill list
    } catch (error) {
        console.error('Error saving bill:', error);
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
    `;
    document.head.appendChild(styleElement);
}

// Make initializeBillEntry globally accessible
window.initializeBillEntry = initializeBillEntry;