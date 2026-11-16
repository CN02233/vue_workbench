// Only the test environment gets transpiled. `npm run build` runs under
// production/development, so vue-cli's output is untouched.
module.exports = {
  env: {
    test: {
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]]
    }
  }
}
