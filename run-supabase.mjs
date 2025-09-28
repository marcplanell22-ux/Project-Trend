import { execSync } from 'child_process';

// Ruta directa al ejecutable de la CLI de Supabase dentro de node_modules
const supabaseCLI = './node_modules/supabase/bin/cli.js';

// Coge los comandos que le pasamos (ej: "init")
const args = process.argv.slice(2).join(' ');

// Construye y ejecuta el comando completo con Node.js
const command = `node ${supabaseCLI} ${args}`;

try {
  console.log(`Ejecutando directamente: ${command}`);
  execSync(command, { stdio: 'inherit' });
} catch (error) {
  console.error("Error cargando recurso:", error?.message ?? error, error);
  if (error?.status) console.error("status:", error.status);
  if (error?.stack) console.error(error.stack);
}