
import React, { useState, useEffect, useRef } from 'react';
import { InspectionData } from '../types';
import { useGeolocation } from '../hooks/useGeolocation';
import { UserIcon, HomeIcon, CalendarIcon, LocationIcon, ArrowRightIcon, PencilIcon, TrashIcon } from './icons';

interface SetupScreenProps {
  onSetupComplete: (data: InspectionData) => void;
}

const InputField: React.FC<{
  icon: React.ReactNode;
  id: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ icon, id, placeholder, value, onChange }) => (
  <div className="relative">
    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
      {icon}
    </div>
    <input
      type="text"
      id={id}
      name={id}
      className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-3 pl-10 text-slate-900 focus:border-blue-500 focus:ring-blue-500"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required
    />
  </div>
);

export const SetupScreen: React.FC<SetupScreenProps> = ({ onSetupComplete }) => {
  const [formData, setFormData] = useState({
    inspectorName: '',
    landlordName: '',
    tenantName: '',
    propertyAddress: '',
    inspectionType: 'initial' as 'initial' | 'final',
    logoDataUrl: null as string | null,
    observations: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useGeolocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, inspectionType: e.target.value as 'initial' | 'final' }));
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logoDataUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, logoDataUrl: null }));
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const inspectionDate = new Date().toLocaleDateString('pt-BR');

    const fullData: InspectionData = {
      ...formData,
      inspectionDate,
      geolocation: location.latitude && location.longitude ? { latitude: location.latitude, longitude: location.longitude } : null,
      photos: [], // Initialize with empty photos array
      inspectorSignatureUrl: null,
      landlordSignatureUrl: null,
      tenantSignatureUrl: null,
    };
    onSetupComplete(fullData);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-800">Vistoria de Imóvel AI</h1>
          <p className="mt-2 text-slate-500">Preencha os dados abaixo para iniciar uma nova vistoria.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField 
              icon={<UserIcon className="h-5 w-5 text-slate-400" />} 
              id="inspectorName" 
              placeholder="Nome do Vistoriador" 
              value={formData.inspectorName} 
              onChange={handleInputChange} 
            />
            <InputField 
              icon={<HomeIcon className="h-5 w-5 text-slate-400" />} 
              id="propertyAddress" 
              placeholder="Endereço do Imóvel" 
              value={formData.propertyAddress} 
              onChange={handleInputChange}
            />
            <InputField 
              icon={<UserIcon className="h-5 w-5 text-slate-400" />} 
              id="landlordName" 
              placeholder="Nome do Locador(a)" 
              value={formData.landlordName} 
              onChange={handleInputChange} 
            />
            <InputField 
              icon={<UserIcon className="h-5 w-5 text-slate-400" />} 
              id="tenantName" 
              placeholder="Nome do Locatário(a)" 
              value={formData.tenantName} 
              onChange={handleInputChange} 
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-slate-900">Tipo de Vistoria</label>
            <div className="flex items-center gap-x-6">
              <div className="flex items-center">
                <input id="initial" name="inspectionType" type="radio" value="initial" checked={formData.inspectionType === 'initial'} onChange={handleRadioChange} className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"/>
                <label htmlFor="initial" className="ml-3 block text-sm font-medium leading-6 text-slate-900">Inicial</label>
              </div>
              <div className="flex items-center">
                <input id="final" name="inspectionType" type="radio" value="final" checked={formData.inspectionType === 'final'} onChange={handleRadioChange} className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"/>
                <label htmlFor="final" className="ml-3 block text-sm font-medium leading-6 text-slate-900">Final</label>
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="observations" className="block mb-2 text-sm font-medium text-slate-900">Observações Gerais (Opcional)</label>
            <textarea
                id="observations"
                name="observations"
                rows={4}
                className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Adicione observações relevantes aqui, como medidores de água/luz, etc."
                value={formData.observations}
                onChange={handleInputChange}
            />
          </div>

          <div className="flex items-center justify-center w-full">
            <label htmlFor="logo-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100">
                {formData.logoDataUrl ? (
                    <div className="relative p-2">
                        <img src={formData.logoDataUrl} alt="Logo" className="h-24 object-contain" />
                        <button type="button" onClick={removeLogo} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 leading-none">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-4 text-slate-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                        <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Clique para carregar</span> o logo da imobiliária</p>
                        <p className="text-xs text-slate-500">PNG, JPG (MAX. 800x400px)</p>
                    </div>
                )}
                <input id="logo-upload" type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleLogoChange} ref={fileInputRef} />
            </label>
          </div> 

          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-start p-4 rounded-lg bg-slate-50 border border-slate-200">
              <LocationIcon className="h-8 w-8 text-blue-500 flex-shrink-0 mr-3" />
              <div>
                <h3 className="font-semibold text-slate-800">Localização</h3>
                {location.loading && <p className="text-sm text-slate-500">Obtendo localização...</p>}
                {location.error && <p className="text-sm text-red-500">Erro ao obter localização: {location.error.message}</p>}
                {location.latitude && location.longitude && <p className="text-sm text-slate-600">Localização obtida com sucesso.</p>}
              </div>
            </div>
          </div>
          
          <button type="submit" disabled={isSubmitting} className="group w-full flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:cursor-not-allowed disabled:bg-slate-400">
            {isSubmitting ? 'Iniciando...' : 'Iniciar Vistoria'}
            <ArrowRightIcon className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </form>
      </div>
    </div>
  );
};
