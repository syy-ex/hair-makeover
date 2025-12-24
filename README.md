[![Demo](demo.png)](demo.png)

# Nano-banana Hair Makeover NextJS Example

This application demonstrates how to integrate with the Nano-banana API (OpenAI Dall-e compatible /v1/images/edits) to generate hair makeovers based on a user-uploaded selfie and a selected hairstyle.

- Upload a selfie.
- Select a hairstyle.
- Click "Generate".

## Getting Started

### Prerequisites

- Node.js
- npm
- Nano-banana API key and base URL
- SMTP credentials for email verification

### Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

### API Key Configuration

This application requires a Nano-banana API key and base URL. You need to set up environment variables:

1. Create a `.env.local` file in the root of the project
2. Add your Nano-banana API key and base URL:

```
NANO_API_KEY=your_nano_banana_api_key_here
NANO_API_URL=https://your-nano-banana-base-url
```

Optional settings:

```
NANO_MODEL=nano-banana
NANO_RESPONSE_FORMAT=url
NANO_ASPECT_RATIO=1:1
NANO_IMAGE_SIZE=4K
```

The API key will be automatically used by the application to authenticate requests to the Nano-banana API.

### Email Verification Configuration

This project sends registration codes via SMTP. Add the following to `.env.local`:

```
SMTP_HOST=your_smtp_host
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM="Hair Makeover <no-reply@example.com>"
AUTH_CODE_SECRET=replace-with-a-random-string
```

### Points & Recharge

- Recharge creates a manual order with fixed amounts: 1/5/10/50 RMB.
- Every 1 RMB adds 10 points after manual approval.
- Generating one image costs 5 points.
- Set the WeChat QR image for recharge (use a stable, publicly accessible URL):

```
NEXT_PUBLIC_WECHAT_QR_URL=https://your-cdn.com/wechat-qr.png
```

Manual review:

- Add admin emails to `.env.local`:

```
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

Then log in with an admin account and open `/admin/recharge` to approve or reject orders.

### Authentication Flow

1. Register with email -> request verification code.
2. Enter code + set password to create the account.
3. Log in with email + password and start generating.

### Local Data Storage

User accounts, sessions, and points are stored in `data/db.json` for local development.

### Running the application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

- Nano-banana API documentation (from your provider)
- [Next.js Documentation](https://nextjs.org/docs)
