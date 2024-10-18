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


function saveCNEntry(existingCN = null) {
    const cnNo = document.getElementById('cnNo').value;
    const cnDate = document.getElementById('cnDate').value;
    const partyName = document.getElementById('partyName').value;
    const cnReason = document.getElementById('cnReason').value;
    const cnAmount = parseFloat(document.getElementById('cnAmount').value);
    const adjustedIn = document.getElementById('adjustedIn').value;
    const status = document.getElementById('cnStatus')?.value || 'Active';

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
        timestamp: existingCN ? existingCN.timestamp : Date.now(),
        status,
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
                    alert(`CN Entry ${existingCN ? 'updated' : 'saved'} successfully`);
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
            row.style.cursor = 'pointer';
            row.innerHTML = `
                <td>${cn.cnNo}</td>
                <td>${cn.cnDate}</td>
                <td>${cn.partyName}</td>
                <td>${cn.cnAmount}</td>
                <td>${cn.status}</td>
            `;
            row.addEventListener('click', () => openCNEntryModal(cn));
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

    document.getElementById('newCNEntryBtn').addEventListener('click', () => openCNEntryModal());
    loadCNEntries();
    window.addEventListener('popstate', (event) => {
        if (!event.state || !event.state.section) {
            goBack();
        }
    });
}


function openCNEntryModal(existingCN = null) {
    const modal = document.createElement('div');
    modal.className = 'cn-modal';
    modal.innerHTML = `
        <div class="cn-modal-content">
            <span class="cn-modal-close">&times;</span>
            <h2 class="cn-modal-title">${existingCN ? 'Edit CN Entry' : 'New CN Entry'}</h2>
            <input type="text" id="cnNo" class="cn-input" placeholder="CN No" ${existingCN ? 'readonly' : ''} value="${existingCN?.cnNo || ''}">
            <input type="date" id="cnDate" class="cn-input" value="${existingCN?.cnDate || new Date().toISOString().split('T')[0]}">
            <div class="cn-party-search-container">
                <input type="text" id="partyName" class="cn-input" placeholder="Party Name" value="${existingCN?.partyName || ''}">
                <div id="partySuggestions" class="cn-party-suggestions"></div>
            </div>
            <input type="text" id="cnReason" class="cn-input" placeholder="CN Reason" value="${existingCN?.cnReason || ''}">
            <input type="number" id="cnAmount" class="cn-input" placeholder="CN Amount" value="${existingCN?.cnAmount || ''}">
            <input type="text" id="adjustedIn" class="cn-input" placeholder="Adjusted In (Optional)" value="${existingCN?.adjustedIn || ''}">
            <select id="cnStatus" class="cn-input" ${existingCN ? '' : 'style="display:none"'}>
                <option value="Active" ${existingCN?.status === 'Active' ? 'selected' : ''}>Active</option>
                <option value="Cancelled" ${existingCN?.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
            <div class="cn-button-group">
                <button id="saveCNBtn" class="cn-save-btn">Save</button>
                <button id="closeCNModalBtn" class="cn-close-btn">Close</button>
                ${existingCN ? '<button id="deleteCNBtn" class="cn-delete-btn">Delete</button>' : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    currentCNModal = modal;

    // Add CSS styles for the modal and buttons
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        .cn-modal {
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

        .cn-modal-content {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            position: relative;
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
        }

        .cn-modal-close {
            position: absolute;
            top: 10px;
            right: 15px;
            font-size: 24px;
            font-weight: bold;
            cursor: pointer;
            color: #666;
            transition: color 0.3s;
        }

        .cn-modal-close:hover {
            color: #000;
        }

        .cn-input {
            width: 100%;
            padding: 8px;
            margin: 8px 0;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }

        .cn-button-group {
            display: flex;
            gap: 8px;
            margin-top: 16px;
        }

        .cn-save-btn, .cn-close-btn, .cn-delete-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            flex: 1;
            transition: opacity 0.3s;
        }

        .cn-save-btn {
            background-color: #4CAF50;
            color: white;
        }

        .cn-close-btn {
            background-color: #888;
            color: white;
        }

        .cn-delete-btn {
            background-color: #f44336;
            color: white;
        }

        .cn-save-btn:hover, .cn-close-btn:hover, .cn-delete-btn:hover {
            opacity: 0.9;
        }

        .cn-party-suggestions {
            position: absolute;
            width: 100%;
            max-height: 150px;
            overflow-y: auto;
            background-color: white;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 4px 4px;
            z-index: 1001;
        }

        .cn-party-suggestion {
            padding: 8px;
            cursor: pointer;
        }

        .cn-party-suggestion:hover {
            background-color: #f5f5f5;
        }
    `;
    document.head.appendChild(styleSheet);

    // Add event listeners
    document.getElementById('partyName').addEventListener('input', handlePartySearch);
    document.getElementById('saveCNBtn').addEventListener('click', () => saveCNEntry(existingCN));
    document.getElementById('closeCNModalBtn').addEventListener('click', closeModal);
    document.querySelector('.cn-modal-close').addEventListener('click', closeModal);

    // Add delete button event listener if editing
    if (existingCN) {
        document.getElementById('deleteCNBtn').addEventListener('click', () => deleteCNEntry(existingCN));
    }

    // Add click outside modal to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

function deleteCNEntry(cn) {
    if (!confirm(`Are you sure you want to delete CN No: ${cn.cnNo}?`)) {
        return;
    }

    // Find the party reference first
    const partyRef = firebase.database().ref('parties').orderByChild('name').equalTo(cn.partyName);
    partyRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            const partyKey = Object.keys(snapshot.val())[0];
            const updates = {};
            // Remove from both locations
            updates[`parties/${partyKey}/cn/${cn.cnNo}`] = null;
            updates[`cn/${cn.cnNo}`] = null;

            firebase.database().ref().update(updates)
                .then(() => {
                    alert('CN Entry deleted successfully');
                    closeModal();
                    loadCNEntries();
                })
                .catch((error) => {
                    console.error('Error deleting CN Entry:', error);
                    alert('Error deleting CN Entry: ' + error.message);
                });
        } else {
            alert('Party not found');
        }
    }).catch((error) => {
        console.error('Error finding party:', error);
        alert('Error finding party: ' + error.message);
    });
}
// Rest of the functions remain the same...
function closeModal() {
    if (currentCNModal) {
        currentCNModal.remove();
        currentCNModal = null;
    }
}




