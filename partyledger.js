let db;
let dbInitialized = false;

async function initializePartyLedger() {
    const searchInput = document.getElementById('partySearch');
    
   
    searchInput.addEventListener('input', searchParties);
    
    addSearchIcon();
    
    try {
        await setupIndexedDB();
        setupFirebaseListener();
        
        // Ensure the "New Party" button is visible initially
        
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
    
    const openingBalanceDate = new Date(2024, 3, 1);
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
        
        // Send Webpushr notification
        await sendWebpushrNotification(partyData.name);
        
        closeModal();
    } catch (error) {
        console.error('Error saving party:', error);
    }
}

async function sendWebpushrNotification(partyName) {
    const notificationData = {
        title: "New Party Added",
        message: `A new party "${partyName}" has been added to the system.`,
        target_url: "https://your-app-url.com/parties", // Replace with your app's URL
        icon: "https://your-app-url.com/icon.png" // Replace with your app's icon URL
    };

    try {
        const response = await fetch('https://api.webpushr.com/v1/notification/send/all', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'webpushrKey': 'ff7ff42103b18bb560f65e9e89221c4e', // Updated with provided API key
                'webpushrAuthToken': '98307' // Updated with provided token
            },
            body: JSON.stringify(notificationData)
        });

        if (!response.ok) {
            throw new Error('Failed to send Webpushr notification');
        }

        const result = await response.json();
        console.log('Webpushr notification sent:', result);
    } catch (error) {
        console.error('Error sending Webpushr notification:', error);
    }
}
function displayEntries(type, partyKey, initialBalance) {
    const entriesContainer = document.getElementById('party-entries-container');
    entriesContainer.innerHTML = '';

    fetchEntriesFromFirebase(type, partyKey).then(entries => {
        firebase.database().ref('parties').child(partyKey).once('value')
            .then(snapshot => {
                const party = snapshot.val();
                if (party && party.openingBalance !== undefined) {
                    const openingBalanceEntry = {
                        type: 'opening_balance',
                        amount: party.openingBalance,
                        date: party.openingBalanceDate || '01 Apr 2024',
                        id: 'opening_balance'
                    };
                    
                    entries.push(openingBalanceEntry);
                }
                
                // Sort entries by date, newest first
                entries.sort((a, b) => new Date(b.date || b.cnDate) - new Date(a.date || a.cnDate));
                
                const fragment = document.createDocumentFragment();
                
                // Use the initialBalance passed as an argument
                let runningBalance = initialBalance;
                
                // Create entry elements in the sorted order (newest first)
                entries.forEach(entry => {
                    const entryElement = createEntryElement(entry, runningBalance);
                    fragment.appendChild(entryElement);
                    
                    // Update running balance for the next iteration
                    if (entry.type === 'bill') {
                        runningBalance -= entry.totalAmount;
                    } else if (entry.type === 'cn') {
                        runningBalance += entry.cnAmount;
                    } else if (entry.type === 'payment') {
                        runningBalance += entry.amountPaid;
                    }
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


// Update the fetchLatestBalance function to include opening balance
async function fetchLatestBalance(partyKey) {
    try {
        const entries = await fetchEntriesFromFirebase('all', partyKey);
        const partySnapshot = await firebase.database().ref('parties').child(partyKey).once('value');
        const party = partySnapshot.val();
        let balance = party.openingBalance || 0;

        entries.forEach(entry => {
            if (entry.type === 'bill') {
                balance += entry.totalAmount;
            } else if (entry.type === 'cn') {
                balance -= entry.cnAmount;
            } else if (entry.type === 'payment') {
                balance -= entry.amountPaid;
            }
        });

        return balance;
    } catch (error) {
        console.error('Error fetching latest balance:', error);
        return 0;
    }
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
                <span class="party-balance-amount">Loading...</span>
            </div>
            <div class="party-button-container">
                <a href="#" class="party-button" id="reportButton">
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
                <a href="#" class="party-button" id="reminderButton">
                    <div class="party-button-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 11l18-5v12L3 14v-3z"></path>
                            <path d="M11.6 16.8a3 3 0 007-1.8"></path>
                        </svg>
                    </div>
                    <span class="party-button-label">Reminder</span>
                </a>
                <a href="#" class="party-button" id="smsButton">
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

    const reportButton = section.querySelector('#reportButton');
    const paymentButton = section.querySelector('#paymentButton');
    const reminderButton = section.querySelector('#reminderButton');
    const smsButton = section.querySelector('#smsButton');

    reportButton.addEventListener('click', () => {
        console.log('Report button clicked');
    });

    paymentButton.addEventListener('click', () => openPaymentRequestPopup(party));

    reminderButton.addEventListener('click', () => sendReminder(party, 'whatsapp'));
    smsButton.addEventListener('click', () => sendReminder(party, 'sms'));

    // Fetch and display entries
    fetchLatestBalance(party.firebaseKey).then(balance => {
        const balanceDisplay = section.querySelector('.party-balance-amount');
        balanceDisplay.textContent = `₹${balance.toFixed(2)}`;
        displayEntries('all', party.firebaseKey, balance);
    });
}

async function sendReminder(party, method) {
    try {
        // Generate and upload the entries image
        const imageUrl = await generateAndUploadEntriesImage(party);
        
        const message = `Dear Sir/Madam,
Your payment of ₹${party.balance.toFixed(2)} 
is pending at Kambeshwar Agencies
click here: ${imageUrl}
to view the details

with regards,
Kambeshwar Agencies`;

        let url;
        if (method === 'sms') {
            url = `sms:+91${party.mobile}?body=${encodeURIComponent(message)}`;
        } else if (method === 'whatsapp') {
            url = `https://wa.me/91${party.mobile}?text=${encodeURIComponent(message)}`;
        }

        window.open(url, '_blank');
    } catch (error) {
        console.error('Error sending reminder:', error);
        alert('There was an error sending the reminder. Please try again.');
    }
}



// Update the displayEntries function to use the new balance calculation
function displayEntries(type, partyKey) {
    const entriesContainer = document.getElementById('party-entries-container');
    entriesContainer.innerHTML = '';

    fetchEntriesFromFirebase(type, partyKey).then(entries => {
        firebase.database().ref('parties').child(partyKey).once('value')
            .then(snapshot => {
                const party = snapshot.val();
                let openingBalance = party.openingBalance || 0;
                
                if (openingBalance !== 0) {
                    const openingBalanceEntry = {
                        type: 'opening_balance',
                        amount: openingBalance,
                        date: party.openingBalanceDate || '01 Apr 2024',
                        id: 'opening_balance'
                    };
                    entries.push(openingBalanceEntry);
                }
                
                // Sort entries by date, newest first
                entries.sort((a, b) => new Date(b.date || b.cnDate) - new Date(a.date || a.cnDate));
                
                // Calculate running balances and final balance
                let runningBalance = openingBalance;
                const reversedEntries = [...entries].reverse();
                
                reversedEntries.forEach(entry => {
                    if (entry.type === 'bill') {
                        runningBalance += entry.totalAmount;
                    } else if (entry.type === 'cn') {
                        runningBalance -= entry.cnAmount;
                    } else if (entry.type === 'payment') {
                        runningBalance -= entry.amountPaid;
                    }
                    entry.runningBalance = runningBalance;
                });
                
                const finalBalance = runningBalance;
                
                // Update Firebase with the final balance
                firebase.database().ref('parties').child(partyKey).update({
                    balance: finalBalance
                }).then(() => {
                    // Update UI balance displays
                    const balanceDisplay = document.querySelector('.party-balance-amount');
                    if (balanceDisplay) {
                        balanceDisplay.textContent = `₹${finalBalance.toFixed(2)}`;
                    }
                    
                    // Create and display entry elements
                    const fragment = document.createDocumentFragment();
                    entries.forEach(entry => {
                        const entryElement = createEntryElement(entry);
                        fragment.appendChild(entryElement);
                    });
                    
                    entriesContainer.appendChild(fragment);
                });
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

// Update the displayParties function to handle balance updates
function displayParties(parties) {
    const partyList = document.getElementById('partyList');
    partyList.innerHTML = '';

    // Create "New Party" button
    const addPartyBtn = document.createElement('button');
    addPartyBtn.id = 'addPartyBtn';
    addPartyBtn.className = 'party-add-btn';
    addPartyBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        New Party
    `;
    addPartyBtn.addEventListener('click', showNewPartyModal);
    partyList.appendChild(addPartyBtn);

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
            <div class="party-balance">Loading...</div>
        `;
        partyElement.addEventListener('click', () => openPartySection(party));
        partyList.appendChild(partyElement);
        
        // Fetch and update balance with Firebase sync
        calculateAndUpdatePartyBalance(party.firebaseKey).then(balance => {
            const balanceElement = partyElement.querySelector('.party-balance');
            balanceElement.textContent = `₹${balance.toFixed(2)}`;
        });
    });
}

// New function to calculate and update party balance
async function calculateAndUpdatePartyBalance(partyKey) {
    try {
        const entries = await fetchEntriesFromFirebase('all', partyKey);
        const partySnapshot = await firebase.database().ref('parties').child(partyKey).once('value');
        const party = partySnapshot.val();
        
        let balance = party.openingBalance || 0;
        
        // Sort entries by date
        entries.sort((a, b) => new Date(a.date || a.cnDate) - new Date(b.date || b.cnDate));
        
        // Calculate final balance
        entries.forEach(entry => {
            if (entry.type === 'bill') {
                balance += entry.totalAmount;
            } else if (entry.type === 'cn') {
                balance -= entry.cnAmount;
            } else if (entry.type === 'payment') {
                balance -= entry.amountPaid;
            }
        });
        
        // Update balance in Firebase
        await firebase.database().ref('parties').child(partyKey).update({
            balance: balance
        });
        
        return balance;
    } catch (error) {
        console.error('Error calculating and updating party balance:', error);
        return 0;
    }
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

function createEntryElement(entry) {
    const entryElement = document.createElement('div');
    entryElement.className = 'party-entry';

    const dateElement = document.createElement('div');
    dateElement.className = 'entry-date';
    dateElement.textContent = formatDate(entry.date || entry.cnDate);
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
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        // If the date is invalid, return the original string
        return dateString;
    }
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
    
    // Set canvas size and styles
    canvas.width = 650;
    const headerHeight = 200;
    const footerHeight = 80;
    const rowHeight = 30;
    const padding = 10;
    
    // Fetch all entries
    const entries = await fetchEntriesFromFirebase('all', party.firebaseKey);
    
    // Add opening balance entry
    const openingBalanceEntry = {
        type: 'opening_balance',
        date: party.openingBalanceDate || '01 Apr 2024',
        amount: party.openingBalance || 0
    };
    entries.push(openingBalanceEntry);
    
    // Sort entries from oldest to newest
    entries.sort((a, b) => new Date(a.date || a.cnDate) - new Date(b.date || b.cnDate));
    
    canvas.height = headerHeight + (entries.length * rowHeight) + footerHeight + (padding * 2);
    
    // Set background color
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Load Poppins font (you need to ensure this font is available)
    const poppins = new FontFace('Poppins', 'url(https://fonts.gstatic.com/s/poppins/v15/pxiEyp8kv8JHgFVrJJfecg.woff2)');
    await poppins.load();
    document.fonts.add(poppins);
    
    // Draw header
    ctx.fillStyle = '#800080'; // Purple color for text
    ctx.font = 'bold 24px Poppins';
    ctx.textAlign = 'center';
    ctx.fillText('KAMBESHWAR AGENCIES', canvas.width / 2, 35);
    
    ctx.fillStyle = '#000000';
    ctx.font = '18px Poppins';
    ctx.fillText('Mapusa Goa', canvas.width / 2, 70);
    
    // Draw lines
    function drawLine(y) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    drawLine(80);
    
    // Draw party details
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px Poppins';
    ctx.fillText(`Party Name: ${party.name}`, padding, 100);
    ctx.fillText(`Mobile: ${party.mobile}`, padding, 120);
    ctx.fillText(`Station: ${party.station || 'N/A'}`, padding, 140);
    
    drawLine(150);
    
    // Draw "LEDGER DETAILS"
    ctx.fillStyle = '#F8E1FF'; // Light pink color
    ctx.fillRect(0, 151, canvas.width, 28);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Poppins';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px'; // Increased letter spacing
    ctx.fillText('LEDGER DETAILS', canvas.width / 2, 170);
    ctx.letterSpacing = '0px'; // Reset letter spacing
    
    drawLine(180);
    
    // Draw table
    function drawTable(x, y, width, height) {
        ctx.strokeRect(x, y, width, height);
    }
    
    // Calculate table dimensions and position
    const tableWidth = 550; // Total width of the table
    const tableX = (canvas.width - tableWidth) / 2; // Center the table horizontally
    
    // Draw table header
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(tableX, headerHeight, tableWidth, rowHeight);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 14px Poppins';
    ctx.textAlign = 'left';
    
    const colWidths = [80, 240, 100, 130];
    let xPos = tableX;
    ['Date', 'Description', 'Amount', 'Balance'].forEach((header, index) => {
        drawTable(xPos, headerHeight, colWidths[index], rowHeight);
        ctx.fillText(header, xPos + 5, headerHeight + 20);
        xPos += colWidths[index];
    });
    
    // Draw entries
    let y = headerHeight + rowHeight;
    let balance = 0;
    entries.forEach(entry => {
        xPos = tableX;
        ctx.font = '12px Poppins';
        ctx.fillStyle = '#000000';
        
        // Date
        drawTable(xPos, y, colWidths[0], rowHeight);
        ctx.fillText(formatDate(entry.date || entry.cnDate), xPos + 5, y + 20);
        xPos += colWidths[0];
        
        // Description
        drawTable(xPos, y, colWidths[1], rowHeight);
        ctx.fillText(getEntryDescription(entry), xPos + 5, y + 20);
        xPos += colWidths[1];
        
        // Amount
        drawTable(xPos, y, colWidths[2], rowHeight);
        const amount = getEntryAmount(entry);
        ctx.fillStyle = amount > 0 ? '#388e3c' : '#d32f2f';
        ctx.fillText(`₹${Math.abs(amount).toFixed(2)}`, xPos + 5, y + 20);
        xPos += colWidths[2];
        
        // Balance
        drawTable(xPos, y, colWidths[3], rowHeight);
        balance += amount;
        ctx.fillStyle = '#000000';
        ctx.fillText(`₹${balance.toFixed(2)}`, xPos + 5, y + 20);
        
        y += rowHeight;
    });
    
    // Draw footer
    y += 20; // Add space below the table
    drawLine(y);
    
    ctx.fillStyle = '#F8E1FF'; // Light pink color
    ctx.fillRect(0, y + 1, canvas.width, 28);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Poppins';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px'; // Increased letter spacing
    ctx.fillText(`Dr Bal. ₹${balance.toFixed(2)}`, canvas.width / 2, y + 20);
    ctx.letterSpacing = '0px'; // Reset letter spacing
    
    drawLine(y + 30);
    
    // Convert canvas to blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    
    // Cloudinary upload configuration
    const cloudName = 'dhuhvfubv';
    const apiKey = '319994322683626';
    
    // Create FormData and append necessary fields
    const formData = new FormData();
    formData.append('file', blob, 'ledger.png');
    formData.append('api_key', apiKey);
    
    // Generate timestamp and signature for authentication
    const timestamp = Math.round((new Date).getTime()/1000);
    formData.append('timestamp', timestamp);
    const signature = await generateCloudinarySignature(timestamp);
    formData.append('signature', signature);
    
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
}



function getEntryDescription(entry) {
    switch (entry.type) {
        case 'opening_balance':
            return 'Opening Balance';
        case 'bill':
            return `Sale Bill: ${entry.billNo}`;
        case 'cn':
            return `Credit Note: ${entry.cnNo}`;
        case 'payment':
            return `Payment: ${entry.paymentMode} ${entry.voucherNo}`;
        default:
            return 'Unknown';
    }
}

function getEntryAmount(entry) {
    switch (entry.type) {
        case 'opening_balance':
            return entry.amount;
        case 'bill':
            return entry.totalAmount;
        case 'cn':
            return -entry.cnAmount; // Negative amount for credit notes
        case 'payment':
            return -entry.amountPaid; // Negative amount for payments
        default:
            return 0;
    }
}

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

