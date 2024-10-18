// Add these HTML elements to your existing modal structure
// First, update the bill adjustment modal HTML structure
function addBillAdjustmentModalContent() {
    const modalBody = document.querySelector('.bill-adjustment-modal-body');
    modalBody.innerHTML = `
        <div class="payment-summary-header">
            <div class="payment-amount-display">
                <span>Paid Amount: </span>
                <span id="paid-amount-display">0</span>
            </div>
            <div class="pending-adjustment-display">
                <span>Pending Adjustment: </span>
                <span id="pending-adj-display">0</span>
            </div>
        </div>
        <div id="selected-adjustments-container"></div>
        <button id="adj-bill-cn-btn" class="adj-bill-cn-button" onclick="openAdjBillCnModal()">Adj Bill/CN</button>
        <button id="save-payment-btn" class="save-payment-button" onclick="savePaymentVoucher()">Save Payment</button>
    `;
}


// Add this modal to your HTML
function addAdjBillCnModal() {
    const modal = document.createElement('div');
    modal.className = 'adj-bill-cn-modal';
    modal.id = 'adj-bill-cn-modal';
    modal.innerHTML = `
        <div class="adj-bill-cn-modal-content">
            <div class="adj-bill-cn-modal-header">
                <h2>Select Bill/CN/Opening Balance for Adjustment</h2>
                <span class="adj-bill-cn-close-btn" onclick="closeAdjBillCnModal()">&times;</span>
            </div>
            <div class="adj-bill-cn-modal-body">
                <table class="adj-bill-cn-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Bill/CN No</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="adj-bill-cn-table-body"></tbody>
                </table>
                <div class="discount-entry">
                    <h3>Add Discount</h3>
                    <button onclick="addDiscountEntry()">ADD DISCOUNT</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}



let selectedPartyKey = '';
let paidAmount = 0;
let pendingAdjustment = 0;
let selectedAdjustments = [];

function openBillAdjustmentModal() {
    addBillAdjustmentModalContent();
    addAdjBillCnModal();
    
    const modal = document.getElementById('bill-adjustment-modal');
    selectedPartyKey = document.getElementById('party-search').dataset.partyKey;
    paidAmount = parseFloat(document.querySelector('.payment-voucher-amount-input').value) || 0;
    pendingAdjustment = paidAmount;
    
    updatePaymentSummaryDisplay();
    modal.style.display = 'block';
}

function updatePaymentSummaryDisplay() {
    document.getElementById('paid-amount-display').textContent = paidAmount.toFixed(2);
    document.getElementById('pending-adj-display').textContent = pendingAdjustment.toFixed(2);
    
    const saveBtn = document.getElementById('save-payment-btn');
    if (saveBtn) {
        if (pendingAdjustment === 0 && selectedAdjustments.length > 0) {
            saveBtn.style.display = 'block';
        } else {
            saveBtn.style.display = 'none';
        }
    }
}

function openAdjBillCnModal() {
    const modal = document.getElementById('adj-bill-cn-modal');
    modal.style.display = 'block';
    loadPartyBillsAndCN();
}

function closeAdjBillCnModal() {
    const modal = document.getElementById('adj-bill-cn-modal');
    modal.style.display = 'none';
}

async function loadPartyBillsAndCN() {
    const tableBody = document.getElementById('adj-bill-cn-table-body');
    tableBody.innerHTML = '';
    
    try {
        // Load opening balance
        const partyRef = database.ref(`parties/${selectedPartyKey}`);
        const partySnapshot = await partyRef.once('value');
        const partyData = partySnapshot.val();
        
        if (partyData.openingBalance && partyData.openingBalance !== 0) {
            addRowToAdjustmentTable({
                date: partyData.openingBalanceDate || 'N/A',
                itemNo: 'OB',
                amount: partyData.openingBalance,
                type: 'Opening Balance'
            });
        }

        // Load bills
        const billsRef = database.ref(`bills`);
        const billsSnapshot = await billsRef.orderByChild('partyKey').equalTo(selectedPartyKey).once('value');
        
        billsSnapshot.forEach((billSnapshot) => {
            const bill = billSnapshot.val();
            const remainingBalance = getRemainingBalance(bill);
            
            if (remainingBalance > 0) {
                addRowToAdjustmentTable({
                    ...bill,
                    remainingBalance
                }, 'Bill');
            }
        });
        
        // Load CNs
        const cnRef = database.ref(`parties/${selectedPartyKey}/cn`);
        const cnSnapshot = await cnRef.once('value');
        
        cnSnapshot.forEach((cnSnapshot) => {
            const cn = cnSnapshot.val();
            if (cn.status === 'Active') {
                addRowToAdjustmentTable(cn, 'CN');
            }
        });
    } catch (error) {
        console.error("Error loading bills, CNs, and opening balance:", error);
        // Optionally, display an error message to the user
    }
}


function isFullyPaid(bill) {
    // Check if bill is fully paid by looking at existing payments
    if (!bill.payments) return false;
    let totalPaid = 0;
    Object.values(bill.payments).forEach(payment => {
        totalPaid += payment.amountPaid + (payment.discount || 0);
    });
    return totalPaid >= bill.totalAmount;
}

function getRemainingBalance(bill) {
    if (!bill.payments) return bill.totalAmount;
    let totalPaid = 0;
    Object.values(bill.payments).forEach(payment => {
        totalPaid += payment.amountPaid + (payment.discount || 0);
    });
    return bill.totalAmount - totalPaid;
}

function addRowToAdjustmentTable(item, type) {
    const tableBody = document.getElementById('adj-bill-cn-table-body');
    const row = document.createElement('tr');
    const itemNo = type === 'Bill' ? item.billNo : (type === 'CN' ? item.cnNo : 'OB');
    let amount = type === 'Bill' ? item.remainingBalance : (type === 'CN' ? item.cnAmount : item.amount);
    
    // Check if this item is already in selectedAdjustments and update the amount
    const existingAdjustment = selectedAdjustments.find(adj => adj.itemNo === itemNo);
    if (existingAdjustment) {
        amount -= existingAdjustment.crAmount;
    }
    
    if (amount <= 0) return; // Don't add row if amount is 0 or negative
    
    row.innerHTML = `
        <td>${item.date}</td>
        <td>${itemNo}</td>
        <td>${type}</td>
        <td>${amount.toFixed(2)}</td>
        <td><button onclick="selectAdjustmentItem('${itemNo}', ${amount}, '${type}', '${item.date}')">Select</button></td>
    `;
    tableBody.appendChild(row);
}

function selectAdjustmentItem(itemNo, amount, type, date) {
    closeAdjBillCnModal();
    
    const adjustmentEntry = {
        itemNo,
        amount,
        type,
        date,
        crAmount: Math.min(amount, pendingAdjustment),
        remark: ''
    };
    
    // Remove existing adjustment for this item, if any
    selectedAdjustments = selectedAdjustments.filter(adj => adj.itemNo !== itemNo);
    
    selectedAdjustments.push(adjustmentEntry);
    addAdjustmentEntryToDisplay(adjustmentEntry);
    updatePendingAdjustment(adjustmentEntry.crAmount);
}


function addAdjustmentEntryToDisplay(entry) {
    const container = document.getElementById('selected-adjustments-container');
    const entryDiv = document.createElement('div');
    entryDiv.className = 'adjustment-entry';
    entryDiv.innerHTML = `
        <div class="adjustment-entry-details">
            <span>${entry.date}</span> |
            <span>${entry.itemNo}</span> |
            <span>${entry.type}</span> |
            <span>${entry.amount}</span>
        </div>
        <div class="adjustment-entry-inputs">
            <input type="number" value="${entry.crAmount}" onchange="updateCrAmount(this, ${selectedAdjustments.length - 1})" max="${Math.min(entry.amount, pendingAdjustment + entry.crAmount)}">
            <input type="text" placeholder="Remark" onchange="updateRemark(this, ${selectedAdjustments.length - 1})">
            <button onclick="removeAdjustmentEntry(${selectedAdjustments.length - 1})">Remove</button>
        </div>
    `;
    container.appendChild(entryDiv);
    
    // Move the Adj Bill/CN button below the entries
    const adjButton = document.getElementById('adj-bill-cn-btn');
    container.parentNode.appendChild(adjButton);
}

function updateCrAmount(input, index) {
    const oldCrAmount = selectedAdjustments[index].crAmount;
    const newCrAmount = parseFloat(input.value);
    const maxAllowed = Math.min(
        selectedAdjustments[index].amount,
        pendingAdjustment + oldCrAmount
    );
    
    if (newCrAmount > maxAllowed) {
        input.value = maxAllowed;
        selectedAdjustments[index].crAmount = maxAllowed;
    } else {
        selectedAdjustments[index].crAmount = newCrAmount;
    }
    
    pendingAdjustment = paidAmount - selectedAdjustments.reduce((sum, adj) => sum + adj.crAmount, 0);
    updatePaymentSummaryDisplay();
    
    // Refresh the Adj Bill/CN modal to reflect updated amounts
    loadPartyBillsAndCN();
}

function updateRemark(input, index) {
    selectedAdjustments[index].remark = input.value;
}

function removeAdjustmentEntry(index) {
    pendingAdjustment += selectedAdjustments[index].crAmount;
    selectedAdjustments.splice(index, 1);
    
    const container = document.getElementById('selected-adjustments-container');
    container.innerHTML = '';
    selectedAdjustments.forEach((entry, i) => {
        addAdjustmentEntryToDisplay(entry);
    });
    
    updatePaymentSummaryDisplay();
    
    // Refresh the Adj Bill/CN modal to reflect updated amounts
    loadPartyBillsAndCN();
}

function updatePendingAdjustment(crAmount) {
    pendingAdjustment -= crAmount;
    updatePaymentSummaryDisplay();
}

function addDiscountEntry() {
    closeAdjBillCnModal();
    
    const discountEntry = {
        itemNo: 'DISCOUNT',
        amount: pendingAdjustment,
        type: 'Discount',
        date: document.getElementById('voucher-date').value,
        crAmount: pendingAdjustment,
        remark: 'Discount'
    };
    
    selectedAdjustments.push(discountEntry);
    addAdjustmentEntryToDisplay(discountEntry);
    updatePendingAdjustment(pendingAdjustment);
}

async function savePaymentVoucher() {
    try {
        // 1. Gather and validate all required data
        const voucherDate = document.getElementById('voucher-date').value;
        const partyName = document.getElementById('party-search').value;
        const activePaymentBtn = document.querySelector('.payment-voucher-mode-btn.active');
        
        // Validation checks
        if (!voucherDate || !partyName || !selectedPartyKey || !paidAmount) {
            console.error('Missing required fields:', {
                voucherDate,
                partyName,
                selectedPartyKey,
                paidAmount
            });
            alert('Please fill in all required fields');
            return;
        }

        if (selectedAdjustments.length === 0) {
            alert('Please add at least one bill adjustment, discount, or opening balance adjustment');
            return;
        }

        if (pendingAdjustment !== 0) {
            alert(`There is still ${pendingAdjustment} pending adjustment. Please adjust all amounts before saving.`);
            return;
        }

        // 2. Prepare payment data
        const paymentMode = activePaymentBtn ? activePaymentBtn.textContent.toLowerCase() : 'cash';
        
        const paymentData = {
            voucherNo: `V${lastVoucherNumber}`,
            date: voucherDate,
            partyKey: selectedPartyKey,
            partyName: partyName,
            paymentMode: paymentMode,
            amountPaid: paidAmount,
            timestamp: Date.now()
        };

        // Add mode-specific fields
        if (paymentMode === 'cheque') {
            const chequeNo = document.getElementById('cheque-number')?.value;
            const chequeDate = document.getElementById('cheque-date')?.value;
            if (!chequeNo || !chequeDate) {
                alert('Please fill in all cheque details');
                return;
            }
            paymentData.chequeNo = chequeNo;
            paymentData.chequeDate = chequeDate;
        } else if (paymentMode === 'online') {
            const onlineMethod = document.getElementById('online-method')?.value;
            if (!onlineMethod) {
                alert('Please specify the online payment method');
                return;
            }
            paymentData.onlineMethod = onlineMethod;
        }

        // 3. Process adjustments
        paymentData.billsAdjusted = {};
        paymentData.openingBalanceAdjustment = 0;
        let totalDiscount = 0;
        let totalCnAdjustment = 0;

        for (const adj of selectedAdjustments) {
            if (adj.type === 'Discount') {
                totalDiscount += adj.crAmount;
            } else if (adj.type === 'CN') {
                totalCnAdjustment += adj.crAmount;
                // Mark CN as used
                await database.ref(`cn/${adj.itemNo}`).update({
                    adjustedIn: paymentData.voucherNo,
                    status: 'Used'
                });
            } else if (adj.type === 'Bill') {
                paymentData.billsAdjusted[adj.itemNo] = {
                    billNo: adj.itemNo,
                    amount: adj.amount,
                    amountPaid: adj.crAmount,
                    discount: 0,
                    balance: adj.amount - adj.crAmount,
                    remark: adj.remark || ''
                };
            } else if (adj.type === 'Opening Balance') {
                paymentData.openingBalanceAdjustment = adj.crAmount;
            }
        }

        paymentData.discount = totalDiscount;
        paymentData.cnAdjustment = totalCnAdjustment;
        paymentData.totalAdjustedAmount = paidAmount;

        // 4. Save to Firebase
        console.log('Saving payment data:', paymentData);
        
        // Save payment entry
        const newPaymentRef = await database.ref('payments').push(paymentData);
        const paymentId = newPaymentRef.key;

        // 5. Update bills
        for (const [billNo, billAdj] of Object.entries(paymentData.billsAdjusted)) {
            // Find the actual bill ID
            const billsRef = database.ref('bills');
            const billSnapshot = await billsRef.orderByChild('billNo').equalTo(billNo).once('value');
            
            if (billSnapshot.exists()) {
                let actualBillId = null;
                billSnapshot.forEach(childSnapshot => {
                    actualBillId = childSnapshot.key;
                });

                if (actualBillId) {
                    // Get existing payments
                    const existingPaymentsSnapshot = await database.ref(`bills/${actualBillId}/payments`).once('value');
                    const existingPayments = existingPaymentsSnapshot.val() || {};
                    
                    // Calculate total paid so far
                    let totalPaidSoFar = 0;
                    Object.values(existingPayments).forEach(payment => {
                        totalPaidSoFar += payment.amountPaid + (payment.discount || 0);
                    });
                    
                    // Calculate new balance
                    const newBalance = billAdj.amount - (totalPaidSoFar + billAdj.amountPaid + billAdj.discount);
                    
                    // Update bill with new payment
                    await database.ref(`bills/${actualBillId}/payments/${paymentId}`).set({
                        amountPaid: billAdj.amountPaid,
                        discount: billAdj.discount,
                        balance: newBalance,
                        remark: billAdj.remark || ''
                    });
                }
            }
        }

        // 6. Update party data and add ledger entry
        const partyRef = database.ref(`parties/${selectedPartyKey}`);
        const partySnapshot = await partyRef.once('value');
        const partyData = partySnapshot.val();
        
        const ledgerEntry = {
            date: voucherDate,
            type: 'cr',
            amount: paymentData.totalAdjustedAmount,
            description: `Payment via ${paymentMode.charAt(0).toUpperCase() + paymentMode.slice(1)} - ${paymentData.voucherNo}`
        };
        
        // Prepare opening balance adjustment entry
        const openingBalanceAdjustment = {
            date: voucherDate,
            amount: paymentData.openingBalanceAdjustment,
            voucherNo: paymentData.voucherNo
        };

        // Update party data
        const partyUpdate = {
            openingBalance: partyData.openingBalance - paymentData.openingBalanceAdjustment
        };

        // If there's an opening balance adjustment, update the adjustments array
        if (paymentData.openingBalanceAdjustment !== 0) {
            await partyRef.child('openingBalanceAdjustments').transaction((currentAdjustments) => {
                if (currentAdjustments) {
                    currentAdjustments.push(openingBalanceAdjustment);
                    return currentAdjustments;
                } else {
                    return [openingBalanceAdjustment];
                }
            });
        }

        // Perform the party update
        await partyRef.update(partyUpdate);
        
        // Add ledger entry
        await database.ref(`parties/${selectedPartyKey}/ledger`).push(ledgerEntry);

        // Update party balance
        await updatePartyBalance(selectedPartyKey);

        // 7. Success cleanup
        alert('Payment saved successfully!');
        closeBillAdjustmentModal();
        closeVoucherModal();
        refreshPaymentTable();

    } catch (error) {
        console.error("Error saving payment:", error);
        alert(`Error saving payment: ${error.message}`);
    }
}
// Helper function to refresh payment table (implement based on your needs)
function refreshPaymentTable() {
    // Implement based on how you're displaying payments in your main interface
    // This might involve fetching latest payments and updating the UI
    console.log('Refreshing payment table...');
}
let lastVoucherNumber = 0;


function initializePaymentEntry() {
    const sectionContent = document.querySelector('.section-content');
    sectionContent.innerHTML = `
        <div class="payment-entry-container">
            <input type="text" class="payment-entry-searchbar" placeholder="Search payments...">
            <button class="payment-entry-new-btn" onclick="openVoucherModal()">Add New Voucher</button>
            <table class="payment-entry-table">
                <thead>
                    <tr>
                        <th>V.NO:</th>
                        <th>V.Date</th>
                        <th>Party</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody id="payment-entry-table-body">
                    <!-- Table rows will be dynamically added here -->
                </tbody>
            </table>
        </div>

        <!-- Voucher Entry Modal -->
        <div class="payment-voucher-modal" id="payment-voucher-modal">
            <div class="payment-voucher-modal-content">
                <div class="payment-voucher-modal-header">
                    <div class="payment-voucher-number">Voucher No: V<span id="voucher-number-display">1</span></div>
                    <input type="date" id="voucher-date" class="payment-voucher-date">
                    <span class="payment-voucher-close-btn" onclick="closeVoucherModal()">&times;</span>
                </div>
                <form class="payment-voucher-form" onsubmit="submitVoucher(event)">
                    <div class="payment-voucher-party-container">
                        <input type="text" id="party-search" class="payment-voucher-party-search" 
                               placeholder="Search party..." onkeyup="searchParty(this.value)">
                        <div class="payment-voucher-party-suggestions" id="party-suggestions"></div>
                    </div>
                    <div class="payment-voucher-mode-group">
                        <button type="button" class="payment-voucher-mode-btn" onclick="selectPaymentMode('cash')">Cash</button>
                        <button type="button" class="payment-voucher-mode-btn" onclick="selectPaymentMode('cheque')">Cheque</button>
                        <button type="button" class="payment-voucher-mode-btn" onclick="selectPaymentMode('online')">Online</button>
                    </div>
                    <input type="text" id="cheque-number" class="payment-voucher-extra-field" placeholder="Cheque Number">
                    <input type="date" id="cheque-date" class="payment-voucher-extra-field">
                    <input type="text" id="online-method" class="payment-voucher-extra-field" placeholder="Online Payment Method">
                    <input type="number" class="payment-voucher-amount-input" placeholder="Amount" required>
                    <button type="button" class="payment-voucher-adjust-btn" onclick="openBillAdjustmentModal()">Bill Adjustment</button>
                    <button type="submit" class="payment-voucher-save-btn">Save Payment</button>
                </form>
            </div>
        </div>

        <!-- Bill Adjustment Modal -->
        <div class="bill-adjustment-modal" id="bill-adjustment-modal">
            <div class="bill-adjustment-modal-content">
                <div class="bill-adjustment-modal-header">
                    <h2>Payment Adjustments</h2>
                    <span class="bill-adjustment-close-btn" onclick="closeBillAdjustmentModal()">&times;</span>
                </div>
                <div class="bill-adjustment-modal-body">
                    <!-- Add your bill adjustment content here -->
                </div>
                <div class="bill-adjustment-modal-footer">
                    <button onclick="saveBillAdjustment()" class="bill-adjustment-save-btn">Save</button>
                </div>
            </div>
        </div>
    `;

    // Set today's date as default
    document.getElementById('voucher-date').valueAsDate = new Date();
    
    // Load and display existing payments
    loadExistingPayments();

  window.addEventListener('popstate', (event) => {
        if (!event.state || !event.state.section) {
            goBack();
        }
    });
}

function loadExistingPayments() {
    const paymentsRef = database.ref('payments');
    paymentsRef.on('value', (snapshot) => {
        const tableBody = document.getElementById('payment-entry-table-body');
        tableBody.innerHTML = ''; // Clear existing rows
        
        let maxVoucherNumber = 0;
        
        snapshot.forEach((childSnapshot) => {
            const payment = childSnapshot.val();
            const row = tableBody.insertRow();
            
            row.innerHTML = `
                <td>${payment.voucherNo}</td>
                <td>${payment.date}</td>
                <td>${payment.partyName}</td>
                <td>${payment.amountPaid}</td>
            `;
            
            // Extract number from voucherNo (assuming format 'V1', 'V2', etc.)
            const voucherNumber = parseInt(payment.voucherNo.substring(1));
            if (voucherNumber > maxVoucherNumber) {
                maxVoucherNumber = voucherNumber;
            }
        });
        
        // Update lastVoucherNumber for new entries
        lastVoucherNumber = maxVoucherNumber;
        
        // Update the voucher number display in the modal
        const voucherNumberDisplay = document.getElementById('voucher-number-display');
        if (voucherNumberDisplay) {
            voucherNumberDisplay.textContent = lastVoucherNumber + 1;
        }
    });
}

function openVoucherModal() {
    const modal = document.getElementById('payment-voucher-modal');
    modal.style.display = 'block';
    lastVoucherNumber++;
    document.getElementById('voucher-number-display').textContent = lastVoucherNumber;
}

function closeVoucherModal() {
    const modal = document.getElementById('payment-voucher-modal');
    modal.style.display = 'none';
}

function selectPaymentMode(mode) {
    // Reset all buttons and hide all extra fields
    const buttons = document.querySelectorAll('.payment-voucher-mode-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.payment-voucher-extra-field').forEach(field => {
        field.style.display = 'none';
        field.required = false;
    });

    // Activate selected button and show relevant fields
    event.target.classList.add('active');
    if (mode === 'cheque') {
        document.getElementById('cheque-number').style.display = 'block';
        document.getElementById('cheque-date').style.display = 'block';
        document.getElementById('cheque-number').required = true;
        document.getElementById('cheque-date').required = true;
    } else if (mode === 'online') {
        document.getElementById('online-method').style.display = 'block';
        document.getElementById('online-method').required = true;
    }
}

function searchParty(query) {
    if (!query) {
        document.getElementById('party-suggestions').innerHTML = '';
        document.getElementById('party-suggestions').style.display = 'none';
        return;
    }

    const partiesRef = database.ref('parties');
    partiesRef.orderByChild('name').startAt(query.toUpperCase()).endAt(query.toUpperCase() + '\uf8ff').once('value', (snapshot) => {
        const parties = [];
        snapshot.forEach((childSnapshot) => {
            parties.push({
                key: childSnapshot.key,
                name: childSnapshot.val().name
            });
        });
        displayPartySuggestions(parties);
    }).catch((error) => {
        console.error("Error searching for parties:", error);
    });
}

function displayPartySuggestions(parties) {
    const suggestionsDiv = document.getElementById('party-suggestions');
    if (parties.length > 0) {
        suggestionsDiv.innerHTML = parties.map(party => 
            `<div class="payment-voucher-party-item" onclick="selectParty('${party.name}', '${party.key}')">${party.name}</div>`
        ).join('');
        suggestionsDiv.style.display = 'block';
    } else {
        suggestionsDiv.innerHTML = '<div class="payment-voucher-party-item">No parties found</div>';
        suggestionsDiv.style.display = 'block';
    }
}

function selectParty(partyName, partyKey) {
    document.getElementById('party-search').value = partyName;
    document.getElementById('party-suggestions').style.display = 'none';
    // Store the selected party key for later use
    document.getElementById('party-search').dataset.partyKey = partyKey;
}

function submitVoucher(event) {
    event.preventDefault();
    // Implement voucher submission logic here
    // This is where you'd typically save the voucher data to Firebase
    
    const voucherData = {
        voucherNumber: lastVoucherNumber,
        date: document.getElementById('voucher-date').value,
        partyName: document.getElementById('party-search').value,
        partyKey: document.getElementById('party-search').dataset.partyKey,
        amount: document.querySelector('.payment-voucher-amount-input').value,
        // Add other relevant fields
    };
    
    // Save to Firebase (you'll need to implement this)
    // saveVoucherToFirebase(voucherData);
    
    // For demonstration, let's just add a row to the table
    const tableBody = document.getElementById('payment-entry-table-body');
    const newRow = tableBody.insertRow();
    newRow.innerHTML = `
        <td>V${voucherData.voucherNumber}</td>
        <td>${voucherData.date}</td>
        <td>${voucherData.partyName}</td>
        <td>${voucherData.amount}</td>
    `;
    
    closeVoucherModal();
}
function closeBillAdjustmentModal() {
    const modal = document.getElementById('bill-adjustment-modal');
    modal.style.display = 'none';
    // Reset selected adjustments and other state if needed
    selectedAdjustments = [];
    pendingAdjustment = paidAmount;
}

async function updatePartyBalance(partyKey) {
    const partyRef = database.ref(`parties/${partyKey}`);
    const billsRef = database.ref('bills').orderByChild('partyKey').equalTo(partyKey);
    const paymentsRef = database.ref('payments').orderByChild('partyKey').equalTo(partyKey);

    try {
        // Get party data
        const partySnapshot = await partyRef.once('value');
        const partyData = partySnapshot.val();

        // Get all bills for the party
        const billsSnapshot = await billsRef.once('value');
        let totalBillAmount = 0;
        billsSnapshot.forEach((billSnapshot) => {
            const bill = billSnapshot.val();
            totalBillAmount += bill.totalAmount;
        });

        // Get all payments for the party
        const paymentsSnapshot = await paymentsRef.once('value');
        let totalPaymentAmount = 0;
        paymentsSnapshot.forEach((paymentSnapshot) => {
            const payment = paymentSnapshot.val();
            totalPaymentAmount += payment.amountPaid;
        });

        // Calculate new balance
        const newBalance = (totalBillAmount + partyData.openingBalance) - totalPaymentAmount;

        // Update party balance in Firebase
        await partyRef.update({ balance: newBalance });

        console.log(`Updated balance for party ${partyKey}: ${newBalance}`);
    } catch (error) {
        console.error(`Error updating balance for party ${partyKey}:`, error);
    }
}
