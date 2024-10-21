//homepage.js

const cardData = [
    { 
        title: 'Ledgers', 
        description: 'Manage and view all party transaction details.',
        logo: 'https://i.postimg.cc/T2HpW52V/9800965.png',
        color: '#163450'  // Gold
    },
    { 
        title: 'Bill Entry', 
        description: 'Record bills issued to parties.',
        logo: 'https://i.postimg.cc/brYN28WF/Whats-App-Image-2024-10-18-at-22-40-42-2e51bdfb-removebg-preview.png',
        color: '#311D50'  // Pale Green
    },
    { 
        title: 'Payment', 
        description: 'Record payments received from parties.',
        logo: 'https://i.postimg.cc/4x6MjtmV/Whats-App-Image-2024-10-18-at-22-40-44-49f4b529-removebg-preview.png',
        color: '#462133'  // Light Sky Blue
    },
    { 
        title: 'CN Entry', 
        description: 'Issue and manage credit notes.',
        logo: 'https://i.postimg.cc/KjCwhDPr/Whats-App-Image-2024-10-18-at-22-40-43-7f08418a-removebg-preview.png',
        color: '#183533'  // Plum
    },
    { 
        title: 'Outstanding', 
        description: 'Track and manage outstanding bills.',
        logo: 'https://i.postimg.cc/NMJZpcLn/Whats-App-Image-2024-10-18-at-22-40-43-32a65498-removebg-preview.png',
        color: '#43271C'  // Light Salmon
    },
    { 
        title: 'Deleted', 
        description: 'Records all deleted entries for restoring.',
        logo: 'https://i.postimg.cc/Dzc94shn/Whats-App-Image-2024-10-18-at-22-40-42-b9e0cfd0-removebg-preview.png',
        color: '#431522'  // Light Coral
    },
];

function initializeHomepage() {
    const mainSection = document.querySelector('.main-section');
    mainSection.innerHTML = ''; // Clear existing content

    // Create cards (keeping exactly as original)
    cardData.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.onclick = () => showSection(card.title);
        
        cardElement.style.backgroundColor = card.color;
        
        const imgElement = document.createElement('img');
        imgElement.src = card.logo;
        imgElement.alt = `${card.title} icon`;
        imgElement.className = 'card-logo';
        
        cardElement.appendChild(imgElement);
        cardElement.innerHTML += `
            <h3>${card.title}</h3>
            <p>${card.description}</p>
        `;
        mainSection.appendChild(cardElement);
    });

    // Add payments section after main section
    const mainContainer = mainSection.parentElement;
    
    // Create recent payments section
    const recentPaymentsSection = document.createElement('div');
    recentPaymentsSection.className = 'recent-payments-section';
    recentPaymentsSection.style.marginTop = '180px'; // Push it below the cards
    recentPaymentsSection.style.padding = '0 20px';
    mainContainer.appendChild(recentPaymentsSection);

    // Fetch and display recent payments
    fetchRecentPayments();
}

function fetchRecentPayments() {
    const recentPaymentsSection = document.querySelector('.recent-payments-section');
    
    try {
        // Get reference to the payments in Firebase
        const paymentsRef = firebase.database().ref('payments');
        
        // Query the last 2 payments, ordered by timestamp
        paymentsRef
            .orderByChild('timestamp')
            .limitToLast(2)
            .once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const payments = [];
                    snapshot.forEach((childSnapshot) => {
                        payments.push(childSnapshot.val());
                    });

                    // Sort payments by timestamp in descending order
                    payments.sort((a, b) => b.timestamp - a.timestamp);

                    // Clear previous content
                    recentPaymentsSection.innerHTML = '';

                    // Create payment containers
                    payments.forEach(payment => {
                        const paymentContainer = document.createElement('div');
                        paymentContainer.className = 'payment-container';
                        
                        paymentContainer.innerHTML = `
                            <div class="payment-party-name">${payment.partyName}</div>
                            <div class="payment-amount">₹${payment.amountPaid.toLocaleString('en-IN')}</div>
                            <div class="payment-date">${payment.date} (${payment.voucherNo})</div>
                        `;
                        
                        recentPaymentsSection.appendChild(paymentContainer);
                    });
                } else {
                    recentPaymentsSection.innerHTML = '<div class="no-payments">No recent payments found</div>';
                }
            })
            .catch((error) => {
                console.error('Error fetching recent payments:', error);
                recentPaymentsSection.innerHTML = '<div class="error-message">Error loading recent payments</div>';
            });
    } catch (error) {
        console.error('Error fetching recent payments:', error);
        recentPaymentsSection.innerHTML = '<div class="error-message">Error loading recent payments</div>';
    }
}

    // Update header username
    document.getElementById('header-username').textContent = currentUser;
    
    // Start clock
    updateTime();
    setInterval(updateTime, 1000);



