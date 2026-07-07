/**
 * app.js — Lógica principal de FA Office
 * =======================================
 * Depende de: js/shared/constants.js, js/reglas.js, js/ui.js
 * TEAM_LOGOS y CSV_URLS vienen de shared/constants.js
 */

// === ESTADO GLOBAL ===

let dbEquipos_Base = [];
let dbJugadores_Base = [];

let allTeams    = [];
let livePlayers = [];
let activeTeam  = null;
let activePlayerId = null;

let isGlobalSimOpen       = false;
let globalSimActivePlayerId  = null;
let globalSimActiveTeamName  = null;

// Paths SVG para el icono de estrella (favorito)
const STAR_PATH_FILLED = "M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.692c.197-.39.73-.39.927 0l2.184 4.427 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z";
const STAR_PATH_EMPTY  = "M2.866 14.85c-.078.444.368.791.746.593l4.39-2.256 4.389 2.256c.377.197.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z";

// === ARRANQUE ===

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// === INICIALIZACIÓN ===

function initApp() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';

    // Carga de archivos CSV locales (rutas definidas en shared/constants.js)
    Promise.all([
        window.fetchCSV(CSV_URLS.players),
        window.fetchCSV(CSV_URLS.economia)
    ]).then(([csvPlayers, csvEconomy]) => {
        
        const delimiterPlayers = csvPlayers.split('\n')[0].includes(';') ? ';' : ',';
        const delimiterEconomy = csvEconomy.split('\n')[0].includes(';') ? ';' : ',';

        const rawPlayers = Papa.parse(csvPlayers, { header: true, skipEmptyLines: true, delimiter: delimiterPlayers }).data;
        const rawTeams = Papa.parse(csvEconomy, { header: true, skipEmptyLines: true, delimiter: delimiterEconomy }).data;
        
        function mapCsvToTeam(t, idx) {
            const keys = Object.keys(t);
            const nameCol = keys.find(k => k.toLowerCase().includes("team") || k.toLowerCase().includes("equipo")) || keys[0];
            const lsCol = keys.find(k => k.toLowerCase().includes("límite salarial") || k.toLowerCase().includes("limite salarial") || k.toLowerCase().includes("lmite")) || keys[1]; 
            const presCol = keys.find(k => k.toLowerCase().includes("presupuesto") && !k.toLowerCase().includes("efectivo")) || keys[2];
            const mleCol = keys.find(k => k.toLowerCase().includes("mle") || k.toLowerCase().includes("mid")) || keys[3];
            const capHoldCol = keys.find(k => k.toLowerCase().includes("caphold") || k.toLowerCase().includes("cap hold") || k.toLowerCase().includes("retenido")) || keys[4];
            const lsEfectivoCol = keys.find(k => k.toLowerCase().includes("efectivo ls") || k.toLowerCase().includes("limite - ch")) || keys[5];
            const budEfectivoCol = keys.find(k => k.toLowerCase().includes("efectivo presupuesto") || k.toLowerCase().includes("presupuesto - ch") || k.toLowerCase().includes("retrasadas")) || keys[6];

            return {
                id: (idx + 1).toString(),
                name: t[nameCol] || "Desconocido",
                cap: parseCurrency(t[lsCol]),
                efectivo: parseCurrency(t[lsEfectivoCol]),
                budget: parseCurrency(t[presCol]),
                budgetEfectivo: parseCurrency(t[budEfectivoCol]),
                capHoldTotal: parseCurrency(t[capHoldCol]),
                mle: parseCurrency(t[mleCol]),
                numPlayers: 0
            };
        }

        // Mapear TODOS los equipos
        dbEquipos_Base = rawTeams
            .map(mapCsvToTeam)
            .filter(t => t.name !== "Desconocido");

        // Calcular numero de jugadores por equipo
        let rostersCount = {};
        rawPlayers.forEach(p => {
            const t1 = parseFloat(p.t1) || 0;
            if (t1 > 0 && p.team_id !== "31") {
                rostersCount[p.team_id] = (rostersCount[p.team_id] || 0) + 1;
            }
        });

        dbEquipos_Base.forEach(t => {
            t.numPlayers = rostersCount[t.id] || 0;
        });

        let startR3Idx = rawPlayers.findIndex(x => x.Player === "C.J. McCollum");
        let endR3Idx = rawPlayers.findIndex(x => x.Player === "Tari Eason");

        // Mapear Jugadores (Solo FA)
        dbJugadores_Base = rawPlayers.filter(p => {
            const t1Val = parseFloat(p.t1) || 0;
            return t1Val === 0 || p.team_id === "31";
        }).map((p, idx) => {
            let minSal = parseCurrency(p['Minimum'] || p['Minimum Sa'] || p['Minimum Salary'] || p.MinimumSalary || "0");
            let maxSal = parseCurrency(p['Maximum'] || p['Maximum Sa'] || p['Maximum Salary'] || p.MaximumSalary || "0");
            const capHold = parseCurrency(p['caphold'] || p['Cap Hold'] || p.CapHold || "0");
            const isR = (p.FA && p.FA.trim().toUpperCase() === 'R');
            const isBird = (parseInt(p.Bird) >= 3);
            const teamObj = dbEquipos_Base.find(t => t.id == p.team_id);
            const teamName = teamObj ? teamObj.name : "FA";

            const rating = parseInt(p.Rating) || 0;
            let isR3 = false;
            let calcRound = "5";
            if (rating >= 85) calcRound = "1";
            else if (rating >= 82) calcRound = "2";
            else if (rating >= 80) { calcRound = "3"; isR3 = true; }
            else if (rating >= 75) calcRound = "4";

            let originalIdx = rawPlayers.indexOf(p);
            if (startR3Idx !== -1 && endR3Idx !== -1 && originalIdx >= startR3Idx && originalIdx <= endR3Idx) {
                if (p.Player !== "Shaedon Sharpe" && p.Player !== "Walker Kessler") {
                    calcRound = "3";
                    isR3 = true;
                }
            }

            if (isR3) {
                calcRound = "4";
                minSal = minSal * 0.90;
                maxSal = maxSal * 0.90;
            }

            if (p.Player === "C.J. McCollum" || p.Player === "Ty Jerome") {
                minSal = minSal * 0.85;
                maxSal = maxSal * 0.85;
            }

            return {
                id: idx + 1,
                name: p.Player || "Desconocido",
                team: teamName,
                pos: p.Position || p.Pos || "-",
                rating: rating,
                edad: typeof calculateAge === 'function' ? calculateAge(p.FechaNacimiento) : (parseInt(p.Age) || 0),
                bird: p.Bird || "0",
                r: p.FA || "",
                min: minSal,
                max: maxSal,
                baseMin: minSal,
                baseMax: maxSal,
                capHold: capHold,
                round: calcRound,
                baseRound: calcRound,
                roundChangedAt: 0,
                originTeam: teamName,
                derechos: isR || isBird,
                renounced: false
            };
        }).filter(p => p.name !== "Desconocido");

        let orlando = dbEquipos_Base.find(t => t.name === "Orlando Magic");
        activeTeam = structuredClone(orlando || dbEquipos_Base[0]);

        // Inicializar Selector de Logos
        renderLogoGrid();
        updateActiveTeamUI(activeTeam.name);

        if (loader) loader.style.display = 'none';
        resetSimulation();
        initPlayerSearch();

    }).catch(err => {
        alert("Error al leer los archivos CSV locales.\n\nComprueba que 'players.csv' y 'economia.csv' están en esta carpeta.\nRecuerda que debes abrir index.html o fa.html usando 'Live Server' de VS Code por seguridad del navegador.");
        if (loader) loader.style.display = 'none';
    });
}

