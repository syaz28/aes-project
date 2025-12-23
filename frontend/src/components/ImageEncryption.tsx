import { useState } from 'react';
import { Lock, Unlock, Image as ImageIcon, Dice5, Download, Trash2, Upload, AlertCircle, Loader2, Clock, Shield, ZoomIn } from 'lucide-react';
import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../config';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type Mode = 'encrypt' | 'decrypt';
type SboxType = 'K44' | 'AES_Standard' | 'Excel';

interface HistogramData {
  R: number[];
  G: number[];
  B: number[];
}

interface SecurityMetrics {
  entropy: {
    original: number;
    encrypted: number;
  };
  npcr: number;
  uaci: number;
  correlation: {
    original: {
      horizontal: number;
      vertical: number;
      diagonal: number;
    };
    encrypted: {
      horizontal: number;
      vertical: number;
      diagonal: number;
    };
  };
}

interface ImageEncryptionProps {
  customSboxData: number[] | null;
  customSboxName: string | null;
}

export default function ImageEncryption({ customSboxData, customSboxName }: ImageEncryptionProps) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // UI State
  const [mode, setMode] = useState<Mode>('encrypt');
  const [selectedSbox, setSelectedSbox] = useState<SboxType>('K44');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [useLogScale, setUseLogScale] = useState(true);

  // Input State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [key, setKey] = useState<string>('');

  // Output State - Encryption
  const [encryptedImage, setEncryptedImage] = useState<string | null>(null);
  const [originalHistogram, setOriginalHistogram] = useState<HistogramData | null>(null);
  const [encryptedHistogram, setEncryptedHistogram] = useState<HistogramData | null>(null);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);

  // Output State - Decryption
  const [decryptedImage, setDecryptedImage] = useState<string | null>(null);

  // Metadata
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  // Process State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // HANDLERS (Keep existing handlers)
  // ============================================================================

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    handleClear();
  };

  const handleSboxChange = (sbox: SboxType) => {
    setSelectedSbox(sbox);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (JPG, PNG, etc.)');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      setError(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateRandomKey = () => {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const hexKey = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    setKey(hexKey);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setKey('');
    setEncryptedImage(null);
    setDecryptedImage(null);
    setOriginalHistogram(null);
    setEncryptedHistogram(null);
    setSecurityMetrics(null);
    setExecutionTime(null);
    setImageSize(null);
    setError(null);
  };

  // Process Key: Ensure 32 hex characters (16 bytes)
  // Supports both hex input and plain text (ASCII) input
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

  const handleEncrypt = async () => {
    if (!selectedFile) {
      setError('Please select an image file');
      return;
    }

    if (!key.trim()) {
      setError('Please enter an encryption key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const processedKey = processKey(key);

      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('key', processedKey);
      formData.append('matrix_name', selectedSbox);
      formData.append('constant', '0x63');

      // If using Excel S-box, send the custom S-box data as JSON
      if (selectedSbox === 'Excel' && customSboxData) {
        formData.append('custom_sbox_json', JSON.stringify(customSboxData));
      }

      const response = await axios.post(`${API_BASE_URL}/encrypt-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 180000 // 180 second timeout for large images (3 minutes)
      });

      setEncryptedImage(response.data.encrypted_image);
      setOriginalHistogram(response.data.original_histogram);
      setEncryptedHistogram(response.data.encrypted_histogram);
      setSecurityMetrics(response.data.security_metrics);
      setExecutionTime(response.data.execution_time);
      setImageSize(response.data.image_size);

    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail || 'Image encryption failed');
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

  const handleDecrypt = async () => {
    // Clear previous errors
    setError(null);

    // Simplified validation - only need file and key
    if (!selectedFile) {
      setError('Please select an encrypted image file');
      return;
    }

    if (!key.trim()) {
      setError('Please enter the decryption key');
      return;
    }

    setLoading(true);

    try {
      // Process key - supports both hex and plain text input
      const processedKey = processKey(key);

      // Simplified FormData - only file, key, matrix_name, constant
      // IV and dimensions are extracted from the encrypted image automatically
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('key', processedKey);
      formData.append('matrix_name', selectedSbox);
      formData.append('constant', '0x63');

      const response = await axios.post(`${API_BASE_URL}/decrypt-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 180000 // 180 second timeout for large images (3 minutes)
      });

      setDecryptedImage(response.data.decrypted_image);
      setExecutionTime(response.data.execution_time);
      setImageSize(response.data.image_size);

    } catch (err) {
      if (err instanceof AxiosError) {
        // Provide user-friendly error messages
        if (err.response?.status === 400) {
          setError(`Bad Request: ${err.response?.data?.detail || 'Invalid encrypted image or key.'}`);
        } else if (err.response?.status === 500) {
          setError(`Server Error: ${err.response?.data?.detail || 'Decryption failed. Check if the key is correct.'}`);
        } else if (err.code === 'ERR_NETWORK') {
          setError(`Network Error: Cannot connect to backend server. Make sure the server is running on ${API_BASE_URL}`);
        } else {
          setError(err.response?.data?.detail || err.message || 'Image decryption failed');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred during decryption');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (imageData: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageData}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
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
              Image Encryption & Decryption
            </h2>
          </div>
          <p className="text-sm text-zinc-400">
            AES-128 CBC Mode for Visual Cryptography with Security Analysis
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Mode Tabs & S-box Config (Keep existing code) */}
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
                Encrypt Image
              </button>
              <button
                onClick={() => handleModeChange('decrypt')}
                className={`py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${mode === 'decrypt'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700'
                  }`}
              >
                <Unlock className="w-4 h-4" />
                Decrypt Image
              </button>
            </div>
          </div>

          {/* S-box Configuration */}
          <div>
            <label className="text-sm font-semibold text-zinc-400 mb-3 block">
              S-box Configuration
            </label>
            <div className="grid grid-cols-3 gap-3">
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
              <button
                onClick={() => handleSboxChange('Excel')}
                disabled={!customSboxData}
                className={`py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${selectedSbox === 'Excel'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : customSboxData
                    ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700'
                    : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                  }`}
                title={customSboxData ? `Using: ${customSboxName}` : 'Upload an Excel S-box in Research Parameters first'}
              >
                Excel S-box
                {customSboxData && <span className="ml-1 text-green-400">✓</span>}
              </button>
            </div>
            {selectedSbox === 'Excel' && customSboxName && (
              <p className="text-xs text-purple-400 mt-2">
                Using: {customSboxName}
              </p>
            )}
          </div>

          {/* Grid Layout: Upload/Preview | Output */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: Upload & Input (Keep existing upload code) */}
            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <label className="text-sm font-semibold text-zinc-400 mb-2 block">
                  {mode === 'encrypt' ? 'Select Image to Encrypt' : 'Select Encrypted Image'}
                </label>

                {!previewUrl ? (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer bg-zinc-950 hover:bg-zinc-800 transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-12 h-12 mb-3 text-zinc-600" />
                      <p className="mb-2 text-sm text-zinc-400">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-zinc-600">PNG, JPG (MAX. 10MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileSelect}
                    />
                  </label>
                ) : (
                  <div className="relative border border-zinc-700 rounded-lg overflow-hidden bg-zinc-950 group">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-48 object-contain cursor-pointer"
                      onClick={() => setZoomedImage(previewUrl)}
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        onClick={() => setZoomedImage(previewUrl)}
                        className="bg-blue-500/80 hover:bg-blue-500 text-white p-2 rounded-md transition-all opacity-0 group-hover:opacity-100"
                        title="Zoom"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleClear}
                        className="bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-md transition-all"
                        title="Remove image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {selectedFile && (
                  <div className="mt-2 text-xs text-zinc-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Filename:</span>
                      <span className="font-mono text-zinc-400">{selectedFile.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span className="font-mono text-zinc-400">{formatFileSize(selectedFile.size)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Key Input with Random Button */}
              <div>
                <label className="text-sm font-semibold text-zinc-400 mb-2 block">
                  Encryption Key (128-bit / 32 hex characters)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-4 pr-12 py-3 text-zinc-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-zinc-600"
                    placeholder="Enter key or click dice..."
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
                  Auto-padded/truncated to 128-bit
                </p>
              </div>

              {/* Info Banner (Decrypt Mode Only) */}
              {mode === 'decrypt' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400">
                      Simplified Decryption
                    </span>
                  </div>
                  <p className="text-xs text-emerald-300 mt-1">
                    IV and dimensions are automatically extracted from the encrypted image.
                    Just upload the file and enter your key!
                  </p>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={mode === 'encrypt' ? handleEncrypt : handleDecrypt}
                disabled={loading || !selectedFile || !key}
                className={`w-full py-3 px-6 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${mode === 'encrypt'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-600/30'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-600/30'
                  } disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {mode === 'encrypt' ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                    {mode === 'encrypt' ? 'Encrypt Image' : 'Decrypt Image'}
                  </>
                )}
              </button>

              {/* Error Display */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 text-xs font-semibold">Error</p>
                    <p className="text-red-300 text-xs mt-1">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Output & Results */}
            <div className="space-y-4">
              {/* Result Image Display */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-zinc-400">
                    {mode === 'encrypt' ? 'Encrypted Image (Cipher)' : 'Decrypted Image'}
                  </label>
                  {(encryptedImage || decryptedImage) && (
                    <button
                      onClick={() => handleDownload(
                        mode === 'encrypt' ? encryptedImage! : decryptedImage!,
                        mode === 'encrypt' ? 'encrypted_image.png' : 'decrypted_image.png'
                      )}
                      className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded flex items-center gap-1 transition-all"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  )}
                </div>

                <div className="border border-zinc-700 rounded-lg overflow-hidden bg-zinc-950 min-h-[200px] flex items-center justify-center group relative">
                  {mode === 'encrypt' && encryptedImage ? (
                    <>
                      <img
                        src={`data:image/png;base64,${encryptedImage}`}
                        alt="Encrypted"
                        className="w-full h-auto cursor-pointer"
                        onClick={() => setZoomedImage(`data:image/png;base64,${encryptedImage}`)}
                      />
                      <button
                        onClick={() => setZoomedImage(`data:image/png;base64,${encryptedImage}`)}
                        className="absolute top-2 right-2 bg-blue-500/80 hover:bg-blue-500 text-white p-2 rounded-md transition-all opacity-0 group-hover:opacity-100"
                        title="Zoom"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </>
                  ) : mode === 'decrypt' && decryptedImage ? (
                    <>
                      <img
                        src={`data:image/png;base64,${decryptedImage}`}
                        alt="Decrypted"
                        className="w-full h-auto cursor-pointer"
                        onClick={() => setZoomedImage(`data:image/png;base64,${decryptedImage}`)}
                      />
                      <button
                        onClick={() => setZoomedImage(`data:image/png;base64,${decryptedImage}`)}
                        className="absolute top-2 right-2 bg-emerald-500/80 hover:bg-emerald-500 text-white p-2 rounded-md transition-all opacity-0 group-hover:opacity-100"
                        title="Zoom"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <ImageIcon className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                      <p className="text-xs text-zinc-600 italic">
                        Result will appear here...
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Success Info (Encrypt Mode) */}
              {mode === 'encrypt' && encryptedImage && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400">
                      Encryption Complete
                    </span>
                  </div>
                  <p className="text-xs text-emerald-300">
                    IV and dimensions are embedded in the encrypted image.
                    Download the image and use the same key to decrypt later.
                  </p>
                </div>
              )}

              {/* Metadata */}
              {executionTime !== null && (
                <div className="space-y-3">
                  {/* Execution Time */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs text-zinc-400">Execution Time</span>
                      </div>
                      <span className="text-base font-bold text-emerald-400 font-mono">
                        {executionTime.toFixed(6)}s
                      </span>
                    </div>
                  </div>

                  {/* Image Info */}
                  {imageSize && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-xs text-blue-300">
                        <strong>Image Size:</strong>{' '}
                        <span className="font-mono">{imageSize.width} × {imageSize.height}</span> pixels
                      </p>
                      <p className="text-xs text-blue-400 mt-1">
                        <strong>Config:</strong> AES-128 CBC using{' '}
                        <span className="font-mono">{selectedSbox === 'K44' ? 'K44' : 'AES Standard'}</span> S-box
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* NEW: Security Analysis Dashboard */}
          {mode === 'encrypt' && securityMetrics && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-zinc-100">Security Analysis</h3>
                <span className="text-xs text-zinc-500 ml-2">
                  Cryptographic Quality Metrics
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Entropy Score */}
                <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-400">Information Entropy</span>
                    {securityMetrics.entropy.encrypted > 7.99 && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                        Excellent
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-zinc-600 mb-1">Original:</div>
                      <div className="text-lg font-bold text-zinc-400 font-mono">
                        {securityMetrics.entropy.original.toFixed(4)} bits
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-600 mb-1">Encrypted:</div>
                      <div className={`text-2xl font-bold font-mono ${securityMetrics.entropy.encrypted > 7.99 ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                        {securityMetrics.entropy.encrypted.toFixed(4)}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-600 mt-2">
                      Target: ≥ 7.999 bits
                    </div>
                  </div>
                </div>

                {/* NPCR */}
                <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-400">NPCR</span>
                    {securityMetrics.npcr > 99.5 && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                        Optimal
                      </span>
                    )}
                  </div>
                  <div className={`text-3xl font-bold font-mono mb-2 ${securityMetrics.npcr > 99.5 ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                    {securityMetrics.npcr.toFixed(2)}%
                  </div>
                  <div className="text-xs text-zinc-600">
                    Target: ≥ 99.6%
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Number of Pixel Change Rate
                  </div>
                </div>

                {/* UACI */}
                <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-400">UACI</span>
                    {securityMetrics.uaci > 33.0 && securityMetrics.uaci < 34.0 && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                        Optimal
                      </span>
                    )}
                  </div>
                  <div className={`text-3xl font-bold font-mono mb-2 ${(securityMetrics.uaci > 33.0 && securityMetrics.uaci < 34.0) ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                    {securityMetrics.uaci.toFixed(2)}%
                  </div>
                  <div className="text-xs text-zinc-600">
                    Target: ~33.4%
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Unified Average Changing Intensity
                  </div>
                </div>

                {/* Correlation Summary */}
                <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
                  <span className="text-xs font-semibold text-zinc-400 mb-3 block">
                    Correlation (Encrypted)
                  </span>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500">Horizontal:</span>
                      <span className={`text-sm font-bold font-mono ${Math.abs(securityMetrics.correlation.encrypted.horizontal) < 0.1 ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                        {securityMetrics.correlation.encrypted.horizontal.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500">Vertical:</span>
                      <span className={`text-sm font-bold font-mono ${Math.abs(securityMetrics.correlation.encrypted.vertical) < 0.1 ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                        {securityMetrics.correlation.encrypted.vertical.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500">Diagonal:</span>
                      <span className={`text-sm font-bold font-mono ${Math.abs(securityMetrics.correlation.encrypted.diagonal) < 0.1 ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                        {securityMetrics.correlation.encrypted.diagonal.toFixed(4)}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-600 mt-2">
                      Target: ≈ 0 (low correlation)
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Correlation Matrix */}
              <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-zinc-400 mb-3">
                  Correlation Coefficient Matrix (Comparison)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left py-2 px-3 text-zinc-500 font-semibold">Direction</th>
                        <th className="text-center py-2 px-3 text-zinc-500 font-semibold">Original Image</th>
                        <th className="text-center py-2 px-3 text-zinc-500 font-semibold">Encrypted Image</th>
                        <th className="text-center py-2 px-3 text-zinc-500 font-semibold">Improvement</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-2 px-3 text-zinc-300">Horizontal</td>
                        <td className="text-center py-2 px-3 font-mono text-amber-400">
                          {securityMetrics.correlation.original.horizontal.toFixed(4)}
                        </td>
                        <td className="text-center py-2 px-3 font-mono text-green-400">
                          {securityMetrics.correlation.encrypted.horizontal.toFixed(4)}
                        </td>
                        <td className="text-center py-2 px-3 font-mono text-cyan-400">
                          {((1 - Math.abs(securityMetrics.correlation.encrypted.horizontal / securityMetrics.correlation.original.horizontal)) * 100).toFixed(1)}%
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-2 px-3 text-zinc-300">Vertical</td>
                        <td className="text-center py-2 px-3 font-mono text-amber-400">
                          {securityMetrics.correlation.original.vertical.toFixed(4)}
                        </td>
                        <td className="text-center py-2 px-3 font-mono text-green-400">
                          {securityMetrics.correlation.encrypted.vertical.toFixed(4)}
                        </td>
                        <td className="text-center py-2 px-3 font-mono text-cyan-400">
                          {((1 - Math.abs(securityMetrics.correlation.encrypted.vertical / securityMetrics.correlation.original.vertical)) * 100).toFixed(1)}%
                        </td>
                      </tr>
                      <tr className="hover:bg-zinc-800/30">
                        <td className="py-2 px-3 text-zinc-300">Diagonal</td>
                        <td className="text-center py-2 px-3 font-mono text-amber-400">
                          {securityMetrics.correlation.original.diagonal.toFixed(4)}
                        </td>
                        <td className="text-center py-2 px-3 font-mono text-green-400">
                          {securityMetrics.correlation.encrypted.diagonal.toFixed(4)}
                        </td>
                        <td className="text-center py-2 px-3 font-mono text-cyan-400">
                          {((1 - Math.abs(securityMetrics.correlation.encrypted.diagonal / securityMetrics.correlation.original.diagonal)) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-zinc-600 mt-3">
                  Lower correlation in encrypted image indicates better randomness and security.
                </p>
              </div>
            </div>
          )}

          {/* Histogram Analysis Section */}
          {mode === 'encrypt' && originalHistogram && encryptedHistogram && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-zinc-100">Histogram Analysis</h3>
                </div>
                <button
                  onClick={() => setUseLogScale(!useLogScale)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${useLogScale
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700'
                    }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18" />
                    <path d="M18 17V9" />
                    <path d="M13 17V5" />
                    <path d="M8 17v-3" />
                  </svg>
                  {useLogScale ? 'Logarithmic Scale' : 'Linear Scale'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Original Histogram Chart */}
                <div>
                  <h4 className="text-sm font-semibold text-zinc-400 mb-3">Original Image Histogram</h4>
                  <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={Array.from({ length: 256 }, (_, i) => ({
                          value: i,
                          R: useLogScale ? Math.max(1, originalHistogram.R[i]) : originalHistogram.R[i],
                          G: useLogScale ? Math.max(1, originalHistogram.G[i]) : originalHistogram.G[i],
                          B: useLogScale ? Math.max(1, originalHistogram.B[i]) : originalHistogram.B[i],
                          realR: originalHistogram.R[i],
                          realG: originalHistogram.G[i],
                          realB: originalHistogram.B[i]
                        }))}
                        margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                        <XAxis
                          dataKey="value"
                          stroke="#71717a"
                          tick={{ fontSize: 10 }}
                          interval={63}
                        />
                        <YAxis
                          stroke="#71717a"
                          tick={{ fontSize: 10 }}
                          scale={useLogScale ? 'log' : 'linear'}
                          domain={useLogScale ? [1, 'auto'] : [0, 'auto']}
                          allowDataOverflow={useLogScale}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            border: '1px solid #3f3f46',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                          labelStyle={{ color: '#a1a1aa' }}
                          formatter={(_value: number | undefined, name: string | undefined, props: { payload?: { realR: number; realG: number; realB: number } }) => {
                            const payload = props.payload;
                            if (!payload || !name) return [0, name || ''];
                            const realValue = name === 'R' ? payload.realR : name === 'G' ? payload.realG : payload.realB;
                            return [realValue, name];
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '11px' }}
                        />
                        <Bar dataKey="R" fill="#ef4444" maxBarSize={2} />
                        <Bar dataKey="G" fill="#22c55e" maxBarSize={2} />
                        <Bar dataKey="B" fill="#3b82f6" maxBarSize={2} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-zinc-600 mt-2">
                    Total pixels - R: {originalHistogram.R.reduce((a, b) => a + b, 0).toLocaleString()} |
                    G: {originalHistogram.G.reduce((a, b) => a + b, 0).toLocaleString()} |
                    B: {originalHistogram.B.reduce((a, b) => a + b, 0).toLocaleString()}
                  </p>
                </div>

                {/* Encrypted Histogram Chart */}
                <div>
                  <h4 className="text-sm font-semibold text-zinc-400 mb-3">Encrypted Image Histogram</h4>
                  <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={Array.from({ length: 256 }, (_, i) => ({
                          value: i,
                          R: useLogScale ? Math.max(1, encryptedHistogram.R[i]) : encryptedHistogram.R[i],
                          G: useLogScale ? Math.max(1, encryptedHistogram.G[i]) : encryptedHistogram.G[i],
                          B: useLogScale ? Math.max(1, encryptedHistogram.B[i]) : encryptedHistogram.B[i],
                          realR: encryptedHistogram.R[i],
                          realG: encryptedHistogram.G[i],
                          realB: encryptedHistogram.B[i]
                        }))}
                        margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                        <XAxis
                          dataKey="value"
                          stroke="#71717a"
                          tick={{ fontSize: 10 }}
                          interval={63}
                        />
                        <YAxis
                          stroke="#71717a"
                          tick={{ fontSize: 10 }}
                          scale={useLogScale ? 'log' : 'linear'}
                          domain={useLogScale ? [1, 'auto'] : [0, 'auto']}
                          allowDataOverflow={useLogScale}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            border: '1px solid #3f3f46',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}
                          labelStyle={{ color: '#a1a1aa' }}
                          formatter={(_value: number | undefined, name: string | undefined, props: { payload?: { realR: number; realG: number; realB: number } }) => {
                            const payload = props.payload;
                            if (!payload || !name) return [0, name || ''];
                            const realValue = name === 'R' ? payload.realR : name === 'G' ? payload.realG : payload.realB;
                            return [realValue, name];
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '11px' }}
                        />
                        <Bar dataKey="R" fill="#ef4444" maxBarSize={2} />
                        <Bar dataKey="G" fill="#22c55e" maxBarSize={2} />
                        <Bar dataKey="B" fill="#3b82f6" maxBarSize={2} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-zinc-600 mt-2">
                    Total pixels - R: {encryptedHistogram.R.reduce((a, b) => a + b, 0).toLocaleString()} |
                    G: {encryptedHistogram.G.reduce((a, b) => a + b, 0).toLocaleString()} |
                    B: {encryptedHistogram.B.reduce((a, b) => a + b, 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-4 bg-cyan-500/10 border border-cyan-500/30 rounded p-3">
                <p className="text-xs text-cyan-300">
                  <strong>Analysis:</strong> The histogram shows the distribution of color values (0-255).
                  A good encryption should produce a more <strong>uniform (flat) distribution</strong> compared to the original image,
                  indicating that the cipher image has no distinguishable patterns.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <img
              src={zoomedImage}
              alt="Zoomed"
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}