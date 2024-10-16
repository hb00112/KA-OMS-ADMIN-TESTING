// OneSignal initialization
window.OneSignal = window.OneSignal || [];
OneSignal.push(function() {
    OneSignal.init({
        appId: "da7dcfb1-1587-467d-a4c1-b7bcac4a7cea",
    });
});

// DOM elements
const addPartyBtn = document.getElementById('addPartyBtn');
const sendNotificationBtn = document.getElementById('sendNotificationBtn');
const modal = document.getElementById('modal');
const closeModalBtn = document.getElementById('closeModalBtn');
const savePartyBtn = document.getElementById('savePartyBtn');
const partyNameInput = document.getElementById('partyNameInput');

let parties = [];

// Event listeners
addPartyBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
savePartyBtn.addEventListener('click', saveParty);
sendNotificationBtn.addEventListener('click', () => sendNotification());

// Functions
function openModal() {
    modal.style.display = 'block';
}

function closeModal() {
    modal.style.display = 'none';
    partyNameInput.value = '';
}

function saveParty() {
    const partyName = partyNameInput.value.trim();
    if (partyName) {
        parties.push(partyName);
        closeModal();
        sendNotification(partyName);
    } else {
        alert('Please enter a party name');
    }
}

function sendNotification(partyName) {
    const message = partyName ? `New party added: ${partyName}` : 'New party notification';
    
    OneSignal.push(function() {
        OneSignal.sendSelfNotification(
            "Party Notification", // Title
            message, // Message
            "https://example.com", // URL (optional)
            "/icon.png", // Icon (optional)
            {
                notificationType: "party"
            }, // Data (optional)
            [{ // Buttons (optional)
                id: "like-button",
                text: "Like",
                icon: "http://i.imgur.com/N8SN8ZS.png",
                url: "https://example.com"
            }]
        );
    });
}
