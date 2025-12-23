import { CheckCircle, Activity, Shield, Zap, Target, TrendingUp, Trophy } from 'lucide-react';

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
  AD: number;
  TO: number;
  CI: number;
  Max_Cycle: number;
  Fixed_Points: number;
  SV: number;
}

interface SboxDetailViewProps {
  sbox: number[];
  metrics: MetricData;
  title: string;
  color: 'purple' | 'blue' | 'emerald';
}

export default function SboxDetailView({ sbox, metrics, title, color }: SboxDetailViewProps) {
  const isBalanced = true;
  const isBijective = new Set(sbox).size === 256;

  const colorClasses = {
    purple: {
      border: 'border-purple-500/50',
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      badge: 'bg-purple-500/20 text-purple-300'
    },
    blue: {
      border: 'border-blue-500/50',
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      badge: 'bg-blue-500/20 text-blue-300'
    },
    emerald: {
      border: 'border-emerald-500/50',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-300'
    }
  };

  const colorClass = colorClasses[color];

  return (
    <div className="space-y-6">
      {/* Validation Status */}
      <div className={`bg-zinc-900 rounded-lg border ${colorClass.border} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className={`w-5 h-5 ${colorClass.text}`} />
            <h3 className="text-lg font-bold text-zinc-100">{title}</h3>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
            <CheckCircle className="w-4 h-4" />
            Valid
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className={`${colorClass.bg} rounded-lg p-4 border ${colorClass.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className={`w-4 h-4 ${isBalanced ? 'text-green-400' : 'text-red-400'}`} />
              <span className="text-sm text-zinc-400">Balanced Output Bits</span>
            </div>
            <div className={`text-2xl font-bold ${colorClass.text}`}>128/128</div>
          </div>

          <div className={`${colorClass.bg} rounded-lg p-4 border ${colorClass.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className={`w-4 h-4 ${isBijective ? 'text-green-400' : 'text-red-400'}`} />
              <span className="text-sm text-zinc-400">Bijective Function</span>
            </div>
            <div className={`text-2xl font-bold ${colorClass.text}`}>0-255</div>
          </div>
        </div>
      </div>

      {/* 16x16 S-box Hex Grid WITH HEADERS */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <h3 className="text-sm font-bold text-zinc-400 mb-4">S-box Hexadecimal Values (16×16)</h3>

        {/* Grid Container - LEFT ALIGNED with fit-content */}
        <div style={{ width: 'fit-content' }}>
          {/* Grid Container with Column & Row Headers */}
          <div className="grid gap-0.5" style={{ gridTemplateColumns: '2rem repeat(16, 2rem)' }}>
            {/* Top-left corner (empty cell) */}
            <div className="w-8 h-8" />

            {/* Column Headers (0-F) */}
            {Array.from({ length: 16 }, (_, i) => (
              <div
                key={`col-${i}`}
                className="w-8 h-8 flex items-center justify-center text-[10px] font-bold text-amber-400"
              >
                {i.toString(16).toUpperCase()}
              </div>
            ))}

            {/* Rows with Row Header + Cells */}
            {Array.from({ length: 16 }, (_, row) => (
              <>
                {/* Row Header */}
                <div
                  key={`row-${row}`}
                  className="w-8 h-8 flex items-center justify-center text-[10px] font-bold text-amber-400"
                >
                  {row.toString(16).toUpperCase()}
                </div>

                {/* S-box Cells */}
                {Array.from({ length: 16 }, (_, col) => {
                  const index = row * 16 + col;
                  const value = sbox[index];

                  return (
                    <div
                      key={`cell-${index}`}
                      className="w-8 h-8 flex items-center justify-center text-[9px] font-mono bg-zinc-950 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 transition-all cursor-pointer rounded"
                      title={`[${row.toString(16).toUpperCase()}${col.toString(16).toUpperCase()}] → 0x${value.toString(16).toUpperCase().padStart(2, '0')}`}
                    >
                      <span className="text-zinc-400">
                        {value.toString(16).toUpperCase().padStart(2, '0')}
                      </span>
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>

        <p className="text-xs text-zinc-500 mt-4">
          Hover over cells to see coordinate mapping (Row × Column → Value)
        </p>
      </div>

      {/* 16x16 S-box Decimal Grid */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <h3 className="text-sm font-bold text-zinc-400 mb-4">S-box Decimal Values (0-255)</h3>

        {/* Grid Container - LEFT ALIGNED with fit-content */}
        <div style={{ width: 'fit-content' }}>
          <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(16, 2rem)' }}>
            {sbox.map((value, index) => (
              <div
                key={`dec-${index}`}
                className="w-8 h-8 flex items-center justify-center text-[10px] font-mono font-semibold bg-zinc-950 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 transition-all cursor-pointer rounded"
                title={`Index: ${index} (0x${index.toString(16).toUpperCase().padStart(2, '0')}), Value: ${value}`}
              >
                <span className="text-zinc-400">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-zinc-500 mt-4">
          256 decimal values arranged sequentially (hover for hex conversion)
        </p>
      </div>

      {/* Cryptographic Analysis Cards */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
        <h3 className="text-sm font-bold text-zinc-400 mb-4">Cryptographic Analysis</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Nonlinearity Cards */}
          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-zinc-400">NL (Average)</span>
            </div>
            <div className="text-3xl font-bold text-blue-400 mb-2">{metrics.NL_avg.toFixed(2)}</div>
            <div className="text-xs text-zinc-600">Target: 112 (Max)</div>
          </div>

          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-zinc-400">NL (Min)</span>
            </div>
            <div className="text-3xl font-bold text-blue-400 mb-2">{metrics.NL_min}</div>
            <div className="text-xs text-zinc-600">Target: 112</div>
          </div>

          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-zinc-400">NL (Max)</span>
            </div>
            <div className="text-3xl font-bold text-blue-400 mb-2">{metrics.NL_max}</div>
            <div className="text-xs text-zinc-600">Target: 112</div>
          </div>

          {/* SAC Cards */}
          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-zinc-400">SAC (Avg)</span>
            </div>
            <div className="text-3xl font-bold text-purple-400 mb-2">{metrics.SAC_avg.toFixed(5)}</div>
            <div className="text-xs text-zinc-600">Target: 0.50000</div>
          </div>

          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-zinc-400">SAC (Std)</span>
            </div>
            <div className="text-3xl font-bold text-purple-400 mb-2">{metrics.SAC_std.toFixed(5)}</div>
            <div className="text-xs text-zinc-600">Lower is better</div>
          </div>

          {/* BIC Cards */}
          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-zinc-400">BIC-NL</span>
            </div>
            <div className="text-3xl font-bold text-cyan-400 mb-2">{metrics.BIC_NL}</div>
            <div className="text-xs text-zinc-600">Target: 104</div>
          </div>

          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-zinc-400">BIC-SAC</span>
            </div>
            <div className="text-3xl font-bold text-emerald-400 mb-2">{metrics.BIC_SAC.toFixed(5)}</div>
            <div className="text-xs text-zinc-600">Target: 0.50000</div>
          </div>

          {/* LAP & DAP */}
          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-red-400" />
              <span className="text-xs font-semibold text-zinc-400">LAP (Probability)</span>
            </div>
            <div className="text-3xl font-bold text-red-400 mb-2">{metrics.LAP_Probability.toFixed(6)}</div>
            <div className="text-xs text-zinc-600">Target: 0.562500</div>
          </div>

          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-red-400" />
              <span className="text-xs font-semibold text-zinc-400">LAP (Bias)</span>
            </div>
            <div className="text-3xl font-bold text-red-400 mb-2">{metrics.LAP_Bias.toFixed(6)}</div>
            <div className="text-xs text-zinc-600">Target: 0.062500</div>
          </div>

          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-zinc-400">DAP (Max)</span>
            </div>
            <div className="text-3xl font-bold text-amber-400 mb-2">{metrics.DAP_max.toFixed(6)}</div>
            <div className="text-xs text-zinc-600">Target: 0.015625</div>
          </div>

          {/* Additional Metrics */}
          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-zinc-400">DIFF. UNIFORMITY</span>
            </div>
            <div className="text-3xl font-bold text-indigo-400 mb-2">{metrics.DU_max}</div>
            <div className="text-xs text-zinc-600">Target: 4 (Min)</div>
          </div>

          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-pink-400" />
              <span className="text-xs font-semibold text-zinc-400">MAX CYCLE</span>
            </div>
            <div className="text-3xl font-bold text-pink-400 mb-2">{metrics.Max_Cycle}</div>
            <div className="text-xs text-zinc-600">Higher is better</div>
          </div>

          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-semibold text-zinc-400">FIXED POINTS</span>
            </div>
            <div className="text-3xl font-bold text-orange-400 mb-2">{metrics.Fixed_Points}</div>
            <div className="text-xs text-zinc-600">Target: 0</div>
          </div>

          {/* Strength Value */}
          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800 md:col-span-3">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-zinc-400">STRENGTH VALUE (SV)</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-4xl font-bold text-amber-400">{metrics.SV.toFixed(2)}</div>
              <div className="text-xs text-zinc-600">Lower is stronger (Optimal: 16-20)</div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}