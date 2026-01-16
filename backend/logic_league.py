import random
from datetime import datetime, timedelta

def generate(tournament_id, teams, mode, start_date_str=None, match_duration=10, break_duration=5, num_fields=1):
    matches = []
    
    if len(teams) % 2 != 0:
        teams.append(None) 
        
    num_teams = len(teams)
    num_rounds = num_teams - 1
    half = num_teams // 2
    
    rotation = list(teams)
    
    current_time = datetime.now()
    if mode == 'REAL_TIME' and start_date_str:
        try:
            current_time = datetime.strptime(start_date_str, "%Y-%m-%d %H:%M")
        except: pass

    match_index = 0

    for r in range(num_rounds):
        matches_in_batch = 0 
        
        for i in range(half):
            t1 = rotation[i]
            t2 = rotation[num_teams - 1 - i]
            
            if t1 is not None and t2 is not None:
                # Obliczanie numeru boiska (tylko jeśli mamy więcej niż 1)
                field_num = None
                if mode == 'REAL_TIME' and num_fields > 1:
                    field_num = matches_in_batch + 1

                match_obj = {
                    'home': t1['id'],
                    'away': t2['id'],
                    'type': 'LEAGUE',
                    'stage': 'MAIN',
                    'round': r + 1,
                    'match_index': match_index,
                    'start_time': current_time.strftime("%Y-%m-%d %H:%M") if mode == 'REAL_TIME' else None,
                    'field': field_num # Zapisujemy nr boiska
                }
                matches.append(match_obj)
                match_index += 1
                
                if mode == 'REAL_TIME':
                    matches_in_batch += 1
                    if matches_in_batch >= num_fields:
                        current_time += timedelta(minutes=(match_duration + break_duration))
                        matches_in_batch = 0
        
        if mode == 'REAL_TIME' and matches_in_batch > 0:
             current_time += timedelta(minutes=(match_duration + break_duration))

        rotation.insert(1, rotation.pop())

    return matches

def get_detailed_table(tournament_id):
    import db_manager
    matches = db_manager.get_matches(tournament_id)
    teams = db_manager.get_teams(tournament_id)
    
    table = {t['id']: {'name': t['name'], 'p': 0, 'w': 0, 'd': 0, 'l': 0, 'gf': 0, 'ga': 0, 'pts': 0} for t in teams}
    
    for m in matches:
        if m['status'] == 'FINISHED' and m['score_home'] is not None:
            h, a = m['home_team_id'], m['away_team_id']
            try:
                sh = int(m['score_home'])
                sa = int(m['score_away'])
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

    sorted_table = sorted(table.values(), key=lambda x: (x['pts'], x['gf']-x['ga'], x['gf']), reverse=True)
    return sorted_table