/**
 * utils.js - Funciones de utilidad compartidas
 * ============================================
 */


export function parseCurrency(str) {
    if(!str) return 0;
    let s = str.toString();
    
    // Si tiene formato europeo con decimales (ej. 12.900,50)
    if (s.match(/\.\d{3}/) && s.match(/,\d{1,2}$/)) {
        s = s.replace(/\./g, '').replace(',', '.');
    } 
    // Si tiene formato europeo sin decimales (ej. 12.900)
    else if (s.match(/\.\d{3}/) && !s.includes(',')) {
        s = s.replace(/\./g, '');
    }
    
    let val = s.replace(/[^0-9.-]+/g, "");
    
    // Prevenir múltiples puntos decimales por si acaso
    let parts = val.split('.');
    if (parts.length > 2) {
        val = parts[0] + '.' + parts.slice(1).join('');
    }

    return parseFloat(val) || 0;
}

export function formatCurrency(num) {
    if (isNaN(num)) return "$0";
    let isNeg = num < 0;
    let absNum = Math.abs(num);
    return (isNeg ? "-$" : "$") + absNum.toLocaleString('en-US');
}

export function formatCurrencyOpt(val) {
    let num = parseFloat(val);
    if (!num || isNaN(num) || num === 0) return '-';
    return "$" + num.toLocaleString('en-US');
}

export function calculateRoundModifier(salary, round) {
    let mod = 1.0;
    if (round >= 2) mod *= 0.85; 
    if (round >= 3) mod *= 0.85; 
    if (round >= 4) mod *= 0.90; 
    if (round >= 5) mod *= 0.90; 
    if (round >= 6) mod *= 0.95; 
    if (round >= 7) mod *= 0.95; 
    return Math.round(salary * mod);
}

export function getPlayerPhotoPath(playerName) {
    if (!playerName) return 'photos/none.svg';
    let slug = playerName.toLowerCase();
    slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    slug = slug.replace(/['\.]/g, "");
    slug = slug.replace(/[^a-z0-9]+/g, "-");
    slug = slug.replace(/^-+|-+$/g, '');
    return `photos/${slug}.png`;
}

export function calculateAge(birthdateStr) {
    if (!birthdateStr || birthdateStr.trim() === '') return '-';
    const parts = birthdateStr.split(/[-/]/);
    if (parts.length !== 3) return '-';
    let year, month, day;
    if (parseInt(parts[0]) > 1000) {
        year = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        day = parseInt(parts[2]);
    } else {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        year = parseInt(parts[2]);
    }
    const birthDate = new Date(year, month, day);
    if (isNaN(birthDate)) return '-';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

export function generate2kRatingUrl(playerName) {
    if (!playerName) return '#';
    let slug = playerName.toLowerCase();
    slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    slug = slug.replace(/['\.]/g, "");
    slug = slug.replace(/[^a-z0-9]+/g, "-");
    slug = slug.replace(/^-+|-+$/g, '');
    return `https://www.2kratings.com/${slug}`;
}

export function getColorClass(val) {
    return val < 0 ? 'color-red' : 'color-green';
}

export function getOptClass(opt) {
    if (!opt) return "";
    opt = opt.toUpperCase();
    if (opt.includes('TO') || opt === 'T') return "opt-to";
    if (opt.includes('PO') || opt === 'P') return "opt-po";
    return "";
}
