const puppeteer = require("puppeteer")

let browser
let page

async function initializePuppeteer() {
  try {
    browser = await puppeteer.launch({ headless: true })
    page = await browser.newPage()
    await page.goto("https://booking.com/")
    console.log("Puppeteer initialized successfully")
  } catch (error) {
    console.error("Failed to initialize Puppeteer:", error)
  }
}

async function getPage() {
  if (!browser || !page) {
    await initializePuppeteer()
  } else {
    try {
      // Verifica se o navegador ainda está conectado
      await browser.version()
    } catch (error) {
      console.log("Browser disconnected. Reinitializing...")
      await initializePuppeteer()
    }
  }
  return page
}

module.exports = { initializePuppeteer, getPage }

