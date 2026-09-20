/**
 * server/services/design-to-code/zip-exporter.js
 * Native Node.js ZIP archive generator without external dependencies.
 * Constructs compliant PKZIP archives using built-in zlib.deflateRawSync.
 */

const zlib = require('zlib');

function crc32(buffer) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

const CRC_TABLE = (function () {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }
  return table;
})();

function createZipArchive(files = []) {
  const fileEntries = [];
  let localHeadersOffset = 0;
  const chunks = [];

  for (const file of files) {
    const rawPath = file.filePath || file.path || 'file.txt';
    // Sanitize directory traversal attacks
    const filePath = rawPath.replace(/(\.\.[\/\\])+/g, '').replace(/^\/+/, '');
    const rawContent = file.fileContent ?? file.content ?? '';
    const pathBuffer = Buffer.from(filePath, 'utf8');
    const contentBuffer = Buffer.from(rawContent, 'utf8');

    const compressed = zlib.deflateRawSync(contentBuffer);
    const checksum = crc32(contentBuffer);

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature
    localHeader.writeUInt16LE(20, 4);         // Version needed: 2.0
    localHeader.writeUInt16LE(0, 6);          // General purpose bit flag
    localHeader.writeUInt16LE(8, 8);          // Compression method: Deflate (8)
    localHeader.writeUInt16LE(0, 10);         // Last mod file time
    localHeader.writeUInt16LE(0, 12);         // Last mod file date
    localHeader.writeUInt32LE(checksum, 14);  // CRC-32
    localHeader.writeUInt32LE(compressed.length, 18); // Compressed size
    localHeader.writeUInt32LE(contentBuffer.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(pathBuffer.length, 26); // Filename length
    localHeader.writeUInt16LE(0, 28);         // Extra field length

    const entryOffset = localHeadersOffset;
    chunks.push(localHeader, pathBuffer, compressed);
    localHeadersOffset += localHeader.length + pathBuffer.length + compressed.length;

    fileEntries.push({
      pathBuffer,
      checksum,
      compressedSize: compressed.length,
      uncompressedSize: contentBuffer.length,
      offset: entryOffset
    });
  }

  const centralDirStart = localHeadersOffset;
  let centralDirSize = 0;

  // Central directory records
  for (const entry of fileEntries) {
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central file header signature
    centralHeader.writeUInt16LE(20, 4);         // Version made by
    centralHeader.writeUInt16LE(20, 6);         // Version needed
    centralHeader.writeUInt16LE(0, 8);          // Bit flag
    centralHeader.writeUInt16LE(8, 10);         // Compression method: Deflate
    centralHeader.writeUInt16LE(0, 12);         // Last mod time
    centralHeader.writeUInt16LE(0, 14);         // Last mod date
    centralHeader.writeUInt32LE(entry.checksum, 16); // CRC-32
    centralHeader.writeUInt32LE(entry.compressedSize, 20); // Compressed size
    centralHeader.writeUInt32LE(entry.uncompressedSize, 24); // Uncompressed size
    centralHeader.writeUInt16LE(entry.pathBuffer.length, 28); // Filename length
    centralHeader.writeUInt16LE(0, 30);         // Extra field length
    centralHeader.writeUInt16LE(0, 32);         // File comment length
    centralHeader.writeUInt16LE(0, 34);         // Disk number start
    centralHeader.writeUInt16LE(0, 36);         // Internal file attributes
    centralHeader.writeUInt32LE(0, 38);         // External file attributes
    centralHeader.writeUInt32LE(entry.offset, 42); // Relative offset of local header

    chunks.push(centralHeader, entry.pathBuffer);
    centralDirSize += centralHeader.length + entry.pathBuffer.length;
  }

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);           // End of central dir signature
  eocd.writeUInt16LE(0, 4);                    // Number of this disk
  eocd.writeUInt16LE(0, 6);                    // Disk where central dir starts
  eocd.writeUInt16LE(fileEntries.length, 8);   // Number of central dir records on this disk
  eocd.writeUInt16LE(fileEntries.length, 10);  // Total number of central dir records
  eocd.writeUInt32LE(centralDirSize, 12);      // Size of central directory
  eocd.writeUInt32LE(centralDirStart, 16);     // Offset of start of central directory
  eocd.writeUInt16LE(0, 20);                   // ZIP comment length

  chunks.push(eocd);
  return Buffer.concat(chunks);
}

module.exports = {
  createZipArchive
};
