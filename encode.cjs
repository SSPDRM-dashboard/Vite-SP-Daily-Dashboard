const fs = require('fs');
const path = require('path');

try {
  const imagePath = path.join(__dirname, 'src/assets/logo.png');
  const imageBuf = fs.readFileSync(imagePath);
  const base64Str = imageBuf.toString('base64');
  const tsContent = `export const logoBase64 = "data:image/png;base64,${base64Str}";\n`;
  fs.writeFileSync(path.join(__dirname, 'src/assets/logoBase64.ts'), tsContent);
  console.log('Successfully created base64 logo');
} catch (e) {
  console.error('Error:', e.message);
}
