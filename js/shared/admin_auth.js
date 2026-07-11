// Simple Promise wrapper for IndexedDB to store the directory handle
const DB_NAME = '2kOfficeAdminDB';
const STORE_NAME = 'handles';
import { isGithubSyncEnabled, pushToGithub } from './github_service.js';

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            e.target.result.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function setHandle(handle) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(handle, 'dir_handle');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getHandle() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get('dir_handle');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(tx.error);
    });
}

export function isAdmin() {
    return sessionStorage.getItem('isAdmin') === 'true';
}

export async function loginAdmin() {
    if (isAdmin()) return true;
    
    const pwd = prompt('Contraseña de Administrador:');
    if (pwd === 'admin2k') {
        try {
            if (!window.showDirectoryPicker) {
                alert("Tu navegador no soporta File System Access API.");
                return false;
            }
            const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
            await setHandle(handle);
            sessionStorage.setItem('isAdmin', 'true');
            alert('Modo Administrador Activado.');
            return true;
        } catch (e) {
            console.error(e);
            alert('Permiso a la carpeta denegado o cancelado.');
            return false;
        }
    } else if (pwd !== null) {
        alert('Contraseña incorrecta.');
    }
    return false;
}

export async function getDirectoryHandle() {
    if (!isAdmin()) return null;
    let handle = await getHandle();
    if (handle) {
        // Verify permission
        if (await handle.queryPermission({ mode: 'readwrite' }) === 'granted') {
            return handle;
        }
        // Request if not granted (e.g. after browser restart)
        try {
            if (await handle.requestPermission({ mode: 'readwrite' }) === 'granted') {
                return handle;
            }
        } catch (e) {
            console.warn("Permission request failed, asking for picker again.", e);
        }
    }
    // If we lost it or it wasn't saved, prompt again
    handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await setHandle(handle);
    return handle;
}

export async function writeCSV(filename, dataArray) {
    const handle = await getDirectoryHandle();
    if (!handle) throw new Error("No hay acceso al sistema de archivos.");

    // Convert JSON to CSV using PapaParse (assuming it's loaded in the window)
    const csvStr = window.Papa.unparse(dataArray);

    const fileHandle = await handle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(csvStr);
    await writable.close();
}

export function injectAdminButton() {
    // Add a discreet admin button to the bottom right of the screen
    const btn = document.createElement('div');
    btn.textContent = isAdmin() ? 'Admin ✓' : 'Admin';
    btn.style.position = 'fixed';
    btn.style.bottom = '10px';
    btn.style.right = '10px';
    btn.style.fontSize = '12px';
    btn.style.fontWeight = 'bold';
    btn.style.color = isAdmin() ? '#22c55e' : '#64748b'; // accent-green or text-muted
    btn.style.cursor = 'pointer';
    btn.style.opacity = '0.3';
    btn.style.zIndex = '99999';
    btn.style.fontFamily = 'sans-serif';
    btn.style.padding = '5px 10px';
    btn.style.background = 'rgba(0,0,0,0.5)';
    btn.style.borderRadius = '4px';
    
    btn.addEventListener('mouseenter', () => btn.style.opacity = '1');
    btn.addEventListener('mouseleave', () => btn.style.opacity = '0.3');
    
    btn.addEventListener('click', async () => {
        if (!isAdmin()) {
            const success = await loginAdmin();
            if (success) location.reload(); // Reload to apply admin UI
        } else {
            if (confirm('¿Cerrar sesión de administrador?')) {
                sessionStorage.removeItem('isAdmin');
                location.reload();
            }
        }
    });

    document.body.appendChild(btn);

    if (isAdmin()) {
        const historyBtn = document.createElement('div');
        historyBtn.textContent = '⏱ Historial';
        historyBtn.style.position = 'fixed';
        historyBtn.style.bottom = '10px';
        historyBtn.style.right = '90px'; // Next to the Admin btn
        historyBtn.style.fontSize = '12px';
        historyBtn.style.fontWeight = 'bold';
        historyBtn.style.color = '#eab308'; // yellow
        historyBtn.style.cursor = 'pointer';
        historyBtn.style.opacity = '0.5';
        historyBtn.style.zIndex = '99999';
        historyBtn.style.fontFamily = 'sans-serif';
        historyBtn.style.padding = '5px 10px';
        historyBtn.style.background = 'rgba(0,0,0,0.5)';
        historyBtn.style.borderRadius = '4px';
        
        historyBtn.addEventListener('mouseenter', () => historyBtn.style.opacity = '1');
        historyBtn.addEventListener('mouseleave', () => historyBtn.style.opacity = '0.5');
        
        historyBtn.addEventListener('click', showHistoryModal);
        
        document.body.appendChild(historyBtn);

        const ghBtn = document.createElement('div');
        ghBtn.textContent = '☁️ GitHub Sync';
        ghBtn.style.position = 'fixed';
        ghBtn.style.bottom = '10px';
        ghBtn.style.right = '180px'; // Next to History
        ghBtn.style.fontSize = '12px';
        ghBtn.style.fontWeight = 'bold';
        ghBtn.style.color = '#38bdf8'; // light blue
        ghBtn.style.cursor = 'pointer';
        ghBtn.style.opacity = '0.5';
        ghBtn.style.zIndex = '99999';
        ghBtn.style.fontFamily = 'sans-serif';
        ghBtn.style.padding = '5px 10px';
        ghBtn.style.background = 'rgba(0,0,0,0.5)';
        ghBtn.style.borderRadius = '4px';
        
        ghBtn.addEventListener('mouseenter', () => ghBtn.style.opacity = '1');
        ghBtn.addEventListener('mouseleave', () => ghBtn.style.opacity = '0.5');
        
        ghBtn.addEventListener('click', showGithubConfigModal);
        
        document.body.appendChild(ghBtn);
    }
}