// === MOTOR FINANCIERO ===

window.recalculateCapHolds = function() {
    // 1. Resetear todos los equipos en allTeams a sus valores base
    allTeams.forEach(t => {
        let baseTeam = dbEquipos_Base.find(bt => bt.name === t.name);
        if (baseTeam) {
            t.capHoldSum = 0;
            t.capHoldTotal = 0;
            t.numPlayers = baseTeam.numPlayers;
            t.mle = baseTeam.mle;
            t.budgetEfectivo = baseTeam.budgetEfectivo;
            t.cap = baseTeam.cap;
            t.budget = baseTeam.budget;
        }
    });

    // 2. Sumar Cap Holds activos para cada equipo
    livePlayers.forEach(p => {
        if (p.derechos && !p.renounced) {
            // Si el jugador está firmado simulado y NO pospuesto (firma normal), su Cap Hold se libera.
            // Si está pospuesto (isDelayed === true), el Cap Hold sigue restando.
            let countsAsCapHold = true;
            if (p.simulatedSigned && p.simTx && p.simTx.team === (activeTeam ? activeTeam.name : null) && !p.simTx.isDelayed) {
                countsAsCapHold = false;
            }
            if (countsAsCapHold) {
                let team = allTeams.find(t => t.name === p.originTeam);
                if (team) {
                    team.capHoldSum += p.capHold;
                }
            }
        }
    });

    // 3. Establecer efectivo inicial (Límite - Cap Holds) y total de cap holds
    allTeams.forEach(t => {
        t.efectivo = t.cap - t.capHoldSum;
        t.capHoldTotal = t.capHoldSum;
    });

    // 4. Aplicar los efectos de las firmas simuladas activas (solo del activeTeam para FA Office)
    if (activeTeam) {
        let currentActive = allTeams.find(t => t.name === activeTeam.name);
        if (currentActive) {
            currentActive.simSignedCount = 0;
            livePlayers.forEach(p => {
                if (p.simulatedSigned && p.simTx && p.simTx.team === activeTeam.name) {
                    const tx = p.simTx;
                    if (!tx.isPreloaded) {
                        currentActive.simSignedCount++;
                    }
                    
                    if (tx.isDelayed) {
                        if (!tx.isPreloaded) {
                            currentActive.budgetEfectivo -= (p.capHold || 0);
                        }
                    } else {
                        currentActive.budgetEfectivo -= tx.salary;
                    }
                    
                    if (!tx.isDelayed) {
                        if (tx.exception === 'cap' || tx.exception === 'bird') {
                            currentActive.efectivo -= tx.salary;
                            if (tx.exception === 'cap') {
                                currentActive.cap -= tx.salary;
                            }
                        } else if (tx.exception === 'mle') {
                            currentActive.mle -= tx.salary;
                        }
                    }
                }
            });
        }
    }

    // 5. Aplicar la devolución del "freespot" y actualizar roster para todos los equipos
    allTeams.forEach(t => {
        let baseTeam = dbEquipos_Base.find(bt => bt.name === t.name);
        if (baseTeam) {
            let signedCount = t.simSignedCount || 0;
            let totalRoster = baseTeam.numPlayers + signedCount;
            t.numPlayers = totalRoster;
            
            let baseEmptySpots = Math.max(0, 14 - baseTeam.numPlayers);
            let currentEmptySpots = Math.max(0, 14 - totalRoster);
            let filledSpots = baseEmptySpots - currentEmptySpots;
            let totalFreespotBonus = filledSpots * 1800000;
            
            t.efectivo += totalFreespotBonus;
            t.budgetEfectivo += totalFreespotBonus;
            t.cap += totalFreespotBonus;
            t.budget += totalFreespotBonus;
        }
    });

    // 6. Sincronizar el objeto activeTeam global
    if (activeTeam) {
        let currentActive = allTeams.find(t => t.name === activeTeam.name);
        if (currentActive) {
            activeTeam.cap = currentActive.cap;
            activeTeam.efectivo = currentActive.efectivo;
            activeTeam.budget = currentActive.budget;
            activeTeam.budgetEfectivo = currentActive.budgetEfectivo;
            activeTeam.capHoldTotal = currentActive.capHoldTotal;
            activeTeam.mle = currentActive.mle;
            activeTeam.numPlayers = currentActive.numPlayers;
        }
    }

    // 7. Actualizar la barra visual
    if (typeof window.renderTopTeamsBar === "function") {
        window.renderTopTeamsBar();
    }
}

