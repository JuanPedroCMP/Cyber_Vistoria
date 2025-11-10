import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { InspectionData } from '../types';
import { generateReportSummary } from '../services/geminiService';
import { UserIcon, HomeIcon, CalendarIcon, LocationIcon, DocumentIcon, ShareIcon, PencilIcon } from './icons';

// Adiciona declarações para o TypeScript reconhecer bibliotecas importadas via CDN
declare const html2canvas: any;
declare const jspdf: any;

interface ReportScreenProps {
  inspectionData: InspectionData;
  onBackToSetup: () => void;
  onUpdateInspection: (data: InspectionData) => void;
}

const InfoCard: React.FC<{ icon: React.ReactNode; title: string; value: string | undefined | null }> = ({ icon, title, value }) => (
    <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-blue-600">{icon}</div>
        <div>
            <h3 className="text-sm font-semibold text-slate-500">{title}</h3>
            <p className="text-base text-slate-800">{value || 'Não informado'}</p>
        </div>
    </div>
);

const SignaturePadModal: React.FC<{
    onSave: (dataUrl: string) => void;
    onClose: () => void;
    personName: string;
}> = ({ onSave, onClose, personName }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        const context = canvas.getContext('2d');
        if (!context) return;
        
        context.scale(dpr, dpr);
        context.lineCap = 'round';
        context.strokeStyle = 'black';
        context.lineWidth = 2;
        contextRef.current = context;
    }, []);

    const getPosition = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const touchEvent = event.nativeEvent as TouchEvent;

        if (touchEvent.touches && touchEvent.touches.length > 0) {
            return {
                offsetX: touchEvent.touches[0].clientX - rect.left,
                offsetY: touchEvent.touches[0].clientY - rect.top,
            };
        }
        const mouseEvent = event.nativeEvent as MouseEvent;
        return { offsetX: mouseEvent.offsetX, offsetY: mouseEvent.offsetY };
    };

    const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const { offsetX, offsetY } = getPosition(event);
        contextRef.current?.beginPath();
        contextRef.current?.moveTo(offsetX, offsetY);
        isDrawing.current = true;
    };

    const finishDrawing = () => {
        contextRef.current?.closePath();
        isDrawing.current = false;
    };

    const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing.current) return;
        event.preventDefault(); // Prevent scrolling on touch devices
        const { offsetX, offsetY } = getPosition(event);
        contextRef.current?.lineTo(offsetX, offsetY);
        contextRef.current?.stroke();
    };
    
    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas && contextRef.current) {
            contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            onSave(canvas.toDataURL('image/png'));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
            <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl flex flex-col gap-4">
                <h2 className="text-xl font-bold text-slate-800">Assinatura de {personName}</h2>
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseUp={finishDrawing}
                    onMouseMove={draw}
                    onTouchStart={startDrawing}
                    onTouchEnd={finishDrawing}
                    onTouchMove={draw}
                    className="w-full h-48 bg-slate-100 border border-slate-300 rounded-lg cursor-crosshair"
                />
                <div className="flex justify-between gap-3 mt-2">
                    <button onClick={clearCanvas} className="rounded-lg bg-slate-200 px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-300">Limpar</button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="rounded-lg bg-slate-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700">Cancelar</button>
                        <button onClick={handleSave} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">Salvar Assinatura</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ReportScreen: React.FC<ReportScreenProps> = ({ inspectionData, onBackToSetup, onUpdateInspection }) => {
    const [summary, setSummary] = useState<string>('');
    const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(true);
    const [isSharing, setIsSharing] = useState<boolean>(false);
    const [isEditingSummary, setIsEditingSummary] = useState<boolean>(false);
    const [editedSummary, setEditedSummary] = useState<string>('');
    const [signingFor, setSigningFor] = useState<'inspector' | 'landlord' | 'tenant' | null>(null);

    const generateNativePdf = async (data: InspectionData, summaryText: string): Promise<Blob> => {
        const { jsPDF } = jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4',
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 40;
        const contentWidth = pageWidth - margin * 2;
        let cursorY = margin;

        const addPageIfNeeded = (heightNeeded: number) => {
            if (cursorY + heightNeeded > pdf.internal.pageSize.getHeight() - margin) {
                pdf.addPage();
                cursorY = margin;
            }
        };

        const addSectionTitle = (title: string) => {
            addPageIfNeeded(30);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(14);
            pdf.text(title, margin, cursorY);
            cursorY += 20;
            pdf.setDrawColor(200, 200, 200);
            pdf.line(margin, cursorY, pageWidth - margin, cursorY);
            cursorY += 15;
        };

        const addText = (text: string | null | undefined, options: { fontSize?: number, fontStyle?: string, isPre?: boolean } = {}) => {
            if (!text) return;
            const { fontSize = 10, fontStyle = 'normal', isPre = false } = options;
            const lines = pdf.splitTextToSize(text, contentWidth);
            const textHeight = lines.length * fontSize * 1.2;
            addPageIfNeeded(textHeight);
            pdf.setFont('helvetica', fontStyle);
            pdf.setFontSize(fontSize);
            pdf.text(lines, margin, cursorY);
            cursorY += textHeight;
        };
        
        // --- INÍCIO DO CONTEÚDO DO PDF ---

        // Cabeçalho
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        const title = `Laudo de Vistoria de Imóvel (${data.inspectionType === 'initial' ? 'Inicial' : 'Final'})`;
        pdf.text(title, pageWidth / 2, cursorY, { align: 'center' });
        cursorY += 30;
        
        // Dados da Vistoria
        addSectionTitle('Dados da Vistoria');
        const details = [
            { title: 'Vistoriador', value: data.inspectorName },
            { title: 'Locador(a)', value: data.landlordName },
            { title: 'Locatário(a)', value: data.tenantName },
            { title: 'Endereço', value: data.propertyAddress },
            { title: 'Data', value: data.inspectionDate },
            { title: 'Geolocalização', value: data.geolocation ? `${data.geolocation.latitude.toFixed(5)}, ${data.geolocation.longitude.toFixed(5)}` : 'Não disponível' },
        ];
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        details.forEach(detail => {
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${detail.title}:`, margin, cursorY);
            pdf.setFont('helvetica', 'normal');
            const lines = pdf.splitTextToSize(detail.value || 'Não informado', contentWidth - 80);
            pdf.text(lines, margin + 80, cursorY);
            cursorY += (lines.length * 10) + 5;
        });
        cursorY += 10;
        
        // Observações Gerais
        if (data.observations) {
            addSectionTitle('Observações Gerais');
            addText(data.observations, { isPre: true });
            cursorY += 10;
        }

        // Resumo IA
        addSectionTitle('Resumo da Condição do Imóvel (IA)');
        addText(summaryText, { isPre: true });
        cursorY += 10;

        // Itens Vistoriados
        if (data.photos.length > 0) {
            pdf.addPage();
            cursorY = margin;
            addSectionTitle('Itens Vistoriados');

            for (let i = 0; i < data.photos.length; i++) {
                const photo = data.photos[i];
                const textLines = pdf.splitTextToSize(photo.description, contentWidth);
                const textHeight = textLines.length * 10 * 1.2;
                const imageHeight = 200; // Altura fixa para a imagem
                const itemHeight = imageHeight + textHeight + 30; // 30 de margem
                
                addPageIfNeeded(itemHeight);

                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(12);
                pdf.text(`Item ${i + 1}`, margin, cursorY);
                cursorY += 20;

                try {
                    const img = new Image();
                    img.src = photo.imageDataUrl;
                    await new Promise(resolve => { img.onload = resolve });

                    const imgRatio = img.width / img.height;
                    const imgWidth = imageHeight * imgRatio;
                    
                    pdf.addImage(photo.imageDataUrl, 'JPEG', margin, cursorY, Math.min(imgWidth, contentWidth), imageHeight);
                    cursorY += imageHeight + 10;
                } catch (e) {
                    pdf.text('Erro ao carregar imagem.', margin, cursorY);
                    cursorY += 20;
                }

                addText(photo.description);
                cursorY += 20; // Espaço entre itens
            }
        }
        
        // Assinaturas
        pdf.addPage();
        cursorY = margin;
        addSectionTitle('Assinaturas');
        
        const signatures = [
            { title: 'Vistoriador(a)', name: data.inspectorName, url: data.inspectorSignatureUrl },
            { title: 'Locador(a)', name: data.landlordName, url: data.landlordSignatureUrl },
            { title: 'Locatário(a)', name: data.tenantName, url: data.tenantSignatureUrl },
        ];
        
        const sigWidth = contentWidth / 3;
        const sigStartY = cursorY;

        signatures.forEach((sig, index) => {
            const sigX = margin + (index * sigWidth);
            cursorY = sigStartY;
            if (sig.url) {
                try {
                   pdf.addImage(sig.url, 'PNG', sigX + 10, cursorY, sigWidth - 20, 50, undefined, 'FAST');
                } catch(e) {
                   pdf.text('Erro na assinatura', sigX + 10, cursorY + 25);
                }
            } else {
                pdf.setFontSize(10);
                pdf.text('[Não assinado]', sigX + (sigWidth / 2), cursorY + 25, { align: 'center' });
            }
            cursorY += 60;
            pdf.setDrawColor(150, 150, 150);
            pdf.line(sigX + 5, cursorY, sigX + sigWidth - 5, cursorY);
            cursorY += 15;
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.text(sig.name, sigX + (sigWidth / 2), cursorY, { align: 'center' });
            cursorY += 10;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.text(sig.title, sigX + (sigWidth / 2), cursorY, { align: 'center' });
        });
        
        // Rodapé com número de página
        const pageCount = pdf.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pdf.internal.pageSize.getHeight() - 20, { align: 'center' });
        }

        return pdf.output('blob');
    };


    const handleShare = async () => {
        setIsSharing(true);
        try {
            const pdfBlob = await generateNativePdf(inspectionData, summary);
            const file = new File([pdfBlob], 'laudo-vistoria.pdf', { type: 'application/pdf' });
            
            const shareData = {
                title: `Laudo de Vistoria - ${inspectionData.propertyAddress}`,
                text: `Segue o laudo de vistoria para o imóvel: ${inspectionData.propertyAddress}`,
                files: [file],
            };
            
            if (navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                alert('O compartilhamento de arquivos não é suportado. Iniciando download.');
                const link = document.createElement('a');
                link.href = URL.createObjectURL(pdfBlob);
                link.download = 'laudo-vistoria.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }
        } catch (error) {
            console.error('Erro ao gerar ou compartilhar PDF:', error);
            alert('Ocorreu um erro ao gerar o PDF para compartilhamento.');
        } finally {
            setIsSharing(false);
        }
    };

    const fetchSummary = useCallback(async () => {
        setIsLoadingSummary(true);
        if (inspectionData.photos.length > 0) {
            const descriptions = inspectionData.photos.map(p => p.description);
            try {
                const result = await generateReportSummary(descriptions);
                setSummary(result);
            } catch (error) {
                setSummary('Erro ao gerar o resumo.');
            }
        } else {
            setSummary('Nenhum item foi adicionado para gerar um resumo.');
        }
        setIsLoadingSummary(false);
    }, [inspectionData.photos]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    const handleSaveSignature = (dataUrl: string) => {
        if (!signingFor) return;

        const updatedData = { ...inspectionData };
        if (signingFor === 'inspector') updatedData.inspectorSignatureUrl = dataUrl;
        else if (signingFor === 'landlord') updatedData.landlordSignatureUrl = dataUrl;
        else if (signingFor === 'tenant') updatedData.tenantSignatureUrl = dataUrl;
        
        onUpdateInspection(updatedData);
        setSigningFor(null);
    };
    
    const signingPersonName = useMemo(() => {
        if (signingFor === 'inspector') return inspectionData.inspectorName;
        if (signingFor === 'landlord') return inspectionData.landlordName;
        if (signingFor === 'tenant') return inspectionData.tenantName;
        return '';
    }, [signingFor, inspectionData]);

    const SignatureBox: React.FC<{
        role: 'inspector' | 'landlord' | 'tenant';
        name: string;
        title: string;
        signatureUrl: string | null | undefined;
    }> = ({ role, name, title, signatureUrl }) => (
        <div className="flex flex-col items-center justify-between h-full">
            <div className="flex-grow flex items-center justify-center w-full">
                {signatureUrl ? (
                    <img src={signatureUrl} alt={`Assinatura ${title}`} className="max-h-24 object-contain" />
                ) : (
                    <button onClick={() => setSigningFor(role)} className="no-print rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300">
                        Assinar
                    </button>
                )}
            </div>
            <div className="border-t w-full mt-2 pt-2">
                <p className="font-semibold text-sm">{name}</p>
                <p className="text-xs text-slate-500">{title}</p>
            </div>
        </div>
    );

    return (
        <div className="bg-slate-100 p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="no-print mb-8 flex flex-wrap justify-between items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-800">Laudo de Vistoria</h1>
                    <div className="flex gap-2">
                        <button onClick={handleShare} disabled={isSharing} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-400">
                           <ShareIcon className="h-4 w-4" />
                           {isSharing ? 'Gerando PDF...' : 'Compartilhar PDF'}
                        </button>
                        <button onClick={onBackToSetup} className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Nova Vistoria</button>
                    </div>
                </div>

                <div id="report-content" className="bg-white p-8 shadow-lg rounded-xl">
                    <header className="border-b pb-6 mb-6">
                        <h2 className="text-3xl font-bold text-slate-900 text-center">
                            Laudo de Vistoria de Imóvel ({inspectionData.inspectionType === 'initial' ? 'Inicial' : 'Final'})
                        </h2>
                    </header>
                    
                    <section className="mb-8">
                        <h3 className="text-xl font-semibold text-slate-800 border-b pb-2 mb-4">Dados da Vistoria</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InfoCard icon={<UserIcon className="h-6 w-6"/>} title="Vistoriador" value={inspectionData.inspectorName} />
                            <InfoCard icon={<DocumentIcon className="h-6 w-6"/>} title="Tipo de Vistoria" value={inspectionData.inspectionType === 'initial' ? 'Vistoria Inicial' : 'Vistoria Final'} />
                            <InfoCard icon={<CalendarIcon className="h-6 w-6"/>} title="Data da Vistoria" value={inspectionData.inspectionDate} />
                            <InfoCard icon={<HomeIcon className="h-6 w-6"/>} title="Endereço" value={inspectionData.propertyAddress} />
                            <InfoCard icon={<LocationIcon className="h-6 w-6"/>} title="Geolocalização" value={inspectionData.geolocation ? `${inspectionData.geolocation.latitude.toFixed(5)}, ${inspectionData.geolocation.longitude.toFixed(5)}` : 'Não disponível'} />
                            <InfoCard icon={<UserIcon className="h-6 w-6"/>} title="Locador" value={inspectionData.landlordName} />
                            <InfoCard icon={<UserIcon className="h-6 w-6"/>} title="Locatário" value={inspectionData.tenantName} />
                        </div>
                    </section>

                    {inspectionData.observations && (
                        <section className="mb-8">
                             <h3 className="text-xl font-semibold text-slate-800 border-b pb-2 mb-4">Observações Gerais</h3>
                             <p className="text-slate-700 whitespace-pre-wrap">{inspectionData.observations}</p>
                        </section>
                    )}
                    
                    <section className="mb-8">
                        <div className="flex justify-between items-center border-b pb-2 mb-4">
                            <h3 className="text-xl font-semibold text-slate-800">Resumo da Condição do Imóvel (IA)</h3>
                            {!isLoadingSummary && !isEditingSummary && (
                                <button 
                                    onClick={() => {
                                        setEditedSummary(summary);
                                        setIsEditingSummary(true);
                                    }}
                                    className="no-print flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
                                >
                                    <PencilIcon className="h-4 w-4" />
                                    Editar
                                </button>
                            )}
                        </div>

                        {isLoadingSummary ? (
                            <div className="animate-pulse space-y-2">
                                <div className="h-4 bg-slate-200 rounded w-full"></div>
                                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                            </div>
                        ) : isEditingSummary ? (
                            <div>
                                <textarea
                                    rows={8}
                                    className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
                                    value={editedSummary}
                                    onChange={(e) => setEditedSummary(e.target.value)}
                                />
                                <div className="flex justify-end gap-2 mt-2">
                                    <button onClick={() => setIsEditingSummary(false)} className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300">Cancelar</button>
                                    <button onClick={() => { setSummary(editedSummary); setIsEditingSummary(false);}} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Salvar</button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-700 whitespace-pre-wrap">{summary}</p>
                        )}
                    </section>
                    
                    <section className="print-break-before">
                        <h3 className="text-xl font-semibold text-slate-800 border-b pb-2 mb-6">Itens Vistoriados</h3>
                        <div className="space-y-8">
                            {inspectionData.photos.map((photo, index) => (
                                <div key={photo.id} className="print-break-inside-avoid grid grid-cols-1 md:grid-cols-2 gap-6 items-start border-t pt-6 first:border-t-0 first:pt-0">
                                    <img src={photo.imageDataUrl} alt={`Item ${index + 1}`} className="rounded-lg shadow-md w-full" />
                                    <div>
                                        <h4 className="text-lg font-semibold text-slate-900 mb-2">Item {index + 1}</h4>
                                        <p className="text-slate-700">{photo.description}</p>
                                    </div>
                                </div>
                            ))}
                            {inspectionData.photos.length === 0 && (
                                <p className="text-slate-500 text-center py-8">Nenhuma foto foi adicionada a esta vistoria.</p>
                            )}
                        </div>
                    </section>
                    
                    <section className="mt-12 pt-8 border-t print-break-before">
                        <h3 className="text-xl font-semibold text-slate-800 text-center mb-8">Assinaturas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center min-h-[150px]">
                            <SignatureBox role="inspector" name={inspectionData.inspectorName} title="Vistoriador(a)" signatureUrl={inspectionData.inspectorSignatureUrl} />
                            <SignatureBox role="landlord" name={inspectionData.landlordName} title="Locador(a)" signatureUrl={inspectionData.landlordSignatureUrl} />
                            <SignatureBox role="tenant" name={inspectionData.tenantName} title="Locatário(a)" signatureUrl={inspectionData.tenantSignatureUrl} />
                        </div>
                    </section>

                    <footer className="mt-12 pt-6 border-t text-center text-sm text-slate-500">
                        <p>Laudo gerado por Vistoria Imóvel AI</p>
                        <p>Data de Geração: {new Date().toLocaleString('pt-BR')}</p>
                    </footer>
                </div>
            </div>
            {signingFor && <SignaturePadModal onSave={handleSaveSignature} onClose={() => setSigningFor(null)} personName={signingPersonName}/>}
        </div>
    );
};