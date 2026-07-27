import QRCode from 'qrcode';

/**
 * Generates a QR code as a base64 PNG data URL for the given text/URL.
 * Used to print/display scannable registration links (e.g. on campus
 * recruitment posters) that deep-link candidates straight into the
 * registration flow on their phone.
 */
export async function generateQrCodeDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}
