# API Documentation - Connected Sessions Endpoints

## Overview

Endpoints baru untuk mendapatkan informasi session WhatsApp yang terhubung.

## Authentication

Semua endpoint memerlukan API Key di header:

```
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### 1. Get Connected Sessions

Mendapatkan daftar session yang sedang terhubung (status: connected atau authenticated).

**Endpoint:** `GET /sessions/connected`

**Response:**

```json
{
  "success": true,
  "message": "Connected sessions retrieved successfully",
  "data": [
    {
      "id": 1,
      "sessionId": "whatsapp_connection",
      "status": "connected",
      "createdAt": "2025-07-25T08:00:00.000Z",
      "updatedAt": "2025-07-25T08:30:00.000Z",
      "isActive": true,
      "isAuthenticated": true,
      "startTime": 1721890800000,
      "connectionStatus": "CONNECTED"
    }
  ],
  "count": 1
}
```

**Response Fields:**

- `id`: Database ID
- `sessionId`: Session identifier
- `status`: Database status (connected, authenticated, etc.)
- `createdAt`: Session creation time
- `updatedAt`: Last update time
- `isActive`: Whether session is active in memory
- `isAuthenticated`: Whether session is authenticated
- `startTime`: Session start timestamp (if active)
- `connectionStatus`: Real-time connection status

### 2. Get All Sessions

Mendapatkan semua session dari database (connected, disconnected, dll).

**Endpoint:** `GET /sessions/all`

**Response:**

```json
{
  "success": true,
  "message": "All sessions retrieved successfully",
  "data": [
    {
      "id": 1,
      "sessionId": "whatsapp_connection",
      "status": "connected",
      "createdAt": "2025-07-25T08:00:00.000Z",
      "updatedAt": "2025-07-25T08:30:00.000Z",
      "isActive": true,
      "isAuthenticated": true,
      "startTime": 1721890800000,
      "connectionStatus": "CONNECTED"
    },
    {
      "id": 2,
      "sessionId": "old_session",
      "status": "disconnected",
      "createdAt": "2025-07-24T10:00:00.000Z",
      "updatedAt": "2025-07-24T12:00:00.000Z",
      "isActive": false,
      "isAuthenticated": false,
      "startTime": null,
      "connectionStatus": "DISCONNECTED"
    }
  ],
  "count": 2
}
```

### 3. Enhanced Active Sessions (Existing)

Endpoint yang sudah ada sekarang juga memberikan informasi yang lebih lengkap.

**Endpoint:** `GET /sessions`

## Example Usage

### Using cURL

```bash
# Get connected sessions
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/sessions/connected

# Get all sessions
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/sessions/all
```

### Using JavaScript/Fetch

```javascript
const apiKey = "YOUR_API_KEY";
const baseUrl = "http://localhost:3000";

// Get connected sessions
async function getConnectedSessions() {
  const response = await fetch(`${baseUrl}/sessions/connected`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  console.log("Connected sessions:", data);
  return data;
}

// Get all sessions
async function getAllSessions() {
  const response = await fetch(`${baseUrl}/sessions/all`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  console.log("All sessions:", data);
  return data;
}
```

## Status Mapping

### Database Status

- `connecting`: Session sedang dalam proses koneksi
- `connected`: Session terhubung dan siap digunakan
- `authenticated`: Session sudah terotentikasi
- `disconnected`: Session terputus
- `logged_out`: Session logout

### Connection Status

- `CONNECTING`: Sedang mencoba terhubung
- `CONNECTED`: Terhubung dan siap
- `AUTHENTICATED`: Terotentikasi
- `DISCONNECTED`: Terputus
- `CLOSING`: Sedang menutup koneksi

## Use Cases

1. **Monitoring Dashboard**: Menampilkan status real-time semua session
2. **Health Check**: Memantau session yang active vs yang stored di database
3. **Session Management**: Mengidentifikasi session yang perlu direstart
4. **Load Balancing**: Mendistribusikan request ke session yang available
5. **Analytics**: Melacak uptime dan usage patterns

## Benefits

- **Real-time Status**: Kombinasi data database dan memory untuk status akurat
- **Comprehensive Info**: Informasi lengkap tentang setiap session
- **Easy Integration**: Format JSON yang mudah diintegrasikan
- **Monitoring Ready**: Siap untuk monitoring tools dan dashboards
