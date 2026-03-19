import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = process.cwd();
const assetsDir = path.join(root, 'assets');
const storeDir = path.join(assetsDir, 'store');

fs.mkdirSync(assetsDir, { recursive: true });
fs.mkdirSync(storeDir, { recursive: true });

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function createImage(width, height, color) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    pixels[i * 4] = color[0];
    pixels[i * 4 + 1] = color[1];
    pixels[i * 4 + 2] = color[2];
    pixels[i * 4 + 3] = color[3] ?? 255;
  }
  return { width, height, pixels };
}

function setPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const offset = (y * image.width + x) * 4;
  image.pixels[offset] = color[0];
  image.pixels[offset + 1] = color[1];
  image.pixels[offset + 2] = color[2];
  image.pixels[offset + 3] = color[3] ?? 255;
}

function verticalGradient(image, topColor, bottomColor) {
  for (let y = 0; y < image.height; y += 1) {
    const t = y / Math.max(1, image.height - 1);
    const color = [
      Math.round(topColor[0] + (bottomColor[0] - topColor[0]) * t),
      Math.round(topColor[1] + (bottomColor[1] - topColor[1]) * t),
      Math.round(topColor[2] + (bottomColor[2] - topColor[2]) * t),
      255,
    ];
    for (let x = 0; x < image.width; x += 1) {
      setPixel(image, x, y, color);
    }
  }
}

function fillRect(image, x, y, width, height, color) {
  for (let iy = y; iy < y + height; iy += 1) {
    for (let ix = x; ix < x + width; ix += 1) {
      setPixel(image, ix, iy, color);
    }
  }
}

function fillCircle(image, centerX, centerY, radius, color) {
  const radiusSquared = radius * radius;
  for (let y = Math.floor(centerY - radius); y <= Math.ceil(centerY + radius); y += 1) {
    for (let x = Math.floor(centerX - radius); x <= Math.ceil(centerX + radius); x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      if ((dx * dx) + (dy * dy) <= radiusSquared) {
        setPixel(image, x, y, color);
      }
    }
  }
}

function drawCard(image, x, y, width, height, innerColor, borderColor) {
  fillRect(image, x, y, width, height, borderColor);
  fillRect(image, x + 4, y + 4, width - 8, height - 8, innerColor);
}

function drawTrendGlyph(image, centerX, centerY, scale) {
  const green = [74, 222, 128, 255];
  fillCircle(image, centerX, centerY, Math.round(scale * 5.2), [74, 222, 128, 34]);
  fillRect(image, Math.round(centerX - scale * 2.2), Math.round(centerY - scale * 4.1), Math.round(scale * 4.4), Math.round(scale * 1.2), green);
  fillRect(image, Math.round(centerX - scale * 0.62), Math.round(centerY - scale * 4.1), Math.round(scale * 1.24), Math.round(scale * 6.4), green);
}

function writePng(filePath, image) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((image.width * 4 + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) {
    const rowOffset = y * (image.width * 4 + 1);
    raw[rowOffset] = 0;
    image.pixels.copy(raw, rowOffset + 1, y * image.width * 4, (y + 1) * image.width * 4);
  }

  const idat = zlib.deflateSync(raw, { level: 9 });
  const png = Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);

  fs.writeFileSync(filePath, png);
}

function makeIcon() {
  const image = createImage(1024, 1024, [5, 11, 20, 255]);
  verticalGradient(image, [7, 17, 28, 255], [4, 10, 17, 255]);
  fillCircle(image, 810, 240, 170, [61, 144, 255, 20]);
  fillCircle(image, 240, 820, 190, [74, 222, 128, 18]);
  drawTrendGlyph(image, 512, 512, 44);
  return image;
}

function makeSplash() {
  const image = createImage(1242, 2688, [5, 11, 20, 255]);
  verticalGradient(image, [6, 15, 25, 255], [4, 10, 17, 255]);
  fillCircle(image, 960, 340, 250, [74, 222, 128, 22]);
  fillCircle(image, 230, 760, 210, [61, 144, 255, 16]);
  drawTrendGlyph(image, 621, 980, 52);
  drawCard(image, 190, 1440, 862, 300, [12, 21, 35, 255], [31, 45, 67, 255]);
  drawCard(image, 190, 1795, 862, 420, [12, 21, 35, 255], [31, 45, 67, 255]);
  fillRect(image, 260, 1510, 300, 28, [74, 222, 128, 255]);
  fillRect(image, 260, 1562, 560, 20, [155, 177, 204, 255]);
  fillRect(image, 260, 1865, 690, 18, [155, 177, 204, 255]);
  fillRect(image, 260, 1910, 590, 18, [155, 177, 204, 255]);
  fillRect(image, 260, 2065, 270, 70, [74, 222, 128, 255]);
  return image;
}

