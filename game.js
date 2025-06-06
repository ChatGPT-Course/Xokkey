
// Profile page functionality
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadProfile();
});

async function loadProfile() {
    try {
        const telegramId = tgApp.getUserId();
        const username = tgApp.getUsername();
        
        currentUser = await api.getOrCreateUser(telegramId, username);
        
        if (currentUser) {
            updateProfileUI();
            await loadRecentGames();
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
        tgApp.showAlert('Ошибка загрузки профиля');
    }
}

function updateProfileUI() {
    if (!currentUser) return;
    
    // Update profile info
    document.getElementById('profileName').textContent = 
        tgApp.getDisplayName();
    document.getElementById('profileId').textContent = 
        `ID: ${currentUser.telegram_id}`;
    
    // Update stats
    const totalGames = currentUser.total_games || 0;
    const wins = currentUser.wins || 0;
    const losses = currentUser.losses || 0;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    
    document.getElementById('totalGames').textContent = totalGames;
    document.getElementById('wins').textContent = wins;
    document.getElementById('losses').textContent = losses;
    document.getElementById('winRate').textContent = `${winRate}%`;
}

async function loadRecentGames() {
    try {
        const games = await api.getRecentGames(currentUser.telegram_id, 5);
        const gamesList = document.getElementById('recentGamesList');
        
        if (games.length === 0) {
            gamesList.innerHTML = '<p>Игр пока нет</p>';
            return;
        }
        
        gamesList.innerHTML = games.map(game => {
            const isPlayer1 = game.player1_id === currentUser.telegram_id;
            const myScore = isPlayer1 ? game.score1 : game.score2;
            const opponentScore = isPlayer1 ? game.score2 : game.score1;
            const isWin = myScore > opponentScore;
            const result = isWin ? 'Победа' : 'Поражение';
            const resultClass = isWin ? 'win' : 'loss';
            
            return `
                <div class="game-item ${resultClass}">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>${result}</span>
                        <span>${myScore}:${opponentScore}</span>
                    </div>
                    <small style="color: #7f8c8d; font-size: 0.8em;">
                        ${new Date(game.created_at || Date.now()).toLocaleDateString()}
                    </small>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Failed to load recent games:', error);
        document.getElementById('recentGamesList').innerHTML = 
            '<p>Ошибка загрузки игр</p>';
    }
}

function resetStats() {
    tgApp.showConfirm('Вы уверены, что хотите сбросить статистику?', async (confirmed) => {
        if (confirmed) {
            try {
                await api.updateUser(currentUser.Id, {
                    wins: 0,
                    losses: 0,
                    total_games: 0
                });
                
                // Update local data
                currentUser.wins = 0;
                currentUser.losses = 0;
                currentUser.total_games = 0;
                
                updateProfileUI();
                tgApp.showAlert('Статистика сброшена');
                tgApp.hapticFeedback('success');
            } catch (error) {
                console.error('Failed to reset stats:', error);
                tgApp.showAlert('Ошибка сброса статистики');
            }
        }
    });
}

function shareProfile() {
    const winRate = currentUser.total_games > 0 ? 
        Math.round((currentUser.wins / currentUser.total_games) * 100) : 0;
    
    const message = `🏒 Мой профиль в Хоккейной Битве:\n` +
                   `Игр: ${currentUser.total_games || 0}\n` +
                   `Побед: ${currentUser.wins || 0}\n` +
                   `Процент побед: ${winRate}%\n\n` +
                   `Присоединяйся к игре!`;
    
    if (tgApp.tg) {
        // Share via Telegram
        const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    } else {
        // Fallback - copy to clipboard
        navigator.clipboard.writeText(message).then(() => {
            tgApp.showAlert('Профиль скопирован в буфер обмена');
        }).catch(() => {
            tgApp.showAlert('Не удалось скопировать профиль');
        });
    }
    
    tgApp.hapticFeedback('medium');
}

function goHome() {
    tgApp.hapticFeedback('light');
    window.location.href = 'index.html';
}
