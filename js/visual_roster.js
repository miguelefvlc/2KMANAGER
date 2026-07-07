function getPlayerPhotoPath(playerName) {
    if (!playerName) return '';
    let slug = playerName.toLowerCase();
    slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    slug = slug.replace(/['\.]/g, "");
    slug = slug.replace(/[^a-z0-9]+/g, "-");
    slug = slug.replace(/^-+|-+$/g, "");
    return `photos/${slug}.png`;
}

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetTeamName = urlParams.get('team');

    if (!targetTeamName) {
        document.getElementById('vr-team-name').textContent = "EQUIPO NO ENCONTRADO";
        document.getElementById('loader').style.display = 'none';
        document.getElementById('vr-content').style.display = 'flex';
        return;
    }

    // Set Back button
    const backBtn = document.getElementById('vr-back-btn');
    if (backBtn) {
        backBtn.href = `roster.html?team=${encodeURIComponent(targetTeamName)}`;
    }

    // Set Title and Logo
    document.getElementById('vr-team-name').textContent = targetTeamName.toUpperCase();
    
    let logoSrc = "";
    if (typeof TEAM_LOGOS !== 'undefined') {
        const teamKey = Object.keys(TEAM_LOGOS).find(k => k.toLowerCase() === targetTeamName.toLowerCase());
        if (teamKey) logoSrc = 'logos/' + TEAM_LOGOS[teamKey];
    }
    
    if (logoSrc) {
        document.getElementById('vr-team-logo').src = logoSrc;
        document.getElementById('vr-team-logo').style.display = 'block';
        
        const bgLayer = document.getElementById('vr-bg-layer');
        if (bgLayer) {
            bgLayer.style.backgroundImage = `url('${logoSrc}')`;
        }
    } else {
        document.getElementById('vr-team-logo').style.display = 'none';
        const bgLayer = document.getElementById('vr-bg-layer');
        if (bgLayer) bgLayer.style.backgroundImage = 'none';
    }

    try {
        const teamPlayers = await CSVService.getPlayersByTeam(targetTeamName);

        // Sort by Rating (descending)
        teamPlayers.sort((a, b) => {
            return (parseInt(b.Rating) || 0) - (parseInt(a.Rating) || 0);
        });

        // Render
        const grid = document.getElementById('vr-grid');
        grid.innerHTML = '';

        if (teamPlayers.length === 0) {
            grid.innerHTML = '<p style="color: #94a3b8; text-align: center; width: 100%; grid-column: 1 / -1; font-size: 1.2rem;">No hay jugadores asignados a este equipo.</p>';
        } else {
            teamPlayers.forEach(p => {
                const name = p.Player || "Desconocido";
                const rating = parseInt(p.Rating) || 0;
                const pos = p.Position || p.Pos || "-";
                
                // Calculate age
                let age = p.Age || "-";
                if (p.FechaNacimiento) {
                    const bday = new Date(p.FechaNacimiento);
                    if (!isNaN(bday)) {
                        const ageDate = new Date(Date.now() - bday.getTime());
                        age = Math.abs(ageDate.getUTCFullYear() - 1970);
                    }
                }

                // Get saved status
                const savedStatus = StorageService.getTradeStatus(name);
        
                const card = document.createElement('div');
                card.className = 'vr-card';
                card.style.cursor = 'pointer';
                if (savedStatus) {
                    card.setAttribute('data-trade', savedStatus);
                }

                const photoSrc = getPlayerPhotoPath(name);

                card.innerHTML = `
                    <div class="vr-photo-container">
                        <img src="${photoSrc}" alt="${name}" class="vr-photo" onerror="this.onerror=null; this.style.opacity='0.05';">
                    </div>
                    <div class="vr-rating">${rating}</div>
                    <div class="vr-info">
                        <h3 class="vr-name">${name}</h3>
                        <div class="vr-meta">
                            <span>${pos}</span>
                            <span>${age} AÃ‘OS</span>
                        </div>
                    </div>
                `;

                card.addEventListener('click', () => {
                    selectedPlayerCard = card;
                    selectedPlayerName = name;
                    document.getElementById('modal-player-name').textContent = name;
                    document.getElementById('trade-modal').style.display = 'flex';
                });

                grid.appendChild(card);
            });

            // Modal listeners
            const modal = document.getElementById('trade-modal');
            if (modal && !modal.dataset.initialized) {
                modal.dataset.initialized = "true"; // Prevent multiple bindings
                document.getElementById('modal-close').addEventListener('click', () => {
                    modal.style.display = 'none';
                });
                document.querySelectorAll('.modal-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const status = e.target.getAttribute('data-status');
                        if (selectedPlayerCard) {
                            StorageService.setTradeStatus(selectedPlayerName, status);
                            if (status === 'none') {
                                selectedPlayerCard.removeAttribute('data-trade');
                            } else {
                                selectedPlayerCard.setAttribute('data-trade', status);
                            }
                        }
                        modal.style.display = 'none';
                    });
                });
            }
        }

        document.getElementById('loader').style.display = 'none';
        document.getElementById('vr-content').style.display = 'flex';

    } catch (err) {
        console.error("Error loading visual roster:", err);
        document.getElementById('vr-team-name').textContent = "ERROR AL CARGAR";
        document.getElementById('loader').style.display = 'none';
        document.getElementById('vr-content').style.display = 'flex';
    }
});