function makeScreenshot(kind) {
  const image = createImage(1290, 2796, [5, 11, 20, 255]);
  verticalGradient(image, [6, 15, 25, 255], [5, 11, 20, 255]);
  fillRect(image, 0, 0, image.width, 180, [8, 18, 31, 255]);
  drawCard(image, 90, 230, 1110, 2290, [9, 20, 34, 255], [31, 45, 67, 255]);
  fillRect(image, 150, 290, 240, 28, [74, 222, 128, 255]);
  fillRect(image, 150, 342, 460, 20, [155, 177, 204, 255]);

  if (kind === 'dashboard') {
    drawCard(image, 150, 460, 450, 220, [15, 27, 43, 255], [31, 45, 67, 255]);
    drawCard(image, 630, 460, 500, 220, [15, 27, 43, 255], [31, 45, 67, 255]);
    drawCard(image, 150, 735, 980, 380, [15, 27, 43, 255], [31, 45, 67, 255]);
    fillRect(image, 190, 520, 170, 22, [155, 177, 204, 255]);
    fillRect(image, 190, 570, 220, 54, [229, 237, 248, 255]);
    fillRect(image, 670, 520, 170, 22, [155, 177, 204, 255]);
    fillRect(image, 670, 570, 250, 54, [229, 237, 248, 255]);
    fillRect(image, 190, 805, 230, 22, [74, 222, 128, 255]);
    fillRect(image, 190, 858, 620, 18, [155, 177, 204, 255]);
    fillRect(image, 190, 906, 680, 18, [155, 177, 204, 255]);
    fillRect(image, 190, 985, 290, 72, [74, 222, 128, 255]);
  } else if (kind === 'leads') {
    for (let i = 0; i < 4; i += 1) {
      const y = 460 + i * 300;
      drawCard(image, 150, y, 980, 230, [15, 27, 43, 255], [31, 45, 67, 255]);
      fillRect(image, 190, y + 38, 210, 26, [229, 237, 248, 255]);
      fillRect(image, 190, y + 88, 330, 18, [155, 177, 204, 255]);
      fillRect(image, 190, y + 128, 470, 18, [155, 177, 204, 255]);
      fillRect(image, 760, y + 50, 130, 48, [15, 58, 40, 255]);
      fillRect(image, 920, y + 50, 130, 48, [16, 31, 49, 255]);
    }
  } else {
    drawCard(image, 150, 460, 980, 380, [15, 27, 43, 255], [31, 45, 67, 255]);
    drawCard(image, 150, 900, 980, 560, [15, 27, 43, 255], [31, 45, 67, 255]);
    drawCard(image, 150, 1510, 980, 560, [15, 27, 43, 255], [31, 45, 67, 255]);
    fillRect(image, 190, 530, 230, 22, [229, 237, 248, 255]);
    fillRect(image, 190, 582, 610, 18, [155, 177, 204, 255]);
    fillRect(image, 190, 650, 300, 70, [74, 222, 128, 255]);
    for (let i = 0; i < 3; i += 1) {
      drawCard(image, 190 + i * 300, 980, 260, 120, [16, 32, 49, 255], [31, 45, 67, 255]);
    }
    for (let i = 0; i < 3; i += 1) {
      const y = 1590 + i * 160;
      fillRect(image, 190, y, 260, 22, [229, 237, 248, 255]);
      fillRect(image, 190, y + 44, 460, 18, [155, 177, 204, 255]);
      fillRect(image, 910, y + 16, 150, 52, i === 0 ? [74, 222, 128, 255] : [43, 63, 92, 255]);
    }
  }

  return image;
}

writePng(path.join(assetsDir, 'icon.png'), makeIcon());
writePng(path.join(assetsDir, 'adaptive-icon.png'), makeIcon());
writePng(path.join(assetsDir, 'splash.png'), makeSplash());
writePng(path.join(storeDir, 'ios-dashboard.png'), makeScreenshot('dashboard'));
writePng(path.join(storeDir, 'ios-leads.png'), makeScreenshot('leads'));
writePng(path.join(storeDir, 'ios-direct-mail.png'), makeScreenshot('mail'));

console.log('Generated mobile brand assets in assets/ and assets/store/.');
