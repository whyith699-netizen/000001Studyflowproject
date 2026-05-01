# StudyFlow Backend (Firebase Cloud Functions)

Backend V1 for StudyFlow profile API:
- `GET /health`
- `GET /v1/profile`
- `PUT /v1/profile`

Stack:
- Firebase Cloud Functions Gen2
- TypeScript + Express
- Firebase Admin SDK (Firestore + Auth token verify)
- Zod request validation

Region:
- `asia-southeast1`

Project:
- `studydashboard-bd8f0`

## Folder Structure

- `Backend/firebase.json`
- `Backend/.firebaserc`
- `Backend/functions/src/index.ts`
- `Backend/functions/src/app.ts`
- `Backend/functions/src/firebaseDeps.ts`
- `Backend/functions/test/app.test.ts`

## Local Commands

From `Backend/functions`:

```bash
npm install
npm run lint
npm run test
npm run build
```

## Deploy

1. Install Firebase CLI and login:
```bash
firebase login
```

2. Deploy function:
```bash
cd Backend/functions
npm run deploy
```

Deployed base URL:

`https://asia-southeast1-studydashboard-bd8f0.cloudfunctions.net/api/`

## API Contract

### GET `/health`
Response `200`:
```json
{
  "status": "ok",
  "service": "studyflow-functions",
  "version": "v1"
}
```

### GET `/v1/profile`
Headers:
- `Authorization: Bearer <firebase_id_token>`

Response `200`:
```json
{
  "uid": "string",
  "email": "string",
  "displayName": "string",
  "createdAt": "ISO-8601|null",
  "updatedAt": "ISO-8601|null"
}
```

### PUT `/v1/profile`
Headers:
- `Authorization: Bearer <firebase_id_token>`

Body:
```json
{
  "displayName": "string"
}
```

Response `200`:
```json
{
  "message": "Profile updated",
  "profile": {
    "uid": "string",
    "email": "string",
    "displayName": "string",
    "updatedAt": "ISO-8601|null"
  }
}
```

Error format:
```json
{
  "error": {
    "code": "UNAUTHENTICATED|INVALID_ARGUMENT|INTERNAL",
    "message": "human-readable"
  }
}
```
