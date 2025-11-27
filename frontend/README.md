# FunnelSaver Frontend

Minimal React web interface for FunnelSaver scraping tool.

## Features

- Clean, minimalist design
- User authentication (login/register)
- Submit URLs for scraping
- View project list with status
- Detailed project view with screenshots
- Download reports (HTML, JSON, Markdown)
- Real-time status updates (polling every 5 seconds)

## Tech Stack

- React 18
- React Router 6
- Axios for API calls
- CSS (no UI framework for minimalism)

## Setup

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (optional):
```
REACT_APP_API_URL=http://localhost:5000
```

3. Start development server:
```bash
npm start
```

Application will open at http://localhost:3000

### Docker

From root directory:
```bash
docker-compose up frontend
```

## Project Structure

```
frontend/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── components/
│   │   ├── Login.js        # Login/register page
│   │   ├── Login.css
│   │   ├── Dashboard.js    # Main dashboard
│   │   ├── Dashboard.css
│   │   ├── ProjectDetail.js # Project details
│   │   └── ProjectDetail.css
│   ├── App.js              # Main app with routing
│   ├── App.css
│   ├── api.js              # API client
│   ├── index.js            # Entry point
│   └── index.css           # Global styles
├── package.json
├── Dockerfile
└── README.md
```

## Pages

### Login / Register
- Toggle between login and register modes
- JWT token stored in localStorage
- Automatic redirect after successful auth

### Dashboard
- Submit new funnel URL
- View all user's projects
- Status badges (queued, processing, completed, failed)
- Click project card to view details
- Auto-refresh every 5 seconds

### Project Detail
- Project information
- Download files (HTML, JSON, Markdown)
- View all screenshots with metadata
- Action descriptions for each step
- Expandable markdown content
- Auto-refresh while processing

## API Integration

All API calls in [src/api.js](src/api.js):

```javascript
import { login, register, getProjects, createProject, getProject } from './api';

// Login
const response = await login(username, password);
const token = response.data.access_token;

// Get projects
const projects = await getProjects();

// Submit URL
await createProject(url);

// Get project details
const project = await getProject(id);
```

JWT token automatically added to all requests via Axios interceptor.

## Styling

Minimal CSS with:
- Flexbox and Grid layouts
- Gradient backgrounds
- Card-based design
- Responsive (mobile-friendly)
- No external UI frameworks

Color scheme:
- Primary: `#667eea` (purple-blue)
- Success: `#27ae60` (green)
- Warning: `#f39c12` (orange)
- Error: `#e74c3c` (red)
- Info: `#3498db` (blue)

## Environment Variables

Create `.env` file:

```
REACT_APP_API_URL=http://localhost:5000
```

Default: `http://localhost:5000` if not specified.

## Build for Production

```bash
npm run build
```

Creates optimized production build in `build/` directory.

Serve with:
```bash
npx serve -s build
```

## Development Tips

1. **Hot Reload**: Changes auto-reload during development
2. **API URL**: Update `REACT_APP_API_URL` for different backend
3. **Token**: Clear localStorage to reset login state
4. **Polling**: Adjust interval in components (currently 5s)

## Component Details

### Login Component
- Handles both login and register
- Form validation
- Error messages
- Switch between modes

### Dashboard Component
- URL submission form
- Project grid with cards
- Status color coding
- Click to navigate to details
- Polling for updates

### ProjectDetail Component
- Project metadata
- File downloads
- Screenshot gallery
- Step-by-step view
- Markdown content viewer
- Polling while processing

## Browser Support

Modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Contributing

This is an internal tool. For modifications:

1. Follow existing code structure
2. Keep design minimal
3. Use functional components with hooks
4. Add CSS modules for new components
5. Test on mobile devices

## Troubleshooting

**CORS Errors**
- Backend must have CORS enabled
- Check `REACT_APP_API_URL` in `.env`

**401 Unauthorized**
- Token expired or invalid
- Logout and login again

**Images Not Loading**
- Check backend is serving files correctly
- Verify `/api/screenshots/:id/image` endpoint

**Slow Loading**
- Check backend and scraper performance
- Adjust polling intervals if needed
