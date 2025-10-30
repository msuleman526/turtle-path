# 🐢 Turtle Path Tracker - Frontend

Interactive map application for tracking turtle paths with real-time location updates.

## Features

- ✅ Full-screen Google Maps integration
- ✅ Multiple turtle paths support
- ✅ Drag & drop markers to update locations
- ✅ Long-press to add new locations
- ✅ Click markers to delete locations
- ✅ Sidebar to manage paths (rename, delete)
- ✅ Create new paths with custom names
- ✅ Green markers and polylines
- ✅ Auto-loads initial path if database is empty

## Prerequisites

- Node.js (v14 or higher)
- Backend server running on port 3001

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Start the application:**
```bash
npm start
```

The app will open at `http://localhost:3000`

## Usage Guide

### Initial Load
- On first load, if no paths exist in the database, "Path 1" is automatically created with 16 preset locations along the Carolina coast
- The map automatically zooms to show all locations

### Selecting Paths
- Use the **right sidebar** to view all available paths
- Click on any path to select it
- The selected path is highlighted in bright green
- Other paths appear in lighter green

### Adding Locations
1. Select a path from the sidebar
2. **Long-press (hold for 0.5 seconds)** on the map where you want to add a location
3. A new green marker appears at that location

### Moving Locations
1. Select a path from the sidebar
2. **Drag any marker** to a new position
3. The location is automatically updated in the database

### Deleting Locations
1. **Click on any marker**
2. An info window appears with location details
3. Click **"Delete Location"** button
4. Confirm the deletion

### Managing Paths

**Rename a Path:**
1. Click the ✏️ (edit) icon next to the path name in sidebar
2. Enter new name
3. Press Enter or click ✓ to save

**Delete a Path:**
1. Click the 🗑️ (trash) icon next to the path name
2. Confirm deletion

**Create New Path:**
1. Click the **"+ New Path"** button (bottom-right)
2. Enter a path name
3. Click "Create Path"
4. New empty path is created and selected

### Sidebar Controls
- Click the **→** button to collapse the sidebar
- Click the **☰** floating button to reopen it
- Toggle visibility as needed for better map viewing

## Map Controls

- **Zoom:** Use mouse wheel or +/- buttons
- **Pan:** Click and drag the map
- **Map Type:** Switch between map/satellite view
- **Fullscreen:** Expand to fullscreen mode

## Color Coding

- **Selected Path:** Bright green (#22c55e) with thicker line
- **Other Paths:** Light green (#86efac) with thinner line
- **Markers:** Green circles, larger when path is selected

## API Integration

The frontend communicates with the backend API at `http://localhost:3001/api`

Endpoints used:
- `GET /api/paths` - Load all paths
- `POST /api/paths` - Create new path
- `PUT /api/paths/:id` - Update path name
- `DELETE /api/paths/:id` - Delete path
- `POST /api/paths/:id/locations` - Add location
- `PUT /api/paths/:id/locations/:locationId` - Update location
- `DELETE /api/paths/:id/locations/:locationId` - Delete location

## Technologies Used

- **React 18** - UI framework
- **@react-google-maps/api** - Google Maps integration
- **Axios** - HTTP client for API calls
- **Google Maps JavaScript API** - Map rendering

## Troubleshooting

**Map not loading:**
- Verify Google Maps API key is valid
- Check browser console for errors
- Ensure you have internet connection

**Can't connect to backend:**
- Make sure backend server is running on port 3001
- Check that MongoDB is connected
- Verify CORS is enabled on backend

**Long-press not working:**
- Make sure a path is selected (highlighted in sidebar)
- Hold for at least 0.5 seconds
- Try clicking the path in sidebar first

## Development

To run in development mode with hot reload:
```bash
npm start
```

To build for production:
```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── Sidebar.js          # Path list and management
│   ├── Sidebar.css
│   ├── CreatePathModal.js  # New path creation dialog
│   ├── CreatePathModal.css
│   └── MapComponent.js     # Main map with all interactions
├── services/
│   └── api.js              # API service layer
├── constants/
│   └── index.js            # Constants (coordinates, API key, styles)
├── App.js                  # Main application component
├── App.css
├── index.js                # Application entry point
└── index.css

```

## Support

For issues or questions, please check:
1. Backend is running on port 3001
2. MongoDB is connected
3. Google Maps API key is valid
4. Browser console for error messages

---

**Made with 💚 for turtle conservation**
