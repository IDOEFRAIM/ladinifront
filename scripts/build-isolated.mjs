// Build de VÉRIFICATION dans un dossier séparé (.next-verify) : ne touche pas au `.next` du serveur de dev.
// Usage : npm run build:verify
import { spawnSync } from 'node:child_process';
const r = spawnSync('npx', ['next', 'build', '--webpack'], { stdio: 'inherit', shell: true, env: { ...process.env, NEXT_DIST_DIR: '.next-verify' } });
process.exit(r.status ?? 1);
