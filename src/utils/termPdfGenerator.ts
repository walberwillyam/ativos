/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { Asset, HandoverTerm } from '../types';
import { supabase } from '../lib/supabaseClient';

export interface AssetBrandModel {
  marca: string;
  modelo: string;
}

/**
 * Extracts and formats Brand (Marca) and Model (Modelo) from an asset
 */
export function getAssetBrandModel(asset: Asset): AssetBrandModel {
  const specMarca = asset.specifications?.['Marca'] || 
                    asset.specifications?.['Fabricante'] || 
                    asset.specifications?.['brand'] || 
                    asset.specifications?.['manufacturer'] || '';

  const specModelo = asset.specifications?.['Modelo'] || 
                     asset.specifications?.['model'] || '';

  let marca = specMarca.trim();
  let modelo = (asset.model || specModelo).trim();

  // If marca is not explicitly specified, try to parse from asset.model (e.g. "Dell Latitude 5420")
  if (!marca && modelo) {
    const parts = modelo.split(/\s+/);
    if (parts.length > 1) {
      marca = parts[0];
      // Keep full modelo or specific model
    } else {
      marca = modelo;
    }
  }

  return {
    marca: marca || 'Não informada',
    modelo: modelo || 'Não informado'
  };
}

/**
 * Generates a high-quality jsPDF instance for a Handover Term
 */