// === SELECTOR DE FRANQUICIA ===

window.openLogoModal = function() {
    document.getElementById('logo-modal').style.display = 'flex';
}

window.closeLogoModal = function() {
    document.getElementById('logo-modal').style.display = 'none';
}

function renderLogoGrid() {
    const grid = document.getElementById('logo-grid');
    grid.innerHTML = '';
    
    // Sort names alphabetically
    const teamNames = Object.keys(TEAM_LOGOS).sort();
    
    teamNames.forEach(name => {
        const file = TEAM_LOGOS[name];
        let btn = document.createElement('div');
        btn.className = 'team-logo-btn';
        btn.title = name;
        btn.innerHTML = `<img src="logos/${file}" alt="${name}">`;
        btn.onclick = function() {
            selectTeamByLogo(name);
        };
        grid.appendChild(btn);
    });
}

window.renderTopTeamsBar = function() {
    const bar = document.getElementById('top-teams-bar');
    if (!bar) return;
    
    let sortedTeams = [...allTeams].sort((a, b) => {
        let aFull = a.numPlayers >= 15;
        let bFull = b.numPlayers >= 15;
        if (aFull !== bFull) {
            return aFull ? 1 : -1;
        }
        return b.efectivo - a.efectivo;
    });
    
    bar.innerHTML = '';
    sortedTeams.forEach(t => {
        const file = TEAM_LOGOS[t.name];
        if (!file) return;
        
        let wrapper = document.createElement('div');
        wrapper.className = 'team-logo-wrapper';
        wrapper.title = `${t.name}\nEfectivo: ${formatCurrency(t.efectivo)}\nJugadores: ${t.numPlayers}`;
        
        let img = document.createElement('img');
        img.src = `logos/${file}`;
        img.alt = t.name;
        img.className = 'team-logo-img';
        
        if (t.numPlayers >= 15) {
            img.classList.add('disabled');
        }
        
        wrapper.onclick = function() {
            // Select this team as active team
            selectTeamByLogo(t.name);
            // Open rights modal
            if (typeof window.openActiveTeamCHModal === "function") {
                window.openActiveTeamCHModal();
            }
        };
        
        wrapper.appendChild(img);
        bar.appendChild(wrapper);
    });
}

function updateActiveTeamUI(name) {
    const logoImg = document.getElementById('active-team-logo');
    if (TEAM_LOGOS[name]) {
        logoImg.src = `logos/${TEAM_LOGOS[name]}`;
    }
}

