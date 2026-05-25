# Ripto Vibes Frontend

A minimal dark/light browser frontend for your private AI coding platform.

## Features

- Private login using backend `APP_PASSWORD`
- Backend URL setup from login screen
- Project dashboard
- HTML / Discord / blank project creation
- File explorer
- Monaco code editor
- Save, delete, download single file
- Upload files to project
- AI chat for full project edits
- AI specific-file editing
- AI image/file attachments
- AI action history timeline
- Run / stop project
- Live logs using Socket.IO
- Website preview iframe
- Screenshot capture and AI screenshot editing
- GitHub clone and push
- Full project ZIP download
- Minimal responsive UI
- Dark and light mode

## Install

```bash
npm install
npm run dev
```

## Environment

Create `.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://fr.glitchnode.cloud:25574
```

## Login

Use your backend URL and `APP_PASSWORD`.

Example:

```txt
Backend URL: http://fr.glitchnode.cloud:25574
Password: kadduji11
```

The frontend stores these values in browser localStorage and sends:

```txt
x-app-password: your-password
```

with every protected backend request.

## Production on Vercel

1. Upload this folder to GitHub.
2. Import it in Vercel.
3. Add env var:

```env
NEXT_PUBLIC_API_BASE=http://fr.glitchnode.cloud:25574
```

4. Deploy.

## Notes

Your backend must allow CORS. The backend ZIP generated earlier already uses `CORS_ORIGIN=*` by default.
