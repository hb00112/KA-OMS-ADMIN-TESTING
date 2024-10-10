//homepage.js

const cardData = [
    { 
        title: 'Party Ledgers', 
        description: 'Manage and view all party transaction details.',
        logo: 'https://i.postimg.cc/T3vzTNjY/images-1-removebg-preview.png'
    },
    { 
        title: 'Bill Entry', 
        description: 'Record bills issued to parties.',
        logo: 'https://i.postimg.cc/4NfcjsqJ/bill-icon-for-your-website-mobile-presentation-and-logo-design-free-vector-removebg-preview.png'
    },
    { 
        title: 'Payment Entry', 
        description: 'Record payments received from parties.',
        logo: 'https://i.postimg.cc/VLtN7TLY/CN-1-removebg-preview.png'
    },
    { 
        title: 'CN Entry', 
        description: 'Issue and manage credit notes.',
        logo: 'https://i.postimg.cc/Kzn11Hkc/CN-removebg-preview.png'
    },
    { 
        title: 'Outstanding', 
        description: 'Track and manage outstanding bills.',
        logo: 'https://i.postimg.cc/SsKPswtC/images-removebg-preview.png'
    },
    { 
        title: 'Activity', 
        description: 'Review the activity logs of transactions.',
        logo: 'https://i.postimg.cc/285ntCL4/checklist-man-silhouette-icon-candidate-260nw-773065651-removebg-preview.png'
    },
    { 
        title: 'Deleted', 
        description: 'Records all deleted entries for restoring.',
        logo: 'https://i.postimg.cc/285ntCL4/checklist-man-silhouette-icon-candidate-260nw-773065651-removebg-preview.png'
    },
];

// Initialize homepage
function initializeHomepage() {
    const mainSection = document.querySelector('.main-section');
    mainSection.innerHTML = ''; // Clear existing content

    // Create cards
    cardData.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.onclick = () => showSection(card.title);
        cardElement.innerHTML = `
            <img src="${card.logo}" alt="${card.title} icon" class="card-logo">
            <h3>${card.title}</h3>
            <p>${card.description}</p>
        `;
        mainSection.appendChild(cardElement);
    });

    // Update header username
    document.getElementById('header-username').textContent = currentUser;
    
    // Start clock
    updateTime();
    setInterval(updateTime, 1000);
}

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
// ... existing homepage.js code ...

// Update the showSection function to handle Party Ledgers specifically
// Show section function for homepage.js
async function showSection(sectionName) {
    document.getElementById('homepage-container').style.display = 'none';
    const sectionContainer = document.getElementById('section-container');
    sectionContainer.style.display = 'block';
    document.getElementById('section-title').textContent = sectionName;
    
    const sectionContent = document.querySelector('.section-content');
    sectionContent.innerHTML = ''; // Clear previous content
    
    try {
        switch(sectionName) {
            case 'Party Ledgers':
                sectionContent.innerHTML = `
                    <input type="text" id="partySearch" class="party-search" placeholder="Search parties...">
                    <div id="partyList" class="party-list"></div>
                    <button id="addPartyBtn" class="party-add-btn">+</button>
                `;
                await initializePartyLedger();
                break;

            case 'Bill Entry':
                initializeBillEntry();
                break;

            case 'Payment Entry':
                initializePaymentEntry();
                break;

            case 'CN Entry':
                sectionContent.innerHTML = `
                    <div class="coming-soon-message">
                        <h2>Credit Note Entry</h2>
                        <p>This feature is coming soon. Stay tuned!</p>
                    </div>
                `;
                break;

            case 'Outstanding':
                sectionContent.innerHTML = `
                    <div class="coming-soon-message">
                        <h2>Outstanding Reports</h2>
                        <p>This feature is coming soon. Check back later!</p>
                    </div>
                `;
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
            <p>Loading ${sectionName}...</p>
        </div>
    `;
}
// Update the card creation to handle async function
cardData.forEach(card => {
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.onclick = async () => await showSection(card.title);
    cardElement.innerHTML = `
        <h3>${card.title}</h3>
        <p>${card.description}</p>
    `;
    mainSection.appendChild(cardElement);
});
// Rest of the existing homepage.js code...

// Go back to homepage
function goBack() {
    document.getElementById('section-container').style.display = 'none';
    document.getElementById('homepage-container').style.display = 'block';
    // Clear the section content when going back to the homepage
    document.querySelector('.section-content').innerHTML = '';
}

// Quick action function
function quickAction() {
    alert('Quick Action Triggered');
}

document.addEventListener('DOMContentLoaded', function() {
  // Prevent text selection
  document.body.style.userSelect = 'none';
  
  // Prevent context menu
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });

  // Prevent copy
  document.addEventListener('copy', function(e) {
    e.preventDefault();
  });

  // Disable drag and drop
  document.addEventListener('dragstart', function(e) {
    e.preventDefault();
  });


// Prevent long-touch from triggering
document.addEventListener('touchstart', function(e) {
    e.preventDefault();
}, { passive: false });

// Prevent default touch behavior
  document.addEventListener('touchstart', function(e) {
    e.preventDefault();
  }, { passive: false });
});

function disableContextMenu(e) {
    e.preventDefault();
    return false;
}

document.addEventListener('contextmenu', disableContextMenu);
document.body.style.userSelect = 'none';
document.body.style.webkitUserSelect = 'none';
document.body.style.msUserSelect = 'none';
document.body.style.mozUserSelect = 'none';

