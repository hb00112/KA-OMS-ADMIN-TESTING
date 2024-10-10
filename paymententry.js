// Payment Entry Functionality
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
                        <input type="text" class="payment-voucher-party-search" 
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
                    <button type="submit" class="payment-voucher-adjust-btn">Bill Adjustment</button>
                </form>
            </div>
        </div>
    `;

    // Set today's date as default
    document.getElementById('voucher-date').valueAsDate = new Date();
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
    // Implement party search functionality
    // This is a placeholder - you'll need to implement actual party search logic
    const parties = ['Party 1', 'Party 2', 'Party 3'].filter(party => 
        party.toLowerCase().includes(query.toLowerCase())
    );
    
    const suggestionsDiv = document.getElementById('party-suggestions');
    suggestionsDiv.innerHTML = parties.map(party => 
        `<div class="payment-voucher-party-item" onclick="selectParty('${party}')">${party}</div>`
    ).join('');
}

function selectParty(party) {
    document.querySelector('.payment-voucher-party-search').value = party;
    document.getElementById('party-suggestions').innerHTML = '';
}

function submitVoucher(event) {
    event.preventDefault();
    // Implement voucher submission logic here
    // This is where you'd typically save the voucher data
    
    // For demonstration, let's just add a row to the table
    const tableBody = document.getElementById('payment-entry-table-body');
    const newRow = tableBody.insertRow();
    newRow.innerHTML = `
        <td>V${lastVoucherNumber}</td>
        <td>${document.getElementById('voucher-date').value}</td>
        <td>${document.querySelector('.payment-voucher-party-search').value}</td>
        <td>${document.querySelector('.payment-voucher-amount-input').value}</td>
    `;
    
    closeVoucherModal();
}

// Add this to your showSection function in homepage.js