function showGithubConfigModal() {
    let modal = document.getElementById('gh-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'gh-modal';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:100000; justify-content:center; align-items:center; padding: 20px;';
        document.body.appendChild(modal);
    }
    
    const token = localStorage.getItem('gh_token') || '';
    const owner = localStorage.getItem('gh_owner') || '';
    const repo = localStorage.getItem('gh_repo') || '';
    const branch = localStorage.getItem('gh_branch') || 'main';

    window.saveGithubConfig = function() {
        localStorage.setItem('gh_token', document.getElementById('gh-input-token').value.trim());
        localStorage.setItem('gh_owner', document.getElementById('gh-input-owner').value.trim());
        localStorage.setItem('gh_repo', document.getElementById('gh-input-repo').value.trim());
        localStorage.setItem('gh_branch', document.getElementById('gh-input-branch').value.trim() || 'main');
        alert('Configuración de GitHub guardada correctamente.');
        document.getElementById('gh-modal').style.display='none';
    }

    modal.innerHTML = `
        <div style="background:#1f2937; border:1px solid var(--border-subtle); border-radius:12px; padding:24px; max-width:400px; width:100%; position:relative; font-family: 'Inter', sans-serif;">
            <button onclick="document.getElementById('gh-modal').style.display='none'" style="position:absolute; top:16px; right:20px; background:none; border:none; font-size:24px; color:var(--text-muted); cursor:pointer;">&times;</button>
            <h3 style="color:var(--text-main); margin-bottom:20px; border-bottom:1px solid var(--border-subtle); padding-bottom:10px;">Configuración GitHub Sync</h3>
            
            <div style="margin-bottom: 15px;">
                <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:5px;">Personal Access Token (PAT)</label>
                <input type="password" id="gh-input-token" value="${token}" style="width:100%; padding:8px; border-radius:4px; background:var(--bg-surface); color:var(--text-main); border:1px solid var(--border-subtle);" placeholder="ghp_...">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:5px;">Usuario (Owner)</label>
                <input type="text" id="gh-input-owner" value="${owner}" style="width:100%; padding:8px; border-radius:4px; background:var(--bg-surface); color:var(--text-main); border:1px solid var(--border-subtle);" placeholder="ej. mipas">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:5px;">Repositorio</label>
                <input type="text" id="gh-input-repo" value="${repo}" style="width:100%; padding:8px; border-radius:4px; background:var(--bg-surface); color:var(--text-main); border:1px solid var(--border-subtle);" placeholder="ej. 2koffice">
            </div>
            <div style="margin-bottom: 20px;">
                <label style="font-size:0.8rem; color:var(--text-muted); display:block; margin-bottom:5px;">Rama (Branch)</label>
                <input type="text" id="gh-input-branch" value="${branch}" style="width:100%; padding:8px; border-radius:4px; background:var(--bg-surface); color:var(--text-main); border:1px solid var(--border-subtle);" placeholder="main">
            </div>
            
            <button onclick="saveGithubConfig()" style="background:var(--accent-blue); color:#fff; border:none; padding:10px; width:100%; border-radius:6px; font-weight:bold; cursor:pointer;">Guardar Configuración</button>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-top:15px; text-align:center;">Si estos datos están rellenados, los cambios se subirán automáticamente a GitHub.</p>
        </div>
    `;
    modal.style.display = 'flex';
}

export function saveTransactionToHistory(description, oldPlayers, oldEconomy, oldDrafts = null) {
    const historyItem = {
        description: description,
        timestamp: Date.now(),
        players: oldPlayers,
        economy: oldEconomy,
        drafts: oldDrafts
    };
    
    let history = [];
    try {
        const stored = localStorage.getItem('2koffice_history');
        if (stored) history = JSON.parse(stored);
    } catch(e){}
    
    history.push(historyItem);
    if (history.length > 5) {
        history.shift();
    }
    
    localStorage.setItem('2koffice_history', JSON.stringify(history));
}

export function getHistory() {
    try {
        const stored = localStorage.getItem('2koffice_history');
        if (stored) return JSON.parse(stored);
    } catch(e){}
    return [];
}

