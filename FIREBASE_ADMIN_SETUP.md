# Firebase Admin SDK Setup

## Required Environment Variables

Add these to your `.env` file for Firebase Admin SDK to work:

```env
# Firebase Admin SDK (Server-side)
FIREBASE_PROJECT_ID=tgfjf-5bbfe
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tgfjf-5bbfe.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40tgfjf-5bbfe.iam.gserviceaccount.com

# Firebase Database URL (fallback in API route)
FIREBASE_DATABASE_URL=https://tgfjf-5bbfe-default-rtdb.firebaseio.com
```

## How to Get These Values

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `tgfjf-5bbfe`
3. Go to **Project Settings** > **Service accounts**
4. Click **Generate new private key**
5. Download the JSON file
6. Extract values from the JSON:

```json
{
  "type": "service_account",
  "project_id": "tgfjf-5bbfe",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@tgfjf-5bbfe.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40tgfjf-5bbfe.iam.gserviceaccount.com"
}
```

## Important Notes

- Keep the private key format with `\n` for line breaks
- The API route has fallback values for the existing project
- Server-side environment variables are NOT exposed to client
- The `/api/sync-user` route will work once these are set

## Testing

1. Set environment variables
2. Open app in Telegram Mini WebApp
3. Visit `/user-sync-test` for testing interface
4. Check Firebase Console at `telegram_users/{user_id}`