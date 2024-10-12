// CN Entry Section


let currentCNModal = null;

function openNewCNEntryModal() {
    const modal = document.createElement('div');
    modal.className = 'cn-modal';
    modal.innerHTML = `
        <div class="cn-modal-content">
            <h2 class="cn-modal-title">New CN Entry</h2>
            <input type="text" id="cnNo" class="cn-input" placeholder="CN No">
            <input type="date" id="cnDate" class="cn-input" value="${new Date().toISOString().split('T')[0]}">
            <div class="cn-party-search-container">
                <input type="text" id="partyName" class="cn-input" placeholder="Party Name">
                <div id="partySuggestions" class="cn-party-suggestions"></div>
            </div>
            <input type="text" id="cnReason" class="cn-input" placeholder="CN Reason">
            <input type="number" id="cnAmount" class="cn-input" placeholder="CN Amount">
            <input type="text" id="adjustedIn" class="cn-input" placeholder="Adjusted In (Optional)">
            <button id="saveCNBtn" class="cn-save-btn">Save</button>
            <button id="closeCNModalBtn" class="cn-close-btn">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
    currentCNModal = modal;

    document.getElementById('partyName').addEventListener('input', handlePartySearch);
    document.getElementById('saveCNBtn').addEventListener('click', saveCNEntry);
    document.getElementById('closeCNModalBtn').addEventListener('click', closeModal);
}

function closeModal() {
    if (currentCNModal) {
        currentCNModal.remove();
        currentCNModal = null;
    }
}

function saveCNEntry() {
    const cnNo = document.getElementById('cnNo').value;
    const cnDate = document.getElementById('cnDate').value;
    const partyName = document.getElementById('partyName').value;
    const cnReason = document.getElementById('cnReason').value;
    const cnAmount = parseFloat(document.getElementById('cnAmount').value);
    const adjustedIn = document.getElementById('adjustedIn').value;

    // Validate input
    if (!cnNo || !cnDate || !partyName || !cnReason || isNaN(cnAmount)) {
        alert('Please fill all required fields');
        return;
    }

    const cnData = {
        cnNo,
        cnDate,
        partyName,
        cnReason,
        cnAmount,
        adjustedIn,
        timestamp: Date.now(),
        status: 'Active',
        type: 'cr'
    };

    // Save to Firebase
    const partyRef = firebase.database().ref('parties').orderByChild('name').equalTo(partyName);
    partyRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            const partyKey = Object.keys(snapshot.val())[0];
            const updates = {};
            updates[`parties/${partyKey}/cn/${cnNo}`] = cnData;
            updates[`cn/${cnNo}`] = cnData;

            firebase.database().ref().update(updates)
                .then(() => {
                    alert('CN Entry saved successfully');
                    closeModal();
                    loadCNEntries();
                })
                .catch((error) => {
                    console.error('Error saving CN Entry:', error);
                    alert('Error saving CN Entry: ' + error.message);
                });
        } else {
            alert('Party not found');
        }
    }).catch((error) => {
        console.error('Error finding party:', error);
        alert('Error finding party: ' + error.message);
    });
}

function loadCNEntries() {
    const cnTableBody = document.querySelector('#cnTable tbody');
    if (!cnTableBody) {
        console.error('CN table body not found');
        return;
    }
    cnTableBody.innerHTML = '';

    firebase.database().ref('cn').on('value', (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const cn = childSnapshot.val();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cn.cnNo}</td>
                <td>${cn.cnDate}</td>
                <td>${cn.partyName}</td>
                <td>${cn.cnAmount}</td>
                <td>${cn.status}</td>
            `;
            cnTableBody.appendChild(row);
        });
    }, (error) => {
        console.error('Error loading CN entries:', error);
        alert('Error loading CN entries: ' + error.message);
    });
}

function handlePartySearch() {
    const input = document.getElementById('partyName');
    const suggestionBox = document.getElementById('partySuggestions');
    const searchTerm = input.value.toLowerCase();

    // Clear previous suggestions
    suggestionBox.innerHTML = '';

    if (searchTerm.length < 2) return;

    // Query Firebase for matching party names
    firebase.database().ref('parties').orderByChild('name').startAt(searchTerm).endAt(searchTerm + '\uf8ff').limitToFirst(5).once('value', (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const party = childSnapshot.val();
            const suggestion = document.createElement('div');
            suggestion.className = 'cn-party-suggestion';
            suggestion.textContent = party.name;
            suggestion.addEventListener('click', () => {
                input.value = party.name;
                suggestionBox.innerHTML = '';
            });
            suggestionBox.appendChild(suggestion);
        });
    });
}


function initializeCNEntry() {
    const sectionContent = document.querySelector('.section-content');
    if (!sectionContent) {
        console.error('Section content element not found');
        return;
    }

    sectionContent.innerHTML = `
        <div class="cn-entry-section">
            <input type="text" id="cnSearch" class="cn-search-bar" placeholder="Search CN entries...">
            <button id="newCNEntryBtn" class="cn-new-entry-btn">New CN Entry</button>
            <table id="cnTable" class="cn-entries-table">
                <thead>
                    <tr>
                        <th>CN No</th>
                        <th>CN Date</th>
                        <th>Party Name</th>
                        <th>CN Amount</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- CN entries will be dynamically added here -->
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('newCNEntryBtn').addEventListener('click', openNewCNEntryModal);
    loadCNEntries();
}




