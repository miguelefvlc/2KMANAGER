import { CSVService } from './shared/csv_service.js';
import { TEAM_LOGOS } from './shared/constants.js';
import { calculateAge } from './shared/utils.js';

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const [parsedPlayers, parsedEco, parsedDraft] = await Promise.all([
            CSVService.getPlayers(),
            CSVService.getEconomy(),
            CSVService.getDraftPicks()
        ]);

        // Create mappings
        const teamMap = {}; // teamName -> {id, players:[], picks:0}
        
        parsedEco.forEach((row, idx) => {
            let name = row["Equipo"] || row["Team"] || "";
            name = name.replace(/['"]/g, '').trim();
            if(name) {
                teamMap[name.toLowerCase()] = {
                    id: (idx + 1).toString(),
                    name: name,
                    players: [],
                    picks: 0
                };
            }
        });

        // Map players
        parsedPlayers.forEach(p => {
            if(!p.team_id) return;
            // Find team by ID
            const team = Object.values(teamMap).find(t => t.id === p.team_id);
            if(team) {
                team.players.push(p);
            }
        });

        // Map picks
        parsedDraft.forEach(d => {
            const ownerId = d["ID Owner"];
            if(!ownerId) return;
            const team = Object.values(teamMap).find(t => t.id === ownerId);
            if(team) {
                team.picks++;
            }
        });

        // Update DOM
        const cards = document.querySelectorAll('.team-card');
        cards.forEach(card => {
            const nameEl = card.querySelector('.team-name');
            if(!nameEl) return;
            const tName = nameEl.textContent.trim().toLowerCase();
            
            const teamData = teamMap[tName];
            
            // Add background logo for CSS
            const teamKey = Object.keys(TEAM_LOGOS).find(k => k.toLowerCase() === tName);
            if(teamKey && TEAM_LOGOS[teamKey]) {
                card.style.setProperty('--bg-logo', `url('logos/${TEAM_LOGOS[teamKey]}')`);
            }

            if(teamData) {
                const count = teamData.players.length;
                let totalAge = 0;
                let ageCount = 0;
                let totalRating = 0;
                let ratingCount = 0;

                teamData.players.forEach(p => {
                    // Age
                    let age = calculateAge(p.FechaNacimiento);
                    if (age !== '-') {
                        totalAge += parseInt(age);
                        ageCount++;
                    } else if (!isNaN(parseInt(p.Age))) {
                        totalAge += parseInt(p.Age);
                        ageCount++;
                    }

                    // Rating
                    const r = parseInt(p.Rating);
                    if(!isNaN(r)) {
                        totalRating += r;
                        ratingCount++;
                    }
                });

                const avgAge = ageCount > 0 ? (totalAge / ageCount).toFixed(1) : "-";
                const avgRating = ratingCount > 0 ? Math.round(totalRating / ratingCount) : "-";

                const infoDiv = card.querySelector('.team-info');
                const statsDiv = document.createElement('div');
                statsDiv.className = 'team-stats';
                statsDiv.innerHTML = `
                    <div class="stat-row">
                        <span>ROSTER</span>
                        <span class="stat-val">${count}/15</span>
                    </div>
                    <div class="stat-row">
                        <span>AGE</span>
                        <span class="stat-val">${avgAge}</span>
                    </div>
                    <div class="stat-row">
                        <span>OVR</span>
                        <span class="stat-val">${avgRating}</span>
                    </div>
                `;
                infoDiv.appendChild(statsDiv);
            }
        });

    } catch(err) {
        console.error("Error loading equipos stats:", err);
    }
});

