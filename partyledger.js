let db;
let dbInitialized = false;

async function initializePartyLedger() {
    const searchInput = document.getElementById('partySearch');
    
    createAddPartyButton();
    searchInput.addEventListener('input', searchParties);
    
    addSearchIcon();
    
    try {
        await setupIndexedDB();
        setupFirebaseListener();
    } catch (error) {
        console.error('Failed to initialize:', error);
    }
}

function createAddPartyButton() {
    const addBtn = document.createElement('button');
    addBtn.id = 'addPartyBtn';
    addBtn.className = 'party-add-btn';
    addBtn.textContent = ' New Party';
    addBtn.addEventListener('click', showNewPartyModal);
    document.body.appendChild(addBtn);
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
            top: 72px;
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
    
    const openingBalance = parseFloat(document.getElementById('partyBalance').value);
    
    // Format the date as "01 Apr 2024"
    const openingBalanceDate = new Date(2024, 3, 1); // Note: Month is 0-indexed, so 3 is April
    const formattedDate = openingBalanceDate.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    });

    const partyData = {
        name: document.getElementById('partyName').value,
        station: document.getElementById('partyStation').value,
        mobile: document.getElementById('partyMobile').value,
        openingBalance: openingBalance,
        openingBalanceDate: formattedDate,
        balance: openingBalance,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    try {
        // Save to Firebase
        const newPartyRef = await firebase.database().ref('parties').push();
        await newPartyRef.set(partyData);
        
        // Create an opening balance entry
        const openingBalanceEntry = {
            type: 'opening_balance',
            amount: openingBalance,
            date: formattedDate,
            partyKey: newPartyRef.key
        };
        await firebase.database().ref('transactions').push(openingBalanceEntry);
        
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
            <div class="party-info">
                <div class="party-name-station">
                    <span class="party-name">${party.name}</span>
                    <span class="party-station">- ${party.station}</span>
                </div>
                <div class="party-mobile">
                    <span class="call-logo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
                        </svg>
                    </span>
                    <span>${party.mobile}</span>
                </div>
            </div>
            <div class="party-balance">₹${party.balance}</div>
        `;
        partyElement.addEventListener('click', () => openPartySection(party));
        partyList.appendChild(partyElement);
    });
}

function openPartySection(party) {
    const section = document.createElement('div');
    section.className = 'party-full-section';
    section.innerHTML = `
        <div class="party-section-header">
            <div class="party-header-left">
                <button class="party-back-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                </button>
                <div class="party-header-info">
                    <span class="party-header-name">${party.name}</span>
                    <span class="party-header-station">- ${party.station}</span>
                </div>
            </div>
            <div class="party-header-call" onclick="event.stopPropagation(); callParty('${party.mobile}');">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
                </svg>
            </div>
        </div>
        <div class="party-section-content">
            <div class="party-balance-container">
                <span class="party-balance-label">Balance</span>
                <span class="party-balance-amount">₹${party.balance}</span>
            </div>
            <div class="party-button-container">
                <a href="#" class="party-button">
                    <div class="party-button-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                    </div>
                    <span class="party-button-label">Reports</span>
                </a>
                <a href="#" class="party-button" id="paymentButton">
                    <div class="party-button-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23"></line>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                    </div>
                    <span class="party-button-label">Payment</span>
                </a>
                <a href="#" class="party-button">
                    <div class="party-button-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 11l18-5v12L3 14v-3z"></path>
                            <path d="M11.6 16.8a3 3 0 007-1.8"></path>
                        </svg>
                    </div>
                    <span class="party-button-label">Reminder</span>
                </a>
                <a href="#" class="party-button">
                    <div class="party-button-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                    </div>
                    <span class="party-button-label">SMS</span>
                </a>
            </div>
            <div class="party-entries-header">
                <span>Entries</span>
                <span>DR</span>
                <span>CR</span>
            </div>
            <div id="party-entries-container"></div>
        </div>
    `;
    document.body.appendChild(section);

    const backButton = section.querySelector('.party-back-button');
    backButton.addEventListener('click', () => {
        document.body.removeChild(section);
    });

    const paymentButton = section.querySelector('#paymentButton');
    paymentButton.addEventListener('click', () => openPaymentRequestPopup(party));

    // Initial display of all entries
    displayEntries('all', party.firebaseKey);
}


function displayEntries(type, partyKey) {
    const entriesContainer = document.getElementById('party-entries-container');
    entriesContainer.innerHTML = ''; // Clear previous entries

    fetchEntriesFromFirebase(type, partyKey).then(entries => {
        let runningBalance = 0;
        
        firebase.database().ref('parties').child(partyKey).once('value')
            .then(snapshot => {
                const party = snapshot.val();
                if (party && party.openingBalance !== undefined) {
                    const openingBalanceEntry = {
                        type: 'opening_balance',
                        amount: party.openingBalance,
                        date: party.openingBalanceDate || '01 Apr 2024', // Use stored date or default
                        id: 'opening_balance'
                    };
                    
                    // Add opening balance to the beginning of the entries array
                    entries.unshift(openingBalanceEntry);
                    
                    // Sort entries by date, oldest first
                    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
                    
                    // Initialize running balance with opening balance
                    runningBalance = party.openingBalance;
                }
                
                // Create a document fragment for better performance
                const fragment = document.createDocumentFragment();
                
                // Calculate running balances
                entries.forEach(entry => {
                    if (entry.type === 'bill') {
                        runningBalance += entry.totalAmount;
                    } else if (entry.type === 'cn') {
                        runningBalance -= entry.cnAmount;
                    } else if (entry.type === 'payment') {
                        runningBalance -= entry.amountPaid;
                    }
                    entry.runningBalance = runningBalance;
                });
                
                // Reverse the entries array to display most recent first
                entries.reverse();
                
                // Display all entries
                entries.forEach(entry => {
                    const entryElement = createEntryElement(entry);
                    fragment.appendChild(entryElement);
                });
                
                entriesContainer.appendChild(fragment);
            })
            .catch(error => {
                console.error("Error fetching party data: ", error);
                entriesContainer.innerHTML = '<p>Error loading entries. Please try again.</p>';
            });
    }).catch(error => {
        console.error("Error displaying entries: ", error);
        entriesContainer.innerHTML = '<p>Error loading entries. Please try again.</p>';
    });
}

// Fetch entries from Firebase
function fetchEntriesFromFirebase(type, partyKey) {
    return new Promise((resolve, reject) => {
      const db = firebase.database();
      const entries = [];
  
      // Helper function to process snapshot and add to entries
      const processSnapshot = (snapshot, entryType) => {
        snapshot.forEach((childSnapshot) => {
          const entry = childSnapshot.val();
          entry.id = childSnapshot.key;
          entry.type = entryType;
          entries.push(entry);
        });
      };
  
      // Create an array of promises for each data type
      const promises = [];
  
      // Fetch bills
      if (type === 'all' || type === 'bill') {
        const billPromise = db.ref('bills').orderByChild('partyKey').equalTo(partyKey).once('value')
          .then(snapshot => processSnapshot(snapshot, 'bill'));
        promises.push(billPromise);
      }
  
      // Fetch credit notes
      if (type === 'all' || type === 'cn') {
        const cnPromise = getPartyName(partyKey).then(partyName => 
          db.ref('cn').orderByChild('partyName').equalTo(partyName).once('value')
            .then(snapshot => processSnapshot(snapshot, 'cn'))
        );
        promises.push(cnPromise);
      }
  
      // Fetch payments
      if (type === 'all' || type === 'payment') {
        const paymentPromise = db.ref('payments').orderByChild('partyKey').equalTo(partyKey).once('value')
          .then(snapshot => processSnapshot(snapshot, 'payment'));
        promises.push(paymentPromise);
      }
  
      // Wait for all promises to resolve
      Promise.all(promises)
        .then(() => {
          // Sort entries by date, newest first
          entries.sort((a, b) => new Date(b.date) - new Date(a.date));
          resolve(entries);
        })
        .catch(error => {
          console.error("Error fetching entries: ", error);
          reject(error);
        });
    });
  }
  
  // Helper function to get party name from party key
  function getPartyName(partyKey) {
    return new Promise((resolve, reject) => {
      firebase.database().ref('parties').child(partyKey).once('value')
        .then(snapshot => {
          const party = snapshot.val();
          if (party && party.name) {
            resolve(party.name);
          } else {
            reject(new Error('Party not found'));
          }
        })
        .catch(error => {
          console.error("Error fetching party name: ", error);
          reject(error);
        });
    });
  }
  
  // Display entries
/*  function displayEntries(type, partyKey) {
    const entriesContainer = document.getElementById('party-entries-container');
    entriesContainer.innerHTML = ''; // Clear previous entries

    fetchEntriesFromFirebase(type, partyKey).then(entries => {
        let balance = 0;
        
        firebase.database().ref('parties').child(partyKey).once('value')
            .then(snapshot => {
                const party = snapshot.val();
                if (party && party.openingBalance !== undefined) {
                    const openingBalanceEntry = {
                        type: 'opening_balance',
                        amount: party.openingBalance,
                        date: '2024-04-01', // Fixed date for opening balance
                        id: 'opening_balance'
                    };
                    
                    // Add opening balance to the end of the entries array
                    entries.push(openingBalanceEntry);
                    
                    // Sort entries by date, newest first
                    entries.sort((a, b) => new Date(b.date) - new Date(a.date));
                    
                    // Initialize balance with opening balance
                    balance = party.openingBalance;
                }
                
                // Create a document fragment for better performance
                const fragment = document.createDocumentFragment();
                
                // Display all entries
                entries.forEach(entry => {
                    const entryElement = createEntryElement(entry);
                    
                    // Update balance
                    if (entry.type === 'bill') {
                        balance += entry.totalAmount;
                    } else if (entry.type === 'cn') {
                        balance -= entry.cnAmount;
                    } else if (entry.type === 'payment') {
                        balance -= entry.amountPaid;
                    }
                    // Opening balance is already included in the initial balance
                    
                    // Add balance to the entry element
                    const balanceElement = document.createElement('div');
                    balanceElement.className = 'entry-balance';
                    balanceElement.textContent = `₹${balance.toFixed(2)}`;
                    entryElement.appendChild(balanceElement);
                    
                    fragment.insertBefore(entryElement, fragment.firstChild);
                });
                
                entriesContainer.appendChild(fragment);
            })
            .catch(error => {
                console.error("Error fetching party data: ", error);
                entriesContainer.innerHTML = '<p>Error loading entries. Please try again.</p>';
            });
    }).catch(error => {
        console.error("Error displaying entries: ", error);
        entriesContainer.innerHTML = '<p>Error loading entries. Please try again.</p>';
    });
}*/

function createEntryElement(entry) {
    const entryElement = document.createElement('div');
    entryElement.className = 'party-entry';

    const dateElement = document.createElement('div');
    dateElement.className = 'entry-date';
    dateElement.textContent = entry.type === 'opening_balance' ? entry.date : formatDate(entry.date);
    entryElement.appendChild(dateElement);

    const detailsElement = document.createElement('div');
    detailsElement.className = 'entry-details';

    const typeDetailWrapper = document.createElement('div');
    typeDetailWrapper.className = 'type-detail-wrapper';

    const typeElement = document.createElement('div');
    typeElement.className = 'entry-type';
    typeElement.textContent = getEntryTypeLabel(entry.type);
    typeDetailWrapper.appendChild(typeElement);

    const detailElement = document.createElement('div');
    detailElement.className = 'entry-detail';
    detailElement.textContent = getEntryDetail(entry);
    typeDetailWrapper.appendChild(detailElement);

    detailsElement.appendChild(typeDetailWrapper);

    const crAmountElement = document.createElement('div');
    crAmountElement.className = 'entry-amount entry-cr';

    const drAmountElement = document.createElement('div');
    drAmountElement.className = 'entry-amount entry-dr';

    if (entry.type === 'opening_balance') {
        crAmountElement.textContent = `₹${entry.amount.toFixed(2)}`;
        drAmountElement.textContent = ' ';
    } else if (entry.type === 'bill') {
        crAmountElement.textContent = `₹${entry.totalAmount.toFixed(2)}`;
        drAmountElement.textContent = ' ';
    } else if (entry.type === 'cn') {
        crAmountElement.textContent = ' ';
        drAmountElement.textContent = `₹${entry.cnAmount.toFixed(2)}`;
    } else if (entry.type === 'payment') {
        crAmountElement.textContent = ' ';
        drAmountElement.textContent = `₹${entry.amountPaid.toFixed(2)}`;
    }

    detailsElement.appendChild(crAmountElement);
    detailsElement.appendChild(drAmountElement);

    entryElement.appendChild(detailsElement);

    // Add running balance
    const balanceElement = document.createElement('div');
    balanceElement.className = 'entry-balance';
    balanceElement.textContent = `₹${entry.runningBalance.toFixed(2)}`;
    entryElement.appendChild(balanceElement);

    return entryElement;
}


function getEntryTypeLabel(type) {
    switch (type) {
        case 'opening_balance': return 'Opening Balance';
        case 'bill': return 'Sales Bill';
        case 'cn': return 'Credit Note';
        case 'payment': return 'Payment';
        default: return 'Unknown';
    }
}

function getEntryDetail(entry) {
    switch (entry.type) {
        case 'opening_balance': return 'Initial Balance';
        case 'bill': return `Bill No: ${entry.billNo}`;
        case 'cn': return `CN No: ${entry.cnNo}`;
        case 'payment': return `V No: ${entry.voucherNo} - ${entry.paymentMode}`;
        default: return '';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    });
}
// ... (rest of your existing code)

function callParty(mobileNumber) {
    window.location.href = `tel:${mobileNumber}`;
}

// ... (rest of your existing code)
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


function openPaymentRequestPopup(party) {
    const popup = document.createElement('div');
    popup.className = 'payment-request-popup';
    popup.innerHTML = `
        <div class="payment-request-content">
            <h2>Request ${party.name} to pay you</h2>
            <div class="amount-input-container">
                <span class="rupee-symbol">₹</span>
                <input type="number" id="paymentAmount" value="${party.balance.toFixed(2)}" class="payment-amount-input">
            </div>
            <div class="payment-request-buttons">
                <button class="sms-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    SMS
                </button>
                <button class="whatsapp-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            document.body.removeChild(popup);
        }
    });

    const smsButton = popup.querySelector('.sms-button');
    const whatsappButton = popup.querySelector('.whatsapp-button');

    smsButton.addEventListener('click', () => sendPaymentRequest(party, 'sms'));
    whatsappButton.addEventListener('click', () => sendPaymentRequest(party, 'whatsapp'));
}

