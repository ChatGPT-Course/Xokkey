
// Game logic and state management
class HockeyGame {
    constructor() {
        this.gameId = null;
        this.currentUser = null;
        this.opponent = null;
        this.gameState = 'searching'; // searching, playing, waiting, finished
        this.isAttacker = true;
        this.round = 1;
        this.maxRounds = 6; // 3 points to win, 2 rounds per point
        this.score = { player1: 0, player2: 0 };
        this.selectedZones = [];
        this.pollInterval = null;
        
        this.init();
    }

    async init() {
        try {
            // Get current user
            const telegramId = tgApp.getUserId();
            const username = tgApp.getUsername();
            this.currentUser = await api.getOrCreateUser(telegramId, username);
            
            // Start game search
            await this.searchForGame();
        } catch (error) {
            console.error('Failed to initialize game:', error);
            tgApp.showAlert('Ошибка инициализации игры');
        }
    }

    async searchForGame() {
        this.showElement('gameSearch');
        this.hideElement('gameArea');
        
        try {
            // Look for existing waiting game
            let waitingGame = await api.findWaitingGame();
            
            if (waitingGame && waitingGame.player1_id !== this.currentUser.telegram_id) {
                // Join existing game
                await this.joinGame(waitingGame);
            } else {
                // Create new game
                await this.createGame();
            }
        } catch (error) {
            console.error('Failed to search for game:', error);
            tgApp.showAlert('Ошибка поиска игры');
        }
    }

    async createGame() {
        try {
            const gameData = {
                game_id: 'game_' + Date.now(),
                player1_id: this.currentUser.telegram_id,
                player2_id: null,
                status: 'waiting',
                score1: 0,
                score2: 0,
                current_round: 1
            };

            const response = await api.createGame(gameData);
            this.gameId = gameData.game_id;
            
            // Start polling for opponent
            this.startPolling();
        } catch (error) {
            console.error('Failed to create game:', error);
            throw error;
        }
    }

    async joinGame(game) {
        try {
            this.gameId = game.game_id;
            
            // Update game with second player
            await api.updateGame(this.gameId, {
                player2_id: this.currentUser.telegram_id,
                status: 'playing'
            });

            // Get opponent info
            this.opponent = await api.getUser(game.player1_id);
            this.isAttacker = false; // Second player starts as defender
            
            this.startGame();
        } catch (error) {
            console.error('Failed to join game:', error);
            throw error;
        }
    }

