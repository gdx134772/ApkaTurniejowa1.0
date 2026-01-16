import sqlite3

DB_NAME = "turniej.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def create_tables():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tournaments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            mode TEXT NOT NULL,
            start_date TEXT,
            match_duration INTEGER DEFAULT 10,
            break_duration INTEGER DEFAULT 5,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS teams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tournament_id INTEGER,
            name TEXT NOT NULL,
            group_name TEXT DEFAULT NULL, 
            FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE
        )
    ''')

    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tournament_id INTEGER,
            home_team_id INTEGER,
            away_team_id INTEGER,
            score_home INTEGER DEFAULT NULL,
            score_away INTEGER DEFAULT NULL,
            
            type TEXT NOT NULL,
            stage TEXT DEFAULT 'MAIN', 
            round INTEGER,
            match_index INTEGER DEFAULT 0,
            status TEXT DEFAULT 'SCHEDULED',
            
            start_time TEXT,
            
            next_match_id INTEGER DEFAULT NULL,
            target_slot TEXT DEFAULT NULL,
            
            field INTEGER DEFAULT NULL, -- Numer boiska (1, 2, 3...)
            
            FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE,
            FOREIGN KEY (home_team_id) REFERENCES teams (id),
            FOREIGN KEY (away_team_id) REFERENCES teams (id)
        )
    ''')

    conn.commit()
    conn.close()
    print("Baza danych zaktualizowana (Dodano pole 'field').")

if __name__ == "__main__":
    create_tables()