
// Game logic and state management
class HockeyGame {
    constructor() {
        this.currentUser = null;
        this.currentGame = null;
        this.gameId = null;
        this.isAttacker = true;
        this.currentRound = 1;
        this.selectedZones = [];
        this.waitingForOpponent = false;
        this.init();
    }

    async init() {
        try {
            // Initialize user
            const telegramId = tgApp.getUserId();
            const username = tgApp.getUsername();
            this.currentUser = await api.getOrCreateUser(telegramId, username);
            
            // Try to find existing game or create new one
            await this.findOrCreateGame();
            
            // Start game loop
            this.startGameLoop();
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showMessage('Ошибка инициализации игры', 'error');
        }
    }

    async findOrCreateGame() {
        // Check if there's a waiting game
        const waitingGame = await api.findWaitingGame();
        
        if (waitingGame && waitingGame.player1_id !== this.currentUser.telegram_id) {
            // Join existing game
            this.gameId = waitingGame.game_id;
            await api.updateGame(this.gameId, {
                player2_id: this.currentUser.telegram_id,
                player2_name: this.currentUser.username,
                status: 'playing'
            });
            this.isAttacker = false; // Second player starts as defender
        } else {
            // Create new game
            this.gameId = 'game_' + Date.now();
            await api.createGame({
                game_id: this.gameId,
                player1_id: this.currentUser.telegram_id,
                player1_name: this.currentUser.username,
                player2_id: null,
                player2_name: null,
                status: 'waiting',
                score1: 0,
                score2: 0,
                current_round: 1,
                attacker: this.currentUser.telegram_id
            });
            this.isAttacker = true;
        }
        
        await this.updateGameDisplay();
    }

    async startGameLoop() {
        // Poll for game updates every 2 seconds
        setInterval(async () => {
            await this.checkGameStatus();
        }, 2000);
    }

    async checkGameStatus() {
        try {
            const game = await api.getGame(this.gameId);
            if (game) {
                this.currentGame = game;
                await this.updateGameDisplay();
                
                // Check if game is finished
                if (game.status === 'finished') {
                    this.endGame();
                }
            }
        } catch (error) {
            console.error('Failed to check game status:', error);
        }
    }

    async updateGameDisplay() {
        if (!this.currentGame) return;

        // Update score
        document.getElementById('player1Name').textContent = this.currentGame.player1_name || 'Игрок 1';
        document.getElementById('player2Name').textContent = this.currentGame.player2_name || 'Ожидание...';
        document.getElementById('player1Score').textContent = this.currentGame.score1 || 0;
        document.getElementById('player2Score').textContent = this.currentGame.score2 || 0;

        // Update round info
        document.getElementById('roundNumber').textContent = this.currentGame.current_round || 1;

        // Update role info
        const isMyTurn = (this.currentGame.attacker === this.currentUser.telegram_id && this.isAttacker) ||
                        (this.currentGame.attacker !== this.currentUser.telegram_id && !this.isAttacker);
        
        const roleText = this.isAttacker ? '🏒 Вы нападающий - выберите 1 зону для броска' : '🥅 Вы защитник - выберите 2 зоны для защиты';
        document.getElementById('roleInfo').textContent = roleText;

        // Show/hide appropriate sections
        if (this.currentGame.status === 'waiting') {
            this.showElement('waitingRoom');
            this.hideElement('gamePlay');
            this.hideElement('gameEnd');
        } else if (this.currentGame.status === 'playing') {
            this.hideElement('waitingRoom');
            this.showElement('gamePlay');
            this.hideElement('gameEnd');
        }
    }

    selectZone(zoneNumber) {
        const zone = document.getElementById(`zone${zoneNumber}`);
        const maxSelections = this.isAttacker ? 1 : 2;

        if (zone.classList.contains('selected')) {
            // Deselect
            zone.classList.remove('selected');
            this.selectedZones = this.selectedZones.filter(z => z !== zoneNumber);
        } else if (this.selectedZones.length < maxSelections) {
            // Select
            zone.classList.add('selected');
            this.selectedZones.push(zoneNumber);
        }

        // Enable/disable submit button
        const submitBtn = document.getElementById('submitMove');
        if (submitBtn) {
            submitBtn.disabled = this.selectedZones.length !== maxSelections;
        }
    }

    async submitMove() {
        if (!this.currentGame || this.selectedZones.length === 0) return;

        try {
            const moveData = {
                player_id: this.currentUser.telegram_id,
                zones: this.selectedZones,
                round: this.currentGame.current_round,
                is_attacker: this.isAttacker
            };

            // Update game with move
            await api.updateGame(this.gameId, {
                [`${this.isAttacker ? 'attacker' : 'defender'}_move`]: JSON.stringify(this.selectedZones),
                [`${this.isAttacker ? 'attacker' : 'defender'}_ready`]: true
            });

            // Clear selections
            this.selectedZones = [];
            document.querySelectorAll('.zone').forEach(zone => {
                zone.classList.remove('selected');
            });

            this.showMessage('Ход отправлен! Ожидание соперника...', 'info');
            this.waitingForOpponent = true;

            // Check if both players made moves
            await this.checkRoundComplete();

        } catch (error) {
            console.error('Failed to submit move:', error);
            this.showMessage('Ошибка отправки хода', 'error');
        }
    }

