export default eventHandler(async (event) => {
  console.log('eventHandler:', event.path)
  console.log('eventHandler:', event.context.httpClientHintsOptions)
  console.log('eventHandler:', event.context.httpClientHints)
})
