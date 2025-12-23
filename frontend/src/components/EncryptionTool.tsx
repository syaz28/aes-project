import { useState } from 'react';
import { Lock, Unlock, Trash2, AlertCircle, Dice5, Copy, Check, Clock, Key } from 'lucide-react';
import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../config';

interface EncryptionToolProps {
  matrixKey: string;
  currentMatrix: number[];
  constant: string;
}

type Mode = 'encrypt' | 'decrypt';
type SboxType = 'K44' | 'AES_Standard';

export default function EncryptionTool({ matrixKey: _matrixKey, currentMatrix: _currentMatrix, constant }: EncryptionToolProps) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // UI State
  const [mode, setMode] = useState<Mode>('encrypt');
  const [selectedSbox, setSelectedSbox] = useState<SboxType>('K44');

  // Input State
  const [inputText, setInputText] = useState('');
  const [keyInput, setKeyInput] = useState('');

  // Output State
  const [outputText, setOutputText] = useState('');
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  // Process State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Handle Mode Switch (Reset output but keep inputs)
  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setOutputText('');
    setExecutionTime(null);
    setError(null);
  };

  // Handle S-box Selection
  const handleSboxChange = (sbox: SboxType) => {
    setSelectedSbox(sbox);
  };

  // Generate Random 128-bit Key (32 hex chars)
  const generateRandomKey = () => {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const hexKey = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    setKeyInput(hexKey);
  };

  // Copy to Clipboard
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClear = () => {
    setInputText('');
    setKeyInput('');
    setOutputText('');
    setExecutionTime(null);
    setError(null);
  };

  // Process Key: Ensure 32 hex characters (16 bytes)
  const processKey = (rawKey: string): string => {
    let cleanKey = rawKey.replace(/\s/g, '').toUpperCase();

    // If valid hex, pad or truncate
    if (/^[0-9A-F]*$/i.test(cleanKey)) {
      if (cleanKey.length < 32) {
        cleanKey = cleanKey.padEnd(32, '0');
      } else if (cleanKey.length > 32) {
        cleanKey = cleanKey.substring(0, 32);
      }
      return cleanKey;
    }

    // Convert ASCII to hex
    const hexKey = Array.from(rawKey)
      .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

    if (hexKey.length < 32) {
      return hexKey.padEnd(32, '0');
    }
    return hexKey.substring(0, 32);
  };

  // ============================================================================
  // API CALLS
  // ============================================================================

  // Handle Encrypt
  const handleEncrypt = async () => {
    setError(null);

    if (!inputText.trim()) {
      setError('Plaintext cannot be empty');
      return;
    }

    if (!keyInput.trim()) {
      setError('Key cannot be empty');
      return;
    }

    setLoading(true);

    try {
      const processedKey = processKey(keyInput);

      const payload = {
        plaintext: inputText,
        key: processedKey,
        matrix_name: selectedSbox,
        constant: `0x${constant}`,
        mode: 'CBC'
      };

      const response = await axios.post(`${API_BASE_URL}/encrypt`, payload);

      setOutputText(response.data.ciphertext);
      setExecutionTime(response.data.execution_time);
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail || 'Encryption failed');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      console.error('Encryption error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Decrypt
  const handleDecrypt = async () => {
    setError(null);

    if (!inputText.trim()) {
      setError('Ciphertext cannot be empty');
      return;
    }

    if (!keyInput.trim()) {
      setError('Key cannot be empty');
      return;
    }

    // IV is now embedded in ciphertext, no longer required separately

    setLoading(true);

    try {
      const processedKey = processKey(keyInput);

      const payload = {
        ciphertext: inputText,  // Contains IV prefix (first 32 hex chars)
        key: processedKey,
        // iv is no longer needed - extracted from ciphertext automatically
        matrix_name: selectedSbox,
        constant: `0x${constant}`,
        mode: 'CBC'
      };

      const response = await axios.post(`${API_BASE_URL}/decrypt`, payload);

      setOutputText(response.data.plaintext);
      setExecutionTime(response.data.execution_time);
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail || 'Decryption failed');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      console.error('Decryption error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Submit (based on mode)
  const handleSubmit = () => {
    if (mode === 'encrypt') {
      handleEncrypt();
    } else {
      handleDecrypt();
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 shadow-xl">
      {/* Header */}
      <div className="border-b border-zinc-800 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg ${mode === 'encrypt' ? 'bg-blue-500/10' : 'bg-emerald-500/10'}`}>
            {mode === 'encrypt' ? (
              <Lock className="w-5 h-5 text-blue-400" />
            ) : (
              <Unlock className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <h2 className="text-xl font-bold text-zinc-100">
            Encryption & Decryption Module
          </h2>
        </div>
        <p className="text-sm text-zinc-400">
          AES-128 CBC Mode with Research S-box Configuration
        </p>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
        {/* ===================================================================
            LEFT COLUMN: INPUT & CONFIGURATION
        =================================================================== */}
        <div className="space-y-6">
          {/* Mode Switcher (Tabs) */}
          <div>
            <label className="text-sm font-semibold text-zinc-400 mb-3 block">
              Operation Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleModeChange('encrypt')}
                className={`py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${mode === 'encrypt'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700'
                  }`}
              >
                <Lock className="w-4 h-4" />
                Encrypt
              </button>
              <button
                onClick={() => handleModeChange('decrypt')}
                className={`py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${mode === 'decrypt'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700'
                  }`}
              >
                <Unlock className="w-4 h-4" />
                Decrypt
              </button>
            </div>
          </div>

          {/* S-box Configuration (K44 vs AES ONLY) */}
          <div>
            <label className="text-sm font-semibold text-zinc-400 mb-3 block">
              S-box Configuration
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSboxChange('K44')}
                className={`py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${selectedSbox === 'K44'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700'
                  }`}
              >
                K44 S-box
              </button>
              <button
                onClick={() => handleSboxChange('AES_Standard')}
                className={`py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${selectedSbox === 'AES_Standard'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700'
                  }`}
              >
                AES S-box
              </button>
            </div>
          </div>

          {/* Input Text Area */}
          <div>
            <label className="text-sm font-semibold text-zinc-400 mb-2 block">
              {mode === 'encrypt' ? 'Plaintext' : 'Ciphertext (Hex)'}
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full min-h-[160px] bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-zinc-600"
              placeholder={
                mode === 'encrypt'
                  ? 'Enter your message to encrypt...'
                  : 'Enter hex ciphertext (e.g., A1B2C3D4E5F6...)'
              }
            />
          </div>

          {/* Key Input with Random Button */}
          <div>
            <label className="text-sm font-semibold text-zinc-400 mb-2 block">
              Encryption Key (128-bit / 32 hex characters)
            </label>
            <div className="relative">
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-4 pr-12 py-3 text-zinc-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-zinc-600"
                placeholder="Enter key or click dice to generate..."
              />
              <button
                onClick={generateRandomKey}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-md transition-all shadow-lg shadow-purple-600/30"
                title="Generate Random Key"
              >
                <Dice5 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Supports hex values. Will be auto-padded/truncated to 128-bit.
            </p>
          </div>

          {/* Info Banner for Decrypt Mode */}
          {mode === 'decrypt' && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              <p className="text-xs text-emerald-300">
                <strong>Note:</strong> IV is automatically extracted from the ciphertext.
                Just paste the full ciphertext and your key.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading || !inputText.trim() || !keyInput.trim()}
              className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${mode === 'encrypt'
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-600/30'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-600/30'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {mode === 'encrypt' ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                  {mode === 'encrypt' ? 'Encrypt Message' : 'Decrypt Message'}
                </>
              )}
            </button>

            <button
              onClick={handleClear}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-3 px-6 rounded-lg border border-zinc-700 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-sm font-semibold">Error</p>
                <p className="text-red-300 text-xs mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================================
            RIGHT COLUMN: OUTPUT & STATISTICS
        =================================================================== */}
        <div className="space-y-6">
          {/* Output Display */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-zinc-400">
                {mode === 'encrypt' ? 'Ciphertext (Hex)' : 'Decrypted Plaintext'}
              </label>
              {outputText && (
                <button
                  onClick={() => handleCopy(outputText)}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded flex items-center gap-1 transition-all"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
            <div className="min-h-[200px] bg-zinc-950 border border-zinc-700 rounded-lg p-4">
              {outputText ? (
                <code className="text-xs font-mono text-zinc-300 break-all leading-relaxed">
                  {outputText}
                </code>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className={`p-4 rounded-full ${mode === 'encrypt' ? 'bg-blue-500/10' : 'bg-emerald-500/10'} mb-3`}>
                    {mode === 'encrypt' ? (
                      <Lock className="w-8 h-8 text-blue-400 opacity-50" />
                    ) : (
                      <Unlock className="w-8 h-8 text-emerald-400 opacity-50" />
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 italic">
                    Output will appear here after processing...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Success Info (Encrypt Mode Only) */}
          {mode === 'encrypt' && outputText && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Key className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">
                  Encryption Complete
                </span>
              </div>
              <p className="text-xs text-emerald-300">
                The IV is embedded in the ciphertext (first 32 characters).
                Copy the full ciphertext for decryption - no need to save IV separately!
              </p>
            </div>
          )}

          {/* Execution Time & Config Info */}
          {executionTime !== null && (
            <div className="space-y-4">
              {/* Execution Time */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-zinc-400">Execution Time</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    {executionTime.toFixed(6)}s
                  </span>
                </div>
              </div>

              {/* Configuration Info */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-xs text-blue-300">
                  <strong>Configuration:</strong> AES-128 CBC using{' '}
                  <span className="font-mono">{selectedSbox === 'K44' ? 'K44' : 'AES Standard'}</span> S-box
                </p>
                <p className="text-xs text-blue-400 mt-1">
                  Constant: <span className="font-mono">0x{constant.toUpperCase()}</span>
                </p>
              </div>
            </div>
          )}

          {/* Empty State (When no output yet) */}
          {!outputText && !executionTime && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-8 text-center">
              <div className="inline-flex items-center gap-2 text-zinc-600 mb-3">
                <div className="w-2 h-2 bg-zinc-700 rounded-full animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Awaiting Input
                </span>
              </div>
              <p className="text-xs text-zinc-600">
                Configure your settings and click{' '}
                <span className="font-semibold text-zinc-500">
                  {mode === 'encrypt' ? 'Encrypt' : 'Decrypt'}
                </span>{' '}
                to process
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}