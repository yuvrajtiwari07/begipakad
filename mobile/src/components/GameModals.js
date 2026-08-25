import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';

export function RoundSummaryModal({ isOpen, handResult, players, onContinue, isHost = true, hostName = 'Host' }) {
  const [tab, setTab] = useState('round');
  if (!isOpen || !handResult) return null;
  const t1 = players.filter(p => p.teamId === 1);
  const t2 = players.filter(p => p.teamId === 2);
  const t1Total = t1.reduce((a, p) => a + (handResult.finalScores[p.seatIndex] ?? p.score), 0);
  const t2Total = t2.reduce((a, p) => a + (handResult.finalScores[p.seatIndex] ?? p.score), 0);
  return (
    <Modal visible transparent animationType="fade">
      <View style={m.overlay}>
        <View style={m.box}>
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
          <ScrollView style={{maxHeight:200}}>
            {tab === 'round' && (
              <View style={m.teamGrid}>
                {[[t1,'TEAM 1','#818CF8'],[t2,'TEAM 2','#FCD34D']].map(([team,label,col]) => (
                  <View key={label} style={m.teamCard}>
                    <Text style={[m.teamLabel,{color:col}]}>{label} +{team.reduce((a,p)=>a+(handResult.trickPointsGained[p.seatIndex]??0),0)}pts</Text>
                    {team.map(p => <View key={p.id} style={m.row}><Text style={m.pName}>{p.name}</Text><Text style={[m.pScore,{color:(handResult.trickPointsGained[p.seatIndex]??0)>0?'#F87171':'#34D399'}]}>+{handResult.trickPointsGained[p.seatIndex]??0}</Text></View>)}
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
          </ScrollView>
          {isHost ? (
            <TouchableOpacity style={m.continueBtn} onPress={onContinue}>
              <Text style={m.continueBtnText}>PROCEED TO NEXT ROUND ▶</Text>
            </TouchableOpacity>
          ) : (
            <View style={m.waitBanner}>
              <Text style={m.waitText}>Waiting for host ({hostName}) to start next round...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

export function GameOverModal({ isOpen, winnerTeam, players, myTeamId, onPlayAgain, onExitToMenu }) {
  if (!isOpen) return null;
  const didWin = winnerTeam === myTeamId;
  return (
    <Modal visible transparent animationType="fade">
      <View style={m.overlay}>
        <View style={m.box}>
          <Text style={[m.title,{fontSize:24,textAlign:'center'}]}>{didWin ? '🏆 YOU WIN!' : '💀 YOU LOSE'}</Text>
          <Text style={m.sub}>Team {winnerTeam} wins the match!</Text>
          <View style={m.teamGrid}>
            {[1,2].map(tid => (
              <View key={tid} style={[m.teamCard,{borderColor:tid===winnerTeam?'#6366F1':'#334155'}]}>
                <Text style={[m.teamLabel,{color:tid===1?'#818CF8':'#FCD34D'}]}>TEAM {tid}{tid===winnerTeam?' 👑':''}</Text>
                {players.filter(p=>p.teamId===tid).map(p=>(
                  <View key={p.id} style={m.row}>
                    <Text style={m.pName}>{p.name}</Text>
                    <Text style={m.pScore}>{p.score}pts</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
          <TouchableOpacity style={m.continueBtn} onPress={onPlayAgain}><Text style={m.continueBtnText}>PLAY AGAIN</Text></TouchableOpacity>
          <TouchableOpacity style={m.cancelBtn} onPress={onExitToMenu}><Text style={m.cancelText}>Exit to Menu</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function ScoreModal({ isOpen, players, handNumber, trickNumber, onClose }) {
  if (!isOpen) return null;
  const t1 = players.filter(p=>p.teamId===1);
  const t2 = players.filter(p=>p.teamId===2);
  return (
    <Modal visible transparent animationType="fade">
      <View style={m.overlay}>
        <View style={m.box}>
          <Text style={m.title}>Live Scoreboard</Text>
          <Text style={m.sub}>Hand {handNumber} • Ser {trickNumber}/13</Text>
          <View style={m.teamGrid}>
            {[[t1,'TEAM 1','#818CF8'],[t2,'TEAM 2','#FCD34D']].map(([team,label,col])=>(
              <View key={label} style={m.teamCard}>
                <Text style={[m.teamLabel,{color:col}]}>{label} — {team.reduce((a,p)=>a+p.score,0)}pts</Text>
                {team.map(p=><View key={p.id} style={m.row}><Text style={m.pName}>{p.name}</Text><Text style={m.pScore}>{p.score}</Text></View>)}
              </View>
            ))}
          </View>
          <TouchableOpacity style={m.cancelBtn} onPress={onClose}><Text style={m.cancelText}>Back to Table</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function ExitConfirmModal({ isOpen, isHost, onReplaceBot, onExitEnd, onHostEnd, onLeave, onCancel }) {
  if (!isOpen) return null;
  return (
    <Modal visible transparent animationType="fade">
      <View style={m.overlay}>
        <View style={m.box}>
          <Text style={m.title}>Leave Match?</Text>
          <Text style={m.sub}>Choose how you want to exit the current online match.</Text>
          {onReplaceBot && <TouchableOpacity style={[m.continueBtn,{backgroundColor:'#6366F1'}]} onPress={onReplaceBot}><Text style={m.continueBtnText}>Replace Me with AI Bot</Text></TouchableOpacity>}
          {onExitEnd && <TouchableOpacity style={[m.continueBtn,{backgroundColor:'#DC2626'}]} onPress={onExitEnd}><Text style={m.continueBtnText}>Exit & End Game for Everyone</Text></TouchableOpacity>}
          {isHost && onHostEnd && <TouchableOpacity style={[m.continueBtn,{backgroundColor:'#D97706'}]} onPress={onHostEnd}><Text style={m.continueBtnText}>[Host] Close Room & End</Text></TouchableOpacity>}
          <TouchableOpacity style={m.cancelBtn} onPress={onCancel}><Text style={m.cancelText}>Cancel / Stay</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.85)',justifyContent:'center',alignItems:'center',padding:16},
  box:{width:'100%',maxWidth:420,backgroundColor:'#1E293B',borderWidth:1,borderColor:'#334155',borderRadius:24,padding:20,gap:12},
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
});
