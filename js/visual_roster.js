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
        if (teamKey) logoSrc = 'assets/logos/' + TEAM_LOGOS[teamKey];
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

                const photoSrc = getPlayerPhotoPath(name);
                const nameParts = name.split(' ');
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(' ') || '';

                // Dynamic font scaling for long names
                let firstNameStyle = '';
                if (firstName.length > 10) {
                    const scaleF = Math.max(0.7, 1 - ((firstName.length - 10) * 0.035));
                    firstNameStyle = `style="font-size: calc(0.55rem * ${scaleF});"`;
                }

                let lastNameStyle = '';
                if (lastName.length > 10) {
                    const scaleL = Math.max(0.65, 1 - ((lastName.length - 10) * 0.035));
                    lastNameStyle = `style="font-size: calc(0.75rem * ${scaleL}); line-height: 1.1;"`;
                }

                card.innerHTML = `
                    <div class="vr-card-top">
                        <div class="vr-photo-bg"></div>
                        <div class="vr-rating">${rating}</div>
                        <div class="vr-photo-container">
                            <img src="${photoSrc}" alt="${name}" class="vr-photo" onerror="this.onerror=null; this.src='assets/photos/none.svg';">
                        </div>
                    </div>
                    <div class="vr-info">
                        <div class="vr-name">
                            <span class="vr-first-name" ${firstNameStyle}>${firstName}</span>
                            <span class="vr-last-name" ${lastNameStyle}>${lastName}</span>
                        </div>
                        <div class="vr-divider"></div>
                        <div class="vr-meta">
                            <span class="vr-position-text">${pos.replace(/,/g, ' | ')}</span>
                            <span class="vr-dot">•</span>
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

            // Add empty placeholder slots to fill the grid to a multiple of 5
            // so the last row always has 5 cells (empty ones are invisible spacers)
            const COLS = 5;
            const remainder = teamPlayers.length % COLS;
            if (remainder !== 0) {
                const empties = COLS - remainder;
                for (let i = 0; i < empties; i++) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'vr-card-placeholder';
                    grid.appendChild(placeholder);
                }
            }

            // Iniciar SortableJS para animaciones fluidas
            if (typeof Sortable !== 'undefined') {
                new Sortable(grid, {
                    animation: 250,
                    easing: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                    ghostClass: "dragging",
                    filter: ".vr-card-placeholder",
                    onEnd: function (evt) {
                        const newOrder = Array.from(grid.children)
                            .filter(c => c.dataset.playerName)
                            .map(c => c.dataset.playerName);
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

