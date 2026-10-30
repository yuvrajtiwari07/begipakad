import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';

const ORIENTATIONS = ['portrait', 'landscape'];
const noop = () => {};

// Points added to a player's score in a round, including the Zero-Ser -5
const roundDelta = (hand, seat) => (hand.finalScores[seat] ?? 0) - (hand.startScores[seat] ?? 0);
const fmtDelta = (d) => (d > 0 ? `+${d}` : `${d}`);
// Taking points is bad: red for gains, green for the Zero-Ser bonus
const deltaColor = (d) => (d > 0 ? '#F87171' : d < 0 ? '#34D399' : '#64748B');
const totalColor = (score) => (score >= 90 ? '#F87171' : score >= 75 ? '#FBBF24' : '#F1F5F9');

// Round-by-round scores with the totals at the bottom
export function ScoreTable({ players, handHistory, currentHand, mySeatIndex, winnerTeam, maxHeight = 200 }) {
  const t1 = players.filter(p => p.teamId === 1).sort((a, b) => a.seatIndex - b.seatIndex);
  const t2 = players.filter(p => p.teamId === 2).sort((a, b) => a.seatIndex - b.seatIndex);
  const cols = [...t1, ...t2];
  const lastHand = handHistory[handHistory.length - 1];
  const showLive = currentHand !== undefined && !handHistory.some(h => h.handNumber === currentHand);
  const hasPartial = handHistory.some(h => h.isPartial);
  const teamTotal = (team) => team.reduce((a, p) => a + p.score, 0);
  const sep = (i) => (i === t1.length ? m.tSep : null);

  return (
    <View>
      <View style={m.table}>
        <View style={m.tRow}>
          <Text style={[m.tRoundCell, m.tHead]}> </Text>
          <Text style={[m.tTeamHead, { flex: t1.length, color: '#818CF8' }]}>TEAM 1{winnerTeam === 1 ? ' 👑' : ''}</Text>
          <Text style={[m.tTeamHead, m.tSep, { flex: t2.length, color: '#FCD34D' }]}>TEAM 2{winnerTeam === 2 ? ' 👑' : ''}</Text>
        </View>
        <View style={[m.tRow, m.tHeadRow]}>
          <Text style={[m.tRoundCell, m.tHead]}>Round</Text>
          {cols.map((p, i) => (
            <Text key={p.id} numberOfLines={1} style={[m.tCell, m.tHead, sep(i), p.seatIndex === mySeatIndex && { color: '#FFF' }]}>
              {p.seatIndex === mySeatIndex ? 'You' : p.name}
            </Text>
          ))}
        </View>
        <ScrollView style={maxHeight ? { maxHeight } : null} scrollEnabled={Boolean(maxHeight)}>
          {handHistory.map(hand => (
            <View key={hand.handNumber} style={m.tRow}>
              <Text style={m.tRoundCell}>R{hand.handNumber}{hand.isPartial ? '*' : ''}</Text>
              {cols.map((p, i) => {
                const d = roundDelta(hand, p.seatIndex);
                return (
                  <Text key={p.id} style={[m.tCell, sep(i), { color: deltaColor(d) }]}>
                    {fmtDelta(d)}{hand.zeroTrickBonusAwarded[p.seatIndex] ? <Text style={m.tZero}> 0S</Text> : null}
                  </Text>
                );
              })}
            </View>
          ))}
          {showLive && (
            <View style={[m.tRow, { backgroundColor: 'rgba(30,41,59,0.6)' }]}>
              <Text style={m.tRoundCell}>R{currentHand} <Text style={m.tLive}>LIVE</Text></Text>
              {cols.map((p, i) => {
                const d = p.score - (lastHand?.finalScores[p.seatIndex] ?? 0);
                return <Text key={p.id} style={[m.tCell, sep(i), { color: deltaColor(d) }]}>{fmtDelta(d)}</Text>;
              })}
            </View>
          )}
          {handHistory.length === 0 && !showLive && <Text style={[m.sub, { textAlign: 'center', padding: 12 }]}>No rounds played yet</Text>}
        </ScrollView>
        <View style={[m.tRow, m.tTotalRow]}>
          <Text style={[m.tRoundCell, m.tTotalLabel]}>TOTAL</Text>
          {cols.map((p, i) => <Text key={p.id} style={[m.tCell, sep(i), m.tTotal, { color: totalColor(p.score) }]}>{p.score}</Text>)}
        </View>
        <View style={[m.tRow, { borderBottomWidth: 0 }]}>
          <Text style={[m.tRoundCell, m.tTotalLabel, { color: '#64748B' }]}>TEAM</Text>
          <Text style={[m.tCell, m.tTotal, { flex: t1.length, color: '#A5B4FC' }]}>{teamTotal(t1)}</Text>
          <Text style={[m.tCell, m.tSep, m.tTotal, { flex: t2.length, color: '#FCD34D' }]}>{teamTotal(t2)}</Text>
        </View>
      </View>
      <View style={m.tLegend}>
        <Text style={m.tLegendText}><Text style={m.tZero}>0S</Text> = Zero Ser bonus (-5)</Text>
        {hasPartial && <Text style={m.tLegendText}>* Game ended mid-round</Text>}
      </View>
    </View>
  );
}

