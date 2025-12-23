import { useState } from 'react';
import ResearchParameters from './components/ResearchParameters';
import ControlPanel from './components/ControlPanel';
import EncryptionTool from './components/EncryptionTool';
import ParameterPresets from './components/ParameterPresets';
import ImageEncryption from './components/ImageEncryption';
import TeamSection from './components/TeamSection';
import ProjectGuide from './components/ProjectGuide';
import NavigationDock from './components/NavigationDock';
import { API_BASE_URL } from './config';
import { Cpu } from 'lucide-react';

// Define Matrix interface for type safety
interface MatrixConfig {
  name: string;
  key: string;
  description: string;
  matrix: number[];
}

function App() {
  // Lifted state - now App.tsx owns all configuration data
  const [selectedMatrix, setSelectedMatrix] = useState<MatrixConfig>({
    name: 'K44 Matrix (Best Performer)',
    key: 'K44',
    description: 'Optimal configuration from research paper with best cryptographic metrics',
    matrix: [0x57, 0xAB, 0xD5, 0xEA, 0x75, 0xBA, 0x5D, 0xAE]
  });
  const [constantValue, setConstantValue] = useState('63');

  // NEW: Custom S-box from Excel import
  const [customSboxData, setCustomSboxData] = useState<number[] | null>(null);
  const [customSboxName, setCustomSboxName] = useState<string | null>(null);

  // Handler for children components to update configuration
  const handleConfigChange = (newMatrix: MatrixConfig, newConstant: string) => {
    setSelectedMatrix(newMatrix);
    setConstantValue(newConstant);
  };

  // Handler for loading presets (called from ParameterPresets component)
  const handleLoadPreset = (matrix: MatrixConfig, constant: string) => {
    setSelectedMatrix(matrix);
    setConstantValue(constant);
  };

  // NEW: Handler for Excel S-box import
  const handleExcelSboxImport = (sbox: number[] | null, name: string | null) => {
    setCustomSboxData(sbox);
    setCustomSboxName(name);
  };

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4 pb-24">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Cpu className="w-10 h-10 text-blue-400" />
            <h1 className="text-4xl font-bold text-zinc-100 tracking-tight">
              AES FORGE
            </h1>
          </div>
          <p className="text-zinc-400 text-sm">
            Advanced Encryption Standard S-box Modification Research Platform
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-400 font-semibold tracking-wider">
              BACKEND CONNECTED • {API_BASE_URL.replace('http://', '').replace('https://', '')}
            </span>
          </div>
        </header>

        {/* Project Guide - Below Hero */}
        <ProjectGuide />

        {/* Team Section - Below ProjectGuide */}
        <TeamSection />

        {/* Research Section - Wrapped for navigation */}
        <section id="research-section" className="scroll-mt-24 space-y-8">
          {/* Panel 1: Research Parameters (Controlled by App state) */}
          <ResearchParameters
            selectedMatrix={selectedMatrix}
            constantValue={constantValue}
            onConfigChange={handleConfigChange}
            customSboxData={customSboxData}
            customSboxName={customSboxName}
            onExcelSboxImport={handleExcelSboxImport}
          />

          {/* Panel 2: Control Panel (Receives current config + matrix array + custom S-box) */}
          <ControlPanel
            matrixKey={selectedMatrix.key}
            currentMatrix={selectedMatrix.matrix}
            constant={constantValue}
            customSboxData={customSboxData}
          />

          {/* Panel 3: Parameter Presets (NEW POSITION - Between Control & Encryption) */}
          <ParameterPresets
            currentMatrix={selectedMatrix}
            currentConstant={constantValue}
            onLoadPreset={handleLoadPreset}
          />
        </section>

        {/* Text Crypto Section - Wrapped for navigation */}
        <section id="text-crypto-section" className="scroll-mt-24">
          {/* Panel 4: Encryption Tool (Receives current config + matrix array) */}
          <EncryptionTool
            matrixKey={selectedMatrix.key}
            currentMatrix={selectedMatrix.matrix}
            constant={constantValue}
          />
        </section>

        {/* Image Crypto Section - Wrapped for navigation */}
        <section id="image-crypto-section" className="scroll-mt-24">
          {/* Panel 5: Image Encryption & Decryption (with custom S-box support) */}
          <ImageEncryption
            customSboxData={customSboxData}
            customSboxName={customSboxName}
          />
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-zinc-600 pt-8 pb-4">
          <p>AES S-box Modification Research • Built with React + TypeScript + Vite</p>
        </footer>
      </div>

      {/* Floating Navigation Dock */}
      <NavigationDock />
    </div>
  );
}

export default App;