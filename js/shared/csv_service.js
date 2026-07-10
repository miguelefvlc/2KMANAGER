import { CSV_URLS } from './constants.js';

export const CSVService = {
    _caches: {},
    _promises: {},

    async _fetchCSV(urlKey, urlPath, forceRefresh = false) {
        if (!forceRefresh && this._caches[urlKey]) {
            return this._caches[urlKey];
        }
        
        if (!forceRefresh && this._promises[urlKey]) {
            return this._promises[urlKey];
        }

        this._promises[urlKey] = new Promise((resolve, reject) => {
            if (typeof Papa === 'undefined') {
                reject(new Error("PapaParse no esta cargado."));
                return;
            }

            fetch(urlPath, { cache: "no-store" })
                .then(async res => {
                    const buffer = await res.arrayBuffer();
                    try {
                        return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
                    } catch (e) {
                        return new TextDecoder('windows-1252').decode(buffer);
                    }
                })
                .then(text => {
                    const delimiter = text.split('\n')[0].includes(';') ? ';' : ',';
                    const results = Papa.parse(text, {
                        header: true,
                        skipEmptyLines: true,
                        delimiter: delimiter
                    });
                    
                    this._caches[urlKey] = results.data;
                    this._promises[urlKey] = null;
                    resolve(results.data);
                })
                .catch(err => {
                    this._promises[urlKey] = null;
                    console.error("Error leyendo CSV " + urlKey + ":", err);
                    reject(err);
                });
        });

        return this._promises[urlKey];
    },

    async getPlayers(forceRefresh = false) {
        return this._fetchCSV('players', CSV_URLS.players, forceRefresh);
    },

    async getEconomy(forceRefresh = false) {
        return this._fetchCSV('economia', CSV_URLS.economia, forceRefresh);
    },

    async getDraftPicks(forceRefresh = false) {
        return this._fetchCSV('draft', CSV_URLS.draft, forceRefresh);
    },

    async getPlayersByTeam(teamName) {
        const [players, eco] = await Promise.all([
            this.getPlayers(),
            this.getEconomy()
        ]);

        let teamId = null;
        eco.forEach((row, idx) => {
            let name = row["Equipo"] || row["Team"] || "";
            name = name.replace(/['"]/g, '').trim();
            if (name.toLowerCase() === teamName.toLowerCase().trim()) {
                teamId = (idx + 1).toString();
            }
        });

        if (!teamId) return [];

        return players.filter(p => p.team_id === teamId);
    }
};
