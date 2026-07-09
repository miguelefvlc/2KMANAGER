/**
 * engine.js — Motor Compartido (FA Office + Simulador Global)
 * ===========================================================
 * Contiene todas las funciones 100% idénticas entre app.js y simulador.js.
 * Depende de: js/shared/constants.js, js/reglas.js
 *
 * Las variables de estado (allTeams, livePlayers, activeTeam, etc.)
 * son declaradas en app.js o simulador.js. Este archivo solo define
 * funciones que operan sobre ellas — no tiene estado propio.
 */

// -----------------------------------------------------------------
// PARSEO DE CSV — FUNCIONES PURAS (sin efectos secundarios)
// -----------------------------------------------------------------

/**
 * Convierte una fila del CSV de economía en un objeto equipo normalizado.
 * La detección de columnas es flexible ante variaciones de nombre de cabecera.
 * @param {Object} t   - Fila cruda del CSV (Papa.parse header:true)
 * @param {number} idx - Índice de la fila (0-based)
 * @returns {Object}   - Objeto equipo
 */
function mapCsvToTeam(t, idx) {
    const keys = Object.keys(t);
    const nameCol        = keys.find(k => k.toLowerCase().includes('team') || k.toLowerCase().includes('equipo')) || keys[0];
    const lsCol          = keys.find(k => k.toLowerCase().includes('límite salarial') || k.toLowerCase().includes('limite salarial') || k.toLowerCase().includes('lmite')) || keys[1];
    const presCol        = keys.find(k => k.toLowerCase().includes('presupuesto') && !k.toLowerCase().includes('efectivo')) || keys[2];
    const mleCol         = keys.find(k => k.toLowerCase().includes('mle') || k.toLowerCase().includes('mid')) || keys[3];
    const capHoldCol     = keys.find(k => k.toLowerCase().includes('caphold') || k.toLowerCase().includes('cap hold') || k.toLowerCase().includes('retenido')) || keys[4];
    const lsEfectivoCol  = keys.find(k => k.toLowerCase().includes('efectivo ls') || k.toLowerCase().includes('limite - ch')) || keys[5];
    const budEfectivoCol = keys.find(k => k.toLowerCase().includes('efectivo presupuesto') || k.toLowerCase().includes('presupuesto - ch') || k.toLowerCase().includes('retrasadas')) || keys[6];

    return {
        id:             (idx + 1).toString(),
        name:           t[nameCol] || 'Desconocido',
        cap:            parseCurrency(t[lsCol]),
        efectivo:       parseCurrency(t[lsEfectivoCol]),
        budget:         parseCurrency(t[presCol]),
        budgetEfectivo: parseCurrency(t[budEfectivoCol]),
        capHoldTotal:   parseCurrency(t[capHoldCol]),
        mle:            parseCurrency(t[mleCol]),
        numPlayers:     0
    };
}

/**
 * Convierte una fila de jugador FA del CSV en objeto jugador normalizado,
 * aplicando toda la lógica de cálculo de rondas usando las constantes de constants.js.
 * @param {Object} p            - Fila cruda del CSV (Papa.parse header:true)
 * @param {number} idx          - Índice dentro del array filtrado de FAs (0-based)
 * @param {Array}  dbEquipos    - Array de equipos ya parseados (para lookup de nombre)
 * @param {Array}  rawPlayers   - Array completo de jugadores (para calcular posición en rango R3)
 * @param {number} startR3Idx  - Índice del primer jugador del rango forzado R3
 * @param {number} endR3Idx    - Índice del último jugador del rango forzado R3
 * @returns {Object}            - Objeto jugador con ronda calculada
 */
