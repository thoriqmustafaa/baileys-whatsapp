# API Documentation - Session Credentials Endpoints

## Overview

Endpoint untuk mendapatkan informasi credentials (nomor telepon, nama, dll) dari session WhatsApp yang terhubung.

## Authentication

Semua endpoint memerlukan API Key di header:

```
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### 1. Get Connected Sessions with Credentials

Mendapatkan semua session yang connected beserta informasi user (nomor, nama).

**Endpoint:** `GET /sessions/connected/credentials`

**Response:**

```json
{
  "success": true,
  "message": "Connected sessions with credentials retrieved successfully",
  "data": [
    {
      "id": 1,
      "sessionId": "whatsapp_connectiona",
      "status": "connected",
      "createdAt": "2025-07-25T07:09:57.575Z",
      "updatedAt": "2025-07-25T08:28:55.700Z",
      "userInfo": {
        "phoneNumber": "6283876013551",
        "name": "Popeye",
        "jid": "6283876013551:12@s.whatsapp.net",
        "platform": "android",
        "registered": false
      },
      "isActive": true,
      "isAuthenticated": true,
      "startTime": 1753432134215,
      "connectionStatus": "AUTHENTICATED"
    }
  ],
  "count": 1
}
```

### 2. Get Specific Session Credentials

Mendapatkan informasi credentials dari session tertentu.

**Endpoint:** `GET /sessions/:sessionId/credentials`

**Parameters:**

- `sessionId` (string): ID session yang ingin diambil informasinya

**Response:**

```json
{
  "success": true,
  "message": "Session credentials retrieved successfully",
  "data": {
    "id": 1,
    "sessionId": "whatsapp_connectiona",
    "status": "connected",
    "createdAt": "2025-07-25T07:09:57.575Z",
    "updatedAt": "2025-07-25T08:28:55.700Z",
    "userInfo": {
      "phoneNumber": "6283876013551",
      "name": "Popeye",
      "jid": "6283876013551:12@s.whatsapp.net",
      "platform": "android",
      "registered": false
    },
    "isActive": true,
    "isAuthenticated": true,
    "startTime": 1753432134215,
    "connectionStatus": "AUTHENTICATED"
  }
}
```

### 3. Get All Sessions with Credentials

Mendapatkan semua session (connected dan disconnected) beserta informasi user.

**Endpoint:** `GET /sessions/all/credentials`

**Response:** _(sama seperti endpoint 1, tapi termasuk session yang tidak aktif)_

## Response Fields

### Session Info

- `id`: Database ID session
- `sessionId`: Session identifier
- `status`: Status di database (connected, authenticated, disconnected, dll)
- `createdAt`: Waktu session dibuat
- `updatedAt`: Waktu terakhir session diupdate
- `isActive`: Apakah session aktif di memory
- `isAuthenticated`: Apakah session sudah terotentikasi
- `startTime`: Timestamp kapan session dimulai (null jika tidak aktif)
- `connectionStatus`: Status koneksi real-time

### User Info (userInfo object)

- `phoneNumber`: Nomor WhatsApp (tanpa kode negara prefix)
- `name`: Nama yang terdaftar di WhatsApp
- `jid`: WhatsApp JID lengkap (format: phoneNumber:randomId@s.whatsapp.net)
- `platform`: Platform yang digunakan (android, ios, web, dll)
- `registered`: Status registrasi WhatsApp

## Example Usage

### Using cURL

```bash
# Get all connected sessions with credentials
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/sessions/connected/credentials

# Get specific session credentials
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/sessions/session_id/credentials

# Get all sessions with credentials
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:3000/sessions/all/credentials
```

### Using JavaScript/Fetch

```javascript
const apiKey = "YOUR_API_KEY";
const baseUrl = "http://localhost:3000";

