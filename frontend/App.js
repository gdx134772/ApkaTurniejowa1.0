import React, { useState, useEffect } from 'react'; 
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ScrollView, Alert, RefreshControl, SafeAreaView, ActivityIndicator, StatusBar, 
  Platform 
} from 'react-native';

const API_URL = 'http://10.0.2.2:5000';


// --- KOLORYSTYKA ---
const lightColors = {
  bg: '#F5F7FA', card: '#FFFFFF', text: '#2D3748', textSub: '#718096',
  primary: '#007AFF', border: '#E2E8F0', inputBg: '#F7FAFC',
  successBg: '#F0FFF4', successBorder: '#48BB78',
  gold: '#ECC94B'
};

const darkColors = {
  bg: '#1A202C', card: '#2D3748', text: '#F7FAFC', textSub: '#A0AEC0',
  primary: '#4299E1', border: '#4A5568', inputBg: '#2D3748',
  successBg: '#22543D', successBorder: '#48BB78',
  gold: '#D69E2E'
};

// --- FUNKCJA POMOCNICZA: RZYMSKIE CYFRY ---
const toRoman = (num) => {
  const map = {1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII'};
  return map[num] || num;
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const theme = isDarkMode ? darkColors : lightColors;

  const [view, setView] = useState('LIST'); 
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Formularz
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('LEAGUE'); 
  const [gameMode, setGameMode] = useState('4FUN');
  
  const [inputDate, setInputDate] = useState('');
  const [inputTime, setInputTime] = useState(''); 
  
  const [matchDuration, setMatchDuration] = useState('10');
  const [breakDuration, setBreakDuration] = useState('5');
  const [numFields, setNumFields] = useState('1'); // Liczba boisk

  const [teamName, setTeamName] = useState('');
  const [teams, setTeams] = useState([]);
  
  const [activeTrn, setActiveTrn] = useState(null);
  const [trnData, setTrnData] = useState(null);

  useEffect(() => { if (view === 'LIST') fetchTournaments(); }, [view]);

  // Ustawienie domyślnej daty przy wejściu w kreator
  useEffect(() => {
      if (view === 'CREATE') {
          const now = new Date();
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          setInputDate(`${yyyy}-${mm}-${dd}`);
          const nextHour = now.getHours() + 1;
          setInputTime(`${String(nextHour).padStart(2,'0')}:00`);
      }
  }, [view]);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/tournaments`);
      const data = await res.json();
      setTournaments(data);
    } catch (e) { 
        console.log("Błąd pobierania:", e); 
    }
    setLoading(false);
  };

  const isPowerOfTwo = (n) => n > 1 && (n & (n - 1)) === 0;

  const handleCreate = async () => {
    if (!newName.trim()) return Alert.alert("Uwaga", "Podaj nazwę turnieju!");
    if (teams.length < 2) return Alert.alert("Uwaga", "Dodaj minimum 2 drużyny!");

    if (newType === 'CUP') {
        const n = teams.length;
        if (!isPowerOfTwo(n)) {
            Alert.alert("Błąd", `W Pucharze liczba drużyn musi być potęgą 2 (np. 4, 8, 16). Masz: ${n}.`);
            return;
        }
    }

    const fullStartDate = `${inputDate} ${inputTime}`; 

    setLoading(true);
    try {
      const payload = {
        name: newName, type: newType, mode: gameMode, teams: teams,
        startDate: fullStartDate,
        matchDuration: parseInt(matchDuration)||10, 
        breakDuration: parseInt(breakDuration)||5,
        fields: parseInt(numFields) || 1
      };

      const res = await fetch(`${API_URL}/create-tournament`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const responseData = await res.json();
      
      if (responseData.success) {
        setNewName(''); setTeams([]); setTeamName(''); 
        fetchTournaments(); setView('LIST');
      } else { 
        Alert.alert("Błąd", responseData.message); 
      }
    } catch (e) { Alert.alert("Błąd", "Brak połączenia."); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
      const performDelete = async () => {
          const previousData = [...tournaments];
          setTournaments(prev => prev.filter(t => t.id !== id));
          try {
              const res = await fetch(`${API_URL}/tournaments/${id}`, { method: 'DELETE' });
              const json = await res.json();
              if (json.success) fetchTournaments();
              else { Alert.alert("Błąd", "Nie usunięto."); setTournaments(previousData); }
          } catch (e) {
              setTournaments(previousData);
              if (Platform.OS === 'web') alert("Błąd sieci."); else Alert.alert("Błąd sieci.");
          }
      };
      if (Platform.OS === 'web') { if (window.confirm("Usunąć?")) performDelete(); }
      else { Alert.alert("Usuń", "Na pewno?", [{ text: "Anuluj" }, { text: "Usuń", onPress: performDelete }]); }
  };
  
  const openTournament = async (id) => { 
      setLoading(true); 
      try { 
          const res = await fetch(`${API_URL}/tournament/${id}/view`); 
          const data = await res.json(); 
          setTrnData(data); setActiveTrn(id); setView('GAME'); 
      } catch (e) { Alert.alert("Błąd", "Błąd pobierania danych."); } 
      setLoading(false); 
  };

  const updateMatch = async (matchId, h, a, winnerId = null) => { 
      if (h===''||a==='') return Alert.alert("Błąd","Wpisz wynik!"); 
      try { 
          const payload = { match_id: matchId, home: h, away: a };
          if (winnerId) payload.winner_id = winnerId;
          const res = await fetch(`${API_URL}/update-score`, {
              method: 'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
          }); 
          const j = await res.json(); 
          if(j.success) openTournament(activeTrn); else Alert.alert("Błąd", j.message); 
      } catch(e) { Alert.alert("Błąd","Zapis nieudany"); } 
  };

  // --- STYLE ---
  const dynamicStyles = {
      container: { flex: 1, backgroundColor: theme.bg },
      text: { color: theme.text },
      subText: { color: theme.textSub },
      card: { backgroundColor: theme.card, borderColor: theme.border },
      input: { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }
  };

  const renderHeader = (title, subtitle) => ( 
    <View style={styles.headerContainer}>
        <View><Text style={[styles.headerTitle, dynamicStyles.text]}>{title}</Text>{subtitle && <Text style={[styles.headerSubtitle, dynamicStyles.subText]}>{subtitle}</Text>}</View>
        <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)} style={styles.themeToggle}><Text style={{fontSize: 24}}>{isDarkMode ? '☀️' : '🌙'}</Text></TouchableOpacity>
    </View> 
  );

  const renderList = () => (
    <ScrollView style={dynamicStyles.container} contentContainerStyle={{padding: 20}} refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTournaments} />}>
      {renderHeader("Moje Turnieje", "Wybierz turniej lub stwórz nowy")}
      <TouchableOpacity style={styles.createCard} onPress={() => setView('CREATE')}>
        <View style={styles.iconCircle}><Text style={styles.plusIcon}>+</Text></View>
        <View><Text style={styles.createCardTitle}>Nowy Turniej</Text><Text style={styles.createCardSub}>Liga, Puchar</Text></View>
      </TouchableOpacity>
      <Text style={[styles.sectionLabel, dynamicStyles.subText]}>LISTA TURNIEJÓW</Text>
      {tournaments.map(t => (
          <View key={t.id} style={[styles.trnCard, dynamicStyles.card]}>
            <TouchableOpacity style={{flex:1}} onPress={() => openTournament(t.id)}>
              <Text style={[styles.trnName, dynamicStyles.text]}>{t.name}</Text>
              <View style={{flexDirection:'row'}}>
                  <View style={styles.badge}><Text style={styles.badgeText}>{t.type}</Text></View>
                  <View style={[styles.badge, {backgroundColor: theme.bg, marginLeft: 5}]}><Text style={[styles.badgeText, {color: theme.textSub}]}>{t.mode}</Text></View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(t.id)} style={styles.delBtn}><Text style={styles.delText}>🗑️</Text></TouchableOpacity>
          </View>
      ))}
      <View style={{height: 50}} />
    </ScrollView>
  );

  const renderCreate = () => (
    <ScrollView style={dynamicStyles.container} contentContainerStyle={{padding: 20}}>
      <TouchableOpacity onPress={() => setView('LIST')} style={styles.backBtn}><Text style={dynamicStyles.subText}>← Anuluj</Text></TouchableOpacity>
      {renderHeader("Kreator Turnieju", "Skonfiguruj swoje rozgrywki")}
      <View style={[styles.formCard, dynamicStyles.card]}>
        <Text style={[styles.label, dynamicStyles.text]}>Nazwa Turnieju</Text>
        <TextInput style={[styles.input, dynamicStyles.input]} placeholderTextColor={theme.textSub} placeholder="np. MISTRZOSTWA" value={newName} onChangeText={t => setNewName(t.toUpperCase())} />
        
        <Text style={[styles.label, dynamicStyles.text]}>Typ Rozgrywki</Text>
        <View style={styles.typeRow}>
          {['LEAGUE', 'CUP'].map((type) => (
            <TouchableOpacity key={type} style={[styles.typeBtn, dynamicStyles.card, newType === type && styles.typeBtnActive]} onPress={() => setNewType(type)}>
              <Text style={[styles.typeText, dynamicStyles.subText, newType === type && styles.typeTextActive]}>{type === 'LEAGUE' ? 'Liga' : type === 'CUP' ? 'Puchar' : 'Mieszany'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, dynamicStyles.text]}>Tryb Gry</Text>
        <View style={styles.typeRow}>
          {['4FUN', 'REAL_TIME'].map(m => (
             <TouchableOpacity key={m} style={[styles.typeBtn, dynamicStyles.card, gameMode === m && styles.typeBtnActive]} onPress={() => setGameMode(m)}>
               <Text style={[styles.typeText, dynamicStyles.subText, gameMode === m && styles.typeTextActive]}>{m}</Text>
             </TouchableOpacity>
          ))}
        </View>

        {gameMode === 'REAL_TIME' && (
          <View>
             <Text style={[styles.label, dynamicStyles.text]}>Termin Rozpoczęcia</Text>
             <View style={{flexDirection: 'row'}}>
                 <View style={{flex: 2, marginRight: 10}}>
                     <Text style={[styles.labelSmall, dynamicStyles.subText]}>Data (RRRR-MM-DD)</Text>
                     <TextInput style={[styles.input, dynamicStyles.input, {textAlign: 'center', fontWeight: 'bold'}]} value={inputDate} onChangeText={setInputDate} />
                 </View>
                 <View style={{flex: 1}}>
                     <Text style={[styles.labelSmall, dynamicStyles.subText]}>Godzina</Text>
                     <TextInput style={[styles.input, dynamicStyles.input, {textAlign: 'center', fontWeight: 'bold'}]} value={inputTime} onChangeText={setInputTime} />
                 </View>
             </View>

             <View style={{flexDirection: 'row', marginTop: 15}}>
                <View style={{flex: 1, marginRight: 5}}><Text style={[styles.labelSmall, dynamicStyles.subText]}>Mecz (min)</Text><TextInput style={[styles.input, dynamicStyles.input]} keyboardType="numeric" value={matchDuration} onChangeText={setMatchDuration} /></View>
                <View style={{flex: 1, marginHorizontal: 5}}><Text style={[styles.labelSmall, dynamicStyles.subText]}>Przerwa (min)</Text><TextInput style={[styles.input, dynamicStyles.input]} keyboardType="numeric" value={breakDuration} onChangeText={setBreakDuration} /></View>
                <View style={{flex: 1, marginLeft: 5}}><Text style={[styles.labelSmall, dynamicStyles.subText]}>Boiska</Text><TextInput style={[styles.input, dynamicStyles.input]} keyboardType="numeric" value={numFields} onChangeText={setNumFields} /></View>
             </View>
          </View>
        )}

        <Text style={[styles.label, dynamicStyles.text]}>Dodaj Drużyny ({teams.length})</Text>
        <View style={styles.addTeamRow}>
          <TextInput style={[styles.input, dynamicStyles.input, {flex: 1, marginBottom: 0}]} placeholderTextColor={theme.textSub} placeholder="NAZWA DRUŻYNY" value={teamName} onChangeText={t => setTeamName(t.toUpperCase())} />
          <TouchableOpacity style={styles.addBtn} onPress={() => { if (teamName.trim()) { setTeams([...teams, teamName.trim()]); setTeamName(''); } }}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.teamList}>
          {teams.map((t, i) => (
            <TouchableOpacity key={i} onPress={() => { const nt = [...teams]; nt.splice(i, 1); setTeams(nt); }}>
              <View style={styles.teamChip}><Text style={styles.chipText}>{t} ✕</Text></View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>UTWÓRZ TURNIEJ 🚀</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderGame = () => {
    if (!trnData) return <ActivityIndicator size="large" style={{marginTop: 50}} />;
    const upcoming = trnData.matches.filter(m => m.status !== 'FINISHED');
    const history = trnData.matches.filter(m => m.status === 'FINISHED');

    return (
      <ScrollView style={dynamicStyles.container} contentContainerStyle={{padding: 20}} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => openTournament(activeTrn)} />}>
        <View style={styles.gameHeader}>
          <TouchableOpacity onPress={() => setView('LIST')} style={styles.backBtn}>
             <Text style={[dynamicStyles.subText, {fontSize: 16}]}>← Wróć</Text>
          </TouchableOpacity>
          <Text style={[styles.gameTitle, dynamicStyles.text]}>{trnData.name}</Text>
          <View style={{width: 50}} />
        </View>

        <View style={[styles.sectionContainer, dynamicStyles.card]}>
          {trnData.type === 'CUP' && trnData.data.bracket && <WinnerBanner bracket={trnData.data.bracket} theme={theme} />}
          {trnData.type === 'LEAGUE' && trnData.data.table && <LeagueTable tableData={trnData.data.table} theme={theme} />}
          {trnData.type === 'MIXED' && trnData.data.tables && (
              <View>
                  {Object.keys(trnData.data.tables).sort().map(groupName => (
                      <View key={groupName} style={{marginBottom: 20}}>
                          <Text style={[styles.sectionLabel, dynamicStyles.text, {marginBottom: 5}]}>GRUPA {groupName}</Text>
                          <LeagueTable tableData={trnData.data.tables[groupName]} theme={theme} />
                      </View>
                  ))}
              </View>
          )}
          {trnData.type === 'CUP' && trnData.data.bracket && (
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{marginVertical: 10}}>
               {Object.keys(trnData.data.bracket).map(round => (
                 <View key={round} style={styles.roundColumn}>
                    <Text style={styles.roundHeader}>{round === '4' ? '1/8' : `Runda ${round}`}</Text>
                    <ScrollView>
                      {trnData.data.bracket[round].map(m => <MatchCard key={m.id} match={m} onSave={updateMatch} isBracket={true} theme={theme} />)}
                    </ScrollView>
                 </View>
               ))}
            </ScrollView>
          )}
        </View>

        {(trnData.type === 'LEAGUE' || trnData.type === 'MIXED') && (
            <>
                <Text style={[styles.sectionLabel, dynamicStyles.subText]}>MECZE DO ROZEGRANIA</Text>
                {upcoming.map(m => <MatchCard key={m.id} match={m} onSave={updateMatch} theme={theme} />)}
                {history.length > 0 && (
                  <View style={{marginTop: 20}}>
                      <Text style={[styles.sectionLabel, dynamicStyles.subText]}>HISTORIA ({history.length})</Text>
                      {history.slice(0).reverse().map(m => <MatchCard key={m.id} match={m} onSave={updateMatch} theme={theme} />)}
                  </View>
                )}
            </>
        )}
        <View style={{height: 50}} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {view === 'LIST' && renderList()}
      {view === 'CREATE' && renderCreate()}
      {view === 'GAME' && renderGame()}
    </SafeAreaView>
  );
}

const WinnerBanner = ({ bracket, theme }) => {
    const rounds = Object.keys(bracket).sort((a,b) => b-a); 
    if (rounds.length === 0) return null;
    const finalRoundMatches = bracket[rounds[0]];
    const finalMatch = finalRoundMatches[0]; 
    if (finalMatch && finalMatch.status === 'FINISHED') {
        const h = finalMatch.score_home; const a = finalMatch.score_away;
        let winnerName = (h > a) ? finalMatch.home_name : (a > h) ? finalMatch.away_name : "Zwycięzca Wyłoniony";
        return (
            <View style={{backgroundColor: theme.gold, padding: 15, borderRadius: 12, marginBottom: 15, alignItems: 'center', borderWidth: 2, borderColor: '#B7791F'}}>
                <Text style={{fontSize: 14, fontWeight: 'bold', color: '#744210', textTransform: 'uppercase'}}>Zwycięzca Turnieju</Text>
                <Text style={{fontSize: 24, fontWeight: '900', color: '#000', marginTop: 5}}>{winnerName} 🏆</Text>
            </View>
        );
    }
    return null;
};

const LeagueTable = ({ tableData, theme }) => (
    <View style={{width: '100%'}}>
      <View style={[styles.tableHeaderRow, {borderBottomColor: theme.border}]}>
        <Text style={[styles.th, {color: theme.textSub, flex: 0.6}]}>#</Text><Text style={[styles.th, {color: theme.textSub, flex: 3, textAlign:'left'}]}>Drużyna</Text>
        <Text style={[styles.th, {color: theme.textSub}]}>M</Text><Text style={[styles.th, {color: theme.textSub}]}>Z</Text><Text style={[styles.th, {color: theme.textSub}]}>R</Text><Text style={[styles.th, {color: theme.textSub}]}>P</Text>
        <Text style={[styles.th, {color: theme.textSub, flex: 1.8}]}>Bramki</Text><Text style={[styles.th, {color: theme.textSub}]}>+/-</Text><Text style={[styles.th, {color: theme.primary}]}>Pkt</Text>
      </View>
      {tableData.map((r, index) => {
          const gf = r.gf || 0; const ga = r.ga || 0; const diff = gf - ga;
          return (
            <View key={r.team || r.name || index} style={[styles.tableRow, {borderBottomColor: theme.bg}]}>
                <Text style={[styles.td, {color: theme.text, flex: 0.6}]}>{index + 1}.</Text><Text style={[styles.td, {color: theme.text, flex: 3, textAlign:'left', fontWeight:'700'}]} numberOfLines={1}>{r.name || r.team}</Text>
                <Text style={[styles.td, {color: theme.text}]}>{r.p || r.m || 0}</Text><Text style={[styles.td, {color: theme.text}]}>{r.w || r.z || 0}</Text><Text style={[styles.td, {color: theme.text}]}>{r.d || r.r || 0}</Text><Text style={[styles.td, {color: theme.text}]}>{r.l || r.p || 0}</Text>
                <Text style={[styles.td, {color: theme.text, flex: 1.8, fontSize: 10}]}>{gf}:{ga}</Text>
                <Text style={[styles.td, {fontSize: 10, color: diff>=0?'#48BB78':'#F56565'}]}>{diff>0?`+${diff}`:diff}</Text>
                <Text style={[styles.td, {fontWeight:'bold', color: theme.primary}]}>{r.pts || 0}</Text>
            </View>
          );
      })}
    </View>
);

const MatchCard = ({ match, onSave, isBracket, theme }) => {
  const [h, setH] = useState('');
  const [a, setA] = useState('');
  const [winnerChoice, setWinnerChoice] = useState(null); 
  useEffect(() => { setH(match.score_home !== null ? String(match.score_home) : ''); setA(match.score_away !== null ? String(match.score_away) : ''); }, [match]);
  const finished = match.status === 'FINISHED';
  const isPlaceholder = (isBracket && (!match.home_name || !match.away_name));
  const isCupDraw = isBracket && h !== '' && a !== '' && parseInt(h) === parseInt(a);
  
  // --- AKTUALIZACJA: WYŚWIETLANIE BOISKA ---
  let headerText = match.stage || `RUNDA ${match.round}`;
  if (match.start_time) {
      headerText = match.start_time;
      if (match.field) {
          headerText += ` | BOISKO ${toRoman(match.field)}`;
      }
  }

  return (
    <View style={[styles.matchCard, {backgroundColor: theme.card, borderColor: theme.border}, finished && { borderLeftColor: '#48BB78', backgroundColor: theme.successBg }, isBracket && { width: 230, marginRight: 10, borderLeftWidth: 4, padding: 10 }]}>
      <View style={styles.matchInfo}><Text style={styles.matchRound}>{headerText}</Text>{finished && <Text style={{fontSize:10, color:'green', fontWeight:'bold'}}>ZAKOŃCZONY</Text>}</View>
      <View style={styles.matchRow}>
        <Text style={[styles.teamName, {color: theme.text}, !match.home_name && {color:'#ccc', fontSize: 13}]}>{match.home_name || '?'}</Text>
        <View style={{flexDirection:'row', alignItems:'center'}}>
          <TextInput style={[styles.scoreInput, {backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}]} keyboardType="numeric" placeholder="-" placeholderTextColor={theme.textSub} value={h} onChangeText={setH} editable={!isPlaceholder} />
          <Text style={styles.vs}>:</Text>
          <TextInput style={[styles.scoreInput, {backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}]} keyboardType="numeric" placeholder="-" placeholderTextColor={theme.textSub} value={a} onChangeText={setA} editable={!isPlaceholder} />
        </View>
        <Text style={[styles.teamName, {color: theme.text}, !match.away_name && {color:'#ccc', fontSize: 13}]}>{match.away_name || '?'}</Text>
      </View>
      {!finished && isCupDraw && !isPlaceholder && (
          <View style={{flexDirection: 'row', justifyContent: 'space-around', marginVertical: 8}}>
              <TouchableOpacity onPress={() => setWinnerChoice(match.home_team_id)} style={{flexDirection:'row', alignItems:'center'}}><View style={[styles.radio, winnerChoice === match.home_team_id && styles.radioActive]} /><Text style={{fontSize: 10, color: theme.textSub}}>Awans {match.home_name}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setWinnerChoice(match.away_team_id)} style={{flexDirection:'row', alignItems:'center'}}><View style={[styles.radio, winnerChoice === match.away_team_id && styles.radioActive]} /><Text style={{fontSize: 10, color: theme.textSub}}>Awans {match.away_name}</Text></TouchableOpacity>
          </View>
      )}
      {!isPlaceholder && (
          <TouchableOpacity style={[styles.saveScoreBtn, {backgroundColor: theme.inputBg}, finished && {borderColor: '#C6F6D5', borderWidth:1}]} onPress={() => { if (isBracket && h == a && !winnerChoice && !finished) { Alert.alert("Remis!", "W pucharze ktoś musi wygrać."); return; } onSave(match.id, h, a, winnerChoice); }}>
            <Text style={[styles.saveScoreText, finished && {color: '#2F855A'}]}>{finished ? 'POPRAW' : 'ZAPISZ'}</Text>
          </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, marginTop: 10 },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  headerSubtitle: { fontSize: 16, marginTop: 5 },
  themeToggle: { padding: 10 },
  createCard: { backgroundColor: '#007AFF', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 30, shadowColor: '#007AFF', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  plusIcon: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  createCardTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  createCardSub: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  sectionLabel: { fontSize: 13, fontWeight: '700', marginBottom: 10, letterSpacing: 1 },
  trnCard: { borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2, borderWidth: 1 },
  trnName: { fontSize: 18, fontWeight: '600' },
  badge: { backgroundColor: '#EBF8FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 5, alignSelf: 'flex-start' },
  badgeText: { color: '#3182CE', fontSize: 12, fontWeight: 'bold' },
  delBtn: { padding: 15 },
  delText: { fontSize: 20 },
  formCard: { borderRadius: 16, padding: 20, shadowColor:'#000', shadowOpacity:0.05, elevation:3 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 15 },
  labelSmall: { fontSize: 12, fontWeight: '600', marginBottom: 5 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  typeBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, marginHorizontal: 4 },
  typeBtnActive: { backgroundColor: '#EBF8FF', borderColor: '#4299E1' },
  typeText: { fontWeight: '600' },
  typeTextActive: { color: '#2B6CB0' },
  addTeamRow: { flexDirection: 'row', alignItems: 'center' },
  addBtn: { backgroundColor: '#48BB78', width: 50, height: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginLeft: 10 },
  addBtnText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  teamList: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  teamChip: { backgroundColor: '#EDF2F7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  chipText: { color: '#4A5568', fontSize: 14 },
  saveBtn: { backgroundColor: '#007AFF', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 30, shadowColor: '#007AFF', shadowOpacity: 0.3, elevation: 5 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  gameHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, paddingHorizontal: 10, paddingTop: 10 },
  gameTitle: { fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  sectionContainer: { borderRadius: 12, padding: 10, marginBottom: 20, elevation: 2 },
  tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 2, paddingBottom: 8, marginBottom: 8 },
  th: { flex: 1, fontSize: 11, fontWeight: 'bold', textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, alignItems: 'center' },
  td: { flex: 1, fontSize: 11, textAlign: 'center' },
  matchCard: { borderRadius: 12, padding: 15, marginBottom: 15, borderLeftWidth: 5, borderLeftColor: '#A0AEC0', elevation: 2, borderWidth: 1 },
  matchInfo: { marginBottom: 10, flexDirection:'row', justifyContent:'space-between' },
  matchRound: { fontSize: 12, color: '#A0AEC0', fontWeight: 'bold', textTransform: 'uppercase' },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 5 },
  teamName: { flex: 1, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  vs: { fontSize: 18, color: '#CBD5E0', marginHorizontal: 5 },
  scoreInput: { width: 30, height: 30, borderWidth: 1, borderRadius: 6, textAlign: 'center', fontSize: 14, fontWeight: 'bold', padding: 0 },
  saveScoreBtn: { padding: 8, borderRadius: 6, alignItems: 'center', marginTop: 10 },
  saveScoreText: { color: '#4A5568', fontWeight: '600', fontSize: 12 },
  roundColumn: { backgroundColor: '#EDF2F7', padding: 10, borderRadius: 12, marginRight: 15 },
  roundHeader: { fontWeight: 'bold', color: '#4A5568', marginBottom: 10, textAlign:'center' },
  radio: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#A0AEC0', marginRight: 5 },
  radioActive: { backgroundColor: '#48BB78', borderColor: '#48BB78' }
});