export function buildTermJsPdf(asset: Asset, term: HandoverTerm): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 20;
  const contentWidth = pageWidth - margin * 2; // 170mm
  let currentY = 22;

  const isEntrega = term.type === 'entrega';
  const termTitle = isEntrega ? 'TERMO DE RESPONSABILIDADE E ENTREGA' : 'TERMO DE DEVOLUÇÃO DE ATIVO';
  const { marca, modelo } = getAssetBrandModel(asset);

  // 1. Top Header Accent Bar
  doc.setFillColor(isEntrega ? 79 : 225, isEntrega ? 70 : 29, isEntrega ? 229 : 72); // indigo-600 or rose-600
  doc.rect(margin, currentY, contentWidth, 3, 'F');
  currentY += 10;

  // 2. Title & Term ID
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(termTitle, margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Protocolo: ${term.id}`, pageWidth - margin, currentY, { align: 'right' });
  currentY += 6;

  const signedDateStr = term.signedAt ? new Date(term.signedAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
  doc.setFontSize(9);
  doc.text(`Emitido em: ${signedDateStr}`, margin, currentY);
  currentY += 8;

  // Divider line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // 3. Section: Especificação do Ativo Patrimonial
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('1. DADOS DO ATIVO PATRIMONIAL', margin, currentY);
  currentY += 5;

  // Info Box
  const boxStartY = currentY;
  const boxHeight = 44;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, boxStartY, contentWidth, boxHeight, 2, 2, 'FD');

  let boxTextY = boxStartY + 7;
  const col1 = margin + 5;
  const col2 = margin + 90;

  // Row 1: Equipamento / Nome
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('Equipamento:', col1, boxTextY);
  doc.setFont('helvetica', 'normal');
  doc.text(asset.name || 'N/A', col1 + 25, boxTextY);

  // Row 1 right: Categoria
  doc.setFont('helvetica', 'bold');
  doc.text('Categoria:', col2, boxTextY);
  doc.setFont('helvetica', 'normal');
  doc.text(asset.category || 'N/A', col2 + 20, boxTextY);
  boxTextY += 7;

  // Row 2: Marca & Modelo (Explicitly requested by user)
  doc.setFont('helvetica', 'bold');
  doc.text('Marca:', col1, boxTextY);
  doc.setFont('helvetica', 'normal');
  doc.text(marca, col1 + 25, boxTextY);

  doc.setFont('helvetica', 'bold');
  doc.text('Modelo:', col2, boxTextY);
  doc.setFont('helvetica', 'normal');
  doc.text(modelo, col2 + 20, boxTextY);
  boxTextY += 7;

  // Row 3: Patrimônio & Número de Série
  doc.setFont('helvetica', 'bold');
  doc.text('Patrimônio:', col1, boxTextY);
  doc.setFont('helvetica', 'normal');
  doc.text(asset.patrimonio || 'N/A', col1 + 25, boxTextY);

  doc.setFont('helvetica', 'bold');
  doc.text('Nº de Série:', col2, boxTextY);
  doc.setFont('helvetica', 'normal');
  doc.text(asset.serialNumber || 'N/A', col2 + 20, boxTextY);
  boxTextY += 7;

  // Row 4: Unidade / Filial & Localização
  doc.setFont('helvetica', 'bold');
  doc.text('Unidade:', col1, boxTextY);
  doc.setFont('helvetica', 'normal');
  doc.text(asset.unit || 'Matriz', col1 + 25, boxTextY);

  doc.setFont('helvetica', 'bold');
  doc.text('Localização:', col2, boxTextY);
  doc.setFont('helvetica', 'normal');
  doc.text(asset.location || 'N/A', col2 + 20, boxTextY);

  currentY = boxStartY + boxHeight + 8;

  // 4. Section: Cláusula de Responsabilidade
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('2. DECLARAÇÃO E RESPONSABILIDADE', margin, currentY);
  currentY += 6;

  const declarationText = isEntrega
    ? `Pelo presente instrumento particular, o(a) colaborador(a) abaixo qualificado(a) declara ter recebido da empresa o ativo patrimonial descrito acima (${asset.category} - ${asset.name} - Marca: ${marca} - Modelo: ${modelo} - Patrimônio: ${asset.patrimonio}), em perfeito estado de conservação, limpeza e pleno funcionamento, acompanhado de seus cabos e acessórios necessários.\n\nO(A) colaborador(a) assume expressamente a responsabilidade civil e criminal por sua guarda, zelo e conservação, comprometendo-se a utilizá-lo estritamente para as finalidades profissionais acordadas, e a devolvê-lo nas mesmas condições quando solicitado ou na rescisão do vínculo corporativo.`
    : `Pelo presente instrumento, declara-se a devolução formal à empresa do ativo patrimonial (${asset.category} - ${asset.name} - Marca: ${marca} - Modelo: ${modelo} - Patrimônio: ${asset.patrimonio}), cessando a partir desta data qualquer obrigação de guarda sobre o referido bem patrimonial corporativo.`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const splitDeclaration = doc.splitTextToSize(declarationText, contentWidth);
  doc.text(splitDeclaration, margin, currentY);
  currentY += splitDeclaration.length * 4.5 + 6;

  // 5. Section: Observações (se houver)
  if (term.observation && term.observation.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('3. OBSERVAÇÕES E CONDIÇÕES ADICIONAIS', margin, currentY);
    currentY += 5;

    const obsText = term.observation.trim();
    const splitObs = doc.splitTextToSize(obsText, contentWidth - 10);
    const obsHeight = Math.max(12, splitObs.length * 4.5 + 6);

    doc.setFillColor(254, 252, 232); // amber-50
    doc.setDrawColor(251, 191, 36); // amber-400
    doc.roundedRect(margin, currentY, contentWidth, obsHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 53, 15);
    doc.text(splitObs, margin + 5, currentY + 6);

    currentY += obsHeight + 8;
  }

  // 6. Section: Assinaturas Digitais (Colhidas na tela)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('ASSINATURAS DAS PARTES', margin, currentY);
  currentY += 6;

  const sigColWidth = 78;
  const sigCol1X = margin;
  const sigCol2X = margin + sigColWidth + 14;
  const sigBoxHeight = 35;

  // Technician Signature
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(sigCol1X, currentY, sigColWidth, sigBoxHeight, 2, 2, 'D');

  if (term.technicianSignature && term.technicianSignature.startsWith('data:image')) {
    try {
      doc.addImage(term.technicianSignature, 'PNG', sigCol1X + 4, currentY + 2, sigColWidth - 8, sigBoxHeight - 12);
    } catch (e) {
      console.warn("Could not render technician signature in PDF:", e);
    }
  }

  // Line & name for technician
  doc.setDrawColor(148, 163, 184);
  doc.line(sigCol1X + 5, currentY + sigBoxHeight - 9, sigCol1X + sigColWidth - 5, currentY + sigBoxHeight - 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(term.technicianName || 'Técnico Responsável', sigCol1X + sigColWidth / 2, currentY + sigBoxHeight - 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TÉCNICO EMITENTE', sigCol1X + sigColWidth / 2, currentY + sigBoxHeight + 4, { align: 'center' });

  // Recipient Signature
  doc.roundedRect(sigCol2X, currentY, sigColWidth, sigBoxHeight, 2, 2, 'D');

  if (term.recipientSignature && term.recipientSignature.startsWith('data:image')) {
    try {
      doc.addImage(term.recipientSignature, 'PNG', sigCol2X + 4, currentY + 2, sigColWidth - 8, sigBoxHeight - 12);
    } catch (e) {
      console.warn("Could not render recipient signature in PDF:", e);
    }
  }

  // Line & name for recipient
  doc.line(sigCol2X + 5, currentY + sigBoxHeight - 9, sigCol2X + sigColWidth - 5, currentY + sigBoxHeight - 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(term.recipientName || 'Colaborador Recebedor', sigCol2X + sigColWidth / 2, currentY + sigBoxHeight - 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('COLABORADOR RECEBEDOR', sigCol2X + sigColWidth / 2, currentY + sigBoxHeight + 4, { align: 'center' });

  // 7. Footer Seal & Disclaimer
  const footerY = 282;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Documento emitido digitalmente pelo Sistema Ativos Apoio • Protocolo de Validação: ${term.id}`, margin, footerY + 5);
  doc.text(`Assinado em: ${signedDateStr}`, pageWidth - margin, footerY + 5, { align: 'right' });

  return doc;
}

