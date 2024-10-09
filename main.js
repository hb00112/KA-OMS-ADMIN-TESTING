//main.js
let currentUser = null;

function login() {
    const username = document.getElementById('username').value.toLowerCase();
    const password = document.getElementById('password').value;

    if (password === 'admin') {
        currentUser = username;
        localStorage.setItem('username', username);
        checkUserInFirebase(username);
    } else {
        alert('Incorrect password. Please try again.');
    }
}

function checkUserInFirebase(username) {
    firebase.database().ref('users/' + username).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            // User exists, check last login time
            const lastLogin = snapshot.val().lastLogin;
            const currentTime = new Date().getTime();
            if (lastLogin && currentTime - lastLogin < 24 * 60 * 60 * 1000) {
                // Less than 24 hours since last login, proceed to welcome screen
                showWelcome();
            } else if (snapshot.val().passkey) {
                // More than 24 hours or no last login, show passkey input
                showPasskeyInput();
            } else {
                // No passkey set, show passkey setup
                showPasskeySetup();
            }
        } else {
            // New user, set up in Firebase
            firebase.database().ref('users/' + username).set({
                username: username,
                lastLogin: new Date().getTime()
            });
            showPasskeySetup();
        }
    });
}

function showPasskeySetup() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('passkey-container').style.display = 'block';
    document.getElementById('passkey-username').textContent = currentUser;
    
    if (currentUser.toLowerCase() === 'hemant') {
        document.getElementById('user-photo').style.display = 'block';
    } else {
        document.getElementById('user-photo').style.display = 'none';
    }

    setupPasskeyKeyboard();
    document.getElementById('passkey-container').querySelector('h3').textContent = 'Set Up Your Passkey';
}

function showPasskeyInput() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('passkey-container').style.display = 'block';
    document.getElementById('passkey-username').textContent = currentUser;
    
    if (currentUser.toLowerCase() === 'hemant') {
        document.getElementById('user-photo').style.display = 'block';
    } else {
        document.getElementById('user-photo').style.display = 'none';
    }

    setupPasskeyKeyboard();
    document.getElementById('passkey-container').querySelector('h3').textContent = 'Enter Your Passkey';
    
    // Add "Forgot Passcode" button
    const forgotPasscodeBtn = document.createElement('button');
    forgotPasscodeBtn.textContent = 'Forgot Passcode?';
    forgotPasscodeBtn.onclick = forgotPasscode;
    forgotPasscodeBtn.className = 'forgot-passcode-btn';
    document.getElementById('passkey-container').appendChild(forgotPasscodeBtn);
}

function setupPasskeyKeyboard() {
    const keyboard = document.getElementById('passkey-keyboard');
    keyboard.innerHTML = '';
    for (let i = 1; i <= 9; i++) {
        keyboard.innerHTML += `<button class="key" onclick="addToPasskey(${i})">${i}</button>`;
    }
    keyboard.innerHTML += `
        <button class="key" onclick="clearPasskey()">Clear</button>
        <button class="key" onclick="addToPasskey(0)">0</button>
        <button class="key" onclick="deleteFromPasskey()">Delete</button>
    `;
}

function addToPasskey(num) {
    const input = document.getElementById('passkey-input');
    if (input.textContent.length < 4) {
        input.textContent += '•';
        input.dataset.value = (input.dataset.value || '') + num;
    }
}

function clearPasskey() {
    const input = document.getElementById('passkey-input');
    input.textContent = '';
    input.dataset.value = '';
}

function deleteFromPasskey() {
    const input = document.getElementById('passkey-input');
    input.textContent = input.textContent.slice(0, -1);
    input.dataset.value = input.dataset.value.slice(0, -1);
}

function submitPasskey() {
    const passkey = document.getElementById('passkey-input').dataset.value;
    if (passkey.length === 4) {
        firebase.database().ref('users/' + currentUser).once('value').then((snapshot) => {
            if (snapshot.exists() && snapshot.val().passkey) {
                // Verify passkey
                if (snapshot.val().passkey === passkey) {
                    updateLastLogin();
                    showWelcome();
                } else {
                    alert('Incorrect passkey. Please try again.');
                }
            } else {
                // Set new passkey
                firebase.database().ref('users/' + currentUser).update({
                    passkey: passkey
                });
                updateLastLogin();
                showWelcome();
            }
        });
    } else {
        alert('Please enter a 4-digit passkey.');
    }
}

function updateLastLogin() {
    firebase.database().ref('users/' + currentUser).update({
        lastLogin: new Date().getTime()
    });
}

function showWelcome() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('passkey-container').style.display = 'none';
    document.getElementById('homepage-container').style.display = 'block';
    initializeHomepage(); // This function is defined in homepage.js
}

window.onload = function() {
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
        currentUser = savedUsername;
        checkUserInFirebase(savedUsername);
    }
};

function forgotPassword() {
    const username = document.getElementById('username').value;
    const message = encodeURIComponent(`Dear Sir,

kindly provide login ID and password for the KA PAYMENTS app

Thank You
${username || '[enter your name here]'}`);

    const whatsappLink = `https://wa.me/919284494154?text=${message}`;
    window.open(whatsappLink, '_blank');
}

function forgotPasscode() {
    const message = encodeURIComponent(`Dear Sir,
kindly provide me the passcode of user ID : ${currentUser}

Thank you`);

    const whatsappLink = `https://wa.me/919284494154?text=${message}`;
    window.open(whatsappLink, '_blank');
}