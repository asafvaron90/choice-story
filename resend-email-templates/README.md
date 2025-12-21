# Email Templates - Logo Image Issue & Solution

## 🚨 Problem: SVG Not Showing in Emails

**Issue:** Inline SVG tags are not supported by most email clients (Gmail, Outlook, Yahoo, etc.). The SVG logo embedded directly in the HTML will not render.

**Why:** Email clients have very strict security and rendering limitations. They strip out or ignore SVG tags to prevent security issues.

## ✅ Solution: Use PNG Image Instead

The templates have been updated to use a PNG image URL instead of inline SVG. This is the **most reliable method** for displaying logos in emails across all email clients.

### Changes Made:

1. **Templates Updated:**
   - `share-kid-en.temp.js` - Replaced inline SVG with `<img>` tag
   - `share-kid-he.temp.js` - Replaced inline SVG with `<img>` tag

2. **New Template Variable Added:**
   - `LOGO_URL` - URL to the hosted logo PNG image
   - Default fallback: `https://choice-story.com/logo-white.png`

3. **Constants Updated:**
   - Updated `src/constants/email-templates.ts` to include `LOGO_URL` variable

## 📝 How to Use

### Option 1: Use Default Fallback (Recommended)
Simply don't pass the `LOGO_URL` variable, and it will use the default:
```javascript
await resend.emails.send({
  from: 'Choice Story <app@choice-story.com>',
  to: ['user@example.com'],
  subject: 'Stories have been shared with you!',
  template: {
    id: templateId,
    variables: {
      SHARE_URL: 'https://choice-story.com/shared/xyz123'
      // LOGO_URL will use fallback: https://choice-story.com/logo-white.png
    }
  }
});
```

### Option 2: Provide Custom Logo URL
Pass a custom `LOGO_URL` if you want to use a different image:
```javascript
await resend.emails.send({
  from: 'Choice Story <app@choice-story.com>',
  to: ['user@example.com'],
  subject: 'Stories have been shared with you!',
  template: {
    id: templateId,
    variables: {
      SHARE_URL: 'https://choice-story.com/shared/xyz123',
      LOGO_URL: 'https://your-cdn.com/logo-white.png'
    }
  }
});
```

## 🖼️ Creating a White Logo PNG

You need to create a white version of your logo in PNG format to match the gradient background in the email template.

### Recommended Specifications:
- **Format:** PNG with transparent background
- **Color:** White (#FFFFFF) for the logo text
- **Size:** 240x210 pixels (2x for retina displays)
- **File size:** Keep under 50KB for fast loading

### Using Your Current SVG:

1. **Option A: Convert Manually (Recommended)**
   - Open `public/logo.svg` in a design tool (Figma, Illustrator, etc.)
   - Change all colors to white (#FFFFFF)
   - Export as PNG at 240x210 pixels (2x size for retina)
   - Save as `public/logo-white.png`

2. **Option B: Use Online Converter**
   - Use [CloudConvert](https://cloudconvert.com/svg-to-png)
   - Upload your SVG
   - Set width to 240px (maintains aspect ratio)
   - Download PNG
   - Edit in any image editor to make it white
   - Upload to your server/CDN

3. **Option C: Use ImageMagick (Command Line)**
   ```bash
   # Convert SVG to PNG and make it white
   convert public/logo.svg -colorspace RGB -fill white -colorize 100% -resize 240x210 public/logo-white.png
   ```

## 🌐 Hosting the Logo

### Option 1: Host on Your Domain (Recommended)
1. Create the white PNG logo
2. Upload to `public/logo-white.png`
3. It will be accessible at `https://choice-story.com/logo-white.png`
4. Use this URL as the fallback in the templates

### Option 2: Use a CDN
1. Upload the PNG to a CDN (Cloudinary, AWS S3, etc.)
2. Get the public URL
3. Update the fallback value in both template files:
   ```javascript
   fallbackValue: 'https://your-cdn.com/logo-white.png'
   ```

### Option 3: Base64 Embed (Not Recommended)
You can embed the image as base64, but this:
- Increases email size significantly
- May trigger spam filters
- Slower email delivery

Only use if hosting is not possible.

## 🔄 Updating Templates on Resend

After making these changes, you need to re-upload the templates to Resend:

```bash
cd resend-email-templates
node upload-templates.js
```

This will update the templates on Resend with the new HTML that uses the PNG logo.

## 🧪 Testing

1. Upload the templates: `node upload-templates.js`
2. Send a test email
3. Check the email in different clients:
   - Gmail (web and mobile)
   - Outlook (web and desktop)
   - Apple Mail
   - Yahoo Mail
   - Mobile devices (iOS and Android)

## 📚 Resources

- [Resend Documentation - Embed Images](https://resend.com/docs/dashboard/emails/embed-inline-images)
- [Email Client CSS Support](https://www.caniemail.com/)
- [Why SVG doesn't work in emails](https://www.caniemail.com/features/image-svg/)

## 🆘 Troubleshooting

### Logo not showing?
1. Check that the PNG file exists at the URL
2. Verify the URL is publicly accessible (try opening in browser)
3. Make sure the image is not blocked by CORS
4. Check image file size (should be < 50KB)

### Logo looks pixelated?
- Export at 2x size (240x210px) for retina displays
- Use high-quality PNG export settings

### Email goes to spam?
- Make sure you're using a hosted URL, not base64
- Keep the image file size small (< 50KB)
- Verify your email authentication (SPF, DKIM, DMARC)

