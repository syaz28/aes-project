import { useState } from 'react';
import { Save, Download, Trash2, Package } from 'lucide-react';

interface MatrixConfig {
  name: string;
  key: string;
  description: string;
  matrix: number[];
}

interface SavedPreset {
  id: string;
  presetName: string;
  matrix: MatrixConfig;
  constant: string;
  savedAt: string;
}

interface ParameterPresetsProps {
  currentMatrix: MatrixConfig;
  currentConstant: string;
  onLoadPreset: (matrix: MatrixConfig, constant: string) => void;
}

export default function ParameterPresets({ 
  currentMatrix, 
  currentConstant, 
  onLoadPreset 
}: ParameterPresetsProps) {
  const [presetName, setPresetName] = useState('');
  
  // Lazy initialization - load from localStorage only once during initial render
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(() => {
    const stored = localStorage.getItem('aes_forge_presets');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse saved presets:', e);
        return [];
      }
    }
    return [];
  });
  
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }

    const newPreset: SavedPreset = {
      id: Date.now().toString(),
      presetName: presetName.trim(),
      matrix: currentMatrix,
      constant: currentConstant,
      savedAt: new Date().toISOString()
    };

    const updatedPresets = [...savedPresets, newPreset];
    setSavedPresets(updatedPresets);
    
    // Save to localStorage immediately
    localStorage.setItem('aes_forge_presets', JSON.stringify(updatedPresets));
    
    setPresetName('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleLoadPreset = (preset: SavedPreset) => {
    onLoadPreset(preset.matrix, preset.constant);
  };

  const handleDeletePreset = (id: string) => {
    const updated = savedPresets.filter(p => p.id !== id);
    setSavedPresets(updated);
    
    // Update localStorage immediately
    if (updated.length === 0) {
      localStorage.removeItem('aes_forge_presets');
    } else {
      localStorage.setItem('aes_forge_presets', JSON.stringify(updated));
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="card-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <Package className="w-6 h-6 text-purple-400" />
        <h2 className="text-2xl font-bold text-zinc-100">Configuration Presets</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Save Current Configuration */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">
              Save Current Configuration
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">
                  Preset Name
                </label>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="input-field w-full text-sm"
                  placeholder="e.g., Best K44 Config"
                />
              </div>

              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Matrix:</span>
                  <span className="text-zinc-300 font-mono">{currentMatrix.key}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Constant:</span>
                  <span className="text-zinc-300 font-mono">0x{currentConstant.toUpperCase()}</span>
                </div>
              </div>

              <button
                onClick={handleSavePreset}
                className="btn-primary w-full text-sm"
              >
                <Save className="w-4 h-4" />
                Save Preset
              </button>

              {saveSuccess && (
                <div className="bg-green-500/10 border border-green-500/50 rounded p-2 text-center">
                  <p className="text-xs text-green-400">Preset saved successfully!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Saved Presets List */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-400">
            Saved Presets ({savedPresets.length})
          </h3>

          {savedPresets.length === 0 ? (
            <div className="bg-zinc-900 rounded-lg p-8 border border-zinc-800 text-center">
              <Package className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
              <p className="text-zinc-500 text-sm">No saved presets yet</p>
              <p className="text-zinc-600 text-xs mt-1">
                Configure your parameters and save them for quick access
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {savedPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-zinc-200">
                          {preset.presetName}
                        </h4>
                        <span className="text-xs text-zinc-600">
                          {formatDate(preset.savedAt)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-zinc-500">Matrix: </span>
                          <span className="text-zinc-300 font-mono">{preset.matrix.key}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Constant: </span>
                          <span className="text-zinc-300 font-mono">
                            0x{preset.constant.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoadPreset(preset)}
                        className="btn-secondary text-xs py-2 px-3"
                        title="Load this preset"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeletePreset(preset.id)}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50 rounded-md px-3 py-2 transition-all text-xs"
                        title="Delete preset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}