// Get connected sessions with credentials
async function getConnectedSessionsWithCredentials() {
  const response = await fetch(`${baseUrl}/sessions/connected/credentials`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  console.log("Connected sessions with credentials:", data);
  return data;
}

// Get specific session credentials
async function getSessionCredentials(sessionId) {
  const response = await fetch(`${baseUrl}/sessions/${sessionId}/credentials`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  console.log("Session credentials:", data);
  return data;
}

// Extract phone numbers from connected sessions
async function getConnectedPhoneNumbers() {
  const sessions = await getConnectedSessionsWithCredentials();

  const phoneNumbers = sessions.data
    .filter((session) => session.userInfo?.phoneNumber)
    .map((session) => ({
      sessionId: session.sessionId,
      phoneNumber: session.userInfo.phoneNumber,
      name: session.userInfo.name,
      isActive: session.isActive,
    }));

  return phoneNumbers;
}
```

### Using Python

```python
import requests

API_KEY = 'YOUR_API_KEY'
BASE_URL = 'http://localhost:3000'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

# Get connected sessions with credentials
def get_connected_sessions_with_credentials():
    response = requests.get(f'{BASE_URL}/sessions/connected/credentials', headers=headers)
    return response.json()

# Get specific session credentials
def get_session_credentials(session_id):
    response = requests.get(f'{BASE_URL}/sessions/{session_id}/credentials', headers=headers)
    return response.json()

# Extract phone numbers
def get_connected_phone_numbers():
    sessions = get_connected_sessions_with_credentials()

    phone_numbers = []
    for session in sessions['data']:
        if session.get('userInfo') and session['userInfo'].get('phoneNumber'):
            phone_numbers.append({
                'sessionId': session['sessionId'],
                'phoneNumber': session['userInfo']['phoneNumber'],
                'name': session['userInfo']['name'],
                'isActive': session['isActive']
            })

    return phone_numbers

# Usage
if __name__ == "__main__":
    connected_sessions = get_connected_sessions_with_credentials()
    print("Connected sessions:", connected_sessions)

    phone_numbers = get_connected_phone_numbers()
    print("Connected phone numbers:", phone_numbers)
```

## Error Responses

### Session Not Found

```json
{
  "success": false,
  "message": "Session not found"
}
```

### Invalid API Key

```json
{
  "success": false,
  "message": "Invalid API key"
}
```

### Server Error

```json
{
  "success": false,
  "message": "Failed to fetch session credentials",
  "error": "Error details here"
}
```

## Use Cases

### 1. **Dashboard Monitoring**

Menampilkan daftar nomor WhatsApp yang aktif:

```javascript
// Display active phone numbers in dashboard
const phoneNumbers = await getConnectedPhoneNumbers();
phoneNumbers.forEach((session) => {
  console.log(
    `${session.name} (${session.phoneNumber}) - ${
      session.isActive ? "Active" : "Inactive"
    }`
  );
});
```

### 2. **Session Management**

Mengidentifikasi session berdasarkan nomor telepon:

```javascript
// Find session by phone number
function findSessionByPhone(phoneNumber) {
  return sessions.data.find(
    (session) => session.userInfo?.phoneNumber === phoneNumber
  );
}
```

### 3. **Multi-Account Integration**

Mengelola multiple akun WhatsApp:

```javascript
// Get all account details
const accounts = sessions.data.map((session) => ({
  account: session.userInfo?.name || "Unknown",
  phone: session.userInfo?.phoneNumber || "N/A",
  status: session.connectionStatus,
  sessionId: session.sessionId,
}));
```

### 4. **Health Check**

Memantau kesehatan semua akun:

```javascript
// Check account health
const healthCheck = {
  total: sessions.count,
  active: sessions.data.filter((s) => s.isActive).length,
  authenticated: sessions.data.filter((s) => s.isAuthenticated).length,
  accounts: sessions.data.map((s) => ({
    phone: s.userInfo?.phoneNumber,
    status: s.connectionStatus,
  })),
};
```

## Security Notes

1. **API Key Protection**: Jangan expose API key di client-side code
2. **Rate Limiting**: Gunakan dengan bijak untuk menghindari rate limiting
3. **Data Privacy**: Informasi credentials bersifat sensitif, handle dengan hati-hati
4. **Access Control**: Pastikan hanya user yang berwenang yang bisa mengakses data credentials

## Complete Endpoint List

| Method | Endpoint                          | Description                     |
| ------ | --------------------------------- | ------------------------------- |
| GET    | `/sessions`                       | Daftar session aktif (basic)    |
| GET    | `/sessions/connected`             | Session yang connected (basic)  |
| GET    | `/sessions/connected/credentials` | Session connected + credentials |
| GET    | `/sessions/all`                   | Semua session (basic)           |
| GET    | `/sessions/all/credentials`       | Semua session + credentials     |
| GET    | `/sessions/:id`                   | Session spesifik (basic)        |
| GET    | `/sessions/:id/credentials`       | Session spesifik + credentials  |
| GET    | `/sessions/:id/status`            | Status session                  |
| GET    | `/sessions/:id/qr`                | QR code session                 |
