import { isAdmin, writeCSV, applyEconomyDelta, saveTransactionToHistory } from './admin_auth.js';
import { CSVService } from './csv_service.js';
import { getPlayerPhotoPath, formatCurrency } from './utils.js';

let _playersData = [];
let _teamsData = [];

export function setupAdminModal(playersData, teamsData) {
    _playersData = playersData;
    _teamsData = teamsData;
    createAdminModalContainer();
    window.openAdminModal = openAdminModal;
    window.executeWaive = executeWaive;
    window.executeSign = executeSign;
    window.selectWaiveType = selectWaiveType;
    window.updateStretchSummary = updateStretchSummary;
    window.updateContractPreview = updateContractPreview;
}

function openAdminModal(uid) {
    if (!isAdmin()) return;
    const p = _playersData.find(x => x.uid === uid);
    if (!p) return;
    
    const isFA = p.isFA !== undefined ? p.isFA : (!p.teamId || p.teamId === '0' || p.teamId === '31');
    const teamObj = _teamsData.find(t => t.id === p.teamId);
    const team = isFA ? 'Agente Libre' : (teamObj ? teamObj.name : 'Desconocido');
    
    const fallbackUrl = 'photos/none.svg';
    const photoSrc = typeof getPlayerPhotoPath === 'function' ? getPlayerPhotoPath(p.name) : fallbackUrl;
    
    let html = `
        <div style="background: #1f2937; border: 1px solid var(--border-subtle); border-radius: 12px; padding: 24px; max-width: 500px; width: 100%; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.8); font-family: 'Inter', sans-serif;">
            <button onclick="document.getElementById('admin-modal').style.display='none'" style="position: absolute; top: 16px; right: 20px; background: none; border: none; font-size: 24px; color: var(--text-muted); cursor: pointer; transition: 0.2s;">&times;</button>
            
            <div style="display: flex; gap: 16px; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 20px; margin-bottom: 20px;">
                <img src="${photoSrc}" onerror="this.onerror=null; this.src='${fallbackUrl}';" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover; background: var(--bg-base); border: 2px solid var(--border-subtle);">
                <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                    <div style="font-size: 1.4rem; font-weight: 700; color: var(--text-main); line-height: 1.2;">${p.name}</div>
                    <div style="font-size: 0.9rem; font-weight: 500; color: var(--text-muted); display:flex; gap: 8px; align-items: center;">
                        <span style="color:var(--accent-orange); font-weight:700;">${p.rating || ''} OVR</span>
                        <span>|</span> <span>${p.pos}</span> <span>|</span> <span>${p.age || '?'} años</span>
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-base); background: var(--bg-panel); padding: 4px 8px; border-radius: 4px; display: inline-block; width: fit-content;">${team}</div>
                </div>
            </div>
    `;

    const salary = parseFloat(p.salary || p.t1) || 0;

    if (!isFA) {
        html += `
            <div style="margin-bottom: 25px; text-align: center;">
                <h3 style="font-size: 1rem; color: var(--text-main); margin-bottom: 12px;">Opciones de Despido</h3>
                
                <input type="hidden" id="waive-type-hidden" value="integro">
                
                <div style="display: flex; gap: 10px; justify-content: center; margin-bottom: 10px;">
                    <button id="btn-integro" onclick="selectWaiveType('integro', ${salary})" style="flex: 1; padding: 12px; border-radius: 6px; background: var(--accent-orange); color: #fff; border: none; font-weight: bold; cursor: pointer; transition: 0.2s;">
                        Pagar Íntegro
                    </button>
                    <button id="btn-stretch" onclick="selectWaiveType('stretch', ${salary})" style="flex: 1; padding: 12px; border-radius: 6px; background: var(--bg-panel); color: var(--text-main); border: 1px solid var(--border-subtle); font-weight: bold; cursor: pointer; transition: 0.2s;">
                        Stretch Provision
                    </button>
                </div>
                
                <div id="desc-integro" style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">
                    El equipo asume el 100% del impacto salarial este año. No se libera espacio.
                </div>
                <div id="desc-stretch" style="display: none; font-size: 0.85rem; color: var(--text-muted); font-style: italic;">
                    Repartir el contrato en varias temporadas, liberando espacio este año.
                </div>
                
                <div id="stretch-options" style="display: none; margin-top: 15px; background: var(--bg-base); padding: 12px; border-radius: 8px; border: 1px dashed var(--border-subtle); text-align: left;">
                    <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-main); display: block; margin-bottom: 8px;">Temporadas a repartir (Stretch):</label>
                    <select id="waive-stretch-years" onchange="updateStretchSummary(${salary})" style="width: 100%; padding: 10px; border-radius: 6px; background: #1f2937; border: 1px solid var(--border-subtle); color: var(--text-main); font-size: 0.9rem; outline: none;">
                        <option value="3">3 Temporadas</option>
                        <option value="5">5 Temporadas</option>
                        <option value="7">7 Temporadas</option>
                    </select>
                    <div id="stretch-summary" style="margin-top: 12px; font-size: 0.85rem; color: var(--accent-orange); font-weight: 700; text-align: center;"></div>
                </div>
            </div>

            <button onclick="executeWaive('${p.uid}')" style="background: var(--accent-red); color: #fff; border: none; padding: 14px; font-size: 1rem; border-radius: 8px; font-weight: 700; cursor: pointer; width: 100%; transition: opacity 0.2s; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                CORTAR JUGADOR
            </button>
        </div>`;
    } else {
        const minStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p.minimum || 0);
        const maxStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p.maximum || 0);

        html += `
            <div style="margin-bottom: 20px;">
                <h3 style="font-size: 1rem; color: var(--text-main); margin-bottom: 12px;">Detalles de la Firma</h3>
                
                <div style="display: flex; justify-content: space-between; background: rgba(34, 197, 94, 0.1); padding: 12px; border-radius: 8px; border: 1px solid rgba(34, 197, 94, 0.3); margin-bottom: 20px;">
                    <div>
                        <span style="font-size: 0.8rem; color: var(--text-muted); display: block; text-transform: uppercase;">Pide Mínimo</span>
                        <strong style="color: var(--accent-green); font-size: 1.1rem;">${minStr}</strong>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 0.8rem; color: var(--text-muted); display: block; text-transform: uppercase;">Pide Máximo</span>
                        <strong style="color: var(--accent-green); font-size: 1.1rem;">${maxStr}</strong>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted); display:block; margin-bottom: 6px;">Equipo Destino</label>
                    <select id="sign-team" style="width:100%; padding:10px; border-radius:6px; background:#1f2937; border:1px solid var(--border-subtle); color:var(--text-main); font-size: 0.95rem; outline: none;">
                        ${_teamsData.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                    </select>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted); display:block; margin-bottom: 6px;">Excepción a utilizar</label>
                    <select id="sign-money-type" style="width:100%; padding:10px; border-radius:6px; background:#1f2937; border:1px solid var(--border-subtle); color:var(--text-main); font-size: 0.95rem; outline: none;">
                        <option value="LS">Espacio Salarial (LS)</option>
                        <option value="MLE">Excepción MLE</option>
                        <option value="MIN">Contrato Mínimo</option>
                    </select>
                </div>
                
                <h3 style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 12px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px;">Generador de Contrato</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; background: var(--bg-panel); padding: 15px; border-radius: 8px; border: 1px solid var(--border-subtle);">
                    <div>
                        <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 4px;">Salario Año 1 ($)</label>
                        <input type="number" id="sign-base-salary" style="width: 100%; padding: 8px; font-size: 0.85rem; border-radius: 4px; background: var(--bg-surface); color: var(--text-main); border: 1px solid var(--border-subtle); outline: none;" value="${p.minimum || 0}" step="1000" oninput="updateContractPreview()">
                    </div>
                    <div>
                        <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 4px;">Años</label>
                        <select id="sign-years" style="width: 100%; padding: 8px; font-size: 0.85rem; border-radius: 4px; background: var(--bg-surface); color: var(--text-main); border: 1px solid var(--border-subtle); outline: none;" onchange="updateContractPreview()">
                            <option value="1">1 Año</option>
                            <option value="2">2 Años</option>
                            <option value="3">3 Años</option>
                            <option value="4">4 Años</option>
                            <option value="5">5 Años</option>
                            <option value="6">6 Años</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 4px;">Opción (Últ. Año)</label>
                        <select id="sign-option" style="width: 100%; padding: 8px; font-size: 0.85rem; border-radius: 4px; background: var(--bg-surface); color: var(--text-main); border: 1px solid var(--border-subtle); outline: none;" onchange="updateContractPreview()">
                            <option value="">Ninguna</option>
                            <option value="TO">Team Option (TO)</option>
                        </select>
                    </div>
                </div>
                
                <div id="contract-preview" style="margin-top: 15px; font-size: 0.85rem; color: var(--accent-blue); font-weight: 700; text-align: center; background: rgba(59, 130, 246, 0.1); padding: 10px; border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.2);">
                </div>
            </div>

            <button onclick="executeSign('${p.uid}')" style="background: var(--accent-green); color: #fff; border: none; padding: 14px; font-size: 1rem; border-radius: 8px; font-weight: 700; cursor: pointer; width: 100%; transition: opacity 0.2s; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                FIRMAR JUGADOR
            </button>
        </div>`;
    }

    document.getElementById('admin-modal').innerHTML = html;
    document.getElementById('admin-modal').style.display = 'flex';
    if (isFA) updateContractPreview();
}