/**
 * Returns a Blob of the generated Term PDF
 */
export function generateTermPdfBlob(asset: Asset, term: HandoverTerm): Blob {
  const doc = buildTermJsPdf(asset, term);
  return doc.output('blob');
}

/**
 * Downloads the PDF directly to user's computer
 */
export function downloadTermPdf(asset: Asset, term: HandoverTerm): void {
  const doc = buildTermJsPdf(asset, term);
  const cleanPatrimonio = (asset.patrimonio || 'Ativo').replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `${term.type === 'entrega' ? 'Termo_Entrega' : 'Termo_Devolucao'}_${cleanPatrimonio}_${term.id}.pdf`;
  doc.save(fileName);
}

/**
 * Opens the Term PDF in a new browser tab for preview/printing
 */
export function openTermPdfPreview(asset: Asset, term: HandoverTerm): void {
  const blob = generateTermPdfBlob(asset, term);
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    // If pop-up blocked, trigger direct download
    downloadTermPdf(asset, term);
  }
}

/**
 * Shares the Term via WhatsApp:
 * 1. Generates the PDF file.
 * 2. On Mobile/Web Share API: opens native share sheet directly with the PDF file attached for WhatsApp.
 * 3. On Desktop/Fallback: uploads PDF to Supabase storage to generate a public viewing link,
 *    downloads the PDF locally, and opens WhatsApp with the message containing the document link!
 */
export async function shareTermViaWhatsApp(
  asset: Asset, 
  term: HandoverTerm,
  onStatusChange?: (status: string) => void
): Promise<void> {
  const { marca, modelo } = getAssetBrandModel(asset);
  const isEntrega = term.type === 'entrega';
  const termName = isEntrega ? 'Termo de Entrega' : 'Termo de Devolução';
  const cleanPatrimonio = (asset.patrimonio || 'Ativo').replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `${isEntrega ? 'Termo_Entrega' : 'Termo_Devolucao'}_${cleanPatrimonio}_${term.id}.pdf`;

  onStatusChange?.('Gerando documento PDF...');
  const pdfBlob = generateTermPdfBlob(asset, term);
  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

  const dateStr = term.signedAt ? new Date(term.signedAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
  const baseMessage = `Olá ${term.recipientName}!\n\nSegue o seu *${termName}* referente ao equipamento *${asset.name}* (Patrimônio: ${asset.patrimonio}).\n\n📌 *Marca:* ${marca}\n📌 *Modelo:* ${modelo}\n📌 *Nº de Série:* ${asset.serialNumber || 'N/A'}\n📌 *Data da Assinatura:* ${dateStr}\n📌 *Protocolo:* ${term.id}`;

  // Check if native file sharing is available (Android, iOS)
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      onStatusChange?.('Abrindo compartilhamento...');
      await navigator.share({
        title: `${termName} - ${asset.name}`,
        text: baseMessage,
        files: [pdfFile]
      });
      onStatusChange?.('');
      return;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        onStatusChange?.('');
        return; // User cancelled, normal behavior
      }
      console.warn('Native share failed, proceeding with online link & download:', err);
    }
  }

  // Desktop or fallback: Upload PDF to Supabase storage for online access link
  onStatusChange?.('Preparando link para envio...');
  let publicPdfUrl = '';
  try {
    const storagePath = `termos/${term.id}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage.from('ativos_arquivos').upload(storagePath, pdfBlob, {
      contentType: 'application/pdf',
      upsert: true
    });

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('ativos_arquivos').getPublicUrl(storagePath);
      publicPdfUrl = urlData?.publicUrl || '';
    }
  } catch (err) {
    console.warn("Storage upload for WhatsApp PDF link failed:", err);
  }

  // Also trigger local download so the user has the file immediately on PC
  try {
    downloadTermPdf(asset, term);
  } catch (e) {
    console.warn("Auto-download error:", e);
  }

  // Construct message with link
  let finalMessage = baseMessage;
  if (publicPdfUrl) {
    finalMessage += `\n\n📄 *Acesse e baixe o PDF assinado aqui:*\n${publicPdfUrl}`;
  } else {
    finalMessage += `\n\n📄 O arquivo PDF foi baixado em seu computador para envio em anexo.`;
  }

  onStatusChange?.('Redirecionando para o WhatsApp...');
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(finalMessage)}`;
  window.open(whatsappUrl, '_blank');
  
  setTimeout(() => {
    onStatusChange?.('');
  }, 1000);
}

