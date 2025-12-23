import { Trophy, Award, Medal, Grid3x3 } from 'lucide-react';

interface MetricData {
  NL_avg: number;
  NL_min: number;
  NL_max: number;
  SAC_avg: number;
  SAC_std: number;
  BIC_NL: number;
  BIC_SAC: number;
  LAP_Probability: number;
  LAP_Bias: number;
  DAP_max: number;
  DU_max: number;
  AD: number;  // Changed from AD_max
  TO: number;
  CI: number;  // Changed from CI_max
  Max_Cycle: number;
  Fixed_Points: number;
  SV: number;
}

interface ComparisonResult {
  scenario: string;
  matrix_name: string;
  metrics: MetricData;
  sbox: number[];  // ADDED: S-box array for visualization
}

interface ComparisonViewProps {
  results: ComparisonResult[];
}

type MetricKey = keyof MetricData;

const METRIC_INFO: Record<MetricKey, {
  name: string;
  higherIsBetter?: boolean;
  closerToHalf?: boolean;
  lowerIsBetter?: boolean;
  target?: number | string;
  decimals?: number;
}> = {
  NL_avg: { name: 'Nonlinearity (Avg)', higherIsBetter: true, target: 112, decimals: 2 },
  NL_min: { name: 'Nonlinearity (Min)', higherIsBetter: true, target: 112, decimals: 0 },
  NL_max: { name: 'Nonlinearity (Max)', higherIsBetter: true, target: 112, decimals: 0 },
  SAC_avg: { name: 'SAC (Average)', closerToHalf: true, target: 0.5, decimals: 5 },
  SAC_std: { name: 'SAC (Std Dev)', lowerIsBetter: true, target: 'Low', decimals: 5 },
  BIC_NL: { name: 'BIC-NL', higherIsBetter: true, target: 104, decimals: 0 },
  BIC_SAC: { name: 'BIC-SAC', closerToHalf: true, target: 0.5, decimals: 5 },
  LAP_Probability: { name: 'LAP (Probability)', lowerIsBetter: true, target: 0.5625, decimals: 6 },
  LAP_Bias: { name: 'LAP (Max Bias)', lowerIsBetter: true, target: 0.0625, decimals: 6 },
  DAP_max: { name: 'DAP (Max)', lowerIsBetter: true, target: 0.015625, decimals: 6 },
  DU_max: { name: 'Diff. Uniformity', lowerIsBetter: true, target: 4, decimals: 0 },
  AD: { name: 'Algebraic Degree', higherIsBetter: true, target: 7, decimals: 0 },
  TO: { name: 'Transparency Order', lowerIsBetter: true, target: 'Low', decimals: 5 },
  CI: { name: 'Correlation Immunity', higherIsBetter: true, target: 0, decimals: 0 },
  Max_Cycle: { name: 'Max Cycle Length', higherIsBetter: true, target: 'High', decimals: 0 },
  Fixed_Points: { name: 'Fixed Points', lowerIsBetter: true, target: 0, decimals: 0 },
  SV: { name: 'Strength Value (SV)', lowerIsBetter: true, target: 'Low', decimals: 2 }
};

// ============================================================================
// SIMPLE GRID COMPONENT FOR S-BOX VISUALIZATION
// ============================================================================

interface SimpleGridProps {
  title: string;
  sbox: number[];
  color: 'emerald' | 'blue' | 'purple';
}

