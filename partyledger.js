let db;
let dbInitialized = false;

async function initializePartyLedger() {
    const addBtn = document.getElementById('addPartyBtn');
    const searchInput = document.getElementById('partySearch');
    
    addBtn.addEventListener('click', toggleAddPartyButton);
    searchInput.addEventListener('input', searchParties);
    
    // Add search icon to the search input
    addSearchIcon();
    
    try {
        await setupIndexedDB();
        setupFirebaseListener();
    } catch (error) {
        console.error('Failed to initialize:', error);
    }
}

function addSearchIcon() {
    const searchInput = document.getElementById('partySearch');
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchInput.parentNode.insertBefore(searchContainer, searchInput);
    searchContainer.appendChild(searchInput);
    
    const searchIcon = document.createElement('span');
    searchIcon.className = 'search-icon';
    searchIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
    `;
    searchContainer.insertBefore(searchIcon, searchInput);

    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
        .search-container {
            position: relative;
           
            margin-bottom: 20px;
        }
        #partySearch {
            width: 100%;
            padding: 10px 10px 10px 40px;
            border: 1px solid #ccc;
            border-radius: 20px;
            font-size: 16px;
            outline: none;
        }
        .search-icon {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            width: 20px;
            height: 20px;
            color: #888;
            pointer-events: none;
            margin-top: 18px;
        }
    `;
    document.head.appendChild(style);
}

function setupIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('PartyLedgerDB', 1);
        
        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains('parties')) {
                db.createObjectStore('parties', { keyPath: 'firebaseKey' });
            }
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            dbInitialized = true;
            resolve();
        };
    });
}

function setupFirebaseListener() {
    const partiesRef = firebase.database().ref('parties');
    partiesRef.on('value', (snapshot) => {
        const parties = [];
        snapshot.forEach((childSnapshot) => {
            const party = childSnapshot.val();
            party.firebaseKey = childSnapshot.key;
            parties.push(party);
        });
        displayParties(parties);
        updateIndexedDB(parties);
    });
}

function updateIndexedDB(parties) {
    if (!dbInitialized) return;

    const transaction = db.transaction(['parties'], 'readwrite');
    const store = transaction.objectStore('parties');
    
    // Clear existing data
    store.clear();
    
    // Add new data
    parties.forEach(party => {
        store.add(party);
    });
}

function toggleAddPartyButton(event) {
    const btn = event.currentTarget;
    if (!btn.classList.contains('expanded')) {
        btn.classList.add('expanded');
        btn.innerHTML = '+ <span class="party-add-text">New Party</span>';
        document.addEventListener('click', closeExpandedButton);
    } else {
        showNewPartyModal();
    }
}

function closeExpandedButton(event) {
    const btn = document.getElementById('addPartyBtn');
    if (!btn.contains(event.target)) {
        btn.classList.remove('expanded');
        btn.innerHTML = '+';
        document.removeEventListener('click', closeExpandedButton);
    }
}

function showNewPartyModal() {
    const modalHTML = ` 
    <div class="party-modal" id="newPartyModal">
            <div class="party-modal-content">
                <h2 class="party-modal-title">Add New Party</h2>
                <form id="newPartyForm">
                    <div class="party-form-group">
                        <label class="party-label" for="partyName">Party Name</label>
                        <input type="text" class="party-input" id="partyName" required>
                    </div>
                    <div class="party-form-group">
                        <label class="party-label" for="partyStation">Station</label>
                        <input type="text" class="party-input" id="partyStation" required>
                    </div>
                    <div class="party-form-group">
                        <label class="party-label" for="partyMobile">Mobile</label>
                        <input type="tel" class="party-input" id="partyMobile" required>
                    </div>
                    <div class="party-form-group">
                        <label class="party-label" for="partyBalance">Opening Balance</label>
                        <input type="number" class="party-input" id="partyBalance" required>
                    </div>
                    <button type="submit" class="party-save-btn">Save</button>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('newPartyModal');
    const form = document.getElementById('newPartyForm');
    
    modal.style.display = 'block';
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    form.addEventListener('submit', saveNewParty);
}

function closeModal() {
    const modal = document.getElementById('newPartyModal');
    modal.remove();
}

async function saveNewParty(event) {
    event.preventDefault();
    
    const partyData = {
        name: document.getElementById('partyName').value,
        station: document.getElementById('partyStation').value,
        mobile: document.getElementById('partyMobile').value,
        balance: parseFloat(document.getElementById('partyBalance').value),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    try {
        // Save to Firebase
        await firebase.database().ref('parties').push().set(partyData);
        closeModal();
    } catch (error) {
        console.error('Error saving party:', error);
    }
}

function displayParties(parties) {
    const partyList = document.getElementById('partyList');
    partyList.innerHTML = '';
    
    parties.forEach(party => {
        const partyElement = document.createElement('div');
        partyElement.className = 'party-item';
        partyElement.innerHTML = `
            <div class="party-name">${party.name}</div>
            <div class="party-details">
                Station: ${party.station}<br>
                Mobile: ${party.mobile}<br>
                Balance: ₹${party.balance}
            </div>
        `;
        partyList.appendChild(partyElement);
    });
}

function searchParties(event) {
    const searchTerm = event.target.value.toLowerCase();
    
    // Search in Firebase
    firebase.database().ref('parties').once('value')
        .then((snapshot) => {
            const parties = [];
            snapshot.forEach((childSnapshot) => {
                const party = childSnapshot.val();
                if (party.name.toLowerCase().includes(searchTerm) ||
                    party.station.toLowerCase().includes(searchTerm)) {
                    party.firebaseKey = childSnapshot.key;
                    parties.push(party);
                }
            });
            displayParties(parties);
        })
        .catch(error => console.error('Error searching parties:', error));
}