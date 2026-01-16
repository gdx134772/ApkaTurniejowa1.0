import sqlite3
from database import get_db_connection

# --- ZARZĄDZANIE TURNIEJAMI ---

def create_tournament_entry(name, t_type, mode, start_date, duration, break_time):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO tournaments (name, type, mode, start_date, match_duration, break_duration)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (name, t_type, mode, start_date, duration, break_time))
    t_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return t_id

def get_tournaments():
    conn = get_db_connection()
    ts = conn.execute('SELECT id, name, type, mode, created_at FROM tournaments ORDER BY created_at DESC').fetchall()
    conn.close()
    return [dict(t) for t in ts]

def delete_tournament(t_id):
    conn = get_db_connection()
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM matches WHERE tournament_id = ?', (t_id,))
        cursor.execute('DELETE FROM teams WHERE tournament_id = ?', (t_id,))
        cursor.execute('DELETE FROM tournaments WHERE id = ?', (t_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
    return {"success": True}

def get_tournament_config(t_id):
    conn = get_db_connection()
    cfg = conn.execute('SELECT * FROM tournaments WHERE id = ?', (t_id,)).fetchone()
    conn.close()
    return dict(cfg) if cfg else None

# --- DRUŻYNY ---

def add_team(tournament_id, name):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO teams (tournament_id, name) VALUES (?, ?)', (tournament_id, name))
    t_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return t_id

def get_teams(tournament_id):
    conn = get_db_connection()
    teams = conn.execute('SELECT * FROM teams WHERE tournament_id = ?', (tournament_id,)).fetchall()
    conn.close()
    return [dict(team) for team in teams]

# --- MECZE ---

def create_match(tournament_id, home_id, away_id, m_type, round_num, start_time=None, next_match_id=None, field=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO matches (tournament_id, home_team_id, away_team_id, type, round, status, start_time, next_match_id, field)
        VALUES (?, ?, ?, ?, ?, 'SCHEDULED', ?, ?, ?)
    ''', (tournament_id, home_id, away_id, m_type, round_num, start_time, next_match_id, field))
    match_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return match_id

def get_matches(tournament_id):
    conn = get_db_connection()
    query = '''
        SELECT m.*, t1.name as home_name, t2.name as away_name
        FROM matches m
        LEFT JOIN teams t1 ON m.home_team_id = t1.id
        LEFT JOIN teams t2 ON m.away_team_id = t2.id
        WHERE m.tournament_id = ?
        ORDER BY m.id ASC
    '''
    matches = conn.execute(query, (tournament_id,)).fetchall()
    conn.close()
    return [dict(m) for m in matches]

def update_match_score(match_id, score_home, score_away):
    conn = get_db_connection()
    conn.execute('''
        UPDATE matches 
        SET score_home = ?, score_away = ?, status = 'FINISHED'
        WHERE id = ?
    ''', (score_home, score_away, match_id))
    conn.commit()
    conn.close()