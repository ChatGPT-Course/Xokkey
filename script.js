
// Main menu functionality
let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await initializeUser();
});

async function initializeUser() {
    try {
        const telegramId = tgApp.getUserId();
        const username = tgApp.getUsername();
        
        currentUser = await api.getOrCreateUser(telegramId, username);
        console.log('Current user:', currentUser);
        
        // Update username display
        const usernameEl = document.getElementById('username');
        if (usernameEl) {
            usernameEl.textContent = tgApp.getDisplayName();
        }
    } catch (error) {
        console.error('Failed to initialize user:', error);
