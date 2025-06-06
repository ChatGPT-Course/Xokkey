
// NocoDB API configuration
const API_CONFIG = {
    baseUrl: 'https://app.nocodb.com/api/v2/tables',
    token: 'bocQfycJpJsTG_tbwEf8ma8E5rhoig0njMDXFWtJ',
    usersTable: 'mx65bowvjsniy3y',
    gamesTable: 'mxqqwifh3hv5tdb'
};

class NocoDBAPI {
    constructor() {
        this.headers = {
            'Content-Type': 'application/json',
            'xc-token': API_CONFIG.token
        };
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        const url = `${API_CONFIG.baseUrl}/${endpoint}`;
        
        const options = {
            method,
            headers: this.headers
        };

        if (data && (method === 'POST' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Users API methods
    async getUser(telegramId) {
        try {
            const response = await this.makeRequest(
                `${API_CONFIG.usersTable}/records?where=(telegram_id,eq,${telegramId})`
            );
            return response.list?.[0] || null;
        } catch (error) {
            console.error('Failed to get user:', error);
            return null;
        }
    }

    async createUser(userData) {
        try {
            const response = await this.makeRequest(
                `${API_CONFIG.usersTable}/records`,
                'POST',
                userData
            );
            return response;
        } catch (error) {
            console.error('Failed to create user:', error);
            throw error;
        }
    }

    async updateUser(userId, updates) {
        try {
            const response = await this.makeRequest(
                `${API_CONFIG.usersTable}/records`,
                'PATCH',
                {
                    Id: userId,
                    ...updates
                }
            );
            return response;
        } catch (error) {
            console.error('Failed to update user:', error);
            throw error;
        }
    }

    async getOrCreateUser(telegramId, username) {
        let user = await this.getUser(telegramId);
        
        if (!user) {
            const userData = {
                telegram_id: telegramId,
                username: username || 'unknown',
                wins: 0,
                losses: 0,
                total_games: 0
            };
            
            try {
                const response = await this.createUser(userData);
                user = { Id: response.Id, ...userData };
            } catch (error) {
                console.error('Failed to create user:', error);
                // Return mock user for fallback
                user = {
                    Id: 'mock_' + telegramId,
                    telegram_id: telegramId,
                    username: username || 'unknown',
                    wins: 0,
                    losses: 0,
                    total_games: 0
                };
            }
        }
        
        return user;
    }

    // Games API methods
    async createGame(gameData) {
        try {
            const response = await this.makeRequest(
                `${API_CONFIG.gamesTable}/records`,
                'POST',
                gameData
            );
            return response;
        } catch (error) {
            console.error('Failed to create game:', error);
            throw error;
        }
    }

    async getGame(gameId) {
        try {
            const response = await this.makeRequest(
                `${API_CONFIG.gamesTable}/records?where=(game_id,eq,${gameId})`
            );
            return response.list?.[0] || null;
        } catch (error) {
            console.error('Failed to get game:', error);
            return null;
        }
    }

    async updateGame(gameId, updates) {
        try {
            const response = await this.makeRequest(
                `${API_CONFIG.gamesTable}/records`,
                'PATCH',
                {
                    game_id: gameId,
                    ...updates
                }
            );
            return response;
        } catch (error) {
            console.error('Failed to update game:', error);
            throw error;
        }
    }

    async findWaitingGame() {
        try {
            const response = await this.makeRequest(
                `${API_CONFIG.gamesTable}/records?where=(status,eq,waiting)&limit=1`
            );
            return response.list?.[0] || null;
        } catch (error) {
            console.error('Failed to find waiting game:', error);
            return null;
        }
    }

    async getRecentGames(telegramId, limit = 10) {
        try {
            const response = await this.makeRequest(
                `${API_CONFIG.gamesTable}/records?where=(player1_id,eq,${telegramId}),or,(player2_id,eq,${telegramId})&limit=${limit}&sort=-created_at`
            );
            return response.list || [];
        } catch (error) {
            console.error('Failed to get recent games:', error);
            return [];
        }
    }
}

// Initialize API
const api = new NocoDBAPI();
