import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CheckCircle2, Eraser, PenTool, ShieldCheck, Laptop, Send } from 'lucide-react';

interface PublicSignViewProps {
  sessionId: string;
}

export default function PublicSignView({ sessionId }: PublicSignViewProps) {
  const [params, setParams] = useState<{
    assetName: string;
    category: string;
    marca: string;
    modelo: string;
    patrimonio: string;
    serial: string;
    recipName: string;
    techName: string;
    type: 'entrega' | 'devolucao';
    obs?: string;
  }>({
    assetName: 'Ativo Patrimonial',
    category: 'Geral',
    marca: '',
    modelo: '',
    patrimonio: '',
    serial: '',
    recipName: '',
    techName: '',
    type: 'entrega',
    obs: ''
  });

  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);

  // Parse query params for asset and recipient info
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setParams({
      assetName: searchParams.get('asset') || 'Ativo Patrimonial',
      category: searchParams.get('cat') || 'Equipamento',
      marca: searchParams.get('marca') || '',
      modelo: searchParams.get('modelo') || '',
      patrimonio: searchParams.get('pat') || '',
      serial: searchParams.get('serial') || '',
      recipName: searchParams.get('recip') || '',
      techName: searchParams.get('tech') || 'Suporte Técnico TI',
      type: (searchParams.get('type') as 'entrega' | 'devolucao') || 'entrega',
      obs: searchParams.get('obs') || ''
    });
  }, []);

  // Initialize Canvas with proper DPI resolution
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 2;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const getPos = (e: MouseEvent | TouchEvent) => {
      const cRect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      return { x: clientX - cRect.left, y: clientY - cRect.top };
    };

    const start = (e: MouseEvent | TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      isDrawing.current = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const move = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return;
      if (e.cancelable) e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasDrawn(true);
    };

    const end = () => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      setSignatureData(canvas.toDataURL('image/png'));
    };

    canvas.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);

    canvas.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);

    return () => {
      canvas.removeEventListener('mousedown', start);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      canvas.removeEventListener('touchstart', start);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
    };
  }, []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSignatureData('');
  };

  const handleSubmit = async () => {
    if (!hasDrawn || !signatureData) {
      alert('Por favor, desenhe sua assinatura no espaço indicado antes de confirmar.');
      return;
    }

    try {
      setSubmitting(true);
      const channel = supabase.channel(`term_sign_${sessionId}`);
      
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'sign',
            payload: {
              signature: signatureData,
              sessionId,
              signedAt: new Date().toISOString()
            }
          });
          setIsSuccess(true);
          setSubmitting(false);
        }
      });

      // Fallback timeout in case subscription takes long
      setTimeout(async () => {
        await channel.send({
          type: 'broadcast',
          event: 'sign',
          payload: {
            signature: signatureData,
            sessionId,
            signedAt: new Date().toISOString()
          }
        });
        setIsSuccess(true);
        setSubmitting(false);
      }, 1500);

    } catch (err) {
      console.error('Erro ao enviar assinatura:', err);
      alert('Ocorreu um erro ao enviar. Tente novamente.');
      setSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-500/30 animate-bounce">
          <CheckCircle2 size={44} />
        </div>
        <h2 className="text-2xl font-black mb-2">Assinatura Enviada com Sucesso!</h2>
        <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
          Obrigado, <strong className="text-white">{params.recipName || 'Colaborador'}</strong>. 
          Sua assinatura foi transmitida e o termo já foi atualizado na tela do técnico de TI.
        </p>
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 max-w-sm w-full text-xs text-slate-300 text-left space-y-1.5">
          <p><span className="text-slate-500 font-semibold">Equipamento:</span> {params.assetName}</p>
          {params.patrimonio && <p><span className="text-slate-500 font-semibold">Patrimônio:</span> {params.patrimonio}</p>}
          <p><span className="text-slate-500 font-semibold">Data/Hora:</span> {new Date().toLocaleString()}</p>
        </div>
        <p className="text-slate-500 text-xs mt-8">Você já pode fechar esta página.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Header */}
      <header className="bg-indigo-600 text-white px-5 py-4 shadow-md flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-white text-sm">
            TI
          </div>
          <div>
            <h1 className="font-extrabold text-sm leading-tight">
              {params.type === 'entrega' ? 'Termo de Responsabilidade' : 'Termo de Devolução'}
            </h1>
            <p className="text-[10px] text-indigo-200">Assinatura Eletrônica de Ativo</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-bold bg-white/15 px-2.5 py-1 rounded-full">
          <ShieldCheck size={13} /> Seguro
        </span>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 max-w-lg mx-auto w-full space-y-4 flex-1">
        {/* Asset summary badge */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Laptop size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                {params.category}
              </span>
              <h2 className="font-bold text-slate-800 text-sm truncate mt-1">{params.assetName}</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3 text-slate-600">
            {params.marca && (
              <div>
                <span className="text-slate-400 block text-[10px]">Marca:</span>
                <span className="font-semibold text-slate-800">{params.marca}</span>
              </div>
            )}
            {params.modelo && (
              <div>
                <span className="text-slate-400 block text-[10px]">Modelo:</span>
                <span className="font-semibold text-slate-800">{params.modelo}</span>
              </div>
            )}
            {params.patrimonio && (
              <div>
                <span className="text-slate-400 block text-[10px]">Patrimônio:</span>
                <span className="font-semibold text-slate-800">{params.patrimonio}</span>
              </div>
            )}
            {params.serial && (
              <div>
                <span className="text-slate-400 block text-[10px]">Nº de Série:</span>
                <span className="font-semibold text-slate-800">{params.serial}</span>
              </div>
            )}
          </div>
        </div>

        {/* Declaratory text */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-xs leading-relaxed text-slate-600 space-y-2">
          <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
            {params.type === 'entrega' ? 'Declaração de Recebimento' : 'Declaração de Devolução'}
          </h3>
          <p>
            {params.type === 'entrega'
              ? `Eu, ${params.recipName || 'colaborador recebedor'}, declaro ter recebido da empresa o ativo patrimonial em perfeito estado de conservação e funcionamento, assumindo a responsabilidade civil e criminal por sua guarda, zelo e conservação, obrigando-me a devolvê-lo nas mesmas condições quando solicitado ou no término do vínculo corporativo.`
              : `Eu, ${params.recipName || 'colaborador recebedor'}, declaro estar devolvendo à empresa o ativo patrimonial designado sob minha responsabilidade, cessando a partir desta data qualquer obrigação de guarda sobre o referido equipamento.`}
          </p>
          {params.obs && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-800 text-[11px] mt-2">
              <strong>Observações:</strong> {params.obs}
            </div>
          )}
        </div>

        {/* Signature Area */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <PenTool size={14} className="text-indigo-600" />
              Sua Assinatura (com o dedo) *
            </label>
            {hasDrawn && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
              >
                <Eraser size={12} /> Limpar
              </button>
            )}
          </div>

          <div
            ref={containerRef}
            className="w-full h-44 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 relative touch-none overflow-hidden flex items-center justify-center"
          >
            {!hasDrawn && (
              <div className="absolute text-slate-400 text-xs pointer-events-none select-none flex flex-col items-center gap-1 text-center px-4">
                <PenTool size={20} className="text-slate-300 animate-pulse" />
                <span>Desenhe sua assinatura aqui</span>
              </div>
            )}
            <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />
          </div>

          <p className="text-[10px] text-slate-400 text-center">
            Ao assinar e confirmar, você atesta a veracidade das informações e o recebimento/devolução deste ativo.
          </p>
        </div>
      </main>

      {/* Action Footer */}
      <footer className="p-4 bg-white border-t border-slate-200 sticky bottom-0 z-20">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            disabled={!hasDrawn || submitting}
            onClick={handleSubmit}
            className={`w-full py-3.5 px-5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
              hasDrawn && !submitting
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-[0.99]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <span>Transmitindo Assinatura...</span>
            ) : (
              <>
                <Send size={16} /> Confirmar e Enviar Assinatura
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