export function RoundSummaryModal({ isOpen, handResult, players, onContinue, isHost = true, hostName = 'Host' }) {
  const [tab, setTab] = useState('round');
  if (!isOpen || !handResult) return null;
  const CLOSE = noop;
  const t1 = players.filter(p => p.teamId === 1);
  const t2 = players.filter(p => p.teamId === 2);
  const t1Total = t1.reduce((a, p) => a + (handResult.finalScores[p.seatIndex] ?? p.score), 0);
  const t2Total = t2.reduce((a, p) => a + (handResult.finalScores[p.seatIndex] ?? p.score), 0);
  return (
    <Modal visible transparent animationType="fade" supportedOrientations={ORIENTATIONS} onRequestClose={CLOSE}>
      <View style={m.overlay}>
        <ScrollView style={m.boxScroll} contentContainerStyle={m.box}>
          <View style={m.header}>
            <Text style={m.title}>ROUND {handResult.handNumber} RECAP</Text>
            <View style={m.handBadge}><Text style={m.handBadgeText}>Hand #{handResult.handNumber}</Text></View>
          </View>
          <View style={m.tabs}>
            {[['round','🔥 Round'],['total','🏆 Total'],['ser','🛡 Ser']].map(([k,label]) => (
              <TouchableOpacity key={k} style={[m.tab, tab===k && m.tabActive]} onPress={() => setTab(k)}>
                <Text style={[m.tabText, tab===k && m.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View>
            {tab === 'round' && (
              <View style={m.teamGrid}>
                {[[t1,'TEAM 1','#818CF8'],[t2,'TEAM 2','#FCD34D']].map(([team,label,col]) => (
                  <View key={label} style={m.teamCard}>
                    <Text style={[m.teamLabel,{color:col}]}>{label} {fmtDelta(team.reduce((a,p)=>a+roundDelta(handResult,p.seatIndex),0))}pts</Text>
                    {team.map(p => { const d = roundDelta(handResult, p.seatIndex); return <View key={p.id} style={m.row}><Text style={m.pName}>{p.name}</Text><Text style={[m.pScore,{color:d>0?'#F87171':'#34D399'}]}>{fmtDelta(d)}</Text></View>; })}
                  </View>
                ))}
              </View>
            )}
            {tab === 'total' && (
              <View style={m.teamGrid}>
                {[[t1,'TEAM 1',t1Total,'#818CF8'],[t2,'TEAM 2',t2Total,'#FCD34D']].map(([team,label,tot,col]) => (
                  <View key={label} style={m.teamCard}>
                    <Text style={[m.teamLabel,{color:col}]}>{label} {tot}pts</Text>
                    {team.map(p => <View key={p.id} style={m.row}><Text style={m.pName}>{p.name}</Text><Text style={m.pScore}>{handResult.finalScores[p.seatIndex]??p.score}</Text></View>)}
                  </View>
                ))}
              </View>
            )}
            {tab === 'ser' && (
              <View style={m.serGrid}>
                {players.map(p => {
                  const tricks = handResult.tricksWon[p.seatIndex]??0;
                  const bonus = handResult.zeroTrickBonusAwarded[p.seatIndex];
                  return (
                    <View key={p.id} style={m.serCard}>
                      <Text style={m.pName}>{p.name}</Text>
                      <Text style={m.serCount}>{tricks} Ser</Text>
                      {bonus && <View style={m.bonusBadge}><Text style={m.bonusText}>-5 BONUS</Text></View>}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
          {isHost ? (
            <TouchableOpacity style={m.continueBtn} onPress={onContinue}>
              <Text style={m.continueBtnText}>PROCEED TO NEXT ROUND ▶</Text>
            </TouchableOpacity>
          ) : (
            <View style={m.waitBanner}>
              <Text style={m.waitText}>Waiting for host ({hostName}) to start next round...</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export function GameOverModal({ isOpen, winnerTeam, players, handHistory = [], myTeamId, onExitToMenu }) {
  if (!isOpen) return null;
  const didWin = winnerTeam === myTeamId;
  const CLOSE = onExitToMenu;
  return (
    <Modal visible transparent animationType="fade" supportedOrientations={ORIENTATIONS} onRequestClose={CLOSE}>
      <View style={m.overlay}>
        <ScrollView style={m.boxScroll} contentContainerStyle={m.box}>
          <Text style={[m.title,{fontSize:24,textAlign:'center'}]}>{didWin ? '🏆 YOU WIN!' : '💀 YOU LOSE'}</Text>
          <Text style={m.sub}>Team {winnerTeam} wins the match!</Text>
          <ScoreTable players={players} handHistory={handHistory} winnerTeam={winnerTeam} maxHeight={null} />
          <TouchableOpacity style={m.continueBtn} onPress={onExitToMenu}><Text style={m.continueBtnText}>BACK TO MENU</Text></TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

export function ScoreModal({ isOpen, players, handHistory = [], handNumber, trickNumber, mySeatIndex, onClose }) {
  if (!isOpen) return null;
  const CLOSE = onClose;
  return (
    <Modal visible transparent animationType="fade" supportedOrientations={ORIENTATIONS} onRequestClose={CLOSE}>
      <View style={m.overlay}>
        <ScrollView style={m.boxScroll} contentContainerStyle={m.box}>
          <Text style={m.title}>Live Scoreboard</Text>
          <Text style={m.sub}>Hand {handNumber} • Ser {trickNumber}/13</Text>
          <ScoreTable players={players} handHistory={handHistory} currentHand={handNumber} mySeatIndex={mySeatIndex} maxHeight={null} />
          <TouchableOpacity style={m.cancelBtn} onPress={onClose}><Text style={m.cancelText}>Back to Table</Text></TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

export function ExitConfirmModal({ isOpen, isHost, onReplaceBot, onExitEnd, onHostEnd, onLeave, onCancel }) {
  if (!isOpen) return null;
  const CLOSE = onCancel;
  return (
    <Modal visible transparent animationType="fade" supportedOrientations={ORIENTATIONS} onRequestClose={CLOSE}>
      <View style={m.overlay}>
        <ScrollView style={m.boxScroll} contentContainerStyle={m.box}>
          <Text style={m.title}>Leave Match?</Text>
          <Text style={m.sub}>Choose how you want to exit the current online match.</Text>
          {onReplaceBot && <TouchableOpacity style={[m.continueBtn,{backgroundColor:'#6366F1'}]} onPress={onReplaceBot}><Text style={m.continueBtnText}>Replace Me with AI Bot</Text></TouchableOpacity>}
          {onExitEnd && <TouchableOpacity style={[m.continueBtn,{backgroundColor:'#DC2626'}]} onPress={onExitEnd}><Text style={m.continueBtnText}>Exit & End Game for Everyone</Text></TouchableOpacity>}
          {isHost && onHostEnd && <TouchableOpacity style={[m.continueBtn,{backgroundColor:'#D97706'}]} onPress={onHostEnd}><Text style={m.continueBtnText}>[Host] Close Room & End</Text></TouchableOpacity>}
          <TouchableOpacity style={m.cancelBtn} onPress={onCancel}><Text style={m.cancelText}>Cancel / Stay</Text></TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.85)',justifyContent:'center',alignItems:'center',padding:16},
  boxScroll:{width:'100%',maxWidth:420,maxHeight:'100%',flexGrow:0,backgroundColor:'#1E293B',borderWidth:1,borderColor:'#334155',borderRadius:24},
  box:{padding:20,gap:12},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  title:{color:'#FFF',fontSize:16,fontWeight:'900'},
  sub:{color:'#64748B',fontSize:12},
  handBadge:{backgroundColor:'rgba(99,102,241,0.2)',borderWidth:1,borderColor:'rgba(99,102,241,0.4)',paddingHorizontal:10,paddingVertical:3,borderRadius:99},
  handBadgeText:{color:'#A5B4FC',fontSize:10,fontWeight:'700',fontFamily:'monospace'},
  tabs:{flexDirection:'row',backgroundColor:'#0F172A',borderRadius:14,padding:4,borderWidth:1,borderColor:'#1E293B'},
  tab:{flex:1,paddingVertical:8,borderRadius:10,alignItems:'center'},
  tabActive:{backgroundColor:'#6366F1'},
  tabText:{color:'#64748B',fontSize:11,fontWeight:'700'},
  tabTextActive:{color:'#FFF'},
  teamGrid:{flexDirection:'row',gap:8},
  teamCard:{flex:1,backgroundColor:'#0F172A',borderWidth:1,borderColor:'#334155',borderRadius:14,padding:10,gap:6},
  teamLabel:{fontSize:10,fontWeight:'900',marginBottom:4},
  row:{flexDirection:'row',justifyContent:'space-between'},
  pName:{color:'#CBD5E1',fontSize:11},
  pScore:{color:'#FCD34D',fontSize:11,fontWeight:'900'},
  serGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  serCard:{flex:1,minWidth:'45%',backgroundColor:'#0F172A',borderWidth:1,borderColor:'#334155',borderRadius:12,padding:10,gap:4},
  serCount:{color:'#94A3B8',fontSize:11},
  bonusBadge:{backgroundColor:'rgba(16,185,129,0.2)',borderWidth:1,borderColor:'rgba(16,185,129,0.4)',paddingHorizontal:6,paddingVertical:2,borderRadius:6},
  bonusText:{color:'#34D399',fontSize:9,fontWeight:'900'},
  continueBtn:{backgroundColor:'#6366F1',borderRadius:14,paddingVertical:14,alignItems:'center',shadowColor:'#6366F1',shadowOpacity:0.4,shadowRadius:6,elevation:5},
  continueBtnText:{color:'#FFF',fontWeight:'900',fontSize:13},
  waitBanner:{backgroundColor:'#0F172A',borderRadius:14,paddingVertical:14,alignItems:'center',borderWidth:1,borderColor:'#334155'},
  waitText:{color:'#FCD34D',fontWeight:'700',fontSize:12},
  cancelBtn:{backgroundColor:'#0F172A',borderRadius:14,paddingVertical:12,alignItems:'center',borderWidth:1,borderColor:'#334155'},
  cancelText:{color:'#94A3B8',fontWeight:'700',fontSize:13},
  table:{backgroundColor:'#0F172A',borderWidth:1,borderColor:'#334155',borderRadius:12,overflow:'hidden'},
  tRow:{flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#1E293B'},
  tHeadRow:{borderBottomColor:'#334155'},
  tHead:{color:'#94A3B8',fontSize:10,fontWeight:'700',fontFamily:undefined},
  tTeamHead:{fontSize:10,fontWeight:'900',textAlign:'center',paddingTop:6},
  tRoundCell:{width:52,paddingHorizontal:8,paddingVertical:5,color:'#94A3B8',fontSize:11,fontWeight:'700'},
  tCell:{flex:1,paddingHorizontal:4,paddingVertical:5,textAlign:'center',fontSize:11,fontWeight:'900',fontFamily:'monospace'},
  tSep:{borderLeftWidth:1,borderLeftColor:'#1E293B'},
  tZero:{color:'rgba(16,185,129,0.8)',fontSize:8,fontWeight:'700',fontFamily:undefined},
  tLive:{color:'#34D399',fontSize:8,fontWeight:'900'},
  tTotalRow:{backgroundColor:'#1E293B',borderTopWidth:2,borderTopColor:'#475569'},
  tTotalLabel:{color:'#E2E8F0',fontSize:10,fontWeight:'900'},
  tTotal:{fontSize:13},
  tLegend:{flexDirection:'row',justifyContent:'space-between',marginTop:4},
  tLegendText:{color:'#64748B',fontSize:9},
});
