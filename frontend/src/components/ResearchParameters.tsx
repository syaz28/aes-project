import { useState, useRef } from 'react';
import { FileText, Settings, Boxes, Edit3, Plus, Minus, FileSpreadsheet, Upload, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

type Tab = 'paper' | 'standard' | 'variations' | 'custom' | 'excel';

interface MatrixOption {
  name: string;
  key: string;
  description: string;
  matrix: number[];
}

const PAPER_MATRICES: MatrixOption[] = [
  {
    name: 'K44 Matrix (Best Performer)',
    key: 'K44',
    description: 'Optimal configuration from research paper with best cryptographic metrics',
    matrix: [0x57, 0xAB, 0xD5, 0xEA, 0x75, 0xBA, 0x5D, 0xAE]
  },
  {
    name: 'K43 Matrix',
    key: 'K43',
    description: 'Variation A - Swapped Row 0 and Row 2 from K44',
    matrix: [0xD5, 0xAB, 0x57, 0xEA, 0x75, 0xBA, 0x5D, 0xAE]
  },
  {
    name: 'K45 Matrix',
    key: 'K45',
    description: 'Variation B - Swapped Row 4 and Row 5 from K44',
    matrix: [0x57, 0xAB, 0xD5, 0xEA, 0xBA, 0x75, 0x5D, 0xAE]
  }
];

const STANDARD_MATRIX: MatrixOption = {
  name: 'AES Standard (Rijndael)',
  key: 'AES_Standard',
  description: 'Original AES S-box affine transformation matrix',
  matrix: [0xF1, 0xE3, 0xC7, 0x8F, 0x1F, 0x3E, 0x7C, 0x8E]
};

const VARIATION_MATRICES: MatrixOption[] = [
  {
    name: 'Identity Matrix',
    key: 'Identity',
    description: 'Diagonal matrix with no transformation',
    matrix: [0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01]
  },
  {
    name: 'K44 Rotated',
    key: 'K44_Rotated',
    description: 'Cyclic shift of K44 matrix',
    matrix: [0xAE, 0x57, 0xAB, 0xD5, 0xEA, 0x75, 0xBA, 0x5D]
  }
];

interface ResearchParametersProps {
  selectedMatrix: MatrixOption;
  constantValue: string;
  onConfigChange: (matrix: MatrixOption, constant: string) => void;
  customSboxData: number[] | null;
  customSboxName: string | null;
  onExcelSboxImport: (sbox: number[] | null, name: string | null) => void;
}

export default function ResearchParameters({
  selectedMatrix,
  constantValue,
  onConfigChange,
  customSboxData,
  customSboxName,
  onExcelSboxImport
}: ResearchParametersProps) {
  // Local state only for UI control (tab switching)
  const [activeTab, setActiveTab] = useState<Tab>('paper');

  // Excel import state
  const [excelError, setExcelError] = useState<string | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);

    // Auto-select first matrix of the tab and notify parent
    if (tab === 'paper') {
      onConfigChange(PAPER_MATRICES[0], constantValue);
    } else if (tab === 'standard') {
      onConfigChange(STANDARD_MATRIX, constantValue);
    } else if (tab === 'variations') {
      onConfigChange(VARIATION_MATRICES[0], constantValue);
    } else if (tab === 'custom') {
      // Initialize Custom tab with K44 matrix as starting point
      onConfigChange({
        name: 'Custom Matrix',
        key: 'Custom',
        description: 'User-defined matrix configuration',
        matrix: [...PAPER_MATRICES[0].matrix]
      }, constantValue);
    } else if (tab === 'excel') {
      // Excel tab - use Excel matrix key if S-box is loaded
      if (customSboxData) {
        onConfigChange({
          name: customSboxName || 'Excel S-box',
          key: 'Excel',
          description: 'S-box imported from Excel file',
          matrix: [0, 0, 0, 0, 0, 0, 0, 0] // Placeholder - not used for Excel S-box
        }, constantValue);
      }
    }
  };

  // Excel file handler
  const handleExcelFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setExcelLoading(true);
    setExcelError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Convert to JSON array
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (number | string)[][];

      // Flatten 2D array to 1D
      const flatArray: number[] = [];
      for (const row of jsonData) {
        for (const cell of row) {
          if (cell !== undefined && cell !== null && cell !== '') {
            const num = typeof cell === 'string' ? parseInt(cell, 10) : cell;
            if (!isNaN(num)) {
              flatArray.push(num);
            }
          }
        }
      }

      // Validate: exactly 256 values
      if (flatArray.length !== 256) {
        throw new Error(`S-box must have exactly 256 values (got ${flatArray.length})`);
      }

      // Validate: all values in range 0-255
      for (let i = 0; i < flatArray.length; i++) {
        if (flatArray[i] < 0 || flatArray[i] > 255 || !Number.isInteger(flatArray[i])) {
          throw new Error(`Value at position ${i + 1} is invalid: ${flatArray[i]} (must be integer 0-255)`);
        }
      }

      // Validate: bijective (each value appears exactly once)
      const valueSet = new Set(flatArray);
      if (valueSet.size !== 256) {
        const duplicates: number[] = [];
        const seen = new Set<number>();
        for (const val of flatArray) {
          if (seen.has(val)) {
            duplicates.push(val);
          }
          seen.add(val);
        }
        throw new Error(`S-box must be bijective. Duplicate values found: ${duplicates.slice(0, 5).join(', ')}${duplicates.length > 5 ? '...' : ''}`);
      }

      // Success! Update state
      onExcelSboxImport(flatArray, file.name);
      setExcelError(null);

      // Auto-switch matrix config to Excel
      onConfigChange({
        name: file.name,
        key: 'Excel',
        description: 'S-box imported from Excel file',
        matrix: [0, 0, 0, 0, 0, 0, 0, 0]
      }, constantValue);

    } catch (err) {
      setExcelError(err instanceof Error ? err.message : 'Failed to parse Excel file');
      onExcelSboxImport(null, null);
    } finally {
      setExcelLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearExcelSbox = () => {
    onExcelSboxImport(null, null);
    setExcelError(null);
    // Switch back to paper tab
    handleTabChange('paper');
  };

  const handleMatrixSelect = (matrix: MatrixOption) => {
    onConfigChange(matrix, constantValue);
  };

  const handleConstantChange = (newConstant: string) => {
    onConfigChange(selectedMatrix, newConstant);
  };

  const handleConstantPreset = (value: string) => {
    onConfigChange(selectedMatrix, value);
  };

  // INCREMENT: Add 1 to all matrix values (with modulo 256)
  const handleIncrementMatrix = () => {
    const incrementedMatrix = selectedMatrix.matrix.map(val => (val + 1) % 256);
    onConfigChange({
      ...selectedMatrix,
      matrix: incrementedMatrix
    }, constantValue);
  };

  // DECREMENT: Subtract 1 from all matrix values (with modulo 256)
  const handleDecrementMatrix = () => {
    const decrementedMatrix = selectedMatrix.matrix.map(val => (val - 1 + 256) % 256);
    onConfigChange({
      ...selectedMatrix,
      matrix: decrementedMatrix
    }, constantValue);
  };

  const toBinary = (num: number): string => {
    return num.toString(2).padStart(8, '0');
  };

  const toHex = (num: number): string => {
    return '0x' + num.toString(16).toUpperCase().padStart(2, '0');
  };

  return (
    <div className="card-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-zinc-100">Research Parameters</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section: Matrix Configuration */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab Menu */}
          <div className="flex gap-2 border-b border-zinc-800 pb-3">
            <button
              onClick={() => handleTabChange('paper')}
              className={`tab-button ${activeTab === 'paper' ? 'active' : ''}`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Paper
            </button>
            <button
              onClick={() => handleTabChange('standard')}
              className={`tab-button ${activeTab === 'standard' ? 'active' : ''}`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Standard
            </button>
            <button
              onClick={() => handleTabChange('variations')}
              className={`tab-button ${activeTab === 'variations' ? 'active' : ''}`}
            >
              <Boxes className="w-4 h-4 inline mr-2" />
              Variations
            </button>
            <button
              onClick={() => handleTabChange('custom')}
              className={`tab-button ${activeTab === 'custom' ? 'active' : ''}`}
            >
              <Edit3 className="w-4 h-4 inline mr-2" />
              Custom
            </button>
            <button
              onClick={() => handleTabChange('excel')}
              className={`tab-button ${activeTab === 'excel' ? 'active' : ''} ${customSboxData ? 'ring-2 ring-green-500/50' : ''}`}
            >
              <FileSpreadsheet className="w-4 h-4 inline mr-2" />
              Excel
              {customSboxData && <CheckCircle className="w-3 h-3 inline ml-1 text-green-400" />}
            </button>
          </div>

          {/* Matrix Selection */}
          {activeTab !== 'custom' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-400">
                Select Matrix Configuration
              </label>
              <div className="space-y-2">
                {activeTab === 'paper' && PAPER_MATRICES.map((matrix) => (
                  <button
                    key={matrix.key}
                    onClick={() => handleMatrixSelect(matrix)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${selectedMatrix.key === matrix.key
                      ? 'bg-zinc-800 border-blue-500 text-zinc-100'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                      }`}
                  >
                    <div className="font-semibold">{matrix.name}</div>
                    <div className="text-xs text-zinc-500 mt-1">{matrix.description}</div>
                  </button>
                ))}

                {activeTab === 'standard' && (
                  <div className="px-4 py-3 rounded-lg border bg-zinc-800 border-blue-500">
                    <div className="font-semibold text-zinc-100">{STANDARD_MATRIX.name}</div>
                    <div className="text-xs text-zinc-500 mt-1">{STANDARD_MATRIX.description}</div>
                  </div>
                )}

                {activeTab === 'variations' && VARIATION_MATRICES.map((matrix) => (
                  <button
                    key={matrix.key}
                    onClick={() => handleMatrixSelect(matrix)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${selectedMatrix.key === matrix.key
                      ? 'bg-zinc-800 border-blue-500 text-zinc-100'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                      }`}
                  >
                    <div className="font-semibold">{matrix.name}</div>
                    <div className="text-xs text-zinc-500 mt-1">{matrix.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Excel S-box Import (Only visible when Excel tab is active) */}
          {activeTab === 'excel' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-400">
                  Import S-box from Excel
                </label>
                {customSboxData && (
                  <button
                    onClick={handleClearExcelSbox}
                    className="btn-secondary text-xs py-1 px-3 flex items-center gap-1 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>

              {/* File Upload Area */}
              {!customSboxData ? (
                <div className="space-y-3">
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer bg-zinc-900 hover:bg-zinc-800 transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 mb-3 text-zinc-500" />
                      <p className="mb-2 text-sm text-zinc-400">
                        <span className="font-semibold">Click to upload</span> Excel file
                      </p>
                      <p className="text-xs text-zinc-600">.xlsx or .xls (16×16 grid or 256 values)</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls"
                      onChange={handleExcelFileSelect}
                      disabled={excelLoading}
                    />
                  </label>

                  {excelLoading && (
                    <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Parsing Excel file...
                    </div>
                  )}

                  {excelError && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-400 text-xs font-semibold">Import Error</p>
                        <p className="text-red-300 text-xs mt-1">{excelError}</p>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-xs text-blue-300">
                      <strong>Format:</strong> Excel file with 256 integers (0-255).
                      Can be 16×16 grid or single column. Each value must appear exactly once (bijective).
                    </p>
                  </div>
                </div>
              ) : (
                /* S-box Loaded Successfully */
                <div className="space-y-3">
                  <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-semibold text-sm">S-box Loaded Successfully</span>
                    </div>
                    <p className="text-xs text-green-300">
                      <strong>File:</strong> {customSboxName}
                    </p>
                    <p className="text-xs text-green-300 mt-1">
                      <strong>Size:</strong> 256 values (bijective validated)
                    </p>
                  </div>

                  {/* S-box Preview Grid */}
                  <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-2">S-box Preview (first 32 values):</p>
                    <div className="grid grid-cols-8 gap-1 font-mono text-xs">
                      {customSboxData.slice(0, 32).map((val, idx) => (
                        <div key={idx} className="bg-zinc-800 text-zinc-300 px-1 py-0.5 rounded text-center">
                          {val.toString(16).toUpperCase().padStart(2, '0')}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-600 mt-2">... and {256 - 32} more values</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Matrix Editor (Only visible when Custom tab is active) */}
          {activeTab === 'custom' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-400">
                  Custom Matrix Editor
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleDecrementMatrix}
                    className="btn-secondary text-xs py-1 px-3 flex items-center gap-1"
                    title="Decrement all values by 1"
                  >
                    <Minus className="w-3 h-3" />
                    Dec
                  </button>
                  <button
                    onClick={handleIncrementMatrix}
                    className="btn-secondary text-xs py-1 px-3 flex items-center gap-1"
                    title="Increment all values by 1"
                  >
                    <Plus className="w-3 h-3" />
                    Inc
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                <p className="text-xs text-zinc-500 mb-3">
                  Use the [+] Inc and [-] Dec buttons to modify all matrix values incrementally
                </p>
                <div className="text-xs text-zinc-400 mb-2">
                  Current values will be updated dynamically. Changes are cumulative.
                </div>
              </div>
            </div>
          )}

          {/* Matrix Visualization */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-400">
              Matrix Visualization (M)
            </label>
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <div className="grid grid-cols-[auto_1fr_auto] gap-3 font-mono text-xs">
                {selectedMatrix.matrix.map((value, index) => (
                  <div key={index} className="contents">
                    <div className="text-zinc-500 text-right">R{index}:</div>
                    <div className="matrix-cell">{toBinary(value)}</div>
                    <div className="text-zinc-400">{toHex(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Constant Configuration */}
        <div className="space-y-4">
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-400">
              Constant Vector (C)
            </label>
            <input
              type="text"
              value={constantValue}
              onChange={(e) => handleConstantChange(e.target.value)}
              className="input-field w-full font-mono"
              placeholder="63"
            />
            <div className="text-xs text-zinc-500">
              Hexadecimal value (e.g., 63 for 0x63)
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-400">
              Quick Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleConstantPreset('63')}
                className="btn-secondary text-sm py-2"
              >
                0x63
              </button>
              <button
                onClick={() => handleConstantPreset('55')}
                className="btn-secondary text-sm py-2"
              >
                0x55
              </button>
              <button
                onClick={() => handleConstantPreset('00')}
                className="btn-secondary text-sm py-2"
              >
                0x00
              </button>
              <button
                onClick={() => handleConstantPreset('FF')}
                className="btn-secondary text-sm py-2"
              >
                0xFF
              </button>
            </div>
          </div>

          {/* Current Configuration Summary */}
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 mt-6">
            <div className="text-xs font-semibold text-zinc-400 mb-2">
              Current Configuration
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-zinc-500">Matrix:</span>
                <span className="text-zinc-200 ml-2 font-medium">{selectedMatrix.key}</span>
              </div>
              <div>
                <span className="text-zinc-500">Constant:</span>
                <span className="text-zinc-200 ml-2 font-mono">0x{constantValue.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}