async function executeWaive(uid) {
    if (!isAdmin() || !confirm('¿Seguro que quieres cortar a este jugador?')) return;
    const p = _playersData.find(x => x.uid === uid);
    
    const salary = parseFloat(p.salary || p.t1) || 0;
    
    const waiveType = document.getElementById('waive-type-hidden').value;
    
    const raw = p.originalRaw;
    if(!raw) {
        alert("Error: No se encontró la data original del jugador.");
        return;
    }
    
    const previousTeamId = raw.team_id;
    raw.team_id = '31'; // FA
    for(let i=1; i<=6; i++) {
        raw[`t${i}`] = 0;
        raw[`o${i}`] = '';
    }
    
    try {
        const fullPlayers = await CSVService.getPlayers(true);
        const fullEconomy = await CSVService.getEconomy(true);

        // Backup antes de tocar nada
        const backupP = JSON.parse(JSON.stringify(fullPlayers));
        const backupE = JSON.parse(JSON.stringify(fullEconomy));
        saveTransactionToHistory(`Corte de ${p.name}`, backupP, backupE);

        Object.assign(fullPlayers[p.originalIndex], raw);
        
        let delta = 0;
        if (waiveType === 'stretch') {
            const stretchYears = parseInt(document.getElementById('waive-stretch-years').value) || 3;
            const stretchedSalary = salary / stretchYears;
            delta = -(salary - stretchedSalary);
        }
        
        if (delta !== 0) {
            applyEconomyDelta(fullEconomy, previousTeamId, delta);
        }

        await writeCSV('players.csv', fullPlayers);
        await writeCSV('economia.csv', fullEconomy);
        
        alert('Jugador cortado correctamente. Recargando datos...');
        location.reload();
    } catch (e) {
        console.error(e);
        alert('Error al guardar: ' + e.message);
    }
}

