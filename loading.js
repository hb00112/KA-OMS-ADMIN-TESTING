// Loading screen functionality
document.addEventListener('DOMContentLoaded', function() {
    // Show loading screen
    const loadingScreen = document.getElementById('loading-screen');
    const mainContent = document.getElementById('main-content');
    
    // Simulate loading time (2 seconds)
    setTimeout(function() {
        // Hide loading screen
        loadingScreen.style.display = 'none';
        // Show main content
        mainContent.style.display = 'block';
        
        // If there was a saved username, check it in Firebase
        const savedUsername = localStorage.getItem('username');
        if (savedUsername) {
            currentUser = savedUsername;
            checkUserInFirebase(savedUsername);
        }
    }, 2000);
});