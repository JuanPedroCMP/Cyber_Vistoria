
import { useState, useEffect } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: GeolocationPositionError | null;
}

export const useGeolocation = () => {
  const [location, setLocation] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, loading: false, error: { message: "Geolocation is not supported by your browser." } as GeolocationPositionError }));
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        loading: false,
        error: null,
      });
    };

    const onError = (error: GeolocationPositionError) => {
      setLocation({
        latitude: null,
        longitude: null,
        loading: false,
        error,
      });
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError);
  }, []);

  return location;
};
