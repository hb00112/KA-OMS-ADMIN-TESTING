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

// Navigation history stack
let navigationHistory = [];

// Initialize homepage
function initializeHomepage() {
    const mainSection = document.querySelector('.main-section');
    mainSection.innerHTML = ''; // Clear existing content
    navigationHistory = []; // Clear navigation history

    // Create cards
    cardData.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.onclick = () => showSection(card.title);
        
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

    document.getElementById('header-username').textContent = currentUser;
    
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

// Show section with navigation tracking
async function showSection(sectionName, subSection = null) {
    // Save current state to history
    const currentState = {
        sectionName: document.getElementById('section-title').textContent,
        content: document.querySelector('.section-content').innerHTML,
        display: {
            homepage: document.getElementById('homepage-container').style.display,
            section: document.getElementById('section-container').style.display
        }
    };

    // Only push to history if we're not on the homepage
    if (document.getElementById('section-container').style.display === 'block') {
        navigationHistory.push(currentState);
    }

    // Update display
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
                initializeCNEntry();
                break;

            case 'Outstanding':
                sectionContent.innerHTML = '';
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
}

// Enhanced goBack function
function goBack() {
    if (navigationHistory.length === 0) {
        // If no history, return to homepage
        document.getElementById('section-container').style.display = 'none';
        document.getElementById('homepage-container').style.display = 'block';
        document.querySelector('.section-content').innerHTML = '';
        return;
    }

    // Get previous state
    const previousState = navigationHistory.pop();

    // Restore previous state
    document.getElementById('section-title').textContent = previousState.sectionName;
    document.querySelector('.section-content').innerHTML = previousState.content;
    
    // Restore display states
    document.getElementById('homepage-container').style.display = previousState.display.homepage;
    document.getElementById('section-container').style.display = previousState.display.section;

    // If we're going back to homepage
    if (previousState.display.homepage === 'block') {
        navigationHistory = []; // Clear remaining history
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

// Quick action function
function quickAction() {
    alert('Quick Action Triggered');
}

// Event listeners
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

    // Initialize the homepage
    initializeHomepage();
});
