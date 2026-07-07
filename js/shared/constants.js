/**
 * constants.js — Fuente única de verdad para constantes globales
 * =============================================================
 * Cargado antes que cualquier script de página.
 * Si necesitas cambiar un nombre de equipo, ruta de logo o ruta de CSV,
 * este es el único archivo que debes tocar.
 */

// -----------------------------------------------------------------
// RUTAS A LOS ARCHIVOS DE DATOS
// -----------------------------------------------------------------
const CSV_URLS = {
    players:  'players.csv',
    economia: 'economia.csv',
    draft:    'draft_picks.csv'
};

// ID especial que identifica a los Agentes Libres en players.csv
const FA_TEAM_ID = '31';

// -----------------------------------------------------------------
// LOGOS DE EQUIPOS
// Mapa: Nombre oficial del equipo → archivo de imagen (en /logos/)
// -----------------------------------------------------------------
const TEAM_LOGOS = {
    "Atlanta Hawks":           "imgi_287_atl.png",
    "Boston Celtics":          "imgi_267_bos.png",
    "Brooklyn Nets":           "imgi_268_bkn.png",
    "Charlotte Hornets":       "imgi_288_cha.png",
    "Chicago Bulls":           "imgi_272_chi.png",
    "Cleveland Cavaliers":     "imgi_273_cle.png",
    "Dallas Mavericks":        "imgi_292_dal.png",
    "Denver Nuggets":          "imgi_277_den.png",
    "Detroit Pistons":         "imgi_274_det.png",
    "Golden State Warriors":   "imgi_282_gs.png",
    "Houston Rockets":         "imgi_293_hou.png",
    "Indiana Pacers":          "imgi_275_ind.png",
    "Los Angeles Clippers":    "imgi_283_lac.png",
    "Los Angeles Lakers":      "imgi_284_lal.png",
    "Memphis Grizzlies":       "imgi_294_mem.png",
    "Miami Heat":              "imgi_289_mia.png",
    "Milwaukee Bucks":         "imgi_276_mil.png",
    "Minnesota Timberwolves":  "imgi_278_min.png",
    "New Orleans Pelicans":    "imgi_295_no.png",
    "New York Knicks":         "imgi_269_ny.png",
    "Oklahoma City Thunder":   "imgi_279_okc.png",
    "Orlando Magic":           "imgi_290_orl.png",
    "Philadelphia 76ers":      "imgi_270_phi.png",
    "Phoenix Suns":            "imgi_285_phx.png",
    "Portland Trail Blazers":  "imgi_280_por.png",
    "Sacramento Kings":        "imgi_286_sac.png",
    "San Antonio Spurs":       "imgi_296_sa.png",
    "Toronto Raptors":         "imgi_271_tor.png",
    "Utah Jazz":               "imgi_281_utah.png",
    "Washington Wizards":      "imgi_291_wsh.png"
};

// -----------------------------------------------------------------
// ABREVIATURAS DE EQUIPOS
// -----------------------------------------------------------------
const TEAM_ABBR = {
    "Atlanta Hawks":           "ATL",
    "Boston Celtics":          "BOS",
    "Brooklyn Nets":           "BKN",
    "Charlotte Hornets":       "CHA",
    "Chicago Bulls":           "CHI",
    "Cleveland Cavaliers":     "CLE",
    "Dallas Mavericks":        "DAL",
    "Denver Nuggets":          "DEN",
    "Detroit Pistons":         "DET",
    "Golden State Warriors":   "GSW",
    "Houston Rockets":         "HOU",
    "Indiana Pacers":          "IND",
    "Los Angeles Clippers":    "LAC",
    "Los Angeles Lakers":      "LAL",
    "Memphis Grizzlies":       "MEM",
    "Miami Heat":              "MIA",
    "Milwaukee Bucks":         "MIL",
    "Minnesota Timberwolves":  "MIN",
    "New Orleans Pelicans":    "NOP",
    "New York Knicks":         "NYK",
    "Oklahoma City Thunder":   "OKC",
    "Orlando Magic":           "ORL",
    "Philadelphia 76ers":      "PHI",
    "Phoenix Suns":            "PHX",
    "Portland Trail Blazers":  "POR",
    "Sacramento Kings":        "SAC",
    "San Antonio Spurs":       "SAS",
    "Toronto Raptors":         "TOR",
    "Utah Jazz":               "UTA",
    "Washington Wizards":      "WAS"
};
