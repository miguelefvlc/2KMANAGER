const StorageService = {
    PREFIX: '2kprims_',

    _getKey(key) {
        return this.PREFIX + key;
    },

    setItem(key, value) {
        try {
            localStorage.setItem(this._getKey(key), JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Error saving to localStorage', e);
            return false;
        }
    },

    getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this._getKey(key));
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Error reading from localStorage', e);
            return defaultValue;
        }
    },

    removeItem(key) {
        try {
            localStorage.removeItem(this._getKey(key));
            return true;
        } catch (e) {
            return false;
        }
    },

    // ==========================================
    // Domain Helpers
    // ==========================================

    getTradeStatus(playerName) {
        return this.getItem(`trade_status_${playerName}`, null);
    },

    setTradeStatus(playerName, status) {
        if (!status || status === 'none') {
            this.removeItem(`trade_status_${playerName}`);
        } else {
            this.setItem(`trade_status_${playerName}`, status);
        }
    }
};
