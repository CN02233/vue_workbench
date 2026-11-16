module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: process.env.BUSINESS_API_URL || 'http://localhost:8081',
        changeOrigin: true
      }
    }
  }
}