export async function undoTransaction(index) {
    let history = getHistory();
    if (index < 0 || index >= history.length) return false;
    
    const item = history[index];
    if (!item || !item.players || !item.economy) return false;
    
    try {
        // Write old state back to CSV
        await writeCSV('players.csv', item.players);
        await writeCSV('economia.csv', item.economy);
        if (item.drafts) {
            await writeCSV('draft_picks.csv', item.drafts);
        }

        if (isGithubSyncEnabled()) {
            document.getElementById('history-modal').innerHTML = '<div style="color:white; font-size:1.5rem; text-align:center;">Deshaciendo y sincronizando con GitHub...<br><span style="font-size:1rem; color:var(--text-muted);">Por favor espera...</span></div>';
            let filesToSync = [];
            filesToSync.push({ path: 'players.csv', content: window.Papa.unparse(item.players) });
            filesToSync.push({ path: 'economia.csv', content: window.Papa.unparse(item.economy) });
            if (item.drafts) {
                filesToSync.push({ path: 'draft_picks.csv', content: window.Papa.unparse(item.drafts) });
            }
            await pushToGithub(filesToSync, "Deshacer: " + item.description);
        }
        
        // Remove this and all subsequent transactions
        history = history.slice(0, index);
        localStorage.setItem('2koffice_history', JSON.stringify(history));
        return true;
    } catch (e) {
        console.error("Undo error", e);
        return false;
    }
}

function showHistoryModal() {
    let modal = document.getElementById('history-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'history-modal';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:100000; justify-content:center; align-items:center; padding: 20px;';
        document.body.appendChild(modal);
    }
    
    const history = getHistory();
    let itemsHtml = '';
    
    if (history.length === 0) {
        itemsHtml = '<p style="color:var(--text-muted); text-align:center; padding:20px;">No hay cambios recientes.</p>';
    } else {
        // Reverse iterate to show newest first, or keep order?
        // History pushes new items to the end. It's better to show the newest at the top.
        // Actually if they undo, they undo a specific index. So let's keep track of real index.
        const reversedHistory = [...history].reverse();
        reversedHistory.forEach((item, revIdx) => {
            const realIdx = history.length - 1 - revIdx;
            const d = new Date(item.timestamp);
            const timeStr = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
            itemsHtml += `
                <div style="background:var(--bg-base); padding:12px; border-radius:6px; border:1px solid var(--border-subtle); margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="color:var(--text-main); display:block;">${item.description}</strong>
                        <span style="color:var(--text-muted); font-size:0.8rem;">Hoy a las ${timeStr}</span>
                    </div>
                    <button onclick="executeUndo(${realIdx})" style="background:var(--accent-red); color:#fff; border:none; padding:6px 12px; border-radius:4px; font-weight:bold; cursor:pointer;">Deshacer</button>
                </div>
            `;
        });
    }
    
    window.executeUndo = async function(idx) {
        if (!confirm('¿Seguro que quieres deshacer esto? Se perderán también TODOS los cambios realizados después de este.')) return;
        const ok = await undoTransaction(idx);
        if (ok) {
            alert('Cambio deshecho correctamente.');
            location.reload();
        } else {
            alert('Error al deshacer.');
        }
    }
    
    modal.innerHTML = `
        <div style="background:#1f2937; border:1px solid var(--border-subtle); border-radius:12px; padding:24px; max-width:400px; width:100%; position:relative; font-family: 'Inter', sans-serif;">
            <button onclick="document.getElementById('history-modal').style.display='none'" style="position:absolute; top:16px; right:20px; background:none; border:none; font-size:24px; color:var(--text-muted); cursor:pointer;">&times;</button>
            <h3 style="color:var(--text-main); margin-bottom:20px; border-bottom:1px solid var(--border-subtle); padding-bottom:10px;">Historial de Cambios</h3>
            <div style="max-height: 300px; overflow-y: auto; padding-right:5px;">
                ${itemsHtml}
            </div>
            <p style="font-size:0.75rem; color:var(--accent-orange); margin-top:15px; text-align:center;">Nota: Deshacer un cambio eliminará también todos los cambios posteriores a ese.</p>
        </div>
    `;
    
    modal.style.display = 'flex';
}

export function applyEconomyDelta(fullEconomy, teamId, addedSalary, moneyType = 'LS') {
    const teamIndex = parseInt(teamId) - 1;
    if (teamIndex < 0 || teamIndex >= fullEconomy.length) return false;
    
    const row = fullEconomy[teamIndex];
    if (!row) return false;

    // We SUBTRACT the addedSalary from the space columns
    // If a player is signed for 2M (addedSalary = 2M), available space drops by 2M.
    // If a player is waived with 2M (addedSalary = -2M), available space goes up by 2M.

    const columnsToUpdate = [
        "Disponible limite salarial",
        "Disponible presupuesto",
        "Efectivo LS (- Cap Hold)",
        "Efectivo Presupuesto (- firmas retrasadas)"
    ];

    if (moneyType === 'MLE') {
        columnsToUpdate.push("Disponible MLE");
    }

    columnsToUpdate.forEach(col => {
        if (row[col] !== undefined) {
            let currentVal = parseFloat(row[col]);
            if (!isNaN(currentVal)) {
                row[col] = (currentVal - addedSalary).toFixed(2);
            }
        }
    });

    return true;
}
