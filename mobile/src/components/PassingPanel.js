import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function PassingPanel({ selectedCardIds, targetRecipient, hasSubmitted, timeRemainingSeconds=120, onPassSubmit, onAutoSelect, canReceivePaan, selectedCardsContainPaan }) {
  const [timeLeft, setTimeLeft] = useState(timeRemainingSeconds);

  useEffect(() => {
    setTimeLeft(timeRemainingSeconds);
    const t = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) {
          clearInterval(t);
          if (!hasSubmitted && onAutoSelect) {
            onAutoSelect();
          }
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timeRemainingSeconds, hasSubmitted, onAutoSelect]);

  const mm = Math.floor(timeLeft/60), ss = timeLeft%60;
  const formatted = `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  const isValid = selectedCardIds.length === 5;
  const paanViolation = !canReceivePaan && selectedCardsContainPaan;
  const canSubmit = isValid && !paanViolation && !hasSubmitted;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.sendIcon}><Text style={{fontSize:14}}>✉️</Text></View>
          <View>
            <Text style={s.headerTitle}>Card Passing Phase</Text>
            <Text style={s.headerSub}>Passing to: <Text style={{color:'#A5B4FC'}}>{targetRecipient?.name}</Text> ({targetRecipient?.score}pts)</Text>
          </View>
        </View>
        <View style={s.timer}>
          <Text style={[s.timerText, timeLeft < 20 && s.timerUrgent]}>{formatted}</Text>
        </View>
      </View>

      {/* Paan restriction warning */}
      {!canReceivePaan && (
        <View style={s.warnBanner}>
          <Text style={s.warnText}>⚠️ 90+ Rule: Cannot pass Paan (♥) to {targetRecipient?.name}!</Text>
        </View>
      )}

      {/* Actions */}
      <View style={s.actions}>
        <View style={s.countBadge}>
          <Text style={s.countText}>Selected: </Text>
          <Text style={[s.countNum, isValid && s.countNumValid]}>{selectedCardIds.length}/5</Text>
        </View>
        <View style={s.btns}>
          {!hasSubmitted && (
            <TouchableOpacity style={s.autoBtn} onPress={onAutoSelect}>
              <Text style={s.autoBtnText}>Auto-Select</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.passBtn, !canSubmit && s.passBtnDisabled]}
            disabled={!canSubmit}
            onPress={onPassSubmit}
          >
            <Text style={s.passBtnText}>{hasSubmitted ? 'Waiting...' : '✉ PASS CARDS'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:{backgroundColor:'rgba(15,23,42,0.97)',borderWidth:1,borderColor:'#334155',borderRadius:14,padding:12,gap:8,margin:4},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#1E293B',paddingBottom:8},
  headerLeft:{flexDirection:'row',alignItems:'center',gap:8,flex:1},
  sendIcon:{width:32,height:32,borderRadius:8,backgroundColor:'rgba(99,102,241,0.2)',borderWidth:1,borderColor:'rgba(99,102,241,0.3)',justifyContent:'center',alignItems:'center'},
  headerTitle:{color:'#FFF',fontWeight:'700',fontSize:12},
  headerSub:{color:'#64748B',fontSize:10,marginTop:1},
  timer:{backgroundColor:'#1E293B',paddingHorizontal:10,paddingVertical:4,borderRadius:8,borderWidth:1,borderColor:'#334155'},
  timerText:{color:'#E2E8F0',fontSize:12,fontWeight:'900',fontFamily:'monospace'},
  timerUrgent:{color:'#F87171'},
  warnBanner:{backgroundColor:'rgba(127,29,29,0.4)',borderWidth:1,borderColor:'rgba(239,68,68,0.4)',borderRadius:10,padding:8},
  warnText:{color:'#FCA5A5',fontSize:10,fontWeight:'600'},
  actions:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8},
  countBadge:{flexDirection:'row',alignItems:'center'},
  countText:{color:'#94A3B8',fontSize:11},
  countNum:{color:'#818CF8',fontWeight:'900',fontSize:12,fontFamily:'monospace'},
  countNumValid:{color:'#34D399'},
  btns:{flexDirection:'row',gap:8,alignItems:'center'},
  autoBtn:{backgroundColor:'#1E293B',borderWidth:1,borderColor:'#334155',paddingHorizontal:12,paddingVertical:7,borderRadius:8},
  autoBtnText:{color:'#CBD5E1',fontSize:11,fontWeight:'600'},
  passBtn:{backgroundColor:'#6366F1',paddingHorizontal:16,paddingVertical:8,borderRadius:10,shadowColor:'#6366F1',shadowOpacity:0.4,shadowRadius:4,elevation:4},
  passBtnDisabled:{backgroundColor:'#1E293B',borderWidth:1,borderColor:'#334155',shadowOpacity:0},
  passBtnText:{color:'#FFF',fontWeight:'900',fontSize:12},
});
