// frontend/services/api.js

// ⚠️ WAŻNE: Zmień adres IP, jeśli testujesz na fizycznym telefonie!
// Emulator Androida: 'http://10.0.2.2:5000'
// Fizyczny telefon: 'http://192.168.X.X:5000' (Sprawdź ipconfig/ifconfig)
// Przeglądarka: 'http://127.0.0.1:5000'
const API_URL = 'http://127.0.0.1:5000'; 


export const getTournaments = async () => {
    try {
        const res = await fetch(`${API_URL}/tournaments`);
        return await res.json();
    } catch (e) { return []; }
};

export const deleteTournament = async (id) => {
    await fetch(`${API_URL}/tournaments/${id}`, { method: 'DELETE' });
};

export const createTournament = async (config) => {
    try {
        const res = await fetch(`${API_URL}/create-tournament`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
        return await res.json();
    } catch (e) {
        return { success: false, message: "Błąd sieci" };
    }
};

export const getTournamentData = async (id) => {
    try {
        const res = await fetch(`${API_URL}/tournament/${id}/data`);
        return await res.json();
    } catch (e) { return null; }
};

export const updateScore = async (matchId, sHome, sAway) => {
    await fetch(`${API_URL}/update-score`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, home_score: sHome, away_score: sAway }),
    });
};