async function sendPaymentRequest(party, method) {
    const amount = document.getElementById('paymentAmount').value;
    
    // Generate and upload the entries image
    const imageUrl = await generateAndUploadEntriesImage(party);
    
    const message = `Dear Sir/Madam,
Your Payment of ₹*${amount}* is pending at Kambeshwar Agencies

click here: ${imageUrl}
to view details`;

    let url;
    if (method === 'sms') {
        url = `sms:+91${party.mobile}?body=${encodeURIComponent(message)}`;
    } else if (method === 'whatsapp') {
        url = `https://wa.me/91${party.mobile}?text=${encodeURIComponent(message)}`;
    }

    window.open(url, '_blank');

    const popup = document.querySelector('.payment-request-popup');
    document.body.removeChild(popup);
}

async function generateAndUploadEntriesImage(party) {
    // Create a canvas element to draw the entries
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size (adjust as needed)
    canvas.width = 800;
    const entryHeight = 120; // Approximate height for each entry
    const headerHeight = 60;
    const padding = 20;

    // Fetch entries
    const entries = await fetchEntriesFromFirebase('all', party.firebaseKey);
    canvas.height = headerHeight + (entries.length * entryHeight) + (padding * 2);

    // Set background color
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw heading
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`${party.name} - ${party.station}`, padding, 40);

    // Draw header
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, headerHeight, canvas.width, 40);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Date', padding, headerHeight + 25);
    ctx.fillText('Type', 200, headerHeight + 25);
    ctx.fillText('DR', canvas.width - 200, headerHeight + 25);
    ctx.fillText('CR', canvas.width - 100, headerHeight + 25);

    // Draw entries
    let y = headerHeight + 40;
    entries.forEach(entry => {
        // Entry background
        ctx.fillStyle = '#f9f9f9';
        ctx.fillRect(0, y, canvas.width, entryHeight);
        
        // Date
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, y, canvas.width, 30);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(formatDate(entry.date), padding, y + 20);

        // Type and detail
        ctx.font = 'bold 14px Arial';
        ctx.fillText(getEntryTypeLabel(entry.type), padding, y + 50);
        ctx.font = '12px Arial';
        ctx.fillStyle = '#666666';
        ctx.fillText(getEntryDetail(entry), padding, y + 70);

        // Amount
        ctx.font = 'bold 14px Arial';
        if (entry.type === 'bill' || entry.type === 'opening_balance') {
            ctx.fillStyle = '#d32f2f';
            ctx.fillText(`₹${getEntryAmount(entry)}`, canvas.width - 100, y + 60);
        } else {
            ctx.fillStyle = '#388e3c';
            ctx.fillText(`₹${getEntryAmount(entry)}`, canvas.width - 200, y + 60);
        }

        y += entryHeight;
    });

    // Convert canvas to blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

    // Upload to Cloudinary
    const formData = new FormData();
    formData.append('file', blob, 'entries.png');
    formData.append('api_key', '319994322683626');

    // Generate timestamp and signature for authentication
    const timestamp = Math.round((new Date).getTime()/1000);
    formData.append('timestamp', timestamp);
    
    const signature = await generateCloudinarySignature(timestamp);
    formData.append('signature', signature);

    const response = await fetch('https://api.cloudinary.com/v1_1/dhuhvfubv/image/upload', {
        method: 'POST',
        body: formData
    });

    const data = await response.json();
    return data.secure_url;
}

function getEntryAmount(entry) {
    switch (entry.type) {
        case 'opening_balance':
            return entry.amount.toFixed(2);
        case 'bill':
            return entry.totalAmount.toFixed(2);
        case 'cn':
            return entry.cnAmount.toFixed(2);
        case 'payment':
            return entry.amountPaid.toFixed(2);
        default:
            return '0.00';
    }
}

// ... (keep the other functions as they were)

async function generateCloudinarySignature(timestamp) {
    const apiSecret = 'qGAcJummXjiu-HyDBxWsGO_ncvU';
    const stringToSign = `timestamp=${timestamp}${apiSecret}`;
    
    // Use SubtleCrypto API to generate SHA-1 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(stringToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    
    // Convert hash to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
}
