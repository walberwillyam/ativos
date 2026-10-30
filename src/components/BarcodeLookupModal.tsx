/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  ScanBarcode, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Camera, 
  RefreshCw,
  Sparkles,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Asset } from '../types';

interface BarcodeLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  onOpenNewAssetWithPatrimonio?: (patrimonio: string) => void;
}

/**
 * Searches and matches an asset from a scanned barcode or tag string
 */
export function matchAssetByScannedCode(code: string, assets: Asset[]): Asset | undefined {
  if (!code) return undefined;
  const raw = code.trim();
  const lower = raw.toLowerCase();

  // 1. Direct match on id, patrimonio, serialNumber, name
  let found = assets.find(a => 
    (a.id && a.id.toLowerCase() === lower) ||
    (a.patrimonio && a.patrimonio.toLowerCase() === lower) ||
    (a.serialNumber && a.serialNumber.toLowerCase() === lower) ||
    (a.name && a.name.toLowerCase() === lower)
  );
  if (found) return found;

  // 2. Normalized patrimonio (strip '#', 'pat-', 'patrimonio-', leading whitespace)
  const normalizePat = (str: string) => 
    str.toLowerCase().replace(/^[#\s]+/, '').replace(/^pat(rimonio)?[-:\s]*/i, '').trim();
  
  const normInput = normalizePat(raw);

  if (normInput) {
    found = assets.find(a => {
      const normAssetPat = normalizePat(a.patrimonio || '');
      return normAssetPat && normAssetPat === normInput;
    });
    if (found) return found;
  }

  // 3. Digits-only match (e.g. barcode has "7768" and asset has "#PAT-7768" or "PAT-7768")
  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly.length >= 2) {
    const numInput = parseInt(digitsOnly, 10);
    found = assets.find(a => {
      const aDigits = (a.patrimonio || '').replace(/\D/g, '');
      if (!aDigits) return false;
      return aDigits === digitsOnly || (aDigits.length >= 2 && parseInt(aDigits, 10) === numInput);
    });
    if (found) return found;
  }

  // 4. Substring / contains match if input is specific enough (length >= 4)
  if (lower.length >= 4) {
    found = assets.find(a => 
      (a.id && a.id.toLowerCase().includes(lower)) ||
      (a.patrimonio && a.patrimonio.toLowerCase().includes(lower)) ||
      (a.serialNumber && a.serialNumber.toLowerCase().includes(lower))
    );
    if (found) return found;
  }

  return undefined;
}

/**
 * Emits an audible scanner beep using Web Audio API and vibrates if supported
 */
function triggerScanFeedback() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880 Hz
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    }
  } catch (e) {
    // Ignore audio restrictions
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100]);
    }
  } catch (e) {
    // Ignore vibration restrictions
  }
}

