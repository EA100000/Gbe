// Utilisé uniquement par Jest dans ce paquet (Metro utilise la configuration de l'appli).
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-typescript'],
};