window.selectTeamByLogo = function(name) {
    let teamInLive = allTeams.find(t => t.name === name);
    if (!teamInLive) return;
    activeTeam = teamInLive;
    updateActiveTeamUI(name);
    closeLogoModal();
    
    activePlayerId = null;
    document.getElementById('player-target-name').innerText = "Selecciona un objetivo...";
    document.getElementById('threats-box').innerHTML = "<span class='text-muted text-small'>Radar inactivo.</span>";
    
    recalculateCapHolds();
    renderTopEconomy();
    renderStudyTable();
    if (typeof updateSimEconomySummary === "function") {
        updateSimEconomySummary();
    }
    if (typeof renderSignedPlayersList === "function") {
        renderSignedPlayersList();
    }
    const simPanel = document.getElementById('simulator-panel');
    if (simPanel) simPanel.style.display = 'none';
}

window.resetSimulation = function() {
    if(!activeTeam) return;
    let currentTeamName = activeTeam.name;
    
    allTeams = structuredClone(dbEquipos_Base);
    livePlayers = structuredClone(dbJugadores_Base);
    
    // FIRMAS RETRASADAS FIJAS (ya contempladas en el CSV de economía)
    const fixedDelayed = [
        { name: "Paolo Banchero", team: "New York Knicks" },
        { name: "Chet Holmgren", team: "Detroit Pistons" },
        { name: "Jarrett Allen", team: "Los Angeles Lakers" },
        { name: "Michael Porter Jr.", team: "Atlanta Hawks" },
        { name: "Jalen Duren", team: "Atlanta Hawks" },
        { name: "DeMar DeRozan", team: "Detroit Pistons" },
        { name: "Shaedon Sharpe", team: "New York Knicks" },
        { name: "Walker Kessler", team: "Orlando Magic" },
        { name: "Mark Williams", team: "Memphis Grizzlies" }
    ];
    fixedDelayed.forEach(fd => {
        let p = livePlayers.find(pl => pl.name === fd.name && pl.originTeam === fd.team);
        if (p) {
            p.simulatedSigned = true;
            p.simTx = { salary: p.capHold, exception: 'bird', isDelayed: true, isPreloaded: true, team: fd.team };
        }
    });
    
    activeTeam = allTeams.find(t => t.name === currentTeamName);
    
    activePlayerId = null;
    document.getElementById('player-target-name').innerText = "Selecciona un objetivo...";
    document.getElementById('threats-box').innerHTML = "<span class='text-muted text-small'>Radar inactivo.</span>";
    
    const list = document.getElementById('signed-players-list');
    if (list) list.innerHTML = '';
    const simPanel = document.getElementById('simulator-panel');
    if (simPanel) simPanel.style.display = 'none';

    recalculateCapHolds();
    renderTopEconomy();
    renderStudyTable();
    if (typeof updateSimEconomySummary === "function") updateSimEconomySummary();
}

function renderTopEconomy() {
    if(!activeTeam) return;

    document.getElementById('top-mle').innerText = formatCurrency(activeTeam.mle);
    document.getElementById('top-mle').className = `data-num ${getColorClass(activeTeam.mle)}`;

    document.getElementById('top-cap').innerText = formatCurrency(activeTeam.cap);
    document.getElementById('top-cap').className = `data-num ${getColorClass(activeTeam.cap)}`;

    document.getElementById('top-budget').innerText = formatCurrency(activeTeam.budget);
    document.getElementById('top-budget').className = `data-num ${getColorClass(activeTeam.budget)}`;

    document.getElementById('top-ch').innerText = formatCurrency(activeTeam.capHoldTotal);
    document.getElementById('top-ch').className = `data-num ${getColorClass(activeTeam.capHoldTotal)}`;

    document.getElementById('top-efectivo').innerText = formatCurrency(activeTeam.efectivo);
    document.getElementById('top-efectivo').className = `data-num ${getColorClass(activeTeam.efectivo)}`;

    document.getElementById('top-bud-efectivo').innerText = formatCurrency(activeTeam.budgetEfectivo);
    document.getElementById('top-bud-efectivo').className = `data-num ${getColorClass(activeTeam.budgetEfectivo)}`;

    let nplayersEl = document.getElementById('top-nplayers');
    if (nplayersEl) {
        nplayersEl.innerText = activeTeam.numPlayers;
        nplayersEl.className = `data-num ${activeTeam.numPlayers >= 15 ? 'color-red' : 'color-green'}`;
    }
}

// === TABLA DE AGENTES LIBRES ===

