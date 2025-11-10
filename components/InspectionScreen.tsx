import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { InspectionData, PropertyPhoto } from '../types';
import { CameraIcon, TrashIcon, CheckIcon, ArrowRightIcon, PencilIcon } from './icons';

const PhotoWithDescriptionModal: React.FC<{
  onSave: (description: string, imageDataUrl: string) => void;
  onClose: () => void;
}> = ({ onSave, onClose }) => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessingImage(true);
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessingImage(false);
          URL.revokeObjectURL(objectUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setImageDataUrl(dataUrl);
        setIsProcessingImage(false);
        URL.revokeObjectURL(objectUrl);
      };
      img.onerror = () => {
        setIsProcessingImage(false);
        URL.revokeObjectURL(objectUrl);
        console.error("Error loading image.");
      };
      img.src = objectUrl;
    }
  };

  const triggerCameraInput = () => cameraInputRef.current?.click();
  const triggerGalleryInput = () => galleryInputRef.current?.click();

  const handleSave = () => {
    if (imageDataUrl && description) {
      onSave(description, imageDataUrl);
      setDescription('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl flex flex-col gap-4">
        {!imageDataUrl ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-12 text-center">
            <CameraIcon className="mx-auto h-12 w-12 text-slate-400"/>
            <p className="mt-2 text-slate-500">Adicione uma foto à vistoria</p>
            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} className="hidden" />
            <input type="file" accept="image/*" ref={galleryInputRef} onChange={handleFileChange} className="hidden" />
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <button onClick={triggerCameraInput} disabled={isProcessingImage} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-400">
                {isProcessingImage ? 'Processando...' : 'Abrir Câmera'}
              </button>
              <button onClick={triggerGalleryInput} disabled={isProcessingImage} className="rounded-lg bg-slate-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:bg-slate-400">
                Carregar da Galeria
              </button>
            </div>
          </div>
        ) : (
          <>
            <img src={imageDataUrl} alt="Captured" className="w-full max-h-64 object-contain rounded-lg" />
            <div className="flex flex-col gap-2">
                <label htmlFor="description" className="font-semibold text-slate-700">Descrição do Item</label>
                <textarea
                    id="description"
                    rows={4}
                    className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Descreva o que você está vendo..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>
          </>
        )}
        <div className="flex justify-end gap-3 mt-4">
            <button onClick={onClose} className="rounded-lg bg-slate-200 px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-300">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={!imageDataUrl || !description || isProcessingImage} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-400">
              Salvar Foto
            </button>
        </div>
      </div>
    </div>
  );
};

const EditDescriptionModal: React.FC<{
  photo: PropertyPhoto;
  onSave: (photoId: string, newDescription: string) => void;
  onClose: () => void;
}> = ({ photo, onSave, onClose }) => {
    const [description, setDescription] = useState(photo.description);
    
    const handleSave = () => {
        onSave(photo.id, description);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
            <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl flex flex-col gap-4">
                <h2 className="text-xl font-bold text-slate-800">Editar Descrição</h2>
                <img src={photo.imageDataUrl} alt="Item de Vistoria" className="w-full max-h-64 object-contain rounded-lg" />
                <textarea
                    rows={6}
                    className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={onClose} className="rounded-lg bg-slate-200 px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-300">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};


// FIX: Defined the missing InspectionScreenProps interface.
interface InspectionScreenProps {
  inspectionData: InspectionData;
  onUpdateInspection: (data: InspectionData) => void;
  onFinishInspection: () => void;
}

export const InspectionScreen: React.FC<InspectionScreenProps> = ({ inspectionData, onUpdateInspection, onFinishInspection }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<PropertyPhoto | null>(null);
  
  const handleSavePhoto = (description: string, imageDataUrl: string) => {
    const newPhoto: PropertyPhoto = {
      id: new Date().toISOString(),
      description,
      imageDataUrl,
    };
    const updatedData = { ...inspectionData, photos: [...inspectionData.photos, newPhoto] };
    onUpdateInspection(updatedData);
    setIsModalOpen(false);
  };
  
  const handleDeletePhoto = (id: string) => {
    const updatedPhotos = inspectionData.photos.filter(p => p.id !== id);
    onUpdateInspection({ ...inspectionData, photos: updatedPhotos });
  };
  
  const handleUpdatePhotoDescription = (photoId: string, newDescription: string) => {
    const updatedPhotos = inspectionData.photos.map(p =>
        p.id === photoId ? { ...p, description: newDescription } : p
    );
    onUpdateInspection({ ...inspectionData, photos: updatedPhotos });
    setEditingPhoto(null);
  };
  
  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
            <h1 className="text-3xl font-bold text-slate-800">Itens da Vistoria</h1>
            <p className="text-slate-500 mt-1">{inspectionData.propertyAddress}</p>
        </header>

        <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {inspectionData.photos.map((photo, index) => (
                <div key={photo.id} className="group relative overflow-hidden rounded-xl bg-white shadow-lg transition-shadow hover:shadow-2xl">
                    <img src={photo.imageDataUrl} alt={`Vistoria ${index + 1}`} className="h-48 w-full object-cover"/>
                    <div className="p-4">
                        <p className="text-sm text-slate-600 line-clamp-3">{photo.description}</p>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => setEditingPhoto(photo)} className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600">
                            <PencilIcon className="h-5 w-5"/>
                        </button>
                        <button onClick={() => handleDeletePhoto(photo.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600">
                            <TrashIcon className="h-5 w-5"/>
                        </button>
                    </div>
                </div>
            ))}
             <button onClick={() => setIsModalOpen(true)} className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-400 bg-slate-50 text-slate-600 transition hover:border-blue-500 hover:bg-white hover:text-blue-600 min-h-[250px]">
                <CameraIcon className="h-10 w-10"/>
                <span className="mt-2 font-semibold">Adicionar Item</span>
            </button>
        </main>
        
        {isModalOpen && <PhotoWithDescriptionModal onSave={handleSavePhoto} onClose={() => setIsModalOpen(false)} />}
        {editingPhoto && <EditDescriptionModal photo={editingPhoto} onSave={handleUpdatePhotoDescription} onClose={() => setEditingPhoto(null)} />}
        
        <footer className="mt-8 flex justify-end">
            <button onClick={onFinishInspection} disabled={inspectionData.photos.length === 0} className="group flex items-center justify-center rounded-lg bg-green-600 px-6 py-3 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:cursor-not-allowed disabled:bg-slate-400">
                Finalizar e Gerar Laudo
                <ArrowRightIcon className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
        </footer>
      </div>
    </div>
  );
};