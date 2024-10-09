//homepage.js

const cardData = [
    { title: 'Quick Entry', description: 'Fast access to record payments, bills, or credit notes.' },
    { title: 'Party Ledgers', description: 'Manage and view all party transaction details.' },
    { title: 'Bill Entry', description: 'Record bills issued to parties.' },
    { title: 'Payment Entry', description: 'Record payments received from parties.' },
    { title: 'CN Entry', description: 'Issue and manage credit notes.' },
    { title: 'Outstanding', description: 'Track and manage outstanding bills.' },
    { title: 'Activity', description: 'Review the activity logs of transactions.' }
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
function showSection(sectionName) {
    document.getElementById('homepage-container').style.display = 'none';
    const sectionContainer = document.getElementById('section-container');
    sectionContainer.style.display = 'block';
    document.getElementById('section-title').textContent = sectionName;
    document.getElementById('section-message').textContent = `${sectionName} Coming Soon`;
}

// Go back to homepage
function goBack() {
    document.getElementById('section-container').style.display = 'none';
    document.getElementById('homepage-container').style.display = 'block';
}

// Quick action function
function quickAction() {
    alert('Quick Action Triggered');
}