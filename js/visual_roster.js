import { CSVService } from './shared/csv_service.js';
import { StorageService } from './shared/storage_service.js';
import { TEAM_LOGOS, TEAM_COLORS } from './shared/constants.js';
import { getPlayerPhotoPath } from './shared/utils.js';

let selectedPlayerCard = null;
let selectedPlayerName = "";

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
    let teamKey = null;
    if (typeof TEAM_LOGOS !== 'undefined') {
        teamKey = Object.keys(TEAM_LOGOS).find(k => k.toLowerCase() === targetTeamName.toLowerCase());
        if (teamKey) logoSrc = 'logos/' + TEAM_LOGOS[teamKey];
    }
    
    if (teamKey && typeof TEAM_COLORS !== 'undefined' && TEAM_COLORS[teamKey]) {
        document.documentElement.style.setProperty('--team-color', TEAM_COLORS[teamKey]);
    } else {
        document.documentElement.style.setProperty('--team-color', 'rgba(30,41,59,0.85)');
    }
    
    if (logoSrc) {
        document.documentElement.style.setProperty('--team-logo', `url('../${logoSrc}')`);
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

        // Load saved order
        const savedOrder = StorageService.getItem(`roster_order_${targetTeamName}`, []);

        // Sort by saved order first, then by Rating (descending)
        teamPlayers.sort((a, b) => {
            const nameA = a.Player || "";
            const nameB = b.Player || "";
            const indexA = savedOrder.indexOf(nameA);
            const indexB = savedOrder.indexOf(nameB);

            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            } else if (indexA !== -1) {
                return -1;
            } else if (indexB !== -1) {
                return 1;
            }
            
            return (parseInt(b.Rating) || 0) - (parseInt(a.Rating) || 0);
        });

        // Render
        const grid = document.getElementById('vr-grid');
        grid.innerHTML = '';
        
        let dragSrcEl = null;

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
                card.draggable = true;
                card.dataset.playerName = name;
                if (savedStatus) {
                    card.setAttribute('data-trade', savedStatus);
                }

                // SortableJS se encarga ahora del Drag & Drop fluido

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
                            <span>${age} AÑOS</span>
                        </div>
                    </div>
                `;

                card.addEventListener('click', (e) => {
                    // Evitar que el drag dispare el modal de traspaso
                    if (e.target.closest('.vr-card') && !card.classList.contains('dragging')) {
                        selectedPlayerCard = card;
                        selectedPlayerName = name;
                        document.getElementById('modal-player-name').textContent = name;
                        document.getElementById('trade-modal').style.display = 'flex';
                    }
                });

                grid.appendChild(card);
            });

            // Iniciar SortableJS para animaciones fluidas
            if (typeof Sortable !== 'undefined') {
                new Sortable(grid, {
                    animation: 250,
                    easing: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                    ghostClass: "dragging",
                    onEnd: function (evt) {
                        const newOrder = Array.from(grid.children).map(c => c.dataset.playerName);
                        StorageService.setItem(`roster_order_${targetTeamName}`, newOrder);
                    }
                });
            }

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

