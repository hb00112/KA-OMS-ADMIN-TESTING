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

function initializeHomepage() {
    const mainSection = document.querySelector('.main-section');
    mainSection.innerHTML = '';

    cardData.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.onclick = () => showSection(card.title);
        
        // Create image element with additional attributes and styles
        const imgElement = document.createElement('img');
        imgElement.src = card.logo;
        imgElement.alt = `${card.title} icon`;
        imgElement.className = 'card-logo';
        imgElement.draggable = false;
        imgElement.style.pointerEvents = 'none'; // Prevents all mouse interactions
        
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

async function showSection(sectionName) {
    document.getElementById('homepage-container').style.display = 'none';
    const sectionContainer = document.getElementById('section-container');
    sectionContainer.style.display = 'block';
    document.getElementById('section-title').textContent = sectionName;
    
    const sectionContent = document.querySelector('.section-content');
    sectionContent.innerHTML = '';
    
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
            // ... other cases remain the same
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

function goBack() {
    document.getElementById('section-container').style.display = 'none';
    document.getElementById('homepage-container').style.display = 'block';
    document.querySelector('.section-content').innerHTML = '';
}

function quickAction() {
    alert('Quick Action Triggered');
}

document.addEventListener('DOMContentLoaded', function() {
    // Comprehensive event prevention
    const preventDefaultEvents = [
        'contextmenu', 'selectstart', 'copy', 'cut', 'paste',
        'dragstart', 'drop', 'touchstart', 'touchmove'
    ];
    
    preventDefaultEvents.forEach(eventType => {
        document.addEventListener(eventType, (e) => {
            e.preventDefault();
            return false;
        }, { passive: false });
    });

    // Disable text selection across different browsers
    const userSelectProperties = [
        'userSelect', 'webkitUserSelect', 'msUserSelect', 
        'mozUserSelect', 'khtmlUserSelect'
    ];
    
    userSelectProperties.forEach(property => {
        document.body.style[property] = 'none';
    });

    // Disable image dragging and context menu
    document.querySelectorAll('img').forEach(img => {
        img.draggable = false;
        img.style.pointerEvents = 'none';
        img.addEventListener('contextmenu', (e) => e.preventDefault());
    });

    // Add CSS to prevent text selection and highlighting
    const style = document.createElement('style');
    style.textContent = `
        * {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -khtml-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
        img {
            pointer-events: none;
            -webkit-user-drag: none;
            user-drag: none;
        }
    `;
    document.head.appendChild(style);
});
