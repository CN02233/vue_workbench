// jsdom keeps localStorage between tests in the same file, and App.vue reads the
// saved locale on creation. Clearing it forces every test to start in Chinese.
beforeEach(() => {
  localStorage.clear()
})
