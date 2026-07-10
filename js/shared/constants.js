/**
 * constants.js â€” Fuente Ãºnica de verdad para constantes globales
 * =============================================================
 * Cargado antes que cualquier script de pÃ¡gina.
 * Si necesitas cambiar un nombre de equipo, ruta de logo o ruta de CSV,
 * este es el Ãºnico archivo que debes tocar.
 */

// -----------------------------------------------------------------
// RUTAS A LOS ARCHIVOS DE DATOS
// -----------------------------------------------------------------
export const CSV_URLS = {
    players:  'players.csv',
    economia: 'economia.csv',
    draft:    'draft_picks.csv'
};

// ID especial que identifica a los Agentes Libres en players.csv
export const FA_TEAM_ID = '31';

// -----------------------------------------------------------------
// LOGOS DE EQUIPOS
// Mapa: Nombre oficial del equipo â†’ archivo de imagen (en /logos/)
// -----------------------------------------------------------------
export const TEAM_LOGOS = {
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
export const TEAM_ABBR = {
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

// -----------------------------------------------------------------
// REGLAS DE ECONOMÃA
// Modificar aquÃ­ si cambian las reglas de liga.
// -----------------------------------------------------------------

/** NÃºmero mÃ¡ximo de jugadores para calcular plazas libres (freespot) */
export const ROSTER_THRESHOLD = 14;

/** NÃºmero de jugadores que marca el roster lleno (no se puede fichar sin Bird/R) */
export const ROSTER_FULL = 15;

/** Bonus econÃ³mico ($) por cada plaza libre de roster que se ocupa al firmar */
export const FREESPOT_BONUS = 1_800_000;

/** Equipo que se preselecciona al arrancar la aplicaciÃ³n */
export const DEFAULT_TEAM = 'Orlando Magic';

// -----------------------------------------------------------------
// REGLAS DE RONDA DE AGENCIA LIBRE
// Controla cÃ³mo se asigna la ronda de mercado a cada FA segÃºn su Rating.
// -----------------------------------------------------------------

/** Umbrales de Rating para asignar ronda inicial */
export const ROUND_THRESHOLDS = { R1: 85, R2: 82, R3: 80, R4: 75 };

/**
 * Rango de posiciones en el CSV rawPlayers que fuerza la Ronda 3
 * independientemente del Rating. Marca el inicio y fin del rango.
 */
export const RANGE_R3_START = 'C.J. McCollum';
export const RANGE_R3_END   = 'Tari Eason';

/** Jugadores dentro del rango R3 que quedan exentos de la forzado a Ronda 3 */
export const RANGE_R3_EXCEPTIONS = ['Shaedon Sharpe', 'Walker Kessler'];

/** Jugadores con descuento manual adicional sobre su salario base */
export const PLAYER_EXTRA_DISCOUNTS = [
    { name: 'C.J. McCollum', multiplier: 0.85 },
    { name: 'Ty Jerome',     multiplier: 0.85 },
];

/** Jugadores que se quedan en Ronda 4 (no bajan automÃ¡ticamente a R5) */
export const FIXED_ROUND4_PLAYERS = ['Tim Hardaway Jr.', 'Jaxson Hayes'];

/**
 * Jugadores excluidos del degradado automÃ¡tico de ronda al siguiente nivel.
 * Estos tienen contratos retrasados fijos que los salvan del decay normal.
 */
export const DELAY_LIST = ['Jarrett Allen', 'Mark Williams', 'Tim Hardaway Jr.', 'Jaxson Hayes'];

// -----------------------------------------------------------------
// FIRMAS RETRASADAS PRECONFIGURADAS
// EstÃ¡n calculadas en el CSV de economÃ­a; solo se reflejan en la UI.
// -----------------------------------------------------------------

/** Firmas retrasadas para FA Office (fa.html) */
export const FIXED_DELAYED_FA = [
    { name: 'Paolo Banchero',     team: 'New York Knicks'    },
    { name: 'Chet Holmgren',      team: 'Detroit Pistons'    },
    { name: 'Jarrett Allen',      team: 'Los Angeles Lakers' },
    { name: 'Michael Porter Jr.', team: 'Atlanta Hawks'      },
    { name: 'Jalen Duren',        team: 'Atlanta Hawks'      },
    { name: 'DeMar DeRozan',      team: 'Detroit Pistons'    },
    { name: 'Shaedon Sharpe',     team: 'New York Knicks'    },
    { name: 'Walker Kessler',     team: 'Orlando Magic'      },
    { name: 'Mark Williams',      team: 'Memphis Grizzlies'  },
];

/** Firmas retrasadas para el Simulador Global (simulador.html) */
export const FIXED_DELAYED_SIM = [
    { name: 'Jarrett Allen',     team: 'Los Angeles Lakers' },
    { name: 'Mark Williams',     team: 'Memphis Grizzlies'  },
    { name: 'Tim Hardaway Jr.',  team: 'Los Angeles Lakers' },
    { name: 'Jaxson Hayes',      team: 'Los Angeles Lakers' },
];

// -----------------------------------------------------------------
// ASSETS DE UI
// -----------------------------------------------------------------

/** SVG path del icono de estrella relleno (jugador favorito) */
export const STAR_PATH_FILLED = 'M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.692c.197-.39.73-.39.927 0l2.184 4.427 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z';

/** SVG path del icono de estrella vacÃ­o (jugador no favorito) */
export const STAR_PATH_EMPTY  = 'M2.866 14.85c-.078.444.368.791.746.593l4.39-2.256 4.389 2.256c.377.197.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z';
