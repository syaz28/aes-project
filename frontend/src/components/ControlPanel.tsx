import { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import ComparisonView from './analysis/ComparisonView';
import SboxDetailView from './analysis/SboxDetailView';

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

interface ComparisonResult {
  scenario: string;
  matrix_name: string;
  metrics: MetricData;
  sbox: number[];  // FIXED: Added missing sbox field
}

interface AnalysisResponse {
  results: ComparisonResult[];
  proposed_sbox: number[];
}

interface ControlPanelProps {
  matrixKey: string;
  currentMatrix: number[];
  constant: string;
  customSboxData: number[] | null;  // Excel S-box data
}

type ResultTab = 'comparison' | 'custom' | 'k44' | 'aes' | 'excel';

export default function ControlPanel({ matrixKey, currentMatrix, constant, customSboxData }: ControlPanelProps) {
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<ResultTab>('comparison');

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload: {
        matrix_name: string;
        constant: string;
        custom_matrix?: number[];
        raw_sbox?: number[];  // For Excel S-box
      } = {
        matrix_name: matrixKey,
        constant: `0x${constant}`
      };

      if (matrixKey === 'Custom') {
        payload.custom_matrix = currentMatrix;
      }

      // If Excel S-box is available, send it as raw_sbox
      if (customSboxData && matrixKey === 'Excel') {
        payload.raw_sbox = customSboxData;
      }

      const response = await axios.post<AnalysisResponse>(`${API_BASE_URL}/analyze`, payload);

      setAnalysisData(response.data);
      setActiveResultTab('comparison');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Extract specific data for tabs (SAFE ACCESS)
  const getTabData = () => {
    if (!analysisData) return null;

    const k44Result = analysisData.results.find(r => r.scenario === 'Research (K44)');
    const aesResult = analysisData.results.find(r => r.scenario === 'AES S-box');
    const customResult = analysisData.results.find(r => r.scenario === 'Custom');
    const excelResult = analysisData.results.find(r => r.scenario === 'Excel S-box');

    return { k44Result, aesResult, customResult, excelResult };
  };

  const tabData = getTabData();

  return (
    <div className="card-panel p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-yellow-400" />
          <h2 className="text-2xl font-bold text-zinc-100">Control Panel</h2>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Generate & Analyze
            </>
          )}
        </button>
      </div>

      {/* Current Config Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-6">
        <p className="text-xs text-blue-300">
          <strong>Current Config:</strong> Using{' '}
          <span className="font-mono">{matrixKey}</span> matrix with constant{' '}
          <span className="font-mono">0x{constant.toUpperCase()}</span>
          {matrixKey === 'Custom' && ' (Custom matrix will be analyzed)'}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-400 text-sm">Error: {error}</p>
        </div>
      )}

      {/* Empty State */}
      {!analysisData && !loading && (
        <div className="text-center py-12 text-zinc-500">
          <Zap className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Ready to Analyze</p>
          <p className="text-sm mt-2">Configure your matrix and click "Generate & Analyze"</p>
        </div>
      )}

      {/* Results Section */}
      {analysisData && tabData && (
        <div className="space-y-6">
          {/* Result Navigation Tabs */}
          <div className="flex gap-2 border-b border-zinc-800 pb-3">
            <button
              onClick={() => setActiveResultTab('comparison')}
              className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all ${activeResultTab === 'comparison'
                ? 'bg-zinc-800 text-zinc-100 border-b-2 border-blue-500'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
            >
              Comparison
            </button>

            {/* CONDITIONAL: Only show Custom tab if customResult exists */}
            {tabData.customResult && (
              <button
                onClick={() => setActiveResultTab('custom')}
                className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all ${activeResultTab === 'custom'
                  ? 'bg-zinc-800 text-zinc-100 border-b-2 border-purple-500'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
              >
                Custom ({tabData.customResult.matrix_name})
              </button>
            )}

            <button
              onClick={() => setActiveResultTab('k44')}
              className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all ${activeResultTab === 'k44'
                ? 'bg-zinc-800 text-zinc-100 border-b-2 border-emerald-500'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
            >
              Research (K44)
            </button>
            <button
              onClick={() => setActiveResultTab('aes')}
              className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all ${activeResultTab === 'aes'
                ? 'bg-zinc-800 text-zinc-100 border-b-2 border-blue-500'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
            >
              AES S-box
            </button>

            {/* CONDITIONAL: Only show Excel tab if excelResult exists */}
            {tabData.excelResult && (
              <button
                onClick={() => setActiveResultTab('excel')}
                className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-all ${activeResultTab === 'excel'
                  ? 'bg-zinc-800 text-zinc-100 border-b-2 border-orange-500'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
              >
                Excel S-box
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeResultTab === 'comparison' && (
              <ComparisonView results={analysisData.results} />
            )}

            {/* CONDITIONAL: Only show Custom detail if data exists */}
            {activeResultTab === 'custom' && tabData.customResult && (
              <SboxDetailView
                sbox={tabData.customResult.sbox}
                metrics={tabData.customResult.metrics}
                title={`Custom S-box (${tabData.customResult.matrix_name})`}
                color="purple"
              />
            )}

            {/* FIXED: Use specific sbox from k44Result, not proposed_sbox */}
            {activeResultTab === 'k44' && tabData.k44Result && (
              <SboxDetailView
                sbox={tabData.k44Result.sbox}
                metrics={tabData.k44Result.metrics}
                title="Research S-box (K44)"
                color="emerald"
              />
            )}

            {/* FIXED: Use specific sbox from aesResult, not proposed_sbox */}
            {activeResultTab === 'aes' && tabData.aesResult && (
              <SboxDetailView
                sbox={tabData.aesResult.sbox}
                metrics={tabData.aesResult.metrics}
                title="AES Standard S-box"
                color="blue"
              />
            )}

            {/* Excel S-box Detail View */}
            {activeResultTab === 'excel' && tabData.excelResult && (
              <SboxDetailView
                sbox={tabData.excelResult.sbox}
                metrics={tabData.excelResult.metrics}
                title="Excel Imported S-box"
                color="purple"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}