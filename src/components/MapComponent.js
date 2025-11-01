import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import turtleCircle from '../assets/turtle-circle.png'; // last-point icon
import deleteIcon from '../assets/delete.png'; // delete icon
import turtle from '../assets/turtle1.png'; // delete icon

const wrapperStyle = { position: 'relative', width: '100vw', height: '100vh' };
const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 25.5, lng: -80.8 };

// Hide zoom (+/-) and fullscreen per request
const defaultOptions = {
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: false, // hidden
  zoomControl: false,       // hidden
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
  // optional: pass your own selectors if different
  drawerSelector = '#drawer',
  toggleSelector = '#sidebar-toggle-floating',
}) => {
  // Popup / hover state
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [hoverKey, setHoverKey] = useState(null);
  const [stickyMarkerKey, setStickyMarkerKey] = useState(null);
  const [hoverOverMarkerKey, setHoverOverMarkerKey] = useState(null);
  const [hoverOverPopup, setHoverOverPopup] = useState(false);

  // Loading badge
  const [isSyncing, setIsSyncing] = useState(false);
  const runSync = async (fn) => {
    try { setIsSyncing(true); return await Promise.resolve(fn?.()); }
    finally { setIsSyncing(false); }
  };

  const hideTimerRef = useRef(null);
  const mapRef = useRef(null);
  const longPressTimer = useRef(null);
  const [isBoundSet, setIsBoundSet] = useState(false);

  // Add New Location toggle (locks gestures; enables long-press)
  const [addMode, setAddMode] = useState(false);

  // Local render data
  const [polylines, setPolylines] = useState([]);
  const [markers, setMarkers] = useState([]);

  // Positioning for the right-anchored "Add New Location" control
  // We compute a dynamic `right` style so the control sits left of drawer/toggle.
  const [addCtrlRightPx, setAddCtrlRightPx] = useState(12); // default 12px from right
  const ADD_CTRL_MARGIN = 12; // gap between target (drawer/toggle) and our control

  const computeAddCtrlRight = useCallback(() => {
    const winW = window.innerWidth || document.documentElement.clientWidth || 0;

    // helper to check element visibility (rough)
    const isVisible = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      // Consider visible if it has width and is within viewport horizontally
      return rect.width > 0 && rect.left >= 0 && rect.left <= winW;
    };

    const drawerEl = document.querySelector(drawerSelector);
    const toggleEl = document.querySelector(toggleSelector);

    let targetLeft = null;

    // Prefer drawer if visible (open). Your drawer may slide-in/out; adjust if needed.
    if (isVisible(drawerEl)) {
      targetLeft = drawerEl.getBoundingClientRect().left;
    } else if (isVisible(toggleEl)) {
      targetLeft = toggleEl.getBoundingClientRect().left;
    }

    if (targetLeft !== null) {
      // Place the control just to the LEFT of the target's left edge.
      // Using `right` avoids needing our control's width:
      // right = windowWidth - targetLeft + margin
      const right = Math.max(ADD_CTRL_MARGIN, Math.round(winW - targetLeft + ADD_CTRL_MARGIN));
      setAddCtrlRightPx(right);
    } else {
      // fallback: keep 12px from right edge
      setAddCtrlRightPx(12);
    }
  }, [drawerSelector, toggleSelector]);

  useEffect(() => {
    computeAddCtrlRight();
    const onResize = () => computeAddCtrlRight();
    window.addEventListener('resize', onResize);

    // Watch for DOM changes that might open/close drawer
    const mo = new MutationObserver(() => computeAddCtrlRight());
    mo.observe(document.body, { attributes: true, childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', onResize);
      mo.disconnect();
    };
  }, [computeAddCtrlRight]);

  // Build render data from paths
  const rebuildRenderData = useCallback((srcPaths) => {
    const tmpPolylines = [];
    const tmpMarkers = [];

    (srcPaths || []).forEach((path) => {
      const safeLocations = (path.locations || []).map((loc) => ({
        _id: loc._id,
        lat: Number(loc.lat),
        lng: Number(loc.lng),
        current_date: loc.current_date,
      }));

      tmpMarkers.push({ path, locations: safeLocations });

      if (safeLocations.length >= 2) {
        tmpPolylines.push({
          path_id: path._id,
          coordinates: safeLocations.map(({ lat, lng }) => ({ lat, lng })),
        });
      }
    });

    setMarkers(tmpMarkers);
    setPolylines(tmpPolylines);
  }, []);

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

  const applyMapInteraction = useCallback((map, enabled) => {
    if (!map) return;
    map.setOptions({
      draggable: enabled,
      zoomControl: enabled,          // we disabled globally via defaultOptions, this respects lock in addMode
      scrollwheel: enabled,
      disableDoubleClickZoom: !enabled,
      gestureHandling: enabled ? 'auto' : 'none',
    });
  }, []);

  const onMapLoad = useCallback(
    (map) => {
      mapRef.current = map;
      applyMapInteraction(map, !addMode);

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
    [paths, isBoundSet, addMode, applyMapInteraction]
  );

  useEffect(() => {
    if (mapRef.current) applyMapInteraction(mapRef.current, !addMode);
  }, [addMode, applyMapInteraction]);

  // Long-press add location (only when authenticated AND addMode is ON)
  const handleMapMouseDown = (e) => {
    if (!isAuthenticated || !addMode) return;

    longPressTimer.current = setTimeout(() => {
      if (selectedPath && e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        runSync(() => onAddLocation?.(selectedPath._id, lat, lng));
      }
    }, 500);
  };

  const handleMapMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Map click should close popup
  const handleMapClick = () => {
    if (selectedMarker) {
      setSelectedMarker(null);
      setStickyMarkerKey(null);
      setHoverOverPopup(false);
      setHoverOverMarkerKey(null);
      setHoverKey(null);
    }
    // also recompute position in case click toggles UI elsewhere
    computeAddCtrlRight();
  };

  // Drag marker -> optimistic update + callback
  const handleMarkerDragEnd = (pathId, locationId, e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    // Optimistically update local render data from current markers state
    const newPathsShape = markers.map((entry) => ({
      ...entry.path,
      locations: entry.locations.map((l) =>
        l._id === locationId ? { ...l, lat, lng } : l
      ),
    }));

    rebuildRenderData(newPathsShape);

    // Keep popup in sync if it belongs to this location
    setSelectedMarker((prev) =>
      prev && prev.location._id === locationId
        ? { ...prev, location: { ...prev.location, lat, lng } }
        : prev
    );

    // Persist
    runSync(() => onUpdateLocation?.(pathId, locationId, lat, lng));
  };

  // Click marker -> open delete prompt and make it sticky
  const handleMarkerClick = (path, location, key) => {
    if (!isAuthenticated) return;
    setSelectedMarker({ path, location });
    setStickyMarkerKey(key);
  };

  // Delete location (optimistic update + callback)
  const handleDeleteLocation = () => {
    if (!selectedMarker) return;

    const { path, location } = selectedMarker;

    // Build pseudo paths from markers, then filter out the location
    const newPathsShape = markers
      .map((entry) => ({ ...entry.path, locations: entry.locations }))
      .map((p) =>
        p._id !== path._id
          ? p
          : { ...p, locations: (p.locations || []).filter((l) => l._id !== location._id) }
      );

    rebuildRenderData(newPathsShape);
    setSelectedMarker(null);

    runSync(() => onDeleteLocation?.(path._id, location._id));
  };

  // --------- Flicker-proof hover handling ----------
  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleMaybeHide = () => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      const shouldHide =
        !stickyMarkerKey && !hoverOverMarkerKey && !hoverOverPopup;
      if (shouldHide) setSelectedMarker(null);
    }, 120);
  };

  // ---- Icon helpers ----
  // Circles (SymbolPath): diameter requested; Symbol.scale uses radius
  const getCircleIcon = (diameterPx) => {
    const scale = diameterPx / 2;
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale,
      fillColor: '#1d4ed8',
      fillOpacity: 1,
      strokeWeight: 0,
      labelOrigin: new window.google.maps.Point(0, 0),
    };
  };

  // First marker label styles (number "1")
  const firstLabel = {
    text: '1',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '12px',
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
    <div style={wrapperStyle}>
      {/* Top-left overlay: Syncing pill (per your earlier requirement) */}
      {isSyncing && (
        <div
          style={{
            position: 'absolute',
            bottom: 75,
            left: 30,
            zIndex: 3,
            background: 'rgba(17,24,39,0.9)',
            color: 'white',
            padding: '6px 10px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}
        >
          Syncing…
        </div>
      )}

      {/* Right-anchored overlay control:
          If drawer is open -> left of drawer.
          Else -> left of #sidebar-toggle-floating.
          We compute 'right' dynamically so we don't need our own width. */}
      {isAuthenticated && (
        <div
          style={{
            position: 'absolute',
            top:  55,
            left: 9, // dynamic placement
            zIndex: 2,
            background: 'white',
            padding: '10px 12px',
            borderRadius: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
            transition: 'right 160ms ease',
          }}
        >
          <span style={{ fontWeight: 600 }}>Add New Location</span>
          <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={addMode}
              onChange={(e) => setAddMode(e.target.checked)}
              style={{ marginRight: 8 }}
              disabled={!isAuthenticated}
              title={isAuthenticated ? 'Toggle add mode' : 'Sign in to add locations'}
            />
            <span>{addMode ? 'On' : 'Off'}</span>
          </label>
        </div>
      )}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={8}
        onLoad={onMapLoad}
        onMouseDown={handleMapMouseDown}
        onMouseUp={handleMapMouseUp}
        onTouchStart={handleMapMouseDown}
        onTouchEnd={handleMapMouseUp}
        onClick={handleMapClick}  // close popup on map click
        options={defaultOptions}
      >
        {/* Yellow polylines */}
        {polylines.map((polyline) => {
          const isSelected = selectedPath?._id === polyline.path_id;
          return (
            <Polyline
              key={polyline.path_id}
              path={polyline.coordinates}
              options={{
                strokeColor: '#facc15',
                strokeOpacity: isSelected ? 0.95 : 0.75,
                strokeWeight: isSelected ? 4 : 3,
              }}
            />
          );
        })}

        {/* Markers */}
        {markers.flatMap((entry) => {
          const isSelectedPath = selectedPath?._id === entry.path._id;
          const locs = entry.locations || [];
          const lastIndex = locs.length - 1;

          return locs.map((location, index) => {
            const isFirst = index === 0;
            const isLast = index === lastIndex && lastIndex >= 0;
            const isEdge = isFirst || isLast;
            const key = `marker-${entry.path._id}-${location._id ?? index}`;
            const isHovered = hoverKey === key;

            // Sizes
            const sizePx = isEdge ? (isHovered ? 36 : 24) : (isHovered ? 22 : 12);
            const sizePxTurtle = isHovered ? 40 : 30

            let icon, label, optimized;
            if (isFirst) {
              icon = getCircleIcon(sizePx);
              label = firstLabel;
              optimized = false; // prevent canvas clipping of symbol + label
            } else if (isLast) {
              const scaled = new window.google.maps.Size(sizePxTurtle, sizePxTurtle);
              const anchor = new window.google.maps.Point(sizePxTurtle / 2, sizePxTurtle / 2);
              icon = { url: turtleCircle, scaledSize: scaled, anchor };
              label = undefined;
              optimized = true;  // image marker can stay optimized
            } else {
              icon = getCircleIcon(sizePx);
              label = undefined;
              optimized = false; // prevent clipped circles
            }

            return (
              <Marker
                key={key}
                position={{ lat: location.lat, lng: location.lng }}
                draggable={isAuthenticated && isSelectedPath}
                onDragEnd={(e) => handleMarkerDragEnd(entry.path._id, location._id, e)}
                onClick={() => handleMarkerClick(entry.path, location, key)}
                onMouseOver={() => {
                  setHoverKey(key);
                  setHoverOverMarkerKey(key);
                  setSelectedMarker({ path: entry.path, location }); // show same popup
                  clearHideTimer();
                }}
                onMouseOut={() => {
                  setHoverKey(null);
                  setHoverOverMarkerKey(null);
                  scheduleMaybeHide();
                }}
                title={`${entry.path.name} - Point ${index + 1}`}
                animation={null}
                icon={icon}
                label={label}
                optimized={optimized}
              />
            );
          });
        })}

        {/* Popup */}
        {selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.location.lat, lng: selectedMarker.location.lng }}
            onCloseClick={() => {
              setSelectedMarker(null);
              setStickyMarkerKey(null);
            }}
          >
            <div
              style={{ minWidth: 140, height: 115 }}
              onMouseEnter={() => {
                setHoverOverPopup(true);
                clearHideTimer();
              }}
              onMouseLeave={() => {
                setHoverOverPopup(false);
                scheduleMaybeHide();
              }}
            >
              <div style={{display: 'inline-flex'}}>
                 <img src={turtle} style={{width: 140, height: 110, borderRadius: 8}}/>  
                 <div style={{display: 'block', marginLeft: 10, marginTop: 20}}>
                    <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', fontSize: 20 }}>
                      {selectedMarker.path.name}
                    </p>
                     <p style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#666' }}>
                      Location: {selectedMarker.location.lat.toFixed(6)}, {selectedMarker.location.lng.toFixed(6)}
                    </p>
                    <p style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#666' }}>
                      Last Known location: {selectedMarker.location.current_date}
                    </p>
                 </div>
              </div>
              {isAuthenticated && selectedPath?._id === selectedMarker.path._id && (
                <img
                  onClick={handleDeleteLocation}
                  src={deleteIcon}
                  alt="Delete"
                  style={{
                    position: 'absolute',
                    width: 20,
                    height: 20,
                    top: 15,
                    left: 10,
                    cursor: 'pointer',
                    borderRadius: 6,
                  }}
                />
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default MapComponent;