function renderStudyTable() {
    const tbody = document.getElementById('study-tbody');
    tbody.innerHTML = '';
    
    let starred = JSON.parse(localStorage.getItem('starred_players') || '[]');
    
    livePlayers.forEach(p => {
        let tr = document.createElement('tr');
        tr.className = 'row-interactive';
        tr.setAttribute('data-id', p.id);
        if(p.id === activePlayerId) tr.classList.add('selected');

        let rowBorderColor = 'transparent';
        // CALCULAR ESTADO DE PUJA PARA ESTE JUGADOR
        if (activeTeam) {
            let isBoss = (p.derechos && p.originTeam === activeTeam.name && p.renounced !== true);
            let canBidImmediate = false;
            let canBidPotential = false;
            
            if (isBoss) {
                canBidImmediate = activeTeam.budgetEfectivo >= p.min;
                canBidPotential = activeTeam.budget >= p.min;
            } else {
                canBidImmediate = (activeTeam.efectivo >= p.min) || (activeTeam.mle >= p.min);
                let maxPotentialCap = activeTeam.efectivo + activeTeam.capHoldTotal;
                canBidPotential = (maxPotentialCap >= p.min) || (activeTeam.mle >= p.min);
            }
            
            if (p.simulatedSigned && p.simTx && p.simTx.team === activeTeam.name) {
                rowBorderColor = 'var(--accent-green)';
                tr.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
                tr.style.opacity = '0.8';
            } else if (activeTeam.numPlayers >= 15 && !isBoss) {
                rowBorderColor = 'gray';
                tr.style.opacity = '0.3';
                tr.style.filter = 'grayscale(0.8)';
            } else if (canBidImmediate) {
                rowBorderColor = 'var(--accent-green)';
                tr.style.backgroundColor = 'rgba(34, 197, 94, 0.05)';
            } else if (canBidPotential) {
                rowBorderColor = 'var(--accent-yellow)';
                tr.style.backgroundColor = 'rgba(234, 179, 8, 0.05)';
                tr.style.opacity = '0.5'; // Atenuar a los que solo se puede aspirar renunciando
                tr.style.filter = 'grayscale(0.3)';
            } else {
                rowBorderColor = 'gray';
                tr.style.opacity = '0.2'; // Atenuar fuertemente a los imposibles
                tr.style.filter = 'grayscale(0.9)';
            }
        }

        tr.onclick = () => { selectStudyPlayer(p.id); };
        
        let birdStyle = parseInt(p.bird) >= 3 ? `style="color: var(--accent-green); font-weight: bold;"` : ``;
        let rStyle = (p.r && p.r.trim().toUpperCase() === 'R') ? `style="color: var(--accent-yellow); font-weight: bold;"` : ``;
        let capHoldDisplay = p.renounced 
            ? `<span style="text-decoration: line-through; color: var(--accent-red); opacity: 0.7;">${formatCurrency(p.capHold)}</span>` 
            : formatCurrency(p.capHold);

        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=1f2937&color=f3f4f6&rounded=true&size=32`;

        let isStarred = starred.includes(p.id);
        let pathFilled = "M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.692c.197-.39.73-.39.927 0l2.184 4.427 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z";
        let pathEmpty = "M2.866 14.85c-.078.444.368.791.746.593l4.39-2.256 4.389 2.256c.377.197.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z";
        
        let starColor = isStarred ? "var(--accent-yellow)" : "var(--text-muted)";
        let starPath = isStarred ? pathFilled : pathEmpty;

        tr.innerHTML = `
            <!-- Columna de estrellas eliminada -->
            <td style="border-left: 4px solid ${rowBorderColor};">
                <div style="display: flex; align-items: center;">
                    <img src="${getPlayerPhotoPath(p.name)}" onerror="this.onerror=null; this.src='${fallbackUrl}';" alt="${p.name}" style="width: 28px; height: 28px; border-radius: 50%; margin-right: 10px; object-fit: cover; background: var(--bg-surface);">
                    <strong>${p.name}</strong>
                </div>
            </td>
            <td>${p.team}</td>
            <td>${p.pos}</td>
            <td class="data-num">${p.rating}</td>
            <td class="data-num">${p.edad}</td>
            <td class="data-num" ${birdStyle}>${p.bird}</td>
            <td ${rStyle}>${p.r}</td>
            <td class="data-num">${formatCurrency(p.min)}</td>
            <td class="data-num">${formatCurrency(p.max)}</td>
            <td class="data-num">${capHoldDisplay}</td>
            <td>${p.round !== "0" ? `<span class="round-badge round-${p.round}">R${p.round}</span>` : ""}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.selectStudyPlayer = function(id) {
    activePlayerId = id;
    renderStudyTable(); 
    
    const p = livePlayers.find(pl => pl.id == id);
    if (!p) return;
    
    const targetName = document.getElementById('player-target-name');
    if (targetName) {
        targetName.innerHTML = `${p.name} <span class="data-num text-muted text-xsmall">Min: ${formatCurrency(p.min)} | Máx: ${formatCurrency(p.max)}</span>`;
    }
    
    // UI Updates
    const box = document.getElementById('threats-box');
    if (box) {
        if (typeof scanThreatsLogic === "function") {
            box.innerHTML = scanThreatsLogic(p, allTeams, activeTeam ? activeTeam.name : null);
        } else {
            box.innerHTML = "<span class='text-muted text-small'>Simulación de amenazas no disponible.</span>";
        }
    }

    if (typeof updateSimulator === "function") {
        updateSimulator(p);
    }
}

function initPlayerSearch() {
    const searchInput = document.getElementById("player-search-input");
    if (searchInput) {
        searchInput.addEventListener("keyup", function(e) {
            if (e.key === "Enter") {
                const term = this.value.toLowerCase().trim();
                if (!term) return;
                
                const rows = document.querySelectorAll("#study-tbody tr");
                let found = false;
                
                rows.forEach(row => {
                    const nameCell = row.querySelector("strong");
                    if (nameCell && nameCell.textContent.toLowerCase().includes(term) && !found) {
                        found = true;
                        
                        const id = row.getAttribute('data-id');
                        if (id) {
                            // Al seleccionar se regenera toda la tabla, destruyendo la fila actual.
                            selectStudyPlayer(parseInt(id));
                            
                            // Buscar la NUEVA fila recién generada para aplicarle el brillo
                            setTimeout(() => {
                                const newRow = document.querySelector(`tr[data-id="${id}"]`);
                                if (newRow) {
                                    newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    newRow.classList.add("glow-row");
                                }
                            }, 50);
                        }
                    }
                });
            }
        });
    }
}

window.toggleStar = function(event, playerId) {
    event.stopPropagation(); // Prevent row selection
    
    let starred = JSON.parse(localStorage.getItem('starred_players') || '[]');
    let idx = starred.indexOf(playerId);
    
    if(idx > -1) {
        starred.splice(idx, 1);
    } else {
        starred.push(playerId);
    }
    
    localStorage.setItem('starred_players', JSON.stringify(starred));
    
    let svg = event.currentTarget;
    let isStarred = (idx === -1); // If it wasn't there before, it is starred now
    
    svg.setAttribute('fill', isStarred ? "var(--accent-yellow)" : "var(--text-muted)");
    
    let pathFilled = "M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.692c.197-.39.73-.39.927 0l2.184 4.427 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z";
    let pathEmpty = "M2.866 14.85c-.078.444.368.791.746.593l4.39-2.256 4.389 2.256c.377.197.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z";
    
    svg.querySelector('path').setAttribute('d', isStarred ? pathFilled : pathEmpty);
}


// === SIMULADOR DE FIRMAS ===

window.updateSimulator = function(p) {
    const panel = document.getElementById('simulator-panel');
    if (!panel) return;
    
    if (!p) {
        panel.style.display = 'none';
        return;
    }
    
    panel.style.display = 'block';
    
    const photoUrl = typeof getPlayerPhotoPath === 'function' 
        ? getPlayerPhotoPath(p.name) 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=1f2937&color=f3f4f6&rounded=true&size=80`;
    
    document.getElementById('sim-player-photo').src = photoUrl;
    
    const salaryInput = document.getElementById('sim-salary-input');
    salaryInput.value = p.max > 0 ? p.max : p.min; // Pre-llenado inicial con el máximo
    
    const signBtn = document.getElementById('sim-sign-btn');
    const feedback = document.getElementById('sim-feedback');
    const select = document.getElementById('sim-exception-select');
    
    // Auto-seleccionar la mejor Excepción disponible
    if (activeTeam) {
        const isBoss = p.derechos && p.originTeam === activeTeam.name;
        if (isBoss) {
            select.value = 'bird';
        } else {
            if (activeTeam.efectivo >= p.min) {
                select.value = 'cap';
            } else if (activeTeam.mle >= p.min) {
                select.value = 'mle';
            } else {
                select.value = 'cap'; // fallback
            }
        }
    }
    
    if (p.simulatedSigned && p.simTx && p.simTx.team === activeTeam.name) {
        panel.style.display = 'none';
        return;
    }
    
    function checkCanSign() {
        let sal = parseFloat(salaryInput.value) || 0;
        let exc = select.value;
        let canSign = false;
        let msg = "";
        
        if (sal < p.min) {
            msg = `El salario no puede ser menor al Mínimo (${formatCurrency(p.min)}).`;
        } else if (sal > p.max && p.max > 0) {
            msg = `El salario supera el máximo permitido (${formatCurrency(p.max)}).`;
        } else {
            if (exc === 'cap') {
                if (activeTeam.efectivo < sal) msg = "Espacio salarial insuficiente.";
                else canSign = true;
            } else if (exc === 'mle') {
                if (activeTeam.mle < sal) msg = "Excepción MLE insuficiente.";
                else canSign = true;
            } else if (exc === 'bird') {
                if (!p.derechos || p.originTeam !== activeTeam.name) msg = "No posees derechos Bird/R sobre este jugador.";
                else if (activeTeam.budgetEfectivo < sal) msg = "Presupuesto insuficiente para renovar.";
                else canSign = true;
            } else if (exc === 'minimum') {
                if (sal > p.min) msg = "Por el Mínimo solo puedes ofrecer su salario Mínimo exacto.";
                else if (activeTeam.budgetEfectivo < sal) msg = "Presupuesto insuficiente.";
                else canSign = true;
            }
        }
        
        const delayBtn = document.getElementById('sim-delay-btn');

        if (canSign) {
            signBtn.disabled = false;
            signBtn.style.opacity = '1';
            signBtn.innerText = 'FIRMA';
            signBtn.style.background = 'var(--accent-green, #22c55e)';
            feedback.innerText = '';

            if (p.derechos && p.originTeam === activeTeam.name) {
                delayBtn.style.display = 'block';
                delayBtn.disabled = false;
            } else {
                if (delayBtn) delayBtn.style.display = 'none';
            }
        } else {
            signBtn.disabled = true;
            signBtn.style.opacity = '0.5';
            signBtn.innerText = 'FIRMA (No viable)';
            signBtn.style.background = 'var(--text-muted, #9ca3af)';
            feedback.innerText = msg;

            if (delayBtn) delayBtn.style.display = 'none';
        }
        
        if (typeof updateSimEconomySummary === "function") {
            let capHold = (p.derechos && p.originTeam === activeTeam.name) ? p.capHold : 0;
            updateSimEconomySummary({ salary: sal, exception: exc, isDelayed: false, capHold: capHold });
        }
    }
    
    salaryInput.oninput = checkCanSign;
    select.onchange = checkCanSign;
    checkCanSign();
}

window.signSimulatedPlayer = function(isDelayed = false) {
    if (!activePlayerId || !activeTeam) return;
    const p = livePlayers.find(pl => pl.id == activePlayerId);
    if (!p) return;
    
    const salary = parseFloat(document.getElementById('sim-salary-input').value) || 0;
    const exception = document.getElementById('sim-exception-select').value;
    
    // Guardamos la firma simulada
    p.simulatedSigned = true; 
    p.simTx = { salary, exception, isDelayed, team: activeTeam.name };
    
    // Recalcular economía del equipo activo
    recalculateCapHolds();
    
    if (typeof renderSignedPlayersList === "function") {
        renderSignedPlayersList();
    }

    // Ocultar el panel activo
    document.getElementById('simulator-panel').style.display = 'none';
    
    // Actualizar UI general
    renderTopEconomy();
    renderStudyTable();
    updateSimEconomySummary();
    
    // Si estamos en el simulador global, refrescarlo también
    if (isGlobalSimOpen && typeof renderGlobalSimTable === "function") {
        renderGlobalSimTable();
    }
}

window.undoSimulatedSigning = function(playerId) {
    if (!activeTeam) return;
    const p = livePlayers.find(pl => pl.id == playerId);
    if (!p || !p.simulatedSigned || !p.simTx) return;
    
    p.simulatedSigned = false;
    delete p.simTx;
    
    if (typeof renderSignedPlayersList === "function") {
        renderSignedPlayersList();
    }
    
    // Recalcular economía y actualizar UI
    recalculateCapHolds();
    renderTopEconomy();
    renderStudyTable();
    updateSimEconomySummary();
    
    if (activePlayerId === p.id) {
        updateSimulator(p);
    }
    
    // Si estamos en el simulador global, refrescarlo también
    if (isGlobalSimOpen && typeof renderGlobalSimTable === "function") {
        renderGlobalSimTable();
    }
}

window.editSimulatedSigning = function(id) {
    const p = livePlayers.find(pl => pl.id === id);
    if (!p || !p.simTx) return;
    
    // Guardar valores antes de deshacer
    const oldSal = p.simTx.salary;
    const oldExc = p.simTx.exception;
    
    // Deshacer la firma
    undoSimulatedSigning(id);
    
    // Seleccionar al jugador para abrir el panel
    selectStudyPlayer(id);
    
    // Restaurar los valores en el panel (usamos timeout para asegurar que el DOM cargó)
    setTimeout(() => {
        const salaryInput = document.getElementById('sim-salary-input');
        const exceptionSelect = document.getElementById('sim-exception-select');
        
        if (salaryInput) {
            salaryInput.value = oldSal;
            // Disparamos el evento input para que se actualicen feedbacks si hay
            salaryInput.dispatchEvent(new Event('input'));
        }
        if (exceptionSelect) {
            exceptionSelect.value = oldExc;
        }
    }, 50);
}

window.updateSimEconomySummary = function(previewTx = null) {
    const sumDiv = document.getElementById('sim-economy-summary');
    if (!sumDiv || !activeTeam) return;
    
    const anySigned = livePlayers.some(p => p.simulatedSigned && p.simTx && p.simTx.team === activeTeam.name);
    
    const negOrMain = (val) => val < 0 ? 'var(--accent-red)' : 'var(--text-main)';
    sumDiv.style.display = 'flex';

    let eff = activeTeam.efectivo;
    let bud = activeTeam.budgetEfectivo;
    let mle = activeTeam.mle;

    if (previewTx) {
        const salary = previewTx.salary || 0;
        const exception = previewTx.exception;
        const isDelayed = previewTx.isDelayed;
        const capHold = previewTx.capHold || 0;
        
        if (isDelayed) {
            bud -= capHold;
        } else {
            bud -= salary;
        }
        
        if (!isDelayed) {
            if (exception === 'cap' || exception === 'bird') {
                eff -= salary;
                eff += capHold;
            } else if (exception === 'mle') {
                mle -= salary;
                eff += capHold;
            } else if (exception === 'minimum') {
                eff += capHold;
            }
        }
    }

    const lsEl = document.getElementById('sim-sum-ls');
    lsEl.innerText = formatCurrency(eff);
    lsEl.style.color = negOrMain(eff);
    
    const presEl = document.getElementById('sim-sum-pres');
    presEl.innerText = formatCurrency(bud);
    presEl.style.color = negOrMain(bud);
    
    const mleEl = document.getElementById('sim-sum-mle');
    mleEl.innerText = formatCurrency(mle);
    mleEl.style.color = negOrMain(mle);
}

window.renderSignedPlayersList = function() {
    const list = document.getElementById('signed-players-list');
    if (!list) return;
    list.innerHTML = '';
    
    if (!activeTeam) return;
    
    const signedPlayers = livePlayers.filter(p => p.simulatedSigned && p.simTx && p.simTx.team === activeTeam.name);
    
    signedPlayers.forEach(p => {
        const salary = p.simTx.salary;
        const exception = p.simTx.exception;
        const isDelayed = p.simTx.isDelayed;
        
        const photoUrl = typeof getPlayerPhotoPath === 'function' 
            ? getPlayerPhotoPath(p.name) 
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=1f2937&color=f3f4f6&rounded=true&size=32`;
            
        let excText = isDelayed ? "Firma Retrasada" : "";
        if (!isDelayed) {
            if (exception === 'cap') excText = "Cap Space";
            else if (exception === 'mle') excText = "MLE";
            else if (exception === 'minimum') excText = "Mínimo";
            else if (exception === 'bird') excText = "Bird/R";
        }

        const folded = document.createElement('div');
        folded.className = 'panel';
        folded.style.padding = '4px 8px';
        folded.style.display = 'flex';
        folded.style.alignItems = 'center';
        folded.style.justifyContent = 'space-between';
        
        if (isDelayed) {
            folded.style.border = '1px solid var(--accent-blue)';
            folded.style.borderLeft = '4px solid var(--accent-blue)';
        } else {
            folded.style.border = '1px solid transparent';
            folded.style.borderLeft = '4px solid var(--accent-green)';
        }
        
        folded.style.marginTop = '0';
        folded.style.backgroundColor = 'var(--bg-panel)';
        folded.style.position = 'relative';
        
        let confirmBtnHTML = isDelayed ? `<button onclick="makeSigningOfficial(${p.id})" style="background: var(--accent-green); color: white; border: none; padding: 2px 6px; border-radius: 4px; font-size: 10px; cursor: pointer; font-weight: bold; margin-right: 6px;" title="Hacer oficial la firma y descontar del límite salarial">FIRMAR</button>` : '';

        folded.id = `sim-folded-${p.id}`;
        folded.innerHTML = `
            <button onclick="undoSimulatedSigning(${p.id})" style="position: absolute; top: 0px; right: 0px; background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 2px;" title="Deshacer firma">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                </svg>
            </button>
            <div style="display: flex; align-items: center; gap: 8px;">
                <img src="${photoUrl}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">
                <div style="display: flex; flex-direction: column;">
                    <strong style="font-size: 12px; color: var(--text-main); line-height: 1.1;">${p.name}</strong>
                    <span class="text-muted text-xsmall" style="font-size: 10px;">${excText}</span>
                </div>
            </div>
            <div style="display: flex; gap: 4px; align-items: center; padding-right: 12px;">
                ${confirmBtnHTML}
                <div class="data-num color-green" style="font-size: 11px; margin-right: 4px;">${formatCurrency(salary)}</div>
                <button onclick="editSimulatedSigning(${p.id})" style="background: transparent; border: none; color: var(--accent-blue); cursor: pointer; padding: 2px;" title="Modificar firma">
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                    </svg>
                </button>
            </div>
        `;
        list.appendChild(folded);
    });
}

window.makeSigningOfficial = function(playerId) {
    const p = livePlayers.find(pl => pl.id === playerId);
    if (!p || !p.simTx) return;
    
    // Al hacerse oficial, ya no está retrasada. Pasa a deducir el salario completo.
    p.simTx.isDelayed = false;
    
    // Actualizamos la interfaz
    recalculateCapHolds();
    renderTopEconomy();
    renderStudyTable();
    if (typeof updateSimEconomySummary === "function") updateSimEconomySummary();
    if (typeof renderSignedPlayersList === "function") renderSignedPlayersList();
}
