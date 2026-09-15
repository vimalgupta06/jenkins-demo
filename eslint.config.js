export default [{
  ignores: ['dist/**', 'node_modules/**'],
}, {
  files: ['**/*.js'],
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { process: 'readonly', console: 'readonly' } },
  rules: { 'no-unused-vars': 'error', 'no-undef': 'error', 'eqeqeq': 'error' },
}];