async function executeSign(uid) {
    if (!isAdmin() || !confirm('¿Confirmar firma?')) return;
    const p = _playersData.find(x => x.uid === uid);
    
    const teamId = document.getElementById('sign-team').value;
    const moneyType = document.getElementById('sign-money-type').value;
    const base = parseFloat(document.getElementById('sign-base-salary').value) || 0;
    const years = parseInt(document.getElementById('sign-years').value) || 1;
    const inc = 0.05; // Incremento anual del 5% automático
    const opt = document.getElementById('sign-option').value;
    
    const raw = p.originalRaw;
    if(!raw) {
        alert("Error: No se encontró la data original del jugador.");
        return;
    }
    
    raw.team_id = teamId;
    
    let current = base;
    for(let i=1; i<=6; i++) {
        if (i <= years) {
            raw[`t${i}`] = Math.round(current);
            raw[`o${i}`] = (i === years && opt) ? opt : '';
            current = current * (1 + inc);
        } else {
            raw[`t${i}`] = 0;
            raw[`o${i}`] = '';
        }
    }
    
    const newSalary = parseFloat(raw.t1) || 0;
    
    try {
        const fullPlayers = await CSVService.getPlayers(true);
        const fullEconomy = await CSVService.getEconomy(true);

        const backupP = JSON.parse(JSON.stringify(fullPlayers));
        const backupE = JSON.parse(JSON.stringify(fullEconomy));

        // VALIDAR PRESUPUESTO
        const teamIndex = parseInt(teamId) - 1;
        if (teamIndex >= 0 && teamIndex < fullEconomy.length) {
            const row = fullEconomy[teamIndex];
            let currentPresupuesto = parseFloat(row["Efectivo Presupuesto (- firmas retrasadas)"]) || 0;
            if (currentPresupuesto - newSalary < 0) {
                alert("Error: La firma no puede efectuarse porque sobrepasa el presupuesto efectivo disponible.");
                return;
            }
        }

        saveTransactionToHistory(`Firma de ${p.name}`, backupP, backupE);
        Object.assign(fullPlayers[p.originalIndex], raw);
        
        // Economy change: SIGNING a player increases the team's salary -> delta is positive
        applyEconomyDelta(fullEconomy, teamId, newSalary, moneyType);

        await writeCSV('players.csv', fullPlayers);
        await writeCSV('economia.csv', fullEconomy);

        alert('Firma procesada correctamente. Recargando datos...');
        location.reload();
    } catch (e) {
        console.error(e);
        alert('Error al guardar: ' + e.message);
    }
}