function mapCsvToPlayer(p, idx, dbEquipos, rawPlayers, startR3Idx, endR3Idx) {
    let minSal   = parseCurrency(p['Minimum'] || p['Minimum Sa'] || p['Minimum Salary'] || p.MinimumSalary || '0');
    let maxSal   = parseCurrency(p['Maximum'] || p['Maximum Sa'] || p['Maximum Salary'] || p.MaximumSalary || '0');
    const capHold = parseCurrency(p['caphold'] || p['Cap Hold'] || p.CapHold || '0');

    const isR    = (p.FA && p.FA.trim().toUpperCase() === 'R');
    const isBird = (parseInt(p.Bird) >= 3);

    const teamObj  = dbEquipos.find(t => t.id == p.team_id);
    const teamName = teamObj ? teamObj.name : 'FA';
    const rating   = parseInt(p.Rating) || 0;

    // --- ASIGNACIÓN DE RONDA INICIAL por Rating ---
    let isR3 = false;
    let calcRound = '5';
    if      (rating >= ROUND_THRESHOLDS.R1) calcRound = '1';
    else if (rating >= ROUND_THRESHOLDS.R2) calcRound = '2';
    else if (rating >= ROUND_THRESHOLDS.R3) { calcRound = '3'; isR3 = true; }
    else if (rating >= ROUND_THRESHOLDS.R4) calcRound = '4';

    // --- OVERRIDE por posición en rango especial del CSV ---
    const originalIdx = rawPlayers.indexOf(p);
    if (startR3Idx !== -1 && endR3Idx !== -1 && originalIdx >= startR3Idx && originalIdx <= endR3Idx) {
        if (!RANGE_R3_EXCEPTIONS.includes(p.Player)) {
            calcRound = '3';
            isR3 = true;
        }
    }

    // --- MODIFICADORES DE SALARIO Y RONDA (en cascada) ---
    if (isR3) {
        calcRound = '4';
        minSal *= 0.90;
        maxSal *= 0.90;
    }

    // Descuentos manuales por jugador específico
    const extraDiscount = PLAYER_EXTRA_DISCOUNTS.find(d => d.name === p.Player);
    if (extraDiscount) {
        minSal *= extraDiscount.multiplier;
        maxSal *= extraDiscount.multiplier;
    }

    // Jugadores fijados en R4 no bajan a R5
    if (calcRound === '4' && !FIXED_ROUND4_PLAYERS.includes(p.Player)) {
        calcRound = '5';
        minSal *= 0.90;
        maxSal *= 0.90;
    }

    // Degradado automático de ronda (salvo lista de exclusión)
    if (!DELAY_LIST.includes(p.Player)) {
        const r = parseInt(calcRound);
        if (r < 7) {
            if (r === 1 || r === 2) { minSal *= 0.85; maxSal *= 0.85; }
            else                    { minSal *= 0.90; maxSal *= 0.90; }
            calcRound = (r + 1).toString();
        }
    }

    // R6 sube directamente a R7
    if (calcRound === '6') {
        calcRound = '7';
        minSal *= 0.90;
        maxSal *= 0.90;
    }

    return {
        id:             idx + 1,
        name:           p.Player || 'Desconocido',
        team:           teamName,
        pos:            p.Position || p.Pos || '-',
        rating:         rating,
        edad:           typeof calculateAge === 'function' ? calculateAge(p.FechaNacimiento) : (parseInt(p.Age) || 0),
        bird:           p.Bird || '0',
        r:              p.FA  || '',
        min:            minSal,
        max:            maxSal,
        baseMin:        minSal,
        baseMax:        maxSal,
        capHold:        capHold,
        round:          calcRound,
        baseRound:      calcRound,
        roundChangedAt: 0,
        originTeam:     teamName,
        derechos:       isR || isBird,
        renounced:      false
    };
}

// -----------------------------------------------------------------
// SELECTOR DE FRANQUICIA — Modal de logos
// -----------------------------------------------------------------

window.openLogoModal = function() {
    document.getElementById('logo-modal').style.display = 'flex';
};

window.closeLogoModal = function() {
    document.getElementById('logo-modal').style.display = 'none';
};

/**
 * Rellena el grid del modal con los logos de todos los equipos.
 * Llamado una sola vez durante initApp().
 */
window.renderLogoGrid = function renderLogoGrid() {
    const grid = document.getElementById('logo-grid');
    if (!grid) return;
    grid.innerHTML = '';
    Object.keys(TEAM_LOGOS).sort().forEach(name => {
        const file = TEAM_LOGOS[name];
        const btn  = document.createElement('div');
        btn.className = 'team-logo-btn';
        btn.title     = name;
        btn.innerHTML = `<img src="logos/${file}" alt="${name}">`;
        btn.onclick   = () => selectTeamByLogo(name);
        grid.appendChild(btn);
    });
};

/**
 * Actualiza el logo del equipo activo en la barra superior.
 * @param {string} name - Nombre oficial del equipo
 */
window.updateActiveTeamUI = function updateActiveTeamUI(name) {
    const logoImg = document.getElementById('active-team-logo');
    if (logoImg && TEAM_LOGOS[name]) {
        logoImg.src = `logos/${TEAM_LOGOS[name]}`;
    }
};

/**
 * Selecciona un equipo como activo al hacer click en su logo.
 * Actualiza toda la UI de la página.
 * @param {string} name - Nombre oficial del equipo
 */
window.selectTeamByLogo = function(name) {
    const teamInLive = allTeams.find(t => t.name === name);
    if (!teamInLive) return;

    activeTeam = teamInLive;
    updateActiveTeamUI(name);
    closeLogoModal();

    activePlayerId = null;
    const tName = document.getElementById('player-target-name');
    if (tName) tName.innerText = 'Selecciona un objetivo...';
    const tBox  = document.getElementById('threats-box');
    if (tBox)  tBox.innerHTML = "<span class='text-muted text-small'>Radar inactivo.</span>";

    recalculateCapHolds();
    renderTopEconomy();
    renderStudyTable();

    if (typeof updateSimEconomySummary === 'function') updateSimEconomySummary();
    if (typeof renderSignedPlayersList === 'function') renderSignedPlayersList();

    const simPanel = document.getElementById('simulator-panel');
    if (simPanel) simPanel.style.display = 'none';
};

