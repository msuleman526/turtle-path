import React, { useState, useEffect } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import Sidebar from './components/Sidebar';
import CreatePathModal from './components/CreatePathModal';
import LoginModal from './components/LoginModal';
import MapComponent from './components/MapComponent';
import { GOOGLE_MAPS_API_KEY, INITIAL_COORDINATES } from './constants';
import {
  getAllPaths,
  createPath,
  updatePathName,
  deletePath,
  addLocation,
  updateLocation,
  deleteLocation,
  login,
  verifyToken,
} from './services/api';
import './App.css';

function App() {
  const [paths, setPaths] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Load all paths on mount
  useEffect(() => {
    loadPaths();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('turtleAuthToken');
    if (token) {
      try {
        await verifyToken();
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('turtleAuthToken');
        setIsAuthenticated(false);
      }
    }
  };

  const handleLogin = async (email, password) => {
    try {
      const response = await login(email, password);
      if (response.success && response.token) {
        localStorage.setItem('turtleAuthToken', response.token);
        setIsAuthenticated(true);
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Invalid credentials');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('turtleAuthToken');
    setIsAuthenticated(false);
    setSelectedPath(null);
  };

  const loadPaths = async () => {
    try {
      setIsLoading(true);
      const response = await getAllPaths();
      
      console.log('API Response:', response);
      
      if (response.success) {
        if (response.data && response.data.length > 0) {
          console.log(`Loaded ${response.data.length} paths:`, response.data);
          // Paths exist, use them
          setPaths(response.data);
          setSelectedPath(response.data[0]); // Select first path by default
        } else {
          console.log('No paths found, creating initial path...');
          // No paths exist, create initial path with hardcoded coordinates
          await createInitialPath();
        }
      } else {
        // Response not successful
        console.error('Failed to load paths:', response);
      }
    } catch (error) {
      console.error('Error loading paths:', error);
      alert('Error connecting to server. Please make sure the backend is running on port 3001.');
    } finally {
      setIsLoading(false);
    }
  };

  const createInitialPath = async () => {
    try {
      const formattedLocations = INITIAL_COORDINATES.map((coord, index) => ({
        lat: coord.lat,
        lng: coord.lng,
        order: index,
      }));

      const response = await createPath('Path 1', formattedLocations);
      
      if (response.success) {
        setPaths([response.data]);
        setSelectedPath(response.data);
      }
    } catch (error) {
      console.error('Error creating initial path:', error);
      throw error;
    }
  };

  const handleCreatePath = async (name) => {
    try {
      const response = await createPath(name, []);
      if (response.success) {
        setPaths([...paths, response.data]);
        setSelectedPath(response.data);
      }
    } catch (error) {
      console.error('Error creating path:', error);
      alert('Failed to create path. Please try again.');
    }
  };

  const handleRenamePath = async (pathId, newName) => {
    try {
      const response = await updatePathName(pathId, newName);
      if (response.success) {
        setPaths(paths.map(p => p._id === pathId ? response.data : p));
        if (selectedPath?._id === pathId) {
          setSelectedPath(response.data);
        }
      }
    } catch (error) {
      console.error('Error renaming path:', error);
      alert('Failed to rename path. Please try again.');
    }
  };

  const handleDeletePath = async (pathId) => {
    try {
      const response = await deletePath(pathId);
      if (response.success) {
        const updatedPaths = paths.filter(p => p._id !== pathId);
        setPaths(updatedPaths);
        
        // If deleted path was selected, select another one
        if (selectedPath?._id === pathId) {
          setSelectedPath(updatedPaths.length > 0 ? updatedPaths[0] : null);
        }
      }
    } catch (error) {
      console.error('Error deleting path:', error);
      alert('Failed to delete path. Please try again.');
    }
  };

  const handleAddLocation = async (pathId, lat, lng) => {
    try {
      const response = await addLocation(pathId, lat, lng);
      if (response.success) {
        setPaths(paths.map(p => p._id === pathId ? response.data : p));
        if (selectedPath?._id === pathId) {
          setSelectedPath(response.data);
        }
      }
    } catch (error) {
      console.error('Error adding location:', error);
      alert('Failed to add location. Please try again.');
    }
  };

  const handleUpdateLocation = async (pathId, locationId, lat, lng) => {
    try {
      const response = await updateLocation(pathId, locationId, lat, lng);
      if (response.success) {
        setPaths(paths.map(p => p._id === pathId ? response.data : p));
        if (selectedPath?._id === pathId) {
          setSelectedPath(response.data);
        }
      }
    } catch (error) {
      console.error('Error updating location:', error);
      alert('Failed to update location. Please try again.');
    }
  };

  const handleDeleteLocation = async (pathId, locationId) => {
    try {
      const response = await deleteLocation(pathId, locationId);
      if (response.success) {
        setPaths(paths.map(p => p._id === pathId ? response.data : p));
        if (selectedPath?._id === pathId) {
          setSelectedPath(response.data);
        }
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Failed to delete location. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <h1>🐢 Turtle Path Tracker</h1>
          <p>Loading paths and initializing map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <MapComponent
        paths={paths}
        selectedPath={selectedPath}
        onAddLocation={handleAddLocation}
        onUpdateLocation={handleUpdateLocation}
        onDeleteLocation={handleDeleteLocation}
        isLoaded={isLoaded}
        isAuthenticated={isAuthenticated}
      />

      {isAuthenticated && (
        <Sidebar
          paths={paths}
          selectedPath={selectedPath}
          onSelectPath={setSelectedPath}
          onRenamePath={handleRenamePath}
          onDeletePath={handleDeletePath}
        />
      )}

      {isAuthenticated ? (
        <>
          <button
            className="create-path-btn"
            onClick={() => setIsModalOpen(true)}
            title="Create new path"
          >
            + New Path
          </button>

          <button
            className="logout-btn"
            onClick={handleLogout}
            title="Logout"
          >
            Logout
          </button>
        </>
      ) : (
        <button
          className="login-btn"
          onClick={() => setIsLoginModalOpen(true)}
          title="Login"
        >
          Login
        </button>
      )}

      <CreatePathModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreatePath}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}

export default App;
