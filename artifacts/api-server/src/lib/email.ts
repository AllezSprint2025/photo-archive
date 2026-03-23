import { Resend } from "resend";
import { logger } from "./logger";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY ?? "dummy_key_not_configured";
  return new Resend(key);
}

interface SendDownloadEmailParams {
  to: string;
  albumTitle: string;
  purchaseType: "single" | "album";
  downloadUrl: string;
  expiresAt: Date;
  photoCount?: number;
}

export async function sendDownloadEmail({
  to,
  albumTitle,
  purchaseType,
  downloadUrl,
  expiresAt,
  photoCount,
}: SendDownloadEmailParams): Promise<void> {
  const itemDescription =
    purchaseType === "album"
      ? `the full <strong>${albumTitle}</strong> album (${photoCount ?? ""} photos)`
      : `your photo from <strong>${albumTitle}</strong>`;

  const expiryString = expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const fromName = process.env.PHOTOGRAPHER_NAME ?? "Photo Store";
  const fromEmail = process.env.FROM_EMAIL ?? "onboarding@resend.dev";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Your Download is Ready</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
          <tr>
            <td style="background:#1a1a1a;padding:32px 40px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;">${escapeHtml(fromName)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 24px;font-size:16px;color:#333;line-height:1.6;">
                Thank you for your purchase! Your download for ${itemDescription} is ready.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#1a1a1a;border-radius:8px;">
                    <a href="${downloadUrl}" style="display:block;padding:16px 40px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                      Download Your Photos
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:14px;color:#666;">
                <strong>Note:</strong> This link expires on <strong>${expiryString}</strong>.
              </p>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
              <p style="margin:0;font-size:13px;color:#999;">
                If the button doesn't work, copy this link:<br/>
                <a href="${downloadUrl}" style="color:#555;word-break:break-all;">${downloadUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9f9f9;padding:24px 40px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;font-size:12px;color:#aaa;">© ${new Date().getFullYear()} ${escapeHtml(fromName)}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject: `Your photos from ${albumTitle} are ready to download!`,
      html,
    });
  } catch (err) {
    logger.error({ err, to }, "Failed to send download email");
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