// -----------------------------------------------------------------
// BARRA DE EQUIPOS (top-teams-bar)
// -----------------------------------------------------------------

/**
 * Renderiza la barra horizontal de logos de equipos ordenados por
 * LS Efectivo descendente (roster lleno va al final, desactivado).
 */
window.renderTopTeamsBar = function() {
    const bar = document.getElementById('top-teams-bar');
    if (!bar) return;

    const sortedTeams = [...allTeams].sort((a, b) => {
        const aFull = a.numPlayers >= ROSTER_FULL;
        const bFull = b.numPlayers >= ROSTER_FULL;
        if (aFull !== bFull) return aFull ? 1 : -1;
        return b.efectivo - a.efectivo;
    });

    bar.innerHTML = '';
    sortedTeams.forEach(t => {
        const file = TEAM_LOGOS[t.name];
        if (!file) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'team-logo-wrapper';
        wrapper.title     = `${t.name}\nEfectivo: ${formatCurrency(t.efectivo)}\nJugadores: ${t.numPlayers}`;

        const img = document.createElement('img');
        img.src       = `logos/${file}`;
        img.alt       = t.name;
        img.className = 'team-logo-img';
        if (t.numPlayers >= ROSTER_FULL) img.classList.add('disabled');

        wrapper.onclick = function() {
            selectTeamByLogo(t.name);
            if (typeof window.openActiveTeamCHModal === 'function') {
                window.openActiveTeamCHModal();
            }
        };

        wrapper.appendChild(img);
        bar.appendChild(wrapper);
    });
};

// -----------------------------------------------------------------
// WIDGETS ECONÓMICOS (top bar)
// -----------------------------------------------------------------

/**
 * Actualiza los widgets numéricos de la barra superior con los datos
 * del equipo activo. Función idéntica en FA Office y Simulador Global.
 */
window.renderTopEconomy = function renderTopEconomy() {
    if (!activeTeam) return;

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerText   = formatCurrency(val);
        el.className   = `data-num ${getColorClass(val)}`;
    };

    set('top-mle',          activeTeam.mle);
    set('top-cap',          activeTeam.cap);
    set('top-budget',       activeTeam.budget);
    set('top-ch',           activeTeam.capHoldTotal);
    set('top-efectivo',     activeTeam.efectivo);
    set('top-bud-efectivo', activeTeam.budgetEfectivo);

    const nplayersEl = document.getElementById('top-nplayers');
    if (nplayersEl) {
        nplayersEl.innerText  = activeTeam.numPlayers;
        nplayersEl.className  = `data-num ${activeTeam.numPlayers >= ROSTER_FULL ? 'color-red' : 'color-green'}`;
    }
}

// -----------------------------------------------------------------
// BÚSQUEDA DE JUGADORES EN LA TABLA
// -----------------------------------------------------------------

/**
 * Inicializa el input de búsqueda de la tabla de FAs.
 * Al pulsar Enter localiza el jugador, lo selecciona y hace scroll.
 */
window.initPlayerSearch = function initPlayerSearch() {
    const searchInput = document.getElementById('player-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('keyup', function(e) {
        if (e.key !== 'Enter') return;
        const term = this.value.toLowerCase().trim();
        if (!term) return;

        let found = false;
        document.querySelectorAll('#study-tbody tr').forEach(row => {
            const nameCell = row.querySelector('strong');
            if (nameCell && nameCell.textContent.toLowerCase().includes(term) && !found) {
                found = true;
                const id = row.getAttribute('data-id');
                if (id) {
                    selectStudyPlayer(parseInt(id));
                    // Buscar la fila recién regenerada (renderStudyTable la destruye y recrea)
                    setTimeout(() => {
                        const newRow = document.querySelector(`tr[data-id="${id}"]`);
                        if (newRow) {
                            newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            newRow.classList.add('glow-row');
                        }
                    }, 50);
                }
            }
        });
    });
}

// -----------------------------------------------------------------
// FAVORITOS (estrella)
// -----------------------------------------------------------------

/**
 * Alterna el estado de favorito de un jugador en localStorage
 * y actualiza el icono SVG al instante sin re-renderizar la tabla.
 * @param {Event}  event    - Click event (se para la propagación)
 * @param {number} playerId - ID del jugador
 */
window.toggleStar = function(event, playerId) {
    event.stopPropagation();

    let starred = JSON.parse(localStorage.getItem('starred_players') || '[]');
    const idx   = starred.indexOf(playerId);

    if (idx > -1) { starred.splice(idx, 1); }
    else          { starred.push(playerId); }

    localStorage.setItem('starred_players', JSON.stringify(starred));

    const isStarred = (idx === -1); // Si no estaba → ahora sí lo está
    const svg       = event.currentTarget;
    svg.setAttribute('fill', isStarred ? 'var(--accent-yellow)' : 'var(--text-muted)');
    svg.querySelector('path').setAttribute('d', isStarred ? STAR_PATH_FILLED : STAR_PATH_EMPTY);
};
