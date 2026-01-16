import math
import random
from datetime import datetime, timedelta

def is_power_of_two(n):
    return n > 0 and (n & (n - 1)) == 0

def generate(tournament_id, teams, mode, start_date_str=None, match_duration=10, break_duration=5, num_fields=1):
    matches = []
    num_teams = len(teams)

    if not is_power_of_two(num_teams):
        return []

    shuffled_teams = list(teams)
    random.shuffle(shuffled_teams)

    current_time = datetime.now()
    if mode == 'REAL_TIME' and start_date_str:
        try:
            current_time = datetime.strptime(start_date_str, "%Y-%m-%d %H:%M")
        except: pass

    total_rounds = int(math.log2(num_teams))
    matches_in_current_round = num_teams // 2

    for r in range(1, total_rounds + 1):
        stage_name = f'RUNDA {r}'
        if r == total_rounds: stage_name = 'FINAŁ'
        elif r == total_rounds - 1: stage_name = 'PÓŁFINAŁ'

        matches_in_batch = 0 

        for i in range(matches_in_current_round):
            home_id = None
            away_id = None
            if r == 1:
                home_id = shuffled_teams[2 * i]['id']
                away_id = shuffled_teams[2 * i + 1]['id']

            next_idx = None
            target_slot = None
            
            if r < total_rounds:
                next_idx = i // 2
                if i % 2 == 0: target_slot = 'home'
                else: target_slot = 'away'

            # Obliczanie boiska
            field_num = None
            if mode == 'REAL_TIME' and num_fields > 1:
                field_num = matches_in_batch + 1

            match_obj = {
                'home': home_id,
                'away': away_id,
                'type': 'CUP',
                'stage': stage_name,
                'round': r,
                'match_index': i,
                'start_time': current_time.strftime("%Y-%m-%d %H:%M") if mode == 'REAL_TIME' else None,
                'score_home': None,
                'score_away': None,
                'next_match_index': next_idx,
                'target_slot': target_slot,
                'field': field_num # Zapisujemy boisko
            }
            matches.append(match_obj)

            if mode == 'REAL_TIME':
                matches_in_batch += 1
                if matches_in_batch >= num_fields:
                    current_time += timedelta(minutes=(match_duration + break_duration))
                    matches_in_batch = 0
        
        if mode == 'REAL_TIME' and matches_in_batch > 0:
             current_time += timedelta(minutes=(match_duration + break_duration))
             current_time += timedelta(minutes=10)
        elif mode == 'REAL_TIME':
             current_time += timedelta(minutes=10)

        matches_in_current_round //= 2

    return matches

def get_bracket_data(tournament_id):
    import db_manager
    matches = db_manager.get_matches(tournament_id)
    bracket = {}
    for m in matches:
        r = m['round']
        if r not in bracket: bracket[r] = []
        bracket[r].append(m)
    return bracket