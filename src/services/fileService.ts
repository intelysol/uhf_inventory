import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/**
 * Android File Handling & Native Sharing Service
 * Supports Capacitor Android native file storage & native sharing
 * with graceful browser/desktop download fallback.
 */

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export interface SaveAndShareResult {
  success: boolean;
  filename: string;
  uri?: string;
  error?: string;
}

/**
 * Save and share a file on Android or download in browser
 */
export async function saveAndShareFile(
  filename: string,
  content: string | Uint8Array,
  mimeType: string,
  shareTitle: string = 'Share File'
): Promise<SaveAndShareResult> {
  const isNative = Capacitor.isNativePlatform();

  try {
    if (isNative) {
      // 1. Android / iOS Native via Capacitor Filesystem
      let base64Data: string;

      if (typeof content === 'string') {
        // Text files (CSV, JSON)
        await Filesystem.writeFile({
          path: filename,
          data: content,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
          recursive: true,
        });
      } else {
        // Binary files (XLSX)
        base64Data = uint8ArrayToBase64(content);
        await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
      }

      // Get native file URI
      const uriResult = await Filesystem.getUri({
        path: filename,
        directory: Directory.Cache,
      });

      // 2. Open Android Native Share Sheet
      try {
        await Share.share({
          title: shareTitle,
          text: `Exported UHF Inventory file: ${filename}`,
          url: uriResult.uri,
          dialogTitle: shareTitle,
        });
      } catch (shareErr: any) {
        // User may cancel the share dialog, which is normal
        console.log('Share sheet dismissed or canceled:', shareErr);
      }

      return {
        success: true,
        filename,
        uri: uriResult.uri,
      };
    } else {
      // 3. Web / Desktop Browser Fallback
      let blob: Blob;
      if (typeof content === 'string') {
        blob = new Blob([content], { type: mimeType });
      } else {
        // Convert Uint8Array to ArrayBuffer to satisfy BlobPart typing
        const buffer = content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength);
        blob = new Blob([buffer], { type: mimeType });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      // Web Share API fallback if supported
      if (navigator.share && navigator.canShare) {
        try {
          const fileObj = new File([blob], filename, { type: mimeType });
          if (navigator.canShare({ files: [fileObj] })) {
            await navigator.share({
              title: shareTitle,
              files: [fileObj],
            });
          }
        } catch {
          // ignore share cancel on browser
        }
      }

      return {
        success: true,
        filename,
      };
    }
  } catch (error: any) {
    console.error('saveAndShareFile error:', error);
    return {
      success: false,
      filename,
      error: error?.message || 'File export failed',
    };
  }
}
