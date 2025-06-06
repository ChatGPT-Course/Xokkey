
// Telegram Web App integration
class TelegramApp {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.user = null;
        this.init();
    }

    init() {
        if (this.tg) {
            this.tg.ready();
            this.tg.expand();
            
            // Set theme colors (check if methods exist)
            if (this.tg.setHeaderColor) {
                this.tg.setHeaderColor('#667eea');
            }
            if (this.tg.setBackgroundColor) {
                this.tg.setBackgroundColor('#ffffff');
            }
            
            // Get user data
            this.user = this.tg.initDataUnsafe?.user;
            
            if (this.user) {
                console.log('Telegram user:', this.user);
                this.displayUserInfo();
            } else {
                // Fallback for testing
                this.user = {
                    id: Date.now(),
                    username: 'test_user',
                    first_name: 'Test',
                    last_name: 'User'
                };
                this.displayUserInfo();
            }
        } else {
            // Fallback for testing outside Telegram
            console.log('Running outside Telegram');
            this.user = {
                id: Date.now(),
                username: 'test_user',
                first_name: 'Test',
                last_name: 'User'
            };
            this.displayUserInfo();
        }
    }

    displayUserInfo() {
        const usernameEl = document.getElementById('username');
        if (usernameEl && this.user) {
            const displayName = this.user.first_name || this.user.username || 'Игрок';
            usernameEl.textContent = displayName;
        }
    }

    showAlert(message) {
        if (this.tg) {
            this.tg.showAlert(message);
        } else {
            alert(message);
        }
    }

    showConfirm(message, callback) {
        if (this.tg) {
            this.tg.showConfirm(message, callback);
        } else {
            const result = confirm(message);
            callback(result);
        }
    }

    hapticFeedback(type = 'impact') {
        if (this.tg?.HapticFeedback) {
            switch(type) {
                case 'light':
                    this.tg.HapticFeedback.impactOccurred('light');
                    break;
                case 'medium':
                    this.tg.HapticFeedback.impactOccurred('medium');
                    break;
                case 'heavy':
                    this.tg.HapticFeedback.impactOccurred('heavy');
                    break;
                case 'success':
                    this.tg.HapticFeedback.notificationOccurred('success');
                    break;
                case 'error':
                    this.tg.HapticFeedback.notificationOccurred('error');
                    break;
                default:
                    this.tg.HapticFeedback.impactOccurred('medium');
            }
        }
    }

    close() {
        if (this.tg) {
            this.tg.close();
        } else {
            window.close();
        }
    }

    getUserId() {
        return this.user?.id || Date.now();
    }

    getUsername() {
        return this.user?.username || 'unknown';
    }

    getDisplayName() {
        return this.user?.first_name || this.user?.username || 'Игрок';
    }
}

// Initialize Telegram app
const tgApp = new TelegramApp();
