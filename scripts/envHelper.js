function requireEnv(varName) {
  const value = process.env[varName];
  if (!value) {
    console.error(`Erreur : La variable d'environnement ${varName} est manquante.`);
    process.exit(1);
  }
  return value;
}
module.exports = { requireEnv };
