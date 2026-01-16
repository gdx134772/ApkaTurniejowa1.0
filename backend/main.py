from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import database
import db_manager
import logic_league, logic_cup, logic_mixed
import traceback 

app = Flask(__name__)
CORS(app)

database.create_tables()

def handle_cup_advancement(match_id, winner_id):
    conn = database.get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM matches WHERE id = ?", (match_id,))
    current_match = cur.fetchone()
    
    if not current_match or not current_match['next_match_id'] or not current_match['target_slot']:
        conn.close()
        return

    next_m_id = current_match['next_match_id']
    target_slot = current_match['target_slot'] 
    column_name = 'home_team_id' if target_slot == 'home' else 'away_team_id'
    
    cur.execute(f"UPDATE matches SET {column_name} = ? WHERE id = ?", (winner_id, next_m_id))
    conn.commit()
    conn.close()

@app.route('/create-tournament', methods=['POST'])
def create():
    try:
        data = request.json
        name = data.get('name', 'Bez nazwy')
        t_type = data.get('type', 'LEAGUE')
        mode = data.get('mode', '4FUN')
        teams = data.get('teams', [])
        
        # --- NOWE: Liczba boisk ---
        num_fields = int(data.get('fields', 1))
        
        if t_type == 'CUP':
            n = len(teams)
            if not (n > 1 and (n & (n - 1) == 0)):
                return jsonify({"success": False, "message": "Liczba drużyn musi być potęgą 2 (4, 8, 16...)."}), 400

        start_date_str = data.get('startDate', datetime.now().strftime("%Y-%m-%d %H:%M"))
        m_dur = int(data.get('matchDuration', 10))
        b_dur = int(data.get('breakDuration', 5))
        
        if len(teams) < 2: return jsonify({"success": False, "message": "Min. 2 drużyny!"}), 400

        t_id = db_manager.create_tournament_entry(name, t_type, mode, start_date_str, m_dur, b_dur)
        
        team_objs = []
        for t_name in teams:
            tid = db_manager.add_team(t_id, t_name)
            team_objs.append({'id': tid, 'name': t_name})
            
        matches_data = []
        # Przekazujemy num_fields do generatorów
        if t_type == 'LEAGUE':
            matches_data = logic_league.generate(t_id, team_objs, mode, start_date_str, m_dur, b_dur, num_fields)
        elif t_type == 'CUP':
            matches_data = logic_cup.generate(t_id, team_objs, mode, start_date_str, m_dur, b_dur, num_fields)
        elif t_type == 'MIXED':
            # Mixed korzysta z logiki ligowej per grupa, można tam też dodać boiska, ale dla uproszczenia zostawmy 1 per grupa lub dodajmy później
            matches_data = logic_mixed.generate(t_id, team_objs, mode, start_date_str)

        created_matches_map = {} 
        for m in matches_data:
            # ZMIANA: Przekazujemy m.get('field')
            real_id = db_manager.create_match(
                t_id, m['home'], m['away'], m['type'], m['round'], 
                start_time=m.get('start_time'),
                field=m.get('field') 
            )
            created_matches_map[(m['round'], m.get('match_index', 0))] = real_id

        conn = database.get_db_connection()
        cur = conn.cursor()
        try:
            if t_type == 'CUP':
                for m in matches_data:
                    curr_id = created_matches_map.get((m['round'], m.get('match_index')))
                    next_idx = m.get('next_match_index')
                    t_slot = m.get('target_slot')
                    
                    if next_idx is not None and t_slot:
                        target_id = created_matches_map.get((m['round'] + 1, next_idx))
                        if curr_id and target_id:
                            cur.execute(
                                "UPDATE matches SET next_match_id = ?, target_slot = ? WHERE id = ?", 
                                (target_id, t_slot, curr_id)
                            )
            conn.commit()
        finally:
            conn.close()

        return jsonify({"success": True, "id": t_id})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/tournaments', methods=['GET'])
def list_trns(): return jsonify(db_manager.get_tournaments())

@app.route('/tournament/<int:t_id>/view', methods=['GET'])
def get_view(t_id):
    config = db_manager.get_tournament_config(t_id)
    if not config: return jsonify({"error": "Brak"}), 404
    
    matches = db_manager.get_matches(t_id)
    resp = {"type": config['type'], "name": config['name'], "mode": config['mode'], "matches": matches, "data": {}}
    
    if config['type'] == 'LEAGUE': 
        resp['data']['table'] = logic_league.get_detailed_table(t_id)
    elif config['type'] == 'CUP': 
        resp['data']['bracket'] = logic_cup.get_bracket_data(t_id)
    elif config['type'] == 'MIXED':
        resp['data']['tables'] = logic_mixed.get_group_tables(t_id) 
        
    return jsonify(resp)

@app.route('/update-score', methods=['PUT'])
def update_score():
    try:
        data = request.json
        match_id = data['match_id']
        h_score = int(data['home'])
        a_score = int(data['away'])
        manual_winner_id = data.get('winner_id') 

        db_manager.update_match_score(match_id, h_score, a_score)
        
        conn = database.get_db_connection()
        m = conn.execute("SELECT * FROM matches WHERE id=?", (match_id,)).fetchone()
        conn.close()
        
        if m and m['type'] == 'CUP':
            winner_id = None
            if h_score > a_score: winner_id = m['home_team_id']
            elif a_score > h_score: winner_id = m['away_team_id']
            elif manual_winner_id: winner_id = manual_winner_id

            if winner_id:
                handle_cup_advancement(match_id, winner_id)

        return jsonify({"success": True})
    except Exception as e: return jsonify({"success": False, "message": str(e)}), 500

@app.route('/tournaments/<int:t_id>', methods=['DELETE'])
def delete_trn(t_id):
    print(f"--- OTRZYMANO ŻĄDANIE USUNIĘCIA TURNIEJU ID: {t_id} ---")
    try:
        result = db_manager.delete_tournament(t_id)
        print(f"--- SUKCES: USUNIĘTO TURNIEJ ID: {t_id} ---")
        return jsonify(result)
    except Exception as e:
        print(f"!!! BŁĄD PODCZAS USUWANIA ID {t_id}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)