import { CSVService } from './shared/csv_service.js';
import { calculateAge, getPlayerPhotoPath, generate2kRatingUrl, formatCurrencyOpt } from './shared/utils.js';
import { isAdmin, injectAdminButton } from './shared/admin_auth.js';
import { setupAdminModal } from './shared/admin_modal.js';

let playersData = [];
let teamsData = [];
let currentSort = { column: 'rating', asc: false };

async function init() {
    injectAdminButton();

    try {
        const [parsedPlayers, parsedEco] = await Promise.all([
            CSVService.getPlayers(),
            CSVService.getEconomy()
        ]);
        
        parsedEco.forEach((teamRow, idx) => {
            let teamName = teamRow["Equipo"] || teamRow["Team"] || "Equipo " + (idx+1);
            teamName = teamName.replace(/['"]/g, '');
            teamsData.push({
                id: (idx + 1).toString(),
                name: teamName
            });
        });

        parsedPlayers.forEach((p, idx) => {
            const isFA = !p.team_id || p.team_id.trim() === '' || p.team_id === '0' || (parseFloat(p.t1) || 0) === 0;
            if (!isFA) return; // SOLO AGENTES LIBRES
            
            playersData.push({
                uid: 'p' + idx,
                originalIndex: idx,
                originalRaw: p,
                name: p.Player,
                pos: p.Position || '-',
                rating: parseInt(p.Rating) || 0,
                age: calculateAge(p.FechaNacimiento),
                bird: p.Bird || '-',
                r: p.FA && p.FA.toUpperCase() === 'R' ? 'R' : '',
                minimum: parseFloat(p.Minimum) || 0,
                maximum: parseFloat(p.Maximum) || 0,
                caphold: parseFloat(p.caphold) || 0
            });
        });

        setupAdminModal(playersData, teamsData);
        setupFilters();
        applyFiltersAndRender();
        
        document.getElementById('loader').style.display = 'none';
    } catch(err) {
        alert("Error cargando los CSV. Asegúrate de ejecutar esto en un servidor local (Live Server).");
        document.getElementById('loader').style.display = 'none';
    }
}

function setupFilters() {
    const input = document.getElementById('filter-name');
    if (input) {
        input.addEventListener('input', applyFiltersAndRender);
    }
}

window.sortBy = function(col) {
    if (currentSort.column === col) {
        currentSort.asc = !currentSort.asc;
    } else {
        currentSort.column = col;
        currentSort.asc = false;
    }
    applyFiltersAndRender();
}

function applyFiltersAndRender() {
    const nameFilter = (document.getElementById('filter-name')?.value || '').toLowerCase();

    let filtered = playersData.filter(p => {
        if (nameFilter && !p.name.toLowerCase().includes(nameFilter)) return false;
        return true;
    });

    filtered.sort((a, b) => {
        let valA = a[currentSort.column];
        let valB = b[currentSort.column];
        
        if (typeof valA === 'string' && typeof valB === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
            if (valA < valB) return currentSort.asc ? -1 : 1;
            if (valA > valB) return currentSort.asc ? 1 : -1;
            return 0;
        } else {
            return currentSort.asc ? valA - valB : valB - valA;
        }
    });

    const tbody = document.getElementById('players-tbody');
    const noResults = document.getElementById('no-results');
    
    if (filtered.length === 0) {
        tbody.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    let html = '';
    const adminStyle = isAdmin() ? 'cursor:pointer;' : '';
    const adminHoverClass = isAdmin() ? 'admin-hover-row' : '';
    
    filtered.forEach(p => {
        const fallbackUrl = 'assets/photos/none.svg';
        const photoPath = typeof getPlayerPhotoPath === 'function' ? getPlayerPhotoPath(p.name) : fallbackUrl;
        const url2k = typeof generate2kRatingUrl === 'function' ? generate2kRatingUrl(p.name) : '#';
        
        const trAction = isAdmin() ? `onclick="openAdminModal('${p.uid}')"` : '';

        html += `
            <tr style="${adminStyle}" ${trAction} class="${adminHoverClass}">
                <td data-label="Jugador" style="text-align:left; display: flex; align-items: center; gap: 10px;">
                    <img src="${photoPath}" onerror="this.onerror=null; this.src='${fallbackUrl}';" alt="${p.name}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; background: var(--bg-surface);">
                    <a href="${url2k}" style="color: inherit; text-decoration: none; font-weight: 600;" title="Ver en 2kratings" onclick="window.open('${url2k}', '_blank'); event.stopPropagation(); return false;">
                        ${p.name}
                    </a>
                </td>
                <td data-label="Pos">${p.pos}</td>
                <td data-label="Media"><div style="background: var(--bg-panel); color: var(--accent-orange); font-size: 11px; font-weight: bold; border: 1px solid var(--border-subtle); border-radius: 4px; display: inline-block; padding: 2px 6px;">${p.rating}</div></td>
                <td data-label="Edad">${p.age}</td>
                <td data-label="Bird" class="${parseInt(p.bird) >= 3 ? 'bg-bird' : ''}">${p.bird !== '0' && p.bird !== '' ? p.bird : '-'}</td>
                <td data-label="R" class="${p.r === 'R' ? 'bg-r' : ''}">${p.r}</td>
                <td data-label="Mínimo" class="data-num">${typeof formatCurrencyOpt === 'function' ? formatCurrencyOpt(p.minimum) : p.minimum}</td>
                <td data-label="Máximo" class="data-num">${typeof formatCurrencyOpt === 'function' ? formatCurrencyOpt(p.maximum) : p.maximum}</td>
                <td data-label="Cap Hold" class="data-num">${p.caphold > 0 ? (typeof formatCurrencyOpt === 'function' ? formatCurrencyOpt(p.caphold) : p.caphold) : '-'}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Start application
window.addEventListener('DOMContentLoaded', init);
