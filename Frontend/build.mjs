import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const tmpFile = path.join(rootDir, 'input.css');
const outFile = path.join(rootDir, 'css', 'index.css');

// 生成index.css
try {
    fs.writeFileSync(tmpFile, '@import "tailwindcss";');
    execSync(`npx @tailwindcss/cli -i "${tmpFile}" -o "${outFile}" --minify`, { stdio: 'inherit' });
} catch (err) {
    console.error(err.stack);
    process.exit(1);
} finally {
    if (fs.existsSync(tmpFile)) fs.rmSync(tmpFile, { force: true });
}

// 复制jsencrypt.min.js
try {
    const src = path.join(rootDir, 'node_modules', 'jsencrypt', 'bin', 'jsencrypt.min.js');
    const dest = path.join(rootDir, 'js', 'jsencrypt.min.js');
    fs.copyFileSync(src, dest);
    console.log('\n./node_modules/jsencrypt/bin/jsencrypt.min.js => ./js/jsencrypt.min.js');
} catch (err) {
    console.error(err.stack);
    process.exit(1);
}