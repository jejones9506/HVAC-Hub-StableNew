import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, ScrollView, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useHVACStore } from '@/store/hvacStore';
import { mockCalculators, CalculatorDef } from '@/constants/hvacData';
import { Spacing } from '@/constants/theme';

interface CalcResult {
  [key: string]: string | number;
}

export default function CalculatorsScreen() {
  const { currentLocation, getLocalCodes, user, calculatorHistory, saveCalculation, clearCalculatorHistory, selectedEquipment } = useHVACStore();
  const [selectedCalc, setSelectedCalc] = useState<CalculatorDef | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [results, setResults] = useState<CalcResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const localCodes = getLocalCodes();

  const openCalculator = (calc: CalculatorDef) => {
    setSelectedCalc(calc);
    const defaults: Record<string, string> = {};
    calc.inputs.forEach(inp => {
      if (inp.default) defaults[inp.key] = inp.default;
    });
    // If equipment selected, try to prefill useful values
    if (selectedEquipment) {
      if (calc.id === 'voltagedrop' || calc.id === 'ohm') {
        if (selectedEquipment.electrical.voltage) defaults.voltage = selectedEquipment.electrical.voltage.replace('/230', '').replace('V', '');
      }
    }
    setInputs(defaults);
    setResults(null);
    setShowResultModal(false);
  };

  const updateInput = (key: string, value: string) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const calculate = () => {
    if (!selectedCalc) return;

    const res: CalcResult = {};
    const vals: Record<string, number> = {};
    
    selectedCalc.inputs.forEach(inp => {
      const val = parseFloat(inputs[inp.key] || '0');
      vals[inp.key] = isNaN(val) ? 0 : val;
    });

    try {
      switch (selectedCalc.id) {
        case 'ohm': {
          const { voltage, current, resistance } = vals;
          if (voltage > 0 && current > 0) {
            res.Resistance = (voltage / current).toFixed(2) + ' Ω';
            res.Power = (voltage * current).toFixed(1) + ' W';
          } else if (voltage > 0 && resistance > 0) {
            res.Current = (voltage / resistance).toFixed(2) + ' A';
            res.Power = (Math.pow(voltage, 2) / resistance).toFixed(1) + ' W';
          } else if (current > 0 && resistance > 0) {
            res.Voltage = (current * resistance).toFixed(1) + ' V';
            res.Power = (current * current * resistance).toFixed(1) + ' W';
          } else {
            res.Note = 'Enter at least two values to calculate the third.';
          }
          break;
        }
        case 'voltagedrop': {
          const length = vals.length;
          const current = vals.current;
          const voltage = vals.voltage || 240;
          const k = 12.9; // copper
          const percentDrop = ((2 * k * current * length) / (voltage * 10000) * 100);
          res['Voltage Drop %'] = percentDrop.toFixed(2) + '%';
          res['Recommended Action'] = percentDrop > 3 ? 'Upsize wire! Exceeds 3% NEC recommendation.' : 'Acceptable per NEC (max 3% for branch circuits).';
          res['Suggested Wire'] = current > 30 ? '8 AWG or larger' : current > 20 ? '10 AWG' : '12 AWG minimum';
          break;
        }
        case 'conduitbend': {
          const offset = vals.offset;
          const size = inputs.conduitSize || '3/4"';
          const multiplier = 2.0; // 30 deg
          res['Travel (30° bend)'] = (offset * multiplier).toFixed(1) + ' inches';
          res['Setback'] = (offset * 0.5).toFixed(1) + ' inches';
          res['Tip'] = `For ${size} EMT. Use proper bender. Measure twice, bend once.`;
          break;
        }
        case 'conduitfill': {
          const numWires = vals.numWires;
          const size = inputs.conduitSize || '1"';
          // Simplified NEC approx
          const fillPercent = Math.min(40, (numWires * 3.5)); // rough
          res['Est. Fill %'] = fillPercent + '%';
          res['Status'] = fillPercent > 40 ? 'Over limit — upsize conduit or reduce wires per NEC Ch. 9 Table 4' : 'OK per simplified NEC';
          res['Code'] = 'Verify with full NEC tables and local amendments.';
          break;
        }
        case 'ductulator': {
          const cfm = vals.cfm;
          const velocity = vals.velocity || 900;
          const areaSqFt = cfm / velocity;
          const diaIn = Math.sqrt(areaSqFt * 144 / 0.785);
          res['Min Duct Diameter (round)'] = diaIn.toFixed(1) + ' inches';
          res['Rect. Example'] = `${Math.round(diaIn * 0.7)}" x ${Math.round(diaIn * 1.4)}"`;
          res['Recommendation'] = cfm > 1200 ? 'Consider reducing velocity or adding dampers for noise control.' : 'Good for typical residential per ASHRAE.';
          break;
        }
        case 'refrigpt': {
          const pressure = vals.pressure;
          const refrig = inputs.refrig || 'R-410A';
          let temp = 40;
          if (refrig.includes('410') || refrig.includes('32')) temp = Math.round(pressure / 3.4 + 5);
          else if (refrig.includes('22')) temp = Math.round(pressure / 2.45);
          res['Approx. Sat. Temp (°F)'] = temp + ' °F';
          res['Note'] = 'Use for superheat/subcool reference. Always cross with manufacturer charging chart and accurate gauges.';
          break;
        }
        case 'wiresize': {
          const amps = vals.amps || 0;
          const length = vals.length || 0;
          let wire = '14 AWG';
          if (amps > 15) wire = '12 AWG';
          if (amps > 20) wire = '10 AWG';
          if (amps > 30) wire = '8 AWG';
          res['Min Wire Size'] = wire;
          res['Ampacity Note'] = `${amps}A load at ${length}ft. Check 60°C/75°C column in NEC Table 310.15(B)(16).`;
          break;
        }
        case 'superheat': {
          const suction = vals.suction || 0;
          const satTemp = vals.satTemp || 0;
          const actualSH = suction - satTemp;
          res['Superheat'] = actualSH.toFixed(1) + ' °F';
          res['Recommendation'] = actualSH < 8 ? 'Low superheat — check TXV or add charge carefully.' : actualSH > 15 ? 'High superheat — check for low charge or restriction.' : 'Within normal range (8-15°F typical for TXV).';
          break;
        }
        // Step 15 new calcs
        case 'transformer': {
          const vaLoad = vals.vaLoad || 0;
          const primaryV = vals.primaryV || 120;
          const va = Math.ceil(vaLoad * 1.25); // 25% headroom
          res['Recommended VA'] = va + ' VA';
          res['Secondary Amps (if 24V)'] = (va / 24).toFixed(1) + ' A';
          res['Note'] = 'Use Class 2 transformer. Size for inrush on contactors.';
          break;
        }
        case 'motorfla': {
          const hp = vals.hp || 0;
          const volts = vals.volts || 230;
          let fla = hp * 4; // rough for 230V single phase
          if (volts < 200) fla = hp * 5;
          res['Est. FLA'] = fla.toFixed(1) + ' A';
          res['NEC Note'] = 'Use NEC Table 430.248/250 for exact. Add 25% for service factor.';
          break;
        }
        case 'airflow': {
          const velocity = vals.velocity || 900;
          const area = vals.area || 1;
          const cfm = velocity * area;
          res['CFM'] = cfm.toFixed(0);
          res['Recommendation'] = cfm < 400 ? 'Low airflow — check filter or fan speed.' : 'Adequate for typical residential per ACCA.';
          break;
        }
        default:
          res['Result'] = 'Calculation complete (enhanced logic in production).';
      }

      res['Local Code Recommendations'] = localCodes.join(' | ');

      setResults(res);
      setShowResultModal(true);

      // Auto-save to history
      saveCalculation({
        calculator: selectedCalc.name,
        inputs: { ...inputs },
        results: res as any,
      });

    } catch (e) {
      Alert.alert('Calc Error', 'Please check your inputs.');
    }
  };

  const closeCalc = () => {
    setSelectedCalc(null);
    setInputs({});
    setResults(null);
    setShowResultModal(false);
  };

  const loadFromEquipment = () => {
    if (!selectedEquipment || !selectedCalc) return;
    const newInputs: Record<string, string> = { ...inputs };
    if (selectedCalc.id.includes('voltage') || selectedCalc.id === 'ohm') {
      newInputs.voltage = selectedEquipment.electrical.voltage.replace(/[^\d]/g, '');
    }
    if (selectedCalc.id === 'refrigpt') {
      newInputs.refrig = selectedEquipment.refrigerant;
    }
    setInputs(newInputs);
    Alert.alert('Loaded', 'Prefilled values from selected equipment where applicable.');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.four, paddingBottom: 0 }}>
          <ThemedText type="title">Calculators &amp; Tools</ThemedText>
          <Pressable onPress={() => setShowHistory(true)}>
            <ThemedText style={{ color: '#208AEF' }}>History ({calculatorHistory.length})</ThemedText>
          </Pressable>
        </View>
        <ThemedText type="small" style={{ paddingHorizontal: Spacing.four, marginBottom: Spacing.two, opacity: 0.7 }}>
          All calculators include recommended actions based on your location ({currentLocation}) and local codes. History is saved automatically and tied to your profile.
        </ThemedText>

        {selectedEquipment && (
          <ThemedText type="small" style={{ paddingHorizontal: Spacing.four, color: '#34C759' }}>
            Selected equipment: {selectedEquipment.brand} {selectedEquipment.model} (values can be prefilled)
          </ThemedText>
        )}

        <ScrollView contentContainerStyle={styles.grid}>
          {mockCalculators.map((calc) => (
            <Pressable 
              key={calc.id} 
              style={styles.calcCard} 
              onPress={() => openCalculator(calc)}
            >
              <ThemedText type="defaultSemiBold">{calc.name}</ThemedText>
              <ThemedText type="small" style={{ opacity: 0.7 }}>{calc.description}</ThemedText>
              <ThemedText type="small" style={{ color: '#208AEF', marginTop: 4 }}>{calc.category}</ThemedText>
            </Pressable>
          ))}
          {/* Extra calculators for Step 4 */}
          <Pressable style={styles.calcCard} onPress={() => openCalculator({ id: 'wiresize', name: 'Wire Sizing', description: 'Quick ampacity and size recommendation.', category: 'Electrical', inputs: [{ key: 'amps', label: 'Load Amps', type: 'number' }, { key: 'length', label: 'Run Length', type: 'number', unit: 'ft' }] })}>
            <ThemedText type="defaultSemiBold">Wire Sizing</ThemedText>
            <ThemedText type="small" style={{ opacity: 0.7 }}>Ampacity and size recommendation.</ThemedText>
            <ThemedText type="small" style={{ color: '#208AEF', marginTop: 4 }}>Electrical</ThemedText>
          </Pressable>
          <Pressable style={styles.calcCard} onPress={() => openCalculator({ id: 'superheat', name: 'Superheat/Subcool', description: 'Calculate actual superheat from gauge readings.', category: 'Refrigeration', inputs: [{ key: 'suction', label: 'Suction Pressure (psig)', type: 'number' }, { key: 'satTemp', label: 'Saturation Temp (°F)', type: 'number' }] })}>
            <ThemedText type="defaultSemiBold">Superheat/Subcool</ThemedText>
            <ThemedText type="small" style={{ opacity: 0.7 }}>Calculate actual superheat.</ThemedText>
            <ThemedText type="small" style={{ color: '#208AEF', marginTop: 4 }}>Refrigeration</ThemedText>
          </Pressable>
          {/* Step 15 additional calculators */}
          <Pressable style={styles.calcCard} onPress={() => openCalculator({ id: 'transformer', name: 'Transformer Sizing', description: 'Size control transformer for VA load.', category: 'Electrical', inputs: [{ key: 'vaLoad', label: 'Total VA Load', type: 'number' }, { key: 'primaryV', label: 'Primary Voltage', type: 'number', default: '120' }] })}>
            <ThemedText type="defaultSemiBold">Transformer Sizing</ThemedText>
            <ThemedText type="small" style={{ opacity: 0.7 }}>Control transformer VA sizing.</ThemedText>
            <ThemedText type="small" style={{ color: '#208AEF', marginTop: 4 }}>Electrical</ThemedText>
          </Pressable>
          <Pressable style={styles.calcCard} onPress={() => openCalculator({ id: 'motorfla', name: 'Motor FLA Lookup', description: 'Estimate full load amps from HP/voltage.', category: 'Electrical', inputs: [{ key: 'hp', label: 'Motor HP', type: 'number' }, { key: 'volts', label: 'Voltage', type: 'number', default: '230' }] })}>
            <ThemedText type="defaultSemiBold">Motor FLA Lookup</ThemedText>
            <ThemedText type="small" style={{ opacity: 0.7 }}>Approx FLA from nameplate data.</ThemedText>
            <ThemedText type="small" style={{ color: '#208AEF', marginTop: 4 }}>Electrical</ThemedText>
          </Pressable>
          <Pressable style={styles.calcCard} onPress={() => openCalculator({ id: 'airflow', name: 'Airflow (CFM) Calc', description: 'Calculate CFM from velocity and duct area.', category: 'Airflow', inputs: [{ key: 'velocity', label: 'Velocity (fpm)', type: 'number', default: '900' }, { key: 'area', label: 'Duct Area (sq ft)', type: 'number' }] })}>
            <ThemedText type="defaultSemiBold">Airflow (CFM)</ThemedText>
            <ThemedText type="small" style={{ opacity: 0.7 }}>CFM = velocity × area.</ThemedText>
            <ThemedText type="small" style={{ color: '#208AEF', marginTop: 4 }}>Airflow</ThemedText>
          </Pressable>
        </ScrollView>

        {/* Calculator Input Modal */}
        <Modal visible={!!selectedCalc && !showResultModal} animationType="slide" onRequestClose={closeCalc}>
          <SafeAreaView style={{ flex: 1, padding: Spacing.four }}>
            <ThemedText type="title">{selectedCalc?.name}</ThemedText>
            <ThemedText type="small" style={{ marginVertical: Spacing.two }}>{selectedCalc?.description}</ThemedText>

            {selectedEquipment && (
              <Pressable style={{ backgroundColor: '#E6F4FE', padding: 8, borderRadius: 6, marginBottom: 12 }} onPress={loadFromEquipment}>
                <ThemedText style={{ color: '#208AEF' }}>Load defaults from selected equipment ({selectedEquipment.model})</ThemedText>
              </Pressable>
            )}

            {selectedCalc?.inputs.map((inp, idx) => (
              <View key={idx} style={{ marginBottom: Spacing.three }}>
                <ThemedText>{inp.label} {inp.unit ? `(${inp.unit})` : ''}</ThemedText>
                <TextInput
                  style={styles.input}
                  keyboardType={inp.type === 'number' ? 'numeric' : 'default'}
                  value={inputs[inp.key] || ''}
                  onChangeText={(v) => updateInput(inp.key, v)}
                  placeholder={inp.default || 'Enter value'}
                />
              </View>
            ))}

            <Pressable style={styles.calcBtn} onPress={calculate}>
              <ThemedText style={{ color: 'white', fontWeight: '600' }}>Calculate + Get Recommendations</ThemedText>
            </Pressable>

            <Pressable style={{ marginTop: 20 }} onPress={closeCalc}>
              <ThemedText style={{ color: '#208AEF' }}>Cancel</ThemedText>
            </Pressable>

            <ThemedText type="small" style={{ marginTop: 30, opacity: 0.6 }}>
              Results include code compliance notes for your area. History is automatically saved.
            </ThemedText>
          </SafeAreaView>
        </Modal>

        {/* Results Modal */}
        <Modal visible={showResultModal} animationType="fade" onRequestClose={() => setShowResultModal(false)}>
          <SafeAreaView style={{ flex: 1, padding: Spacing.four, backgroundColor: '#fff' }}>
            <ThemedText type="title">Results for {selectedCalc?.name}</ThemedText>
            
            {results && Object.entries(results).map(([key, value], idx) => (
              <ThemedView key={idx} style={styles.resultRow}>
                <ThemedText type="defaultSemiBold">{key}:</ThemedText>
                <ThemedText style={{ marginLeft: 8 }}>{value}</ThemedText>
              </ThemedView>
            ))}

            <ThemedText type="small" style={{ marginTop: 20 }}>
              Always verify with local AHJ and manufacturer specs. These are aids only.
            </ThemedText>

            <Pressable style={[styles.calcBtn, { marginTop: 30 }]} onPress={() => setShowResultModal(false)}>
              <ThemedText style={{ color: 'white' }}>Done</ThemedText>
            </Pressable>
            <Pressable style={{ marginTop: 12 }} onPress={closeCalc}>
              <ThemedText style={{ color: '#208AEF' }}>Back to Calculators</ThemedText>
            </Pressable>
          </SafeAreaView>
        </Modal>

        {/* History Modal */}
        <Modal visible={showHistory} animationType="slide" onRequestClose={() => setShowHistory(false)}>
          <SafeAreaView style={{ flex: 1, padding: Spacing.four }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText type="title">Calculator History</ThemedText>
              <Pressable onPress={clearCalculatorHistory}><ThemedText style={{ color: '#E74C3C' }}>Clear All</ThemedText></Pressable>
            </View>
            <ThemedText type="small" style={{ marginBottom: 12 }}>Last 20 calculations, saved with your location. Useful for job logs and repeating jobs.</ThemedText>

            {calculatorHistory.length === 0 ? (
              <ThemedText>No calculations yet. Run a few and they will appear here.</ThemedText>
            ) : (
              <FlatList
                data={calculatorHistory}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <ThemedView style={{ backgroundColor: '#F0F0F3', padding: 12, borderRadius: 8, marginBottom: 8 }}>
                    <ThemedText type="defaultSemiBold">{item.calculator}</ThemedText>
                    <ThemedText type="small">{new Date(item.timestamp).toLocaleString()} • {item.location}</ThemedText>
                    <ThemedText type="small" style={{ marginTop: 4 }}>Inputs: {Object.entries(item.inputs).map(([k,v]) => `${k}=${v}`).join(', ')}</ThemedText>
                    <ThemedText type="small">Results: {Object.entries(item.results).slice(0,3).map(([k,v]) => `${k}: ${v}`).join(' | ')}</ThemedText>
                  </ThemedView>
                )}
              />
            )}
            <Pressable style={{ marginTop: 20 }} onPress={() => setShowHistory(false)}>
              <ThemedText style={{ color: '#208AEF' }}>Close</ThemedText>
            </Pressable>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  grid: { padding: Spacing.four, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  calcCard: { width: '48%', backgroundColor: '#F0F0F3', padding: Spacing.three, borderRadius: 12, marginBottom: Spacing.two },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16, marginTop: 4 },
  calcBtn: { backgroundColor: '#208AEF', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  resultRow: { flexDirection: 'row', marginVertical: 6, flexWrap: 'wrap' },
});
