const puppeteer = require('puppeteer')
const path = require('path')
const fsPromises = require('fs/promises')
const fs = require('fs')
var caminhoLog = null
var caminhoLogSql = null
var nomeCategoria

async function runCrawler(config) {
    const controller = new AbortController()
    const { signal } = controller

    function log(texto) {
        if (texto != null) {
            console.log(texto)
            texto = "CRAWLER-BOOKING|" + (new Date()) + "|" + texto + "\r\n"
            //Adicionando ao final do arquivo
            fs.appendFileSync(caminhoLog, texto, "UTF-8")
        }
    }
    function logSql(sql) {
        
        //Adicionando ao final do arquivo
        fs.appendFileSync(caminhoLogSql, sql, "UTF-8")
    }

    async function logJson(results, caminhoLogSql) {
        try {
            const jsonData = JSON.stringify(results, null, 2);
            await fsPromises.writeFile(caminhoLogSql, jsonData, 'utf-8');
            console.log("Dados escritos no arquivo JSON com sucesso.");
        } catch (err) {
            console.error("Erro ao escrever dados no arquivo JSON:", err.message);
        }
    }

    const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs))

    async function main() {
        const diretorioAtual = __dirname.split('scripts')[0]
        //Gerando o arquivo de logs
        //Construindo um caminho relativo a partir do diretório atual
        caminhoLog = path.join(diretorioAtual, 'logs', "-log.txt")
        //Deletando o arquivo
        fs.unlink(caminhoLog, (err) => {
            if (err) {
                console.log('Ocorreu um erro ao deletar o arquivo log:' + err)
                return
            }
            console.log('Arquivo log deletado com sucesso.')
        });
        //Criando e escrevendo no arquivo
        fs.writeFile(caminhoLog, "", 'utf-8', (err) => {
            if (err) {
                console.log('Ocorreu um erro ao criar o arquivo log:' + err)
                return
            }
            console.log('Arquivo log criado com sucesso e conteúdo escrito.')
        });
        //Gerando o arquivo de SQL
        //Construindo um caminho relativo a partir do diretório atual
        // caminhoLogSql = path.join(diretorioAtual, 'logs', idcrawlerlink + "-" + fase + ".json");
        //Deletando o arquivo

        //Criando e escrevendo no arquivo

        const browser = await puppeteer.launch({
            headless: true,
            defaultViewport: null,
            protocolTimeout: 0,
            timeout: 0,
            setTimeout: 0,
            // args: [`--window-size=1920,1080`]
        })
        const page = await browser.newPage()
        page.setDefaultNavigationTimeout(900000)
        await page.setViewport({ width: 1400, height: 800 })
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36')
        await page.setCacheEnabled(false)
        // await page.setRequestInterception(true)

        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            })
        })

        const device = {
            name: 'iPhone 6',
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/14E5239e Safari/602.1',
            viewport: {
                width: 375,
                height: 667,
                isMobile: true,
                hasTouch: true,
                isLandscape: false,
            },
        }
        await page.emulate(device);

        nomeCategoria = 'passagens'

        const pastaLogs = path.join(diretorioAtual, 'logs');
        if (!fs.existsSync(pastaLogs)) {
            fs.mkdirSync(pastaLogs);
        }

        const caminhoNovaPasta = path.join(pastaLogs, nomeCategoria);
        if (!fs.existsSync(pastaLogs)) {
            fs.mkdirSync(pastaLogs);
        }

        var url = 'https://www.melhoresdestinos.com.br/passagens-aereas#'
        console.log('Abrindo pagina ' + url)

        await page.goto(url, { waitUntil: ['domcontentloaded'] })
        let urls = []
        const baseURL = `https://passagensaereas.melhoresdestinos.com.br/api/v1/twd/web/categories?category_id=`
        for(i = 1; i < 13; i++) {
            urls.push(baseURL + i)
        }
        console.log(`Recuperando passagens`)

        const results = await fetchAllUrls(urls, page);

        try {
            const caminhoLogSql = path.join(caminhoNovaPasta, "passagensCidades.json");
    
            try {
                await fsPromises.unlink(caminhoLogSql);
                console.log(`Arquivo existente ${caminhoLogSql} excluído com sucesso.`);
            } catch (unlinkErr) {
                if (unlinkErr.code !== 'ENOENT') {
                    throw unlinkErr;
                }
            }
    
            await fsPromises.writeFile(caminhoLogSql, "", 'utf-8');
            console.log(`Arquivo JSON criado com sucesso: ${caminhoLogSql}`)
            await logJson(results, caminhoLogSql);
            console.log("Resultados gravados com sucesso no arquivo JSON.")
    
        } catch (err) {
            console.error('Erro ao manipular o arquivo JSON:', err.message)
        } finally {
            await browser.close();
            browser.disconnect();
            return { status: 'success', message: results }
        }
    }
    function randomDelay() {
        return Math.floor(Math.random() * (700 - 400 + 1) + 100);
    }

    // Função para fazer o fetch de uma única URL
    async function fetchUrl(url, page) {
        try {
            const response = await page.evaluate(async (url) => {
                return await fetch(url).then(async (res) => {
                    return await res.json()
                })
            }, url)
            if (!response) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = response;
            // log(`Fetch passagem url: ${url}`)
            return { url, status: 'success', data };
        } catch (error) {
            console.log(`Fetch passagem erro: ${error.message}`)
            return { url, status: 'error', error: error.message };
        }
    }

    // Função principal para fazer o fetch de todas as URLs
    async function fetchAllUrls(urls, page) {
        const results = [];
        const totalUrls = urls.length;
        let urlsCidades = []
        let urlsCategorias = []
        let urlsPassagens = []
        // const startTime = Date.now();

        // console.log(`______________________________________________________________`)

        for (let i = 0; i < totalUrls; i++) {
            if (signal.aborted) throw new Error('Execução cancelada pelo usuário.');
            console.log(`RECUPERANDO PASSAGENS ${i + 1}/${totalUrls} URL: ${urls[i]}
                `)
            const url = urls[i];
            const result = await fetchUrl(url, page);
            if(result.data && result.data.cities){
                for(cidade of result.data.cities) {
                    urlsCidades.push(cidade.link)
                }
            }else if(result.data && result.data.categories){
                for(categoria of result.data.categories) {
                    urlsCategorias.push(categoria.link)
                }
            }

            if (i < totalUrls - 1) {
                const delay = randomDelay();
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        for(let i = 0; i < urlsCategorias.length; i++) {
            console.log(`RECUPERANDO CATEGORIAS ${i + 1}/${urlsCategorias.length} URL: ${urlsCategorias[i]}
                `)
            const result = await fetchUrl(urlsCategorias[i], page)
            if(result.data && result.data.cities){
                for(cidade of result.data.cities) {
                    urlsCidades.push(cidade.link)
                }
            }
            if (i < urlsCategorias.length - 1) {
                const delay = randomDelay();
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        for(let i = 0; i < urlsCidades.length; i++) {
            console.log(`RECUPERANDO CIDADES ${i + 1}/${urlsCidades.length} URL: ${urlsCidades[i]}
                `)
            const result = await fetchUrl(urlsCidades[i], page)
            if(result.data && result.data.cities){
                for(cidade of result.data.cities) {
                    urlsPassagens.push(cidade.link)
                }
            }
            if (i < urlsCidades.length - 1) {
                const delay = randomDelay();
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        for(let i = 0; i < urlsPassagens.length; i++) {
            console.log(`RECUPERANDO CIDADES ${i + 1}/${urlsPassagens.length} URL: ${urlsPassagens[i]}
                `)
            const result = await fetchUrl(urlsPassagens[i], page)
            results.push(result);
            if (i < urlsPassagens.length - 1) {
                const delay = randomDelay();
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        return results;
    }


    async function decodeHTMLEntities(text, page) {
        var txt = await page.evaluate((text) => {
            var tempElement = document.createElement("div")
            tempElement.innerHTML = text
            return tempElement.innerText
        }, text)

        return txt.replace(/<[^>]+>/g, '').replace(/&nbsp;|\r|\n/g, '');
    }

    function substituirCaracteresEspeciais(texto) {
        const mapaCaracteres = {
            'á': 'a',
            'à': 'a',
            'ã': 'a',
            'â': 'a',
            'ä': 'a',
            'é': 'e',
            'è': 'e',
            'ê': 'e',
            'ë': 'e',
            'í': 'i',
            'ì': 'i',
            'î': 'i',
            'ï': 'i',
            'ó': 'o',
            'ò': 'o',
            'õ': 'o',
            'ô': 'o',
            'ö': 'o',
            'ú': 'u',
            'ù': 'u',
            'û': 'u',
            'ü': 'u',
            'ç': 'c',
            'Á': 'A',
            'À': 'A',
            'Ã': 'A',
            'Â': 'A',
            'Ä': 'A',
            'É': 'E',
            'È': 'E',
            'Ê': 'E',
            'Ë': 'E',
            'Í': 'I',
            'Ì': 'I',
            'Î': 'I',
            'Ï': 'I',
            'Ó': 'O',
            'Ò': 'O',
            'Õ': 'O',
            'Ô': 'O',
            'Ö': 'O',
            'Ú': 'U',
            'Ù': 'U',
            'Û': 'U',
            'Ü': 'U',
            'Ç': 'C',
            'ñ': 'n',
            'Ñ': 'N',
            'ß': 'ss',
            'æ': 'ae',
            'Æ': 'AE',
            'œ': 'oe',
            'Œ': 'OE',
            'þ': 'th',
            'Þ': 'TH',
            'ð': 'dh',
            'Ð': 'DH',
            'ø': 'o',
            'Ø': 'O',
            'å': 'a',
            'Å': 'A',
            '&': 'E',
            '´': ' ',
            "'": ' ',
            '`': ' ',
        };

        return texto.replace(/[áàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇñÑßæÆœŒþÞðÐøØåÅ&´'`]/g, (match) => mapaCaracteres[match] || match);
    }

    const result = await main();
    return result
}

// runCrawler(null)

module.exports = { runCrawler, createController: () => new AbortController() };