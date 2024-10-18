// Firebase configuration and initialization code should be here

async function initializeOutstanding() {
    const sectionContent = document.querySelector('.section-content');
    sectionContent.innerHTML = `
        <h2>Outstanding Reports</h2>
        <div id="partyList" class="party-list"></div>
        <div id="partyOutstanding" class="party-outstanding" style="display: none;"></div>
    `;

    try {
        const partiesRef = firebase.database().ref('parties');
        const snapshot = await partiesRef.once('value');
        const parties = snapshot.val();

        const partyListElement = document.getElementById('partyList');
        
        for (const [partyId, partyData] of Object.entries(parties)) {
            const partyElement = document.createElement('div');
            partyElement.className = 'party-item';
            partyElement.textContent = `${partyData.name} - ${partyData.station}`;
            partyElement.addEventListener('click', () => showPartyOutstanding(partyId, partyData.name));
            partyListElement.appendChild(partyElement);
        }
    } catch (error) {
        console.error('Error fetching party data:', error);
        sectionContent.innerHTML += `
            <div class="error-message">
                <p>An error occurred while loading the party list. Please try again later.</p>
            </div>
        `;
    }
    window.addEventListener('popstate', (event) => {
        if (!event.state || !event.state.section) {
            goBack();
        }
    });
}

async function showPartyOutstanding(partyId, partyName) {
    const partyOutstandingElement = document.getElementById('partyOutstanding');
    partyOutstandingElement.style.display = 'block';
    partyOutstandingElement.innerHTML = `
        <h3>${partyName}</h3>
        <table class="outstanding-table">
            <thead>
                <tr>
                    <th>Bill No.</th>
                    <th>Amount</th>
                    <th>Pending Amt</th>
                    <th>Due Days</th>
                </tr>
            </thead>
            <tbody id="billTableBody">
                <!-- Table rows will be populated here -->
            </tbody>
        </table>
        <p class="coming-soon">Coming soon: Additional outstanding information for ${partyName}</p>
    `;

    // Hide the party list when showing party outstanding
    document.getElementById('partyList').style.display = 'none';

    // Add a back button to return to the party list
    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Party List';
    backButton.className = 'back-button';
    backButton.addEventListener('click', () => {
        partyOutstandingElement.style.display = 'none';
        document.getElementById('partyList').style.display = 'block';
    });
    partyOutstandingElement.insertBefore(backButton, partyOutstandingElement.firstChild);

    // Fetch and display bill data
    try {
        const billsRef = firebase.database().ref('bills');
        const snapshot = await billsRef.orderByChild('partyKey').equalTo(partyId).once('value');
        const bills = snapshot.val();

        const billTableBody = document.getElementById('billTableBody');
        
        for (const [billId, billData] of Object.entries(bills)) {
            const pendingAmount = calculatePendingAmount(billData);
            if (pendingAmount > 0) {
                const row = createBillRow(billData, pendingAmount);
                billTableBody.appendChild(row);
            }
        }
    } catch (error) {
        console.error('Error fetching bill data:', error);
        partyOutstandingElement.innerHTML += `
            <div class="error-message">
                <p>An error occurred while loading the bill data. Please try again later.</p>
            </div>
        `;
    }
}

function calculatePendingAmount(billData) {
    const totalAmount = billData.totalAmount;
    let amountPaid = 0;
    if (billData.payments) {
        amountPaid = Object.values(billData.payments).reduce((total, payment) => total + payment.amountPaid, 0);
    }
    return totalAmount - amountPaid;
}

function createBillRow(billData, pendingAmount) {
    const row = document.createElement('tr');
    
    // Bill No.
    const billNoCell = document.createElement('td');
    billNoCell.textContent = billData.billNo;
    row.appendChild(billNoCell);

    // Amount (amount + gst)
    const amountCell = document.createElement('td');
    amountCell.textContent = (billData.amount + billData.gst).toFixed(2);
    row.appendChild(amountCell);

    // Pending Amount
    const pendingCell = document.createElement('td');
    pendingCell.textContent = pendingAmount.toFixed(2);
    row.appendChild(pendingCell);

    // Due Days
    const dueDaysCell = document.createElement('td');
    const duedays = Math.floor((new Date() - new Date(billData.date)) / (1000 * 60 * 60 * 24));
    dueDaysCell.textContent = duedays;
    if (duedays > 30) {
        dueDaysCell.style.color = 'red';
        dueDaysCell.style.fontWeight = 'bold';
    }
    row.appendChild(dueDaysCell);

    return row;
}

// Add this function to the global scope
window.initializeOutstanding = initializeOutstanding;