function SimpleGrid({ title, sbox, color }: SimpleGridProps) {
  const colorClasses = {
    emerald: 'border-emerald-500/50 text-emerald-400',
    blue: 'border-blue-500/50 text-blue-400',
    purple: 'border-purple-500/50 text-purple-400'
  };

  const colorClass = colorClasses[color];

  if (!sbox || sbox.length !== 256) {
    return (
      <div className={`bg-zinc-900 rounded-lg border ${colorClass} p-6`}>
        <h4 className={`text-sm font-bold ${colorClass} mb-4`}>{title}</h4>
        <p className="text-zinc-500 text-center py-8">No S-box data available</p>
      </div>
    );
  }

  return (
    <div className={`bg-zinc-900 rounded-lg border ${colorClass} p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <Grid3x3 className={`w-4 h-4 ${colorClass}`} />
        <h4 className={`text-sm font-bold ${colorClass}`}>{title}</h4>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Grid with headers */}
          <div className="grid gap-0.5" style={{ gridTemplateColumns: 'auto repeat(16, 2rem)' }}>
            {/* Top-left corner (empty) */}
            <div className="w-8 h-8" />

            {/* Column headers (0-F) */}
            {Array.from({ length: 16 }, (_, i) => (
              <div
                key={`col-${i}`}
                className="w-8 h-8 flex items-center justify-center text-[10px] font-bold text-amber-400"
              >
                {i.toString(16).toUpperCase()}
              </div>
            ))}

            {/* Rows with row header + cells */}
            {Array.from({ length: 16 }, (_, row) => (
              <>
                {/* Row header */}
                <div
                  key={`row-${row}`}
                  className="w-8 h-8 flex items-center justify-center text-[10px] font-bold text-amber-400"
                >
                  {row.toString(16).toUpperCase()}
                </div>

                {/* S-box cells */}
                {Array.from({ length: 16 }, (_, col) => {
                  const index = row * 16 + col;
                  const value = sbox[index];

                  return (
                    <div
                      key={`cell-${index}`}
                      className="w-8 h-8 flex flex-col items-center justify-center text-[9px] font-mono bg-zinc-950 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 transition-all cursor-pointer"
                      title={`[${row.toString(16).toUpperCase()}${col.toString(16).toUpperCase()}] → Hex: 0x${value.toString(16).toUpperCase().padStart(2, '0')} | Dec: ${value}`}
                    >
                      <span className="text-zinc-400 leading-none font-semibold">
                        {value.toString(16).toUpperCase().padStart(2, '0')}
                      </span>
                      <span className="text-zinc-600 text-[7px] leading-none">
                        {value}
                      </span>
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-600 mt-3 text-center">
        Hover over cells to see coordinate mapping
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPARISON VIEW COMPONENT
// ============================================================================

export default function ComparisonView({ results }: ComparisonViewProps) {
  if (!results || results.length < 2) {
    return <div className="text-zinc-500 text-center py-8">Insufficient data for comparison</div>;
  }

  // SAFE ACCESS: Find specific scenarios (may be undefined)
  const k44Data = results.find(r => r.scenario === 'Research (K44)');
  const aesData = results.find(r => r.scenario === 'AES S-box');
  const customData = results.find(r => r.scenario === 'Custom');

  // Ensure we have at least K44 and AES (benchmarks)
  if (!k44Data || !aesData) {
    return <div className="text-zinc-500 text-center py-8">Missing benchmark data</div>;
  }

  const determineWinner = (metricKey: MetricKey): string => {
    const k44Val = k44Data?.metrics?.[metricKey];
    const aesVal = aesData?.metrics?.[metricKey];
    const customVal = customData?.metrics?.[metricKey];
    const info = METRIC_INFO[metricKey];

    // Safety check: if k44 or aes values are undefined, skip comparison
    if (k44Val === undefined || aesVal === undefined || k44Val === null || aesVal === null) {
      return '-';
    }

    const scores = { k44: 0, aes: 0, custom: 0 };

    if (info.higherIsBetter) {
      const values = [k44Val, aesVal];
      if (customVal !== undefined) values.push(customVal);
      const maxVal = Math.max(...values);

      if (k44Val === maxVal) scores.k44++;
      if (aesVal === maxVal) scores.aes++;
      if (customVal !== undefined && customVal === maxVal) scores.custom++;
    } else if (info.closerToHalf) {
      const k44Diff = Math.abs(k44Val - 0.5);
      const aesDiff = Math.abs(aesVal - 0.5);
      const customDiff = customVal !== undefined ? Math.abs(customVal - 0.5) : Infinity;

      const minDiff = Math.min(k44Diff, aesDiff, customDiff);

      if (k44Diff === minDiff) scores.k44++;
      if (aesDiff === minDiff) scores.aes++;
      if (customDiff === minDiff) scores.custom++;
    } else if (info.lowerIsBetter) {
      const values = [k44Val, aesVal];
      if (customVal !== undefined) values.push(customVal);
      const minVal = Math.min(...values);

      if (k44Val === minVal) scores.k44++;
      if (aesVal === minVal) scores.aes++;
      if (customVal !== undefined && customVal === minVal) scores.custom++;
    }

    const maxScore = Math.max(scores.k44, scores.aes, scores.custom);
    if (maxScore === 0) return '-';

    const winners = [];
    if (scores.k44 === maxScore) winners.push('K44');
    if (scores.aes === maxScore) winners.push('AES');
    if (scores.custom === maxScore) winners.push('Custom');

    return winners.length > 1 ? 'Tie' : winners[0];
  };

  const calculateRanking = () => {
    let k44Wins = 0;
    let aesWins = 0;
    let customWins = 0;

    (Object.keys(METRIC_INFO) as MetricKey[]).forEach(metricKey => {
      const winner = determineWinner(metricKey);
      if (winner === 'K44') k44Wins++;
      else if (winner === 'AES') aesWins++;
      else if (winner === 'Custom') customWins++;
    });

    const ranking: Array<{ name: string; key: string; wins: number; color: 'emerald' | 'blue' | 'purple' }> = [
      { name: 'Research (K44)', key: k44Data.matrix_name, wins: k44Wins, color: 'emerald' },
      { name: 'AES S-box', key: aesData.matrix_name, wins: aesWins, color: 'blue' }
    ];

    if (customData) {
      ranking.push({
        name: 'Custom',
        key: customData.matrix_name,
        wins: customWins,
        color: 'purple' as const
      });
    }

    return ranking.sort((a, b) => b.wins - a.wins);
  };

  const ranking = calculateRanking();

  const formatValue = (value: number | undefined, decimals: number = 5): string => {
    if (value === undefined || value === null) return 'N/A';
    if (typeof value !== 'number' || isNaN(value)) return 'N/A';
    if (decimals === 0) return value.toString();
    return value.toFixed(decimals);
  };

  return (
    <div className="space-y-6">
      {/* Side-by-Side Comparison Table */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-bold text-zinc-100">Side-by-Side Comparison</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Comprehensive cryptographic metric analysis ({customData ? '3' : '2'} configurations)
          </p>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950">
                <th className="text-left py-3 px-6 font-semibold text-zinc-400 sticky left-0 bg-zinc-950">Metric</th>
                <th className="text-center py-3 px-4 font-semibold text-emerald-400">
                  Research (K44)
                </th>
                <th className="text-center py-3 px-4 font-semibold text-blue-400">
                  AES S-box
                </th>
                {customData && (
                  <th className="text-center py-3 px-4 font-semibold text-purple-400">
                    Custom
                  </th>
                )}
                <th className="text-center py-3 px-4 font-semibold text-zinc-400">Target</th>
                <th className="text-center py-3 px-4 font-semibold text-amber-400">Winner</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(METRIC_INFO) as MetricKey[]).map((metricKey) => {
                const info = METRIC_INFO[metricKey];
                const winner = determineWinner(metricKey);

                return (
                  <tr key={metricKey} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-6 text-zinc-300 font-medium sticky left-0 bg-zinc-900/95">
                      {info.name}
                    </td>
                    <td className={`text-center py-3 px-4 font-mono text-sm ${winner === 'K44' ? 'text-emerald-400 font-bold' : 'text-zinc-400'
                      }`}>
                      {formatValue(k44Data.metrics[metricKey], info.decimals)}
                    </td>
                    <td className={`text-center py-3 px-4 font-mono text-sm ${winner === 'AES' ? 'text-blue-400 font-bold' : 'text-zinc-400'
                      }`}>
                      {formatValue(aesData.metrics[metricKey], info.decimals)}
                    </td>
                    {customData && (
                      <td className={`text-center py-3 px-4 font-mono text-sm ${winner === 'Custom' ? 'text-purple-400 font-bold' : 'text-zinc-400'
                        }`}>
                        {formatValue(customData.metrics[metricKey], info.decimals)}
                      </td>
                    )}
                    <td className="text-center py-3 px-4 font-mono text-xs text-zinc-500">
                      {typeof info.target === 'number' ? formatValue(info.target, info.decimals) : info.target}
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${winner === 'K44' ? 'bg-emerald-500/20 text-emerald-400' :
                        winner === 'AES' ? 'bg-blue-500/20 text-blue-400' :
                          winner === 'Custom' ? 'bg-purple-500/20 text-purple-400' :
                            winner === 'Tie' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-zinc-700/20 text-zinc-500'
                        }`}>
                        {winner}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Ranking */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-zinc-100">Global Ranking</h3>
          <span className="text-xs text-zinc-500 ml-2">
            (Based on {Object.keys(METRIC_INFO).length} metrics)
          </span>
        </div>

        <div className={`grid grid-cols-1 ${customData ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
          {ranking.map((item, index) => {
            const IconComponent = index === 0 ? Trophy : index === 1 ? Award : Medal;
            const iconColor = index === 0 ? 'text-amber-400' : index === 1 ? 'text-zinc-400' : 'text-orange-600';

            return (
              <div
                key={item.key}
                className={`relative bg-zinc-950 rounded-lg p-6 border-2 transition-all ${index === 0 ? 'border-amber-500/50 shadow-lg shadow-amber-500/20' :
                  index === 1 ? 'border-zinc-600/50' :
                    'border-orange-600/50'
                  }`}
              >
                <div className="absolute top-4 right-4">
                  <IconComponent className={`w-8 h-8 ${iconColor}`} />
                </div>

                <div className="mb-4">
                  <div className="text-xs text-zinc-500 mb-1">Rank #{index + 1}</div>
                  <div className={`text-lg font-bold ${item.color === 'emerald' ? 'text-emerald-400' :
                    item.color === 'blue' ? 'text-blue-400' :
                      'text-purple-400'
                    }`}>
                    {item.name}
                  </div>
                  <div className="text-xs text-zinc-600 font-mono">{item.key}</div>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xs text-zinc-500">Total Wins</div>
                    <div className={`text-4xl font-bold ${index === 0 ? 'text-amber-400' :
                      index === 1 ? 'text-zinc-400' :
                        'text-orange-600'
                      }`}>
                      {item.wins}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-600">
                    out of {Object.keys(METRIC_INFO).length}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* NEW SECTION: S-BOX STRUCTURE VISUALIZATION */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Grid3x3 className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-zinc-100">S-box Structure Visualization</h3>
          <span className="text-xs text-zinc-500 ml-2">
            16×16 Hexadecimal Grid
          </span>
        </div>

        {/* Grid Layout: 2 columns (K44 & AES) or 3 columns if Custom exists */}
        <div className={`grid grid-cols-1 ${customData ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
          {/* Left: K44 (or Custom if user selected Custom) */}
          <SimpleGrid
            title={customData ? customData.scenario : k44Data.scenario}
            sbox={customData ? customData.sbox : k44Data.sbox}
            color={customData ? 'purple' : 'emerald'}
          />

          {/* Middle (if Custom exists): K44 */}
          {customData && (
            <SimpleGrid
              title={k44Data.scenario}
              sbox={k44Data.sbox}
              color="emerald"
            />
          )}

          {/* Right: AES */}
          <SimpleGrid
            title={aesData.scenario}
            sbox={aesData.sbox}
            color="blue"
          />
        </div>
      </div>
    </div>
  );
}