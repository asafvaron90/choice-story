/**
 * English Story Ready Email Template
 * Template ID: STORY_READY_EN
 * 
 * Variables:
 * - STORY_URL: URL to access the generated story
 * - STORY_TITLE: The title of the generated story
 */

module.exports = {
  name: 'STORY_READY_EN',
  alias: 'STORY_READY_EN',
  from: 'Choice Story <app@choice-story.com>',
  subject: 'Your story is ready!',
  html: `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Story is Ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; direction: ltr;">
  <!-- Logo -->
  <div>
    <img src="https://firebasestorage.googleapis.com/v0/b/choicestory-b3135.appspot.com/o/public%2Flogo.png?alt=media&token=3a8aac4b-fbfc-486c-ba9d-371bf289877a" alt="Choice Story" style="display: block; margin: 36px auto 0 auto;" />
  </div>
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
          <!-- Main Card -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px; padding: 32px; text-align: center;">
              
              <!-- Main Heading -->
              <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0 0 24px 0; line-height: 1.3;">
                Your Story is Ready! 🎉
              </h1>
              
              <!-- Story Title Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="background-color: rgba(255, 255, 255, 0.95); border-radius: 12px; padding: 20px; text-align: center;">
                    <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0;">
                      {{{STORY_TITLE}}}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="{{{STORY_URL}}}" style="display: inline-block; background-color: #ffffff; color: #6366f1; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 50px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);">
                      Read the Story
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 16px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Sent by Choice Story
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  variables: [
    {
      key: 'STORY_URL',
      type: 'string',
      fallbackValue: 'https://choice-story.com/stories'
    },
    {
      key: 'STORY_TITLE',
      type: 'string',
      fallbackValue: 'Your Amazing Story'
    }
  ]
};