export default function BarcodeLookupModal({
  isOpen,
  onClose,
  assets,
  onSelectAsset,
  onOpenNewAssetWithPatrimonio
}: BarcodeLookupModalProps) {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [foundAsset, setFoundAsset] = useState<Asset | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef(false);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setManualCode('');
      setCameraError(null);
      setLastScannedCode(null);
      setNotFoundCode(null);
      setFoundAsset(null);
      setIsCameraActive(false);
    }
  }, [isOpen]);

  // Handle process scanned text
  const handleProcessCode = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setLastScannedCode(trimmed);
    const matched = matchAssetByScannedCode(trimmed, assets);

    if (matched) {
      triggerScanFeedback();
      setFoundAsset(matched);
      setNotFoundCode(null);

      // Stop camera
      stopScanner();

      // Automatically navigate to asset details after brief visual confirmation
      setTimeout(() => {
        onSelectAsset(matched);
        onClose();
      }, 700);
    } else {
      setNotFoundCode(trimmed);
      setFoundAsset(null);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && !isStoppingRef.current) {
      isStoppingRef.current = true;
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Error stopping scanner:", err);
      } finally {
        html5QrCodeRef.current = null;
        isStoppingRef.current = false;
        setIsCameraActive(false);
      }
    }
  };

  // Initialize camera scanner
  useEffect(() => {
    if (!isOpen || notFoundCode || foundAsset) return;

    let mounted = true;

    async function startScanner() {
      // Small delay to ensure the modal DOM element is rendered
      await new Promise(r => setTimeout(r, 150));
      if (!mounted) return;

      const element = document.getElementById("barcode-lookup-reader");
      if (!element) return;

      try {
        if (html5QrCodeRef.current) {
          await stopScanner();
        }

        const scanner = new Html5Qrcode("barcode-lookup-reader", {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.ITF
          ],
          verbose: false
        });

        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode },
          {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              // Wide aspect ratio optimal for 1D barcodes and QR tags
              const width = Math.min(viewfinderWidth * 0.85, 320);
              const height = Math.min(viewfinderHeight * 0.65, 180);
              return { width, height };
            }
          },
          (decodedText) => {
            if (mounted) {
              handleProcessCode(decodedText);
            }
          },
          () => {
            // Ignore scan frame misses
          }
        );

        if (mounted) {
          setIsCameraActive(true);
          setCameraError(null);
        }
      } catch (err: any) {
        console.warn("Could not start camera for barcode reader:", err);
        if (mounted) {
          setCameraError("Câmera não disponível ou permissão negada. Você pode digitar o código ou usar um leitor USB abaixo.");
          setIsCameraActive(false);
        }
      }
    }

    startScanner();

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [isOpen, facingMode, notFoundCode, foundAsset]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleProcessCode(manualCode);
  };

  const handleRetryScan = () => {
    setNotFoundCode(null);
    setFoundAsset(null);
    setLastScannedCode(null);
  };

  const handleCreateNewWithCode = () => {
    const code = notFoundCode || manualCode;
    onClose();
    if (onOpenNewAssetWithPatrimonio && code) {
      onOpenNewAssetWithPatrimonio(code);
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md select-none animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[95dvh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/50">
              <ScanBarcode size={20} />
            </div>
            <div className="text-left">
              <h3 className="font-extrabold text-base sm:text-lg text-slate-800 dark:text-white">
                Leitor de Tag / Código de Barras
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Aponte para a tag patrimonial para abrir diretamente o cadastro
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-center">
          
          {/* State 1: Asset Found Success Card */}
          {foundAsset && (
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 rounded-2xl space-y-3 animate-slide-up">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                <CheckCircle2 size={26} />
              </div>
              <h4 className="font-bold text-lg text-emerald-900 dark:text-emerald-100">
                Ativo Localizado!
              </h4>
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50 text-left text-xs space-y-1">
                <p className="font-extrabold text-slate-800 dark:text-white text-sm">{foundAsset.name}</p>
                <p className="text-slate-500"><strong>Patrimônio:</strong> {foundAsset.patrimonio}</p>
                <p className="text-slate-500"><strong>Categoria:</strong> {foundAsset.category}</p>
                <p className="text-slate-500"><strong>Unidade:</strong> {foundAsset.unit}</p>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-center gap-1.5">
                <Sparkles size={14} /> Abrindo a ficha do ativo...
              </p>
            </div>
          )}

          {/* State 2: Scanned Code Not Found in Database */}
          {notFoundCode && !foundAsset && (
            <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-2xl space-y-3 text-left animate-slide-up">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-xl shrink-0 mt-0.5">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                    Ativo não localizado
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5">
                    O código <strong className="font-mono bg-amber-200/60 dark:bg-amber-900/60 px-1.5 py-0.5 rounded text-amber-950 dark:text-amber-100">{notFoundCode}</strong> foi lido, mas não corresponde a nenhum patrimônio, ID ou número de série cadastrado.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleRetryScan}
                  className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold text-xs rounded-xl hover:bg-amber-100/50 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={13} /> Escanear Outro
                </button>
                {onOpenNewAssetWithPatrimonio && (
                  <button
                    type="button"
                    onClick={handleCreateNewWithCode}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} /> Cadastrar Novo Ativo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* State 3: Normal Camera Scanner Viewfinder */}
          {!foundAsset && !notFoundCode && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-slate-200 dark:border-slate-700 aspect-video sm:h-64 flex items-center justify-center">
                
                {/* Html5Qrcode target div */}
                <div id="barcode-lookup-reader" className="w-full h-full object-cover"></div>

                {/* Laser scan line animation overlay */}
                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center">
                    {/* Viewfinder borders */}
                    <div className="w-[80%] h-[65%] border-2 border-indigo-400/80 rounded-xl relative shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                      {/* Animated red/neon laser scan bar */}
                      <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444] animate-pulse-vertical"></div>
                      
                      {/* Corner marks */}
                      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white"></div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white"></div>
                      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white"></div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white"></div>
                    </div>
                  </div>
                )}

                {/* Camera error fallback view */}
                {cameraError && (
                  <div className="p-4 text-center text-slate-300 text-xs space-y-2 z-10">
                    <Camera size={28} className="mx-auto text-slate-500" />
                    <p>{cameraError}</p>
                  </div>
                )}

                {/* Camera switch toggle button */}
                {isCameraActive && (
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-sm text-xs flex items-center gap-1 border border-white/20 transition cursor-pointer"
                    title="Alternar Câmera"
                  >
                    <RefreshCw size={13} />
                  </button>
                )}
              </div>

              {/* Helper instruction */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1">
                <span>Centralize o código de barras ou QR Code</span>
                <span className="font-semibold text-indigo-500">Auto-detect</span>
              </div>
            </div>
          )}

          {/* Manual Input Section (also works with USB barcode scanners / typing) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-left">
            <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Ou digite / use leitor USB:
            </label>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ex: #PAT-7768 ou 7768 ou SN..."
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                Buscar <ArrowRight size={13} />
              </button>
            </form>
          </div>

          {/* Sample quick test tags */}
          {assets && assets.length > 0 && (
            <div className="pt-1 text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">
                Atalhos de Teste Rápido:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {assets.slice(0, 4).map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleProcessCode(a.patrimonio || a.id)}
                    className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg text-[10px] font-mono font-medium transition cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    {a.patrimonio || a.id}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>

      <style>{`
        @keyframes scanLaser {
          0% { top: 5%; }
          50% { top: 90%; }
          100% { top: 5%; }
        }
        .animate-pulse-vertical {
          animation: scanLaser 2.2s ease-in-out infinite;
        }
        #barcode-lookup-reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
    </div>,
    document.body
  );
}