// Update time
function updateTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12;
    hours = String(hours).padStart(2, '0');

    const timeString = `${hours}:${minutes}:${seconds} ${ampm}`;
    document.getElementById('clock').textContent = timeString;
}

// Show section
async function showSection(sectionName) {
    document.getElementById('homepage-container').style.display = 'none';
    const sectionContainer = document.getElementById('section-container');
    sectionContainer.style.display = 'block';
    document.getElementById('section-title').textContent = sectionName;
    
    const sectionContent = document.querySelector('.section-content');
    sectionContent.innerHTML = ''; // Clear previous content
    
 // Push state to history when navigating to a section
    history.pushState({ section: sectionName }, '', `#${sectionName.toLowerCase().replace(/\s+/g, '-')}`);

    try {
        switch(sectionName) {
            case 'Ledgers':
                sectionContent.innerHTML = `
                    <input type="text" id="partySearch" class="party-search" placeholder="Search parties...">
                    <div id="partyList" class="party-list"></div>
                    
                `;
                await initializePartyLedger();
                break;

            case 'Bill Entry':
                initializeBillEntry();
                break;

            case 'Payment':
                initializePaymentEntry();
                break;

            case 'CN Entry':
                initializeCNEntry();
                break;
               

                case 'Outstanding':
                    sectionContent.innerHTML = ''; // Clear previous content
                    await initializeOutstanding();
                    break;

            case 'Activity':
                sectionContent.innerHTML = `
                    <div class="coming-soon-message">
                        <h2>Activity Logs</h2>
                        <p>Activity tracking will be available soon.</p>
                    </div>
                `;
                break;

            case 'Deleted':
                sectionContent.innerHTML = `
                    <div class="coming-soon-message">
                        <h2>Deleted Items</h2>
                        <p>Deleted item recovery will be available in a future update.</p>
                    </div>
                `;
                break;

            default:
                sectionContent.innerHTML = `
                    <div class="coming-soon-message">
                        <h2>${sectionName}</h2>
                        <p>This section is under development.</p>
                    </div>
                `;
        }
    } catch (error) {
        console.error(`Error initializing ${sectionName}:`, error);
        sectionContent.innerHTML = `
            <div class="error-message">
                <h2>Error</h2>
                <p>An error occurred while loading this section. Please try again later.</p>
            </div>
        `;
    }

    // Add error handling for required functions
    if (sectionName === 'Party Ledgers' && typeof initializePartyLedger !== 'function') {
        console.error('initializePartyLedger function is not defined');
    }
    if (sectionName === 'Bill Entry' && typeof initializeBillEntry !== 'function') {
        console.error('initializeBillEntry function is not defined');
    }
    if (sectionName === 'Payment Entry' && typeof initializePaymentEntry !== 'function') {
        console.error('initializePaymentEntry function is not defined');
    }
}

// Helper function to create a loading indicator
function showLoadingIndicator(sectionContent) {
    sectionContent.innerHTML = `
        <div class="loading-indicator">
            <div class="spinner"></div>
            <p>Loading...</p>
        </div>
    `;
}

// Go back to homepage
function goBack() {
    document.getElementById('section-container').style.display = 'none';
    document.getElementById('homepage-container').style.display = 'block';
    document.querySelector('.section-content').innerHTML = '';
    // Remove the hash from URL when going back to homepage
    history.pushState('', document.title, window.location.pathname);
}
// Quick action function
function quickAction() {
    alert('Quick Action Triggered');
}

document.addEventListener('DOMContentLoaded', function() {
    // Prevent copy and paste
    document.addEventListener('copy', function(e) {
        e.preventDefault();
    });
    
    document.addEventListener('paste', function(e) {
        e.preventDefault();
    });
    
    // Prevent context menu only for images
    document.addEventListener('contextmenu', function(e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            return false;
        }
    });

    const addPartyBtn = document.getElementById('addPartyBtn');
    if (addPartyBtn) {
        addPartyBtn.style.display = 'block';
    }
// Handle initial hash in URL if any
    if (window.location.hash) {
        const sectionName = window.location.hash.slice(1).replace(/-/g, ' ');
        const validSection = cardData.find(card => 
            card.title.toLowerCase() === sectionName.toLowerCase()
        );
        if (validSection) {
            showSection(validSection.title);
        }
    }
});

