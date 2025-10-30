import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import turtleIcon from '../assets/turtle.png';

const mapContainerStyle = { width: '100vw', height: '100vh' };
const defaultCenter = { lat: 25.5, lng: -80.8 };

const defaultOptions = {
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
  zoomControl: true,
  mapTypeId: 'satellite',
};


const MapComponent = ({
  paths = [],
  selectedPath,
  onAddLocation,
  onUpdateLocation,
  onDeleteLocation,
  isLoaded,
  isAuthenticated = false,
}) => {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const mapRef = useRef(null);
  const longPressTimer = useRef(null);
  const [isBoundSet, setIsBoundSet] = useState(false);

  // Local render data (rebuilt from props, and updated optimistically on delete)
  const [polylines, setPolylines] = useState([]);
  const [markers, setMarkers] = useState([]);



  // helper: rebuild render data from paths
  const rebuildRenderData = useCallback((srcPaths) => {
    const tmpPolylines = [];
    const tmpMarkers = [];

    (srcPaths || []).forEach((path) => {
      const safeLocations = (path.locations || []).map((loc) => ({
        _id: loc._id,
        lat: Number(loc.lat),
        lng: Number(loc.lng),
      }));

      tmpMarkers.push({
        path, // keep full path to access name/_id
        locations: safeLocations,
      });

      // Only add polyline if there are at least 2 locations
      if (safeLocations.length >= 2) {
        tmpPolylines.push({
          path_id: path._id,
          coordinates: safeLocations.map(({ lat, lng }) => ({ lat, lng })),
        });
      }
    });

    console.log('Rebuilding render data, polylines count:', tmpPolylines.length);
    setMarkers(tmpMarkers);
    setPolylines(tmpPolylines);
  }, []);

  // Build render data & fit bounds once when paths change
  useEffect(() => {
    rebuildRenderData(paths);

    if (!isBoundSet && mapRef.current && (paths?.length ?? 0) > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      let hasLocations = false;

      paths.forEach((p) => {
        (p.locations || []).forEach((loc) => {
          if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
            bounds.extend({ lat: loc.lat, lng: loc.lng });
            hasLocations = true;
          }
        });
      });

      if (hasLocations) {
        mapRef.current.fitBounds(bounds, 0);
        setIsBoundSet(true);
      }
    }
  }, [paths, isBoundSet, rebuildRenderData]);

  const onMapLoad = useCallback(
    (map) => {
      mapRef.current = map;

      // Fit bounds on load if not done yet
      if (!isBoundSet && (paths?.length ?? 0) > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        let hasLocations = false;

        paths.forEach((p) => {
          (p.locations || []).forEach((loc) => {
            if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
              bounds.extend({ lat: loc.lat, lng: loc.lng });
              hasLocations = true;
            }
          });
        });

        if (hasLocations) {
          map.fitBounds(bounds, 0);
          setIsBoundSet(true);
        }
      }
    },
    [paths, isBoundSet]
  );

  // Long-press add location (only when authenticated)
  const handleMapMouseDown = (e) => {
    if (!isAuthenticated) return;

    longPressTimer.current = setTimeout(() => {
      if (selectedPath && e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        onAddLocation?.(selectedPath._id, lat, lng);
      }
    }, 500);
  };

  const handleMapMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Drag marker -> update location
  const handleMarkerDragEnd = (pathId, locationId, e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    onUpdateLocation?.(pathId, locationId, lat, lng);
  };

  // Click marker -> open delete prompt (only when authenticated)
  const handleMarkerClick = (path, location) => {
    if (!isAuthenticated) return;
    setSelectedMarker({ path, location });
  };

  // Delete location (optimistic update + callback)
  const handleDeleteLocation = () => {
    if (!selectedMarker) return;

    const { path, location } = selectedMarker;

    // Optimistically update local render data
    const newPathsShape = (prevMarkers => {
      // Build a pseudo paths array out of current markers state to reuse rebuildRenderData
      return prevMarkers.map((entry) => ({
        ...entry.path,
        locations: entry.locations, // we’ll filter below
      }));
    })(markers).map(p => {
      if (p._id !== path._id) return p;
      return {
        ...p,
        locations: (p.locations || []).filter(l => l._id !== location._id),
      };
    });

    rebuildRenderData(newPathsShape);
    setSelectedMarker(null);

    // Notify parent
    onDeleteLocation?.(path._id, location._id);
  };

  if (!isLoaded) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f0f0f0',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2>Loading Map...</h2>
          <p>Please wait while we load the tracking map</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={defaultCenter}
      zoom={8}
      onLoad={onMapLoad}
      onMouseDown={handleMapMouseDown}
      onMouseUp={handleMapMouseUp}
      onTouchStart={handleMapMouseDown}
      onTouchEnd={handleMapMouseUp}
      options={defaultOptions}
    >
      {/* Paths (polylines) */}
      {polylines.map((polyline) => {
        const isSelected = selectedPath?._id === polyline.path_id;
        const pathColor = isSelected ? '#22c55e' : '#86efac';
        const pathOpacity = isSelected ? 0.8 : 0.5;
        console.log('Rendering polyline for path:', polyline.path_id, 'with', polyline.coordinates.length, 'points');
        return (
          <Polyline
            key={polyline.path_id}
            path={polyline.coordinates}
            options={{
              strokeColor: pathColor,
              strokeOpacity: pathOpacity,
              strokeWeight: isSelected ? 3 : 2,
            }}
          />
        );
      })}

      {/* Markers (turtle image) */}
      {markers.flatMap((entry) => {
        const isSelectedPath = selectedPath?._id === entry.path._id;

        return (entry.locations || []).map((location, index) => (
          <Marker
            key={`marker-${entry.path._id}-${location._id ?? index}`}
            position={{ lat: location.lat, lng: location.lng }}
            draggable={isAuthenticated && isSelectedPath}
            onDragEnd={(e) => handleMarkerDragEnd(entry.path._id, location._id, e)}
            onClick={() => handleMarkerClick(entry.path, location)}
            title={`${entry.path.name} - Location ${index + 1}`}
            animation={null}
            icon={{
              url: turtleIcon,
              scaledSize: new window.google.maps.Size(
                isSelectedPath ? 40 : 30,
                isSelectedPath ? 40 : 30
              ),
              anchor: new window.google.maps.Point(
                isSelectedPath ? 20 : 15,
                isSelectedPath ? 20 : 15
              ),
            }}
          />
        ));
      })}

      {/* Delete prompt */}
      {selectedMarker && (
        <InfoWindow
          position={{
            lat: selectedMarker.location.lat,
            lng: selectedMarker.location.lng,
          }}
          onCloseClick={() => setSelectedMarker(null)}
        >
          <div style={{ padding: '8px', minWidth: 180 }}>
            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
              {selectedMarker.path.name}
            </p>
            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#666' }}>
              Lat: {selectedMarker.location.lat.toFixed(6)}
              <br />
              Lng: {selectedMarker.location.lng.toFixed(6)}
            </p>
            <button
              onClick={handleDeleteLocation}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              🗑️ Delete Location
            </button>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

export default MapComponent;
