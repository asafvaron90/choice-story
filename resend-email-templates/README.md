# Email Templates

Resend email templates for Choice Story.

## Templates

- `share-kid-en.temp.js` - English template for sharing kid's stories
- `share-kid-he.temp.js` - Hebrew template for sharing kid's stories

## Upload Templates

To create or update templates on Resend:

```bash
cd resend-email-templates
node upload-templates.js
```

Add `--cleanup` to delete duplicate templates:

```bash
node upload-templates.js --cleanup
```

## Environment

Set your Resend API key in `.env.local`:

```bash
RESEND_API_KEY=re_your_api_key_here
```

## Template Structure

Each template file exports:
- `name` - Template name
- `alias` - Template alias for lookup
- `from` - Sender email
- `subject` - Email subject
- `html` - Email HTML content
- `variables` - Template variables with fallback values

