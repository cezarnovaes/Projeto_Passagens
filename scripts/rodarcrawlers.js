const { createController, runCrawler } = require("./crawlerbestdestinations")

(() => {
    console.log('INICIANDO')
    const controller = createController()
    runCrawler(controller)
})()