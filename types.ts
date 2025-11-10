export interface PropertyPhoto {
  id: string;
  imageDataUrl: string;
  description: string;
}

export interface InspectionData {
  inspectorName: string;
  landlordName: string;
  tenantName: string;
  propertyAddress: string;
  inspectionType: 'initial' | 'final';
  inspectionDate: string;
  geolocation: {
    latitude: number;
    longitude: number;
  } | null;
  photos: PropertyPhoto[];
  logoDataUrl?: string | null;
  observations?: string;
  inspectorSignatureUrl?: string | null;
  landlordSignatureUrl?: string | null;
  tenantSignatureUrl?: string | null;
}

export enum AppStep {
  Setup,
  Inspection,
  Report,
}