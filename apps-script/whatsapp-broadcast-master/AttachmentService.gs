/**
 * Optional attachments. Only used when the selected template has a media header
 * (IMAGE / DOCUMENT / VIDEO) — matching Meta Cloud API via Sheetomatic.
 */

var AttachmentService = (function () {
  var SUPPORTED_HEADER = { IMAGE: true, DOCUMENT: true, VIDEO: true };

  function inspect(input) {
    var raw = String(input || '').trim();
    if (!raw) {
      return { ok: true, optional: true, present: false, media: null, label: 'None' };
    }

    var fileId = extractDriveId_(raw);
    var link = raw;
    var filename = guessFilename_(raw);
    var type = guessType_(filename, raw);

    if (fileId) {
      try {
        var file = DriveApp.getFileById(fileId);
        filename = file.getName();
        type = guessType_(filename, file.getMimeType());
        try {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (shareError) {
          // Sharing may already be set or restricted by Workspace policy.
        }
        link = 'https://drive.google.com/uc?export=download&id=' + fileId;
      } catch (error) {
        return {
          ok: false,
          present: true,
          error: 'Could not read that Google Drive file. Check the file ID and sharing permissions.'
        };
      }
    } else if (!/^https:\/\//i.test(raw)) {
      return {
        ok: false,
        present: true,
        error: 'Attachment must be a public https URL or a Google Drive file ID.'
      };
    }

    if (!SUPPORTED_HEADER[type.toUpperCase()] && type !== 'image' && type !== 'document' && type !== 'video') {
      return {
        ok: false,
        present: true,
        error: 'This file type is not a supported WhatsApp template header (image, PDF/document, or video).'
      };
    }

    return {
      ok: true,
      optional: true,
      present: true,
      label: filename || link,
      media: {
        type: type,
        link: link,
        filename: filename || 'attachment'
      }
    };
  }

  function compatibleWithTemplate(media, template) {
    if (!media) return { ok: true };
    var format = String((template && template.headerFormat) || 'TEXT').toUpperCase();
    if (!SUPPORTED_HEADER[format]) {
      return {
        ok: false,
        error:
          'The selected template does not have a media header, so WhatsApp will not accept an attachment. Choose a template with an image/document/video header, or send without an attachment.'
      };
    }
    var wanted = format.toLowerCase();
    if (media.type !== wanted) {
      return {
        ok: false,
        error:
          'This template expects a ' +
          format.toLowerCase() +
          ' header. The selected file looks like a ' +
          media.type +
          '.'
      };
    }
    return { ok: true };
  }

  function extractDriveId_(value) {
    var text = String(value || '').trim();
    var fromUrl = text.match(/[-\w]{25,}/);
    if (/^[-\w]{25,}$/.test(text)) return text;
    var idMatch = text.match(/[?&]id=([-\w]{25,})/) || text.match(/\/d\/([-\w]{25,})/);
    if (idMatch) return idMatch[1];
    if (/drive\.google\.com/i.test(text) && fromUrl) return fromUrl[0];
    return '';
  }

  function guessFilename_(value) {
    try {
      var path = String(value).split('?')[0];
      var part = path.split('/').pop();
      if (part && /\./.test(part)) return decodeURIComponent(part);
    } catch (error) {}
    return 'attachment';
  }

  function guessType_(filename, mimeOrUrl) {
    var haystack = (String(filename || '') + ' ' + String(mimeOrUrl || '')).toLowerCase();
    if (/image|png|jpe?g|webp|gif/.test(haystack)) return 'image';
    if (/video|mp4|3gp/.test(haystack)) return 'video';
    return 'document';
  }

  return {
    inspect: inspect,
    compatibleWithTemplate: compatibleWithTemplate
  };
})();