function createAdminModalContainer() {
    if (document.getElementById('admin-modal')) return;
    const overlay = document.createElement('div');
    overlay.id = 'admin-modal';
    overlay.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:100000; justify-content:center; align-items:center; padding: 20px;';
    document.body.appendChild(overlay);
}

function selectWaiveType(type, salary) {
    const btnIntegro = document.getElementById('btn-integro');
    const btnStretch = document.getElementById('btn-stretch');
    const descIntegro = document.getElementById('desc-integro');
    const descStretch = document.getElementById('desc-stretch');
    const stretchOptions = document.getElementById('stretch-options');
    const hiddenInput = document.getElementById('waive-type-hidden');

    if (type === 'integro') {
        hiddenInput.value = 'integro';
        btnIntegro.style.background = 'var(--accent-orange)';
        btnIntegro.style.color = '#fff';
        btnIntegro.style.border = 'none';
        
        btnStretch.style.background = 'var(--bg-panel)';
        btnStretch.style.color = 'var(--text-main)';
        btnStretch.style.border = '1px solid var(--border-subtle)';

        descIntegro.style.display = 'block';
        descStretch.style.display = 'none';
        stretchOptions.style.display = 'none';
    } else {
        hiddenInput.value = 'stretch';
        btnStretch.style.background = 'var(--accent-orange)';
        btnStretch.style.color = '#fff';
        btnStretch.style.border = 'none';
        
        btnIntegro.style.background = 'var(--bg-panel)';
        btnIntegro.style.color = 'var(--text-main)';
        btnIntegro.style.border = '1px solid var(--border-subtle)';

        descIntegro.style.display = 'none';
        descStretch.style.display = 'block';
        stretchOptions.style.display = 'block';
        
        updateStretchSummary(salary);
    }
}

function updateStretchSummary(salary) {
    const years = parseInt(document.getElementById('waive-stretch-years').value) || 3;
    const stretched = salary / years;
    
    const formatStr = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(stretched);
    
    document.getElementById('stretch-summary').innerHTML = `Impacto de ${formatStr} por temporada durante ${years} años.`;
}

function updateContractPreview() {
    const base = parseFloat(document.getElementById('sign-base-salary').value) || 0;
    const years = parseInt(document.getElementById('sign-years').value) || 1;
    const inc = 0.05; // Incremento anual del 5% automático
    const opt = document.getElementById('sign-option').value;
    
    let previewHtml = "";
    let total = 0;
    let current = base;
    
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    
    let yearDetails = [];
    for (let i = 1; i <= years; i++) {
        total += current;
        let oStr = (i === years && opt) ? ` (${opt})` : '';
        yearDetails.push(`T${i}: ${formatter.format(current)}${oStr}`);
        current = current * (1 + inc);
    }
    
    previewHtml = `<div style="margin-bottom: 6px;">Total Contrato: ${formatter.format(total)} / ${years} Años</div>`;
    previewHtml += `<div style="font-size: 0.75rem; color: var(--text-main); display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">`;
    yearDetails.forEach(yd => {
        previewHtml += `<span style="background: var(--bg-surface); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-subtle);">${yd}</span>`;
    });
    previewHtml += `</div>`;
    
    const previewEl = document.getElementById('contract-preview');
    if (previewEl) previewEl.innerHTML = previewHtml;
}
