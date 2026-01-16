import db_manager
import logic_league
import logic_cup
import random

def get_group_tables(tournament_id):
    """Generuje tabele dla każdej grupy osobno."""
    matches = db_manager.get_matches(tournament_id)
    teams = db_manager.get_teams(tournament_id)
    
    # Grupowanie drużyn po nazwie grupy
    groups = {}
    for t in teams:
        grp = t.get('group_name')
        if grp:
            if grp not in groups: groups[grp] = []
            groups[grp].append(t)

    tables = {}
    for grp, grp_teams in groups.items():
        # Inicjalizacja wierszy tabeli
        table = {t['id']: {'name': t['name'], 'p': 0, 'w': 0, 'd': 0, 'l': 0, 'gf': 0, 'ga': 0, 'pts': 0} for t in grp_teams}
        
        # Filtrowanie meczów tylko dla tej grupy
        grp_matches = [m for m in matches if m['stage'] == f'GROUP_{grp}']

        for m in grp_matches:
            if m['status'] == 'FINISHED' and m['score_home'] is not None:
                h, a = m['home_team_id'], m['away_team_id']
                try:
                    sh, sa = int(m['score_home']), int(m['score_away'])
                except: continue

                if h in table:
                    table[h]['p'] += 1; table[h]['gf'] += sh; table[h]['ga'] += sa
                    if sh > sa: table[h]['w'] += 1; table[h]['pts'] += 3
                    elif sh == sa: table[h]['d'] += 1; table[h]['pts'] += 1
                    else: table[h]['l'] += 1
                
                if a in table:
                    table[a]['p'] += 1; table[a]['gf'] += sa; table[a]['ga'] += sh
                    if sa > sh: table[a]['w'] += 1; table[a]['pts'] += 3
                    elif sa == sh: table[a]['d'] += 1; table[a]['pts'] += 1
                    else: table[a]['l'] += 1
        
        # Sortowanie: punkty -> bilans bramek -> bramki zdobyte
        sorted_table = sorted(table.values(), key=lambda x: (x['pts'], x['gf']-x['ga'], x['gf']), reverse=True)
        tables[grp] = sorted_table
        
    return tables

def generate(tournament_id, teams, mode, start_date, m_dur, b_dur, num_fields):
    """Faza 1: Inicjalizacja grup."""
    num_teams = len(teams)
    num_groups = 2 if num_teams < 12 else 4
    group_names = ['A', 'B', 'C', 'D'][:num_groups]
    
    shuffled = list(teams)
    random.shuffle(shuffled)
    
    # Przypisanie grup w DB
    conn = db_manager.get_db_connection()
    for i, team in enumerate(shuffled):
        grp = group_names[i % num_groups]
        conn.execute('UPDATE teams SET group_name = ? WHERE id = ?', (grp, team['id']))
        team['group_name'] = grp
    conn.commit()
    conn.close()
    
    all_matches = []
    for grp in group_names:
        grp_teams = [t for t in shuffled if t.get('group_name') == grp]
        grp_matches = logic_league.generate(tournament_id, grp_teams, mode, start_date, m_dur, b_dur, num_fields)
        for m in grp_matches:
            m['stage'] = f'GROUP_{grp}'
            m['type'] = 'MIXED_GROUP'
            all_matches.append(m)
            
    return all_matches

def check_advancement(tournament_id, group_letter):
    all_tables = get_group_tables(tournament_id)
    
    # Sprawdź czy grupa zakończyła mecze
    import db_manager
    matches = db_manager.get_matches(tournament_id)
    group_matches = [m for m in matches if m['stage'] == f'GROUP_{group_letter}']
    if not all(m['status'] == 'FINISHED' for m in group_matches):
        return

    group_table = all_tables.get(group_letter)
    if len(group_table) < 2: return
    
    winner = group_table[0]  # 1. miejsce
    runner_up = group_table[1]  # 2. miejsce
    
    conn = db_manager.get_db_connection()
    
    # Logika krzyżowania (Mapping)
    # match_index to numer meczu w 1. rundzie pucharu
    mapping = {
        'A': {'winner_idx': 0, 'winner_slot': 'home', 'runner_idx': 1, 'runner_slot': 'away'},
        'B': {'winner_idx': 1, 'winner_slot': 'home', 'runner_idx': 0, 'runner_slot': 'away'},
        'C': {'winner_idx': 2, 'winner_slot': 'home', 'runner_idx': 3, 'runner_slot': 'away'},
        'D': {'winner_idx': 3, 'winner_slot': 'home', 'runner_idx': 2, 'runner_slot': 'away'}
    }
    
    config = mapping.get(group_letter)
    if config:
        # Wstaw zwycięzcę
        update_cup_slot(conn, tournament_id, config['winner_idx'], winner['id'], config['winner_slot'])
        # Wstaw drugie miejsce
        update_cup_slot(conn, tournament_id, config['runner_idx'], runner_up['id'], config['runner_slot'])
        
    conn.commit()
    conn.close()

def update_cup_slot(conn, tournament_id, match_index, team_id, slot):
    # Szukamy meczu pucharowego w pierwszej rundzie (round=1) o danym match_index
    query = f"""
        UPDATE matches 
        SET {slot}_team_id = ? 
        WHERE tournament_id = ? AND type = 'MIXED_CUP' AND match_index = ? AND round = 1
    """
    conn.execute(query, (team_id, tournament_id, match_index))