    startPolling() {
        this.pollInterval = setInterval(async () => {
            try {
                const game = await api.getGame(this.gameId);
                if (game && game.status === 'playing' && game.player2_id) {
                    clearInterval(this.pollInterval);
                    this.opponent = await api.getUser(game.player2_id);
                    this.isAttacker = true; // First player starts as attacker
                    this.startGame();
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 2000);
    }

    startGame() {
        this.hideElement('gameSearch');
        this.showElement('gameArea');
        
        // Update UI
        this.updateGameUI();
        this.setupRound();
    }

    updateGameUI() {
        document.getElementById('player1Name').textContent = 
            this.currentUser.username || 'Вы';
        document.getElementById('player2Name').textContent = 
            this.opponent?.username || 'Соперник';
        document.getElementById('player1Score').textContent = this.score.player1;
        document.getElementById('player2Score').textContent = this.score.player2;
    }

    setupRound() {
        this.selectedZones = [];
        this.clearZoneSelection();
        
        const isMyTurn = (this.round % 2 === 1) ? this.isAttacker : !this.isAttacker;
        
        if (isMyTurn) {
            this.showActionUI();
        } else {
            this.showWaitingUI();
            this.waitForOpponent();
        }
        
        // Update round info
        document.getElementById('roundText').textContent = `Раунд ${Math.ceil(this.round / 2)}`;
        
        const role = (this.round % 2 === 1) === this.isAttacker ? 'нападающий' : 'защитник';
        document.getElementById('roleText').textContent = `Вы ${role}`;
    }

    showActionUI() {
        const isAttacking = (this.round % 2 === 1) === this.isAttacker;
        
        if (isAttacking) {
            document.getElementById('actionTitle').textContent = 'Выберите зону для броска:';
        } else {
            document.getElementById('actionTitle').textContent = 'Выберите 2 зоны для защиты:';
        }
        
        this.hideElement('waitingArea');
        this.hideElement('resultArea');
    }

    showWaitingUI() {
        this.hideElement('confirmBtn');
        this.showElement('waitingArea');
    }

    clearZoneSelection() {
        document.querySelectorAll('.zone').forEach(zone => {
            zone.classList.remove('selected', 'defended');
        });
    }

    waitForOpponent() {
        // In a real implementation, this would poll the server
        // For demo purposes, we'll simulate opponent moves
        setTimeout(() => {
            this.simulateOpponentMove();
        }, 3000);
    }

    simulateOpponentMove() {
        const isAttacking = (this.round % 2 === 1) !== this.isAttacker;
        let opponentZones;
        
        if (isAttacking) {
            // Opponent attacks - choose 1 zone
            opponentZones = [Math.floor(Math.random() * 4) + 1];
        } else {
            // Opponent defends - choose 2 zones
            const zone1 = Math.floor(Math.random() * 4) + 1;
            let zone2 = Math.floor(Math.random() * 4) + 1;
            while (zone2 === zone1) {
                zone2 = Math.floor(Math.random() * 4) + 1;
            }
            opponentZones = [zone1, zone2];
        }
        
        this.processRoundResult(opponentZones);
    }

    processRoundResult(opponentZones) {
        const isMyAttack = (this.round % 2 === 1) === this.isAttacker;
        let attackZone, defenseZones;
        
        if (isMyAttack) {
            attackZone = this.selectedZones[0];
            defenseZones = opponentZones;
        } else {
            attackZone = opponentZones[0];
            defenseZones = this.selectedZones;
        }
        
        const isGoal = !defenseZones.includes(attackZone);
        
        // Update score
        if (isGoal) {
            if (isMyAttack) {
                this.score.player1++;
            } else {
                this.score.player2++;
            }
        }
        
        this.showRoundResult(isGoal, attackZone, defenseZones);
    }

    showRoundResult(isGoal, attackZone, defenseZones) {
        this.hideElement('waitingArea');
        this.showElement('resultArea');
        
        // Highlight zones
        document.querySelector(`[data-zone="${attackZone}"]`).classList.add('selected');
        defenseZones.forEach(zone => {
            document.querySelector(`[data-zone="${zone}"]`).classList.add('defended');
        });
        
        const resultText = document.getElementById('resultText');
        if (isGoal) {
            resultText.textContent = '⚽ ГОЛ! Шайба в воротах!';
            tgApp.hapticFeedback('success');
        } else {
            resultText.textContent = '🛡️ Защита! Шайба отбита!';
            tgApp.hapticFeedback('light');
        }
        
        this.updateGameUI();
        
        // Check for game end
        if (this.score.player1 >= 3 || this.score.player2 >= 3) {
            setTimeout(() => this.endGame(), 2000);
        }
    }

    endGame() {
        this.hideElement('gameArea');
        this.showElement('gameEnd');
        
        const winner = this.score.player1 > this.score.player2 ? 'player1' : 'player2';
        const isWinner = winner === 'player1';
        
        document.getElementById('finalResult').textContent = 
            isWinner ? '🏆 Победа!' : '😔 Поражение';
        
        document.getElementById('finalPlayer1').textContent = 'Вы';
        document.getElementById('finalPlayer2').textContent = this.opponent?.username || 'Соперник';
        document.getElementById('finalScore1').textContent = this.score.player1;
        document.getElementById('finalScore2').textContent = this.score.player2;
        
        // Update user stats
        this.updateUserStats(isWinner);
        
        tgApp.hapticFeedback(isWinner ? 'success' : 'error');
    }

    async updateUserStats(isWinner) {
        try {
            const updates = {
                total_games: (this.currentUser.total_games || 0) + 1
            };
            
            if (isWinner) {
                updates.wins = (this.currentUser.wins || 0) + 1;
            } else {
                updates.losses = (this.currentUser.losses || 0) + 1;
            }
            
            await api.updateUser(this.currentUser.Id, updates);
        } catch (error) {
            console.error('Failed to update user stats:', error);
        }
    }

    showElement(id) {
        document.getElementById(id)?.classList.remove('hidden');
    }

    hideElement(id) {
        document.getElementById(id)?.classList.add('hidden');
    }
}

// Global game functions
let game;

function selectZone(zoneNumber) {
    const isAttacking = (game.round % 2 === 1) === game.isAttacker;
    const maxSelections = isAttacking ? 1 : 2;
    
    const zone = document.querySelector(`[data-zone="${zoneNumber}"]`);
    
    if (zone.classList.contains('selected')) {
        // Deselect zone
        zone.classList.remove('selected');
        game.selectedZones = game.selectedZones.filter(z => z !== zoneNumber);
    } else if (game.selectedZones.length < maxSelections) {
        // Select zone
        zone.classList.add('selected');
        game.selectedZones.push(zoneNumber);
    }
    
    // Show/hide confirm button
    if (game.selectedZones.length === maxSelections) {
        game.showElement('confirmBtn');
    } else {
        game.hideElement('confirmBtn');
    }
    
    tgApp.hapticFeedback('light');
}

function confirmAction() {
    if (game.selectedZones.length === 0) return;
    
    tgApp.hapticFeedback('medium');
    game.hideElement('confirmBtn');
    game.showElement('waitingArea');
    
    // Wait for opponent move
    game.waitForOpponent();
}

function nextRound() {
    game.round++;
    game.setupRound();
}

function playAgain() {
    tgApp.hapticFeedback('medium');
    window.location.reload();
}

function cancelSearch() {
    if (game.pollInterval) {
        clearInterval(game.pollInterval);
    }
    goHome();
}

function goHome() {
    if (game?.pollInterval) {
        clearInterval(game.pollInterval);
    }
    window.location.href = 'index.html';
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    game = new HockeyGame();
});
