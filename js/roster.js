import { CSVService } from './shared/csv_service.js';
import { TEAM_LOGOS } from './shared/constants.js';
import { calculateAge, getPlayerPhotoPath, generate2kRatingUrl, getOptClass, formatCurrencyOpt, formatCurrency, parseCurrency } from './shared/utils.js';
import { isAdmin, injectAdminButton } from './shared/admin_auth.js';
import { setupAdminModal } from './shared/admin_modal.js';

let playersData = [];
let teamsData = [];

document.addEventListener("DOMContentLoaded", async () => {
    injectAdminButton();
    // 1. Obtener parámetro de URL
    const urlParams = new URLSearchParams(window.location.search);
    const teamNameParam = urlParams.get('team');

    if (!teamNameParam) {
        document.getElementById('roster-team-name').textContent = "Equipo no encontrado";
        document.getElementById('loader').style.display = 'none';
        document.getElementById('roster-content').style.display = 'block';
        return;
    }

    const targetTeamName = teamNameParam;

    // Configurar botón Visual Roster
    const vrBtn = document.getElementById('visual-roster-btn');
    if (vrBtn) {
        vrBtn.href = `visual_roster.html?team=${encodeURIComponent(targetTeamName)}`;
    }

    // Populate Nav Bar
    const navBar = document.getElementById('roster-nav-bar');
    if (navBar) {
        Object.keys(TEAM_LOGOS).forEach(team => {
            const a = document.createElement('a');
            a.href = `roster.html?team=${encodeURIComponent(team)}`;
            const img = document.createElement('img');
            img.src = 'logos/' + TEAM_LOGOS[team];
            img.className = 'roster-nav-logo';
            img.title = team;
            if (team.toLowerCase() === targetTeamName.toLowerCase()) {
                img.classList.add('active');
            }
            a.appendChild(img);
            navBar.appendChild(a);
        });
    }

    // 2. Establecer Cabecera
    document.getElementById('roster-team-name').textContent = targetTeamName.toUpperCase();
    const logoSrc = TEAM_LOGOS[targetTeamName] ? 'logos/' + TEAM_LOGOS[targetTeamName] : "";
    if (logoSrc) {
        document.getElementById('roster-team-logo').src = logoSrc;
    } else {
        document.getElementById('roster-team-logo').style.display = 'none';
    }

    try {
        // 3. Fetch CSVs via CSVService
        const [parsedPlayers, parsedEco] = await Promise.all([
            CSVService.getPlayers(),
            CSVService.getEconomy()
        ]);

        // Parse teams for Admin Modal
        parsedEco.forEach((teamRow, idx) => {
            let tName = teamRow["Equipo"] || teamRow["Team"] || "Equipo " + (idx+1);
            tName = tName.replace(/['"]/g, '').trim();
            teamsData.push({
                id: (idx + 1).toString(),
                name: tName
            });
        });

        // 4. Buscar Equipo en economia.csv para obtener su ID y sus datos financieros
        let teamId = null;
        let teamEconomyData = null;

        parsedEco.forEach((row, idx) => {
            let name = row["Equipo"] || row["Team"] || "Equipo " + (idx+1);
            name = name.replace(/['"]/g, '').trim();
            if (name.toLowerCase() === targetTeamName.toLowerCase()) {
                teamId = (idx + 1).toString();
                teamEconomyData = row;
            }
        });

        if (!teamId) {
            console.error("No se encontró el equipo en economia.csv");
            document.getElementById('loader').style.display = 'none';
            document.getElementById('roster-content').style.display = 'block';
            return;
        }

        // Parse players into uniform structure for Admin Modal
        parsedPlayers.forEach((p, idx) => {
            const isFA = !p.team_id || p.team_id.trim() === '' || p.team_id === '0' || p.team_id === '31' || (parseFloat(p.t1) || 0) === 0;
            const teamObj = teamsData.find(t => t.id === p.team_id);
            const tName = isFA ? 'FA' : (teamObj ? teamObj.name : '-');
            
            playersData.push({
                uid: 'p' + idx,
                originalIndex: idx, 
                originalRaw: p, 
                name: p.Player,
                teamId: p.team_id,
                teamName: tName,
                salary: parseFloat(p.t1) || 0,
                pos: p.Position || '-',
                rating: parseInt(p.Rating) || 0,
                t1: p.t1 || 0, o1: p.o1 || '',
                t2: p.t2 || 0, o2: p.o2 || '',
                t3: p.t3 || 0, o3: p.o3 || '',
                t4: p.t4 || 0, o4: p.o4 || '',
                t5: p.t5 || 0, o5: p.o5 || '',
                t6: p.t6 || 0, o6: p.o6 || '',
                age: calculateAge(p.FechaNacimiento),
                isFA: isFA
            });
        });

        // Initialize admin modal using the mapped data
        setupAdminModal(playersData, teamsData);

        // 5. Rellenar Tabla Economía
        const ecoBody = document.getElementById('economy-body');
        ecoBody.innerHTML = ''; // Clear
        
        if (teamEconomyData) {
            // Extraer las claves principales de economía
            const keys = [
                "Disponible limite salarial",
                "Disponible presupuesto",
                "Disponible MLE",
                "Caphold retenido",
                "Efectivo LS (- Cap Hold)",
                "Efectivo Presupuesto (- firmas retrasadas)"
            ];

            keys.forEach(key => {
                if (teamEconomyData[key] !== undefined) {
                    const val = parseCurrency(teamEconomyData[key]);
                    const tr = document.createElement('tr');
                    
                    const tdLabel = document.createElement('td');
                    tdLabel.textContent = key;
                    tdLabel.style.fontWeight = '600';
                    
                    const tdVal = document.createElement('td');
                    tdVal.textContent = formatCurrency(val);
                    tdVal.className = 'text-right font-data';
                    
                    // Colorear negativos
                    if (val < 0) {
                        tdVal.classList.add('economy-row-negative');
                    } else if (val > 0 && key.includes("Disponible")) {
                        tdVal.classList.add('economy-row-positive');
                    }
                    
                    tr.appendChild(tdLabel);
                    tr.appendChild(tdVal);
                    ecoBody.appendChild(tr);
                }
            });
        }

        // 6. Filtrar y Rellenar Tabla Jugadores
        const rosterBody = document.getElementById('roster-body');
        rosterBody.innerHTML = '';

        const teamPlayers = parsedPlayers.filter(p => p.team_id === teamId);

        // Sort by Rating by default
        teamPlayers.sort((a, b) => {
            return (parseFloat(b.Rating) || 0) - (parseFloat(a.Rating) || 0);
        });

        if (teamPlayers.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="11" class="text-center text-muted">No hay jugadores en plantilla.</td>`;
            rosterBody.appendChild(tr);
        } else {
            teamPlayers.forEach(p => {
                const tr = document.createElement('tr');
                const age = calculateAge(p.FechaNacimiento);
                const bird = p.Bird && p.Bird !== '0' ? p.Bird : '-';
                const r = p.FA && p.FA.toUpperCase() === 'R' ? 'R' : '';
                
                const fallbackUrl = 'photos/none.svg';
                const photoPath = getPlayerPhotoPath(p.Player);
                const url2k = generate2kRatingUrl(p.Player);
                
                tr.innerHTML = `
                    <td style="text-align:left; display: flex; align-items: center; gap: 10px; font-weight:600;">
                        <img src="${photoPath}" onerror="this.onerror=null; this.src='${fallbackUrl}';" alt="${p.Player}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; background: var(--bg-panel);">
                        <a href="${url2k}" target="_blank" style="color: inherit; text-decoration: none;" title="Ver en 2kratings">
                            ${p.Player || '-'}
                        </a>
                    </td>
                    <td class="text-center">${p.Position || '-'}</td>
                    <td class="text-center"><div style="background: var(--bg-panel); color: var(--accent-orange); font-size: 11px; font-weight: bold; border: 1px solid var(--border-subtle); border-radius: 4px; display: inline-block; padding: 2px 6px;">${p.Rating || '-'}</div></td>
                    <td class="text-center">${age}</td>
                    <td class="text-center ${parseInt(bird) >= 3 ? 'bg-bird' : ''}">${bird}</td>
                    <td class="text-center ${r === 'R' ? 'bg-r' : ''}">${r}</td>
                    <td class="text-right font-data ${getOptClass(p.o1)}">${formatCurrencyOpt(p.t1)}</td>
                    <td class="text-right font-data ${getOptClass(p.o2)}">${formatCurrencyOpt(p.t2)}</td>
                    <td class="text-right font-data ${getOptClass(p.o3)}">${formatCurrencyOpt(p.t3)}</td>
                    <td class="text-right font-data ${getOptClass(p.o4)}">${formatCurrencyOpt(p.t4)}</td>
                    <td class="text-right font-data ${getOptClass(p.o5)}">${formatCurrencyOpt(p.t5)}</td>
                `;
                rosterBody.appendChild(tr);
            });
        }

        // 7. Rellenar Tabla Rondas Draft
        const parsedDraft = await CSVService.getDraftPicks();
        const draftBody = document.getElementById('draft-body');
        if (draftBody) {
            draftBody.innerHTML = '';
            
            const teamDraftPicks = parsedDraft.filter(d => d.Equipo && d.Equipo.toLowerCase() === targetTeamName.toLowerCase());
            
            if (teamDraftPicks.length === 0) {
                draftBody.innerHTML = `<tr><td colspan="3" class="text-center" style="color: var(--text-muted); font-style: italic;">No hay rondas registradas.</td></tr>`;
            } else {
                const sample = parsedDraft[0] || {};
                const yearKey = Object.keys(sample).find(k => k.includes('A') && k.includes('o')) || 'Año';
                
                teamDraftPicks.sort((a, b) => {
                    const ya = parseInt(a[yearKey] || 0);
                    const yb = parseInt(b[yearKey] || 0);
                    if (ya !== yb) return ya - yb;
                    return parseInt(a.Ronda || 0) - parseInt(b.Ronda || 0);
                });

                teamDraftPicks.forEach(d => {
                    const tr = document.createElement('tr');
                    
                    let infoIcon = '';
                    if (d.Comentario && d.Comentario.trim() !== '') {
                        const safeComment = d.Comentario.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        infoIcon = ` <span class="custom-tooltip">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 16px; height: 16px; display: inline-block; vertical-align: -3px; margin-left: 4px; color: var(--accent-orange);">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                            </svg>
                            <span class="tooltip-text">${safeComment}</span>
                        </span>`;
                    }
                    
                    tr.innerHTML = `
                        <td class="text-center font-data">${d[yearKey] || '-'}</td>
                        <td class="text-center font-data">${d.Ronda || '-'}${infoIcon}</td>
                        <td>${d["Equipo Original"] || '-'}</td>
                    `;
                    draftBody.appendChild(tr);
                });
            }
        }

        // Finalizar Carga
        document.getElementById('loader').style.display = 'none';
        document.getElementById('roster-content').style.display = 'block';

    } catch (e) {
        console.error("Error al cargar los datos:", e);
        document.getElementById('loader').innerHTML = `<p style="color:var(--accent-red)">Error al cargar datos. Comprueba la consola.<br><strong>Error:</strong> ${e.message}<br><strong>Stack:</strong> ${e.stack}</p>`;
    }
});