    async checkRoundComplete() {
        const game = await api.getGame(this.gameId);
        if (!game) return;

        if (game.attacker_ready && game.defender_ready) {
            // Both players made moves, resolve round
            await this.resolveRound(game);
        }
    }

    async resolveRound(game) {
        try {
            const attackerMove = JSON.parse(game.attacker_move || '[]');
            const defenderMove = JSON.parse(game.defender_move || '[]');

            // Check if goal was scored
            const goalScored = !defenderMove.includes(attackerMove[0]);
            
            let newScore1 = game.score1;
            let newScore2 = game.score2;

            if (goalScored) {
                // Goal scored by attacker
                if (game.attacker === game.player1_id) {
                    newScore1++;
                } else {
                    newScore2++;
                }
                this.showRoundResult('⚽ ГОЛ!', 'success');
            } else {
                // Goal saved by defender
                if (game.attacker === game.player1_id) {
                    newScore2++;
                } else {
                    newScore1++;
                }
                this.showRoundResult('🥅 СПАСЕНИЕ!', 'info');
            }

            // Check if game is finished
            const gameFinished = newScore1 >= 3 || newScore2 >= 3;
            const newRound = game.current_round + 1;
            const newAttacker = game.attacker === game.player1_id ? game.player2_id : game.player1_id;

            // Update game
            await api.updateGame(this.gameId, {
                score1: newScore1,
                score2: newScore2,
                current_round: newRound,
                attacker: newAttacker,
                status: gameFinished ? 'finished' : 'playing',
                attacker_ready: false,
                defender_ready: false,
                attacker_move: null,
                defender_move: null
            });

            // Switch roles
            this.isAttacker = !this.isAttacker;
            this.waitingForOpponent = false;

            if (gameFinished) {
                await this.updateUserStats(newScore1, newScore2);
            }

        } catch (error) {
            console.error('Failed to resolve round:', error);
        }
    }

    showRoundResult(message, type) {
        const resultDiv = document.createElement('div');
        resultDiv.className = `round-result ${type}`;
        resultDiv.textContent = message;
        resultDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${type === 'success' ? '#51cf66' : '#667eea'};
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-size: 1.5rem;
            font-weight: bold;
            z-index: 1000;
            animation: fadeInOut 2s ease;
        `;

        document.body.appendChild(resultDiv);
        setTimeout(() => {
            document.body.removeChild(resultDiv);
        }, 2000);
    }

    async updateUserStats(finalScore1, finalScore2) {
        try {
            const isPlayer1 = this.currentUser.telegram_id === this.currentGame.player1_id;
            const myScore = isPlayer1 ? finalScore1 : finalScore2;
            const opponentScore = isPlayer1 ? finalScore2 : finalScore1;
            const won = myScore > opponentScore;

            await api.updateUser(this.currentUser.Id, {
                total_games: this.currentUser.total_games + 1,
                wins: this.currentUser.wins + (won ? 1 : 0),
                losses: this.currentUser.losses + (won ? 0 : 1)
            });
        } catch (error) {
            console.error('Failed to update user stats:', error);
        }
    }

    endGame() {
        this.hideElement('gamePlay');
        this.showElement('gameEnd');

        const isPlayer1 = this.currentUser.telegram_id === this.currentGame.player1_id;
        const myScore = isPlayer1 ? this.currentGame.score1 : this.currentGame.score2;
        const opponentScore = isPlayer1 ? this.currentGame.score2 : this.currentGame.score1;
        const won = myScore > opponentScore;

        document.getElementById('finalResult').textContent = won ? '🎉 ПОБЕДА!' : '😔 ПОРАЖЕНИЕ';
        document.getElementById('finalPlayer1').textContent = this.currentGame.player1_name;
        document.getElementById('finalPlayer2').textContent = this.currentGame.player2_name;
        document.getElementById('finalScore1').textContent = this.currentGame.score1;
        document.getElementById('finalScore2').textContent = this.currentGame.score2;
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#ff4757' : type === 'success' ? '#2ed573' : '#667eea'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 1000;
            animation: slideDown 0.3s ease;
        `;

        document.body.appendChild(messageDiv);
        setTimeout(() => {
            if (document.body.contains(messageDiv)) {
                document.body.removeChild(messageDiv);
            }
        }, 3000);
    }

    showElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.classList.remove('hidden');
        }
    }

    hideElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('hidden');
        }
    }

    playAgain() {
        window.location.reload();
    }

    goHome() {
        window.location.href = 'index.html';
    }
}

// Global functions for HTML onclick events
function selectZone(zoneNumber) {
    if (window.hockeyGame) {
        window.hockeyGame.selectZone(zoneNumber);
    }
}

function submitMove() {
    if (window.hockeyGame) {
        window.hockeyGame.submitMove();
    }
}

function playAgain() {
    if (window.hockeyGame) {
        window.hockeyGame.playAgain();
    }
}

function goHome() {
    window.location.href = 'index.html';
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.hockeyGame = new HockeyGame();
});
