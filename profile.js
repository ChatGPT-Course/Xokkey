
// Profile page functionality
class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            const telegramId = tgApp.getUserId();
            const username = tgApp.getUsername();
            
            this.currentUser = await api.getOrCreateUser(telegramId, username);
            this.displayProfile();
            await this.loadRecentGames();
        } catch (error) {
            console.error('Failed to initialize profile:', error);
            this.showError('Ошибка загрузки профиля');
        }
    }

    displayProfile() {
        if (!this.currentUser) return;

        // Update profile info
        document.getElementById('profileName').textContent = tgApp.getDisplayName();
        document.getElementById('profileId').textContent = `ID: ${this.currentUser.telegram_id}`;

        // Update stats
        document.getElementById('totalGames').textContent = this.currentUser.total_games || 0;
        document.getElementById('wins').textContent = this.currentUser.wins || 0;
        document.getElementById('losses').textContent = this.currentUser.losses || 0;

        // Calculate win rate
        const totalGames = this.currentUser.total_games || 0;
        const wins = this.currentUser.wins || 0;
        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
        document.getElementById('winRate').textContent = `${winRate}%`;
    }

    async loadRecentGames() {
        try {
            const games = await api.getRecentGames(this.currentUser.telegram_id, 10);
            this.displayRecentGames(games);
        } catch (error) {
            console.error('Failed to load recent games:', error);
        }
    }

    displayRecentGames(games) {
        const gamesList = document.getElementById('recentGamesList');
        if (!gamesList) return;

        if (games.length === 0) {
            gamesList.innerHTML = '<p class="no-games">Игр пока нет</p>';
            return;
        }

        const gamesHTML = games.map(game => {
            const isPlayer1 = game.player1_id === this.currentUser.telegram_id;
            const myScore = isPlayer1 ? game.score1 : game.score2;
            const opponentScore = isPlayer1 ? game.score2 : game.score1;
            const opponentName = isPlayer1 ? game.player2_name : game.player1_name;
            const won = myScore > opponentScore;
            const resultText = won ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ';
            const resultClass = won ? 'win' : 'loss';

            return `
                <div class="game-item">
                    <div class="game-item-header">
                        <span class="game-result ${resultClass}">${resultText}</span>
                        <span class="game-date">${this.formatDate(game.created_at)}</span>
                    </div>
                    <div class="game-score">
                        против ${opponentName}: ${myScore}-${opponentScore}
                    </div>
                </div>
            `;
        }).join('');

        gamesList.innerHTML = gamesHTML;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff4757;
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 1000;
        `;

        document.body.appendChild(errorDiv);
        setTimeout(() => {
            if (document.body.contains(errorDiv)) {
                document.body.removeChild(errorDiv);
            }
        }, 3000);
    }

    goHome() {
        window.location.href = 'index.html';
    }
}

// Global function for HTML onclick
function goHome() {
    window.location.href = 'index.html';
}

// Initialize profile when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
});
