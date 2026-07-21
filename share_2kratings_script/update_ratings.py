import pandas as pd
import cloudscraper
from bs4 import BeautifulSoup
import re
import time
import random
import unicodedata
import os
import shutil

# Configuración
import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # h:\Mi unidad\2kOFFICE
CSV_FILE = os.path.join(BASE_DIR, 'data', 'players.csv')
BACKUP_FILE = os.path.join(BASE_DIR, 'data', 'players_backup.csv')

def clean_name(name):
    # Convertir a minúsculas
    name = str(name).lower()
    # Eliminar acentos y caracteres especiales
    name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode('utf-8')
    # Reemplazar espacios por guiones y eliminar puntos o comillas
    name = re.sub(r'[^a-z0-9\s-]', '', name)
    name = re.sub(r'\s+', '-', name)
    return name

def get_teams(scraper):
    print("[*] Usando lista de 31 equipos/agentes libres fijos...")
    return [
        "https://www.2kratings.com/teams/atlanta-hawks",
        "https://www.2kratings.com/teams/boston-celtics",
        "https://www.2kratings.com/teams/brooklyn-nets",
        "https://www.2kratings.com/teams/charlotte-hornets",
        "https://www.2kratings.com/teams/chicago-bulls",
        "https://www.2kratings.com/teams/cleveland-cavaliers",
        "https://www.2kratings.com/teams/dallas-mavericks",
        "https://www.2kratings.com/teams/denver-nuggets",
        "https://www.2kratings.com/teams/detroit-pistons",
        "https://www.2kratings.com/teams/golden-state-warriors",
        "https://www.2kratings.com/teams/houston-rockets",
        "https://www.2kratings.com/teams/indiana-pacers",
        "https://www.2kratings.com/teams/los-angeles-clippers",
        "https://www.2kratings.com/teams/los-angeles-lakers",
        "https://www.2kratings.com/teams/memphis-grizzlies",
        "https://www.2kratings.com/teams/miami-heat",
        "https://www.2kratings.com/teams/milwaukee-bucks",
        "https://www.2kratings.com/teams/minnesota-timberwolves",
        "https://www.2kratings.com/teams/new-orleans-pelicans",
        "https://www.2kratings.com/teams/new-york-knicks",
        "https://www.2kratings.com/teams/oklahoma-city-thunder",
        "https://www.2kratings.com/teams/orlando-magic",
        "https://www.2kratings.com/teams/philadelphia-76ers",
        "https://www.2kratings.com/teams/phoenix-suns",
        "https://www.2kratings.com/teams/portland-trail-blazers",
        "https://www.2kratings.com/teams/sacramento-kings",
        "https://www.2kratings.com/teams/san-antonio-spurs",
        "https://www.2kratings.com/teams/toronto-raptors",
        "https://www.2kratings.com/teams/utah-jazz",
        "https://www.2kratings.com/teams/washington-wizards",
        "https://www.2kratings.com/teams/free-agency"
    ]

def scrape_team_players(scraper, team_url):
    team_dict = {}
    try:
        response = scraper.get(team_url, timeout=15)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            rows = soup.find_all('tr')
            for row in rows:
                cells = row.find_all('td')
                if len(cells) > 2:
                    # Encontrar el enlace al perfil del jugador
                    a_tag = row.find('a', href=re.compile(r'^https://www.2kratings.com/[^/]+$'))
                    if a_tag:
                        url_name = a_tag['href'].split('/')[-1]
                        try:
                            # La columna 2 suele contener el Overall
                            ovr_text = cells[2].text.strip()
                            ovr = int(ovr_text)
                            team_dict[url_name] = ovr
                        except ValueError:
                            pass
    except Exception as e:
        print(f"Error escaneando equipo {team_url}: {e}")
    return team_dict

def get_overall_fallback(scraper, player_name):
    url_name = clean_name(player_name)
    url = f'https://www.2kratings.com/{url_name}'
    try:
        response = scraper.get(url, timeout=15)
        if response.status_code == 200:
            html = response.text
            match = re.search(r'labels:\s*\["Overall"[^\]]*\],\s*(?:[^\]]*\s*)*?data:\s*\[(\d+)', html)
            if match:
                return int(match.group(1))
            match2 = re.search(r'labels:\s*\["Overall".*?data:\s*\[(\d+)', html, re.DOTALL)
            if match2:
                return int(match2.group(1))
            match3 = re.search(r'<span class="attribute-box[^>]*>(\d+)</span>', html)
            if match3:
                return int(match3.group(1))
    except Exception:
        pass
    return None

def main():
    print("Iniciando actualización inteligente de Ratings (Modo Seguro)...")
    
    if os.path.exists(CSV_FILE):
        shutil.copy(CSV_FILE, BACKUP_FILE)
        print(f"Copia de seguridad creada en {BACKUP_FILE}")
    else:
        print(f"Error: No se encontró el archivo {CSV_FILE}")
        return
        
    df = pd.read_csv(CSV_FILE)
    if 'Player' not in df.columns or 'Rating' not in df.columns:
        print("Error: El CSV no tiene las columnas 'Player' o 'Rating'.")
        return
        
    scraper = cloudscraper.create_scraper()
    
    # FASE 1: Scraping de Equipos
    teams = get_teams(scraper)
    if not teams:
        print("[!] No se pudieron obtener los equipos. Revisa tu conexión.")
        return
        
    print(f"[*] Encontrados {len(teams)} equipos. Iniciando recolección global en segundo plano...")
    
    global_ratings = {}
    for i, team_url in enumerate(teams):
        team_name = team_url.split('/')[-1]
        print(f"  -> [{i+1}/{len(teams)}] Escaneando {team_name}...")
        team_players = scrape_team_players(scraper, team_url)
        global_ratings.update(team_players)
        
        # Pausa aleatoria (Jitter) para evitar baneos
        sleep_time = random.uniform(5.0, 12.0)
        time.sleep(sleep_time)
        
    print(f"[*] Recolección de equipos finalizada. Jugadores en memoria: {len(global_ratings)}")
    
    # FASE 2: Trasvase de datos
    print("\n[*] Actualizando CSV local...")
    actualizados = 0
    errores = 0
    total = len(df)
    
    for index, row in df.iterrows():
        player_name = row['Player']
        old_rating = row['Rating']
        url_name = clean_name(player_name)
        
        new_rating = None
        # Buscar primero en nuestro diccionario global
        if url_name in global_ratings:
            new_rating = global_ratings[url_name]
        else:
            # Fallback para agentes libres o jugadores que no estaban en equipos
            print(f"  [!] {player_name} no encontrado en memoria. Buscando perfil individual (Fallback)...")
            time.sleep(random.uniform(3.0, 6.0)) # Jitter para el fallback
            new_rating = get_overall_fallback(scraper, player_name)
        
        if new_rating is not None:
            if new_rating != old_rating:
                print(f"  => {player_name}: Actualizado {old_rating} -> {new_rating}")
                df.at[index, 'Rating'] = new_rating
                actualizados += 1
        else:
            errores += 1
            print(f"  [X] No se pudo obtener rating para: {player_name}")
            
        # Guardado parcial cada 50 jugadores
        if (index + 1) % 50 == 0:
            df.to_csv(CSV_FILE, index=False)
            
    df.to_csv(CSV_FILE, index=False)
    print("\n--- RESUMEN ---")
    print(f"Jugadores procesados: {total}")
    print(f"Ratings actualizados: {actualizados}")
    print(f"Errores / No encontrados: {errores}")
    print("El archivo players.csv ha sido actualizado exitosamente.")

if __name__ == "__main__":
    main()
