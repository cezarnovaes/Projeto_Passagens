const puppeteer = require('puppeteer')
const path = require('path')
const fsPromises = require('fs/promises')
const fs = require('fs')
var caminhoLog = null
var caminhoLogSql = null
var nomeCategoria
var listaDestinosG = []

async function runCrawler(config, logCallback) {
    const controller = new AbortController()
    const { signal } = controller

    function log(texto) {
        if (texto != null) {
            console.log(texto)
            if (logCallback) {
                logCallback(texto)
            }
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

        var url = 'https://booking.com/'
        log('Abrindo pagina ' + url)

        await page.goto(url, { waitUntil: ['domcontentloaded'] })

        resultsOrigens = config.groupedLocationsConfig
        let urls = null
        if (config.showMainResults) {
            urls = generateBookingURLs(getTopOriginsDestinations(resultsOrigens, config.resultCount));
        } else {
            urls = generateBookingURLs(getSlicedDestinations(resultsOrigens, config.resultCount));
        }

        log(`Total de URLs geradas: ${urls.length}`);
        log(`Recuperando passagens`)

        const results = await fetchAllUrls(urls, page);

        try {
            const caminhoLogSql = path.join(caminhoNovaPasta, "passagensResult.json");
    
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
            return { status: 'success', message: 'Crawler concluído.' }
        }
    }
    function randomDelay() {
        return Math.floor(Math.random() * (140 - 50 + 1) + 50);
    }

    function generateBookingURLs(resultsOrigens) {
        const datasViagens = obterViagensFimDeSemana(config.departureDate); // Calcula todas as viagens possiveis de finais de semana nos proximos 30 dias
        const urls = [];

        if (config.periodType == "next30days") {
            for (const dataV of datasViagens) {
                console.log("DATAS PROX 30 DIAS: " + dataV.saida + " -/> " + dataV.retorno);
                const baseURL = "https://flights.booking.com/api/flights/";
                const baseParams = {
                    type: config.tripOptions,
                    adults: config.adults,
                    cabinClass: config.cabinClass,
                    children: config.children,
                    sort: "BEST",
                    travelPurpose: "leisure",
                    ca_source: "flights_index_sb",
                    aid: "304142",
                    label: "gen173bo-1DEg1mbGlnaHRzX2luZGV4KIICQgVpbmRleEgfWANoIIgBAZgBH7gBF8gBDNgBA-gBAfgBBogCAZgCAqgCA7gCmb25vAbAAgHSAiQ4MmQzM2I1OC02ZDM0LTRiYzYtODIzYS1iMGRkZjY3MDAxY2HYAgTgAgE",
                    adplat: "www-index-web_shell_header-flight-missing_creative-2VlI6ThuqGTRdPGFqUvfiU",
                    enableVI: "1",
                    depart: dataV.saida,
                    return: dataV.retorno,
                };
                if(!config.destination ||config.destination == ""){
                    const allDestinations = Object.values(resultsOrigens).flat().slice(0, config.resultCount);
                    for (const destination of allDestinations) {
                        if (config.origin.split('-')[0] !== destination.code) {
                            const params = new URLSearchParams({
                                ...baseParams,
                                from: config.origin.split('-')[0],
                                to: (destination.type ? `${destination.code}.${destination.type}` : destination.code),
                                fromCountry: config.origin.split('-')[1],
                                toCountry: destination.country,
                                fromLocationName: config.origin.split('-')[2],
                                toLocationName: destination.name
                            });

                            const url = `${baseURL}?${params.toString()}`;
                            listaDestinosG.push({
                                ...baseParams,
                                from: config.origin.split('-')[0],
                                to: (destination.type ? `${destination.code}.${destination.type}` : destination.code),
                                fromCountry: config.origin.split('-')[1],
                                toCountry: destination.country,
                                fromLocationName: config.origin.split('-')[2],
                                toLocationName: destination.name
                            })
                            urls.push(url);
                        }
                    }
                }else{
                    const params = new URLSearchParams({
                        ...baseParams,
                        from: config.origin.split('-')[0],
                        to: config.destination.split('-')[0],
                        fromCountry: config.origin.split('-')[1],
                        toCountry: config.destination.split('-')[1],
                        fromLocationName: config.origin.split('-')[2],
                        toLocationName: config.destination.split('-')[2]
                    });

                    const url = `${baseURL}?${params.toString()}`;
                    listaDestinosG.push({
                        ...baseParams,
                        from: config.origin.split('-')[0],
                        to: config.destination.split('-')[0],
                        fromCountry: config.origin.split('-')[1],
                        toCountry: config.destination.split('-')[1],
                        fromLocationName: config.origin.split('-')[2],
                        toLocationName: config.destination.split('-')[2]
                    })
                    urls.push(url);
                }
            }
        } else {
            const baseURL = "https://flights.booking.com/api/flights/";
            const baseParams = {
                type: config.tripOptions,
                adults: config.adults,
                cabinClass: config.cabinClass,
                children: config.children,
                sort: "BEST",
                travelPurpose: "leisure",
                ca_source: "flights_index_sb",
                aid: "304142",
                label: "gen173bo-1DEg1mbGlnaHRzX2luZGV4KIICQgVpbmRleEgfWANoIIgBAZgBH7gBF8gBDNgBA-gBAfgBBogCAZgCAqgCA7gCmb25vAbAAgHSAiQ4MmQzM2I1OC02ZDM0LTRiYzYtODIzYS1iMGRkZjY3MDAxY2HYAgTgAgE",
                adplat: "www-index-web_shell_header-flight-missing_creative-2VlI6ThuqGTRdPGFqUvfiU",
                enableVI: "1",
                depart: config.departureDate,
                return: config.returnDate,
            };

            if(config.destination == ""){
                const allDestinations = Object.values(resultsOrigens).flat().slice(0, config.resultCount);
                for (const destination of allDestinations) {
                    if (config.origin.split('-')[0] !== destination.code) {
                        const params = new URLSearchParams({
                            ...baseParams,
                            from: config.origin.split('-')[0],
                            to: (destination.type ? `${destination.code}.${destination.type}` : destination.code),
                            fromCountry: config.origin.split('-')[1],
                            toCountry: destination.country,
                            fromLocationName: config.origin.split('-')[2],
                            toLocationName: destination.name
                        });

                        const url = `${baseURL}?${params.toString()}`;
                        listaDestinosG.push({
                            ...baseParams,
                            from: config.origin.split('-')[0],
                            to: (destination.type ? `${destination.code}.${destination.type}` : destination.code),
                            fromCountry: config.origin.split('-')[1],
                            toCountry: destination.country,
                            fromLocationName: config.origin.split('-')[2],
                            toLocationName: destination.name
                        })
                        urls.push(url);
                    }
                }
            }else{
                const params = new URLSearchParams({
                    ...baseParams,
                    from: config.origin.split('-')[0],
                    to: config.destination.split('-')[0],
                    fromCountry: config.origin.split('-')[1],
                    toCountry: config.destination.split('-')[1],
                    fromLocationName: config.origin.split('-')[2],
                    toLocationName: config.destination.split('-')[2]
                });

                const url = `${baseURL}?${params.toString()}`;
                listaDestinosG.push({
                    ...baseParams,
                    from: config.origin.split('-')[0],
                    to: config.destination.split('-')[0],
                    fromCountry: config.origin.split('-')[1],
                    toCountry: config.destination.split('-')[1],
                    fromLocationName: config.origin.split('-')[2],
                    toLocationName: config.destination.split('-')[2]
                })
                urls.push(url);
            }
        }
        return urls
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
            log(`Fetch passagem erro: ${error.message}`)
            return { url, status: 'error', error: error.message };
        }
    }

    // Função principal para fazer o fetch de todas as URLs
    async function fetchAllUrls(urls, page) {
        const results = [];
        const totalUrls = urls.length;
        const startTime = Date.now();

        log(`______________________________________________________________`)

        for (let i = 0; i < totalUrls; i++) {
            if (signal.aborted) throw new Error('Execução cancelada pelo usuário.');

            const url = urls[i];
            const result = await fetchUrl(url, page);
            results.push(result);

            // Calcular e exibir o progresso
            const elapsedTime = (Date.now() - startTime) / 1000;
            const estimatedTotalTime = (elapsedTime / (i + 1)) * totalUrls;
            const remainingTime = estimatedTotalTime - elapsedTime;
            // console.log(`....................... < ${i + 1} OBJ REQ > .......................`);
            // console.log(listaDestinosG[i])
            // console.log(`....................................................................`)

            log(`Origem: ${listaDestinosG[i].fromLocationName}, ${listaDestinosG[i].fromCountry} -> ${listaDestinosG[i].toLocationName}, ${listaDestinosG[i].toCountry}`)
            log(`Data de saída: ${listaDestinosG[i].depart}, Data de retorno: ${listaDestinosG[i].return}`)
            log(`Progresso: ${i + 1}/${totalUrls} (${((i + 1) / totalUrls * 100).toFixed(2)}%)`);
            log(`Tempo estimado restante: ${(remainingTime / 60).toFixed(2)} minutos`);
            log(`Status da última requisição: ${result.status}`);
            log(`______________________________________________________________`)

            if (i < totalUrls - 1) {
                const delay = randomDelay();
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        return results;
    }

    function getTopOriginsDestinations(data, qtdResults) {
        const allLocations = [];

        for (const letter in data) {
            if (data.hasOwnProperty(letter)) {
                const locations = data[letter];

                locations.forEach((location) => {
                    if (location.type === "AIRPORT") {
                        allLocations.push({
                            code: location.code,
                            name: location.name,
                            country: location.country,
                            countryName: location.countryName
                        });
                    }
                });
            }
        }

        const brazilianLocations = allLocations.filter(
            (location) => location.country === "BR"
        );
        const internationalLocations = allLocations.filter(
            (location) => location.country !== "BR"
        );

        const topBrazilian = brazilianLocations.slice(0, qtdResults);
        const topInternational = internationalLocations.slice(0, qtdResults);

        if(config.tripType == "international") {
            topLocations = [...topInternational];
        }else if(config.tripType == "nacional") {
            topLocations = [...topBrazilian];
        }else{
            topLocations = [...topBrazilian, ...topInternational];
        }

        return topLocations;
    }

    function getSlicedDestinations(data, qtdResults) {
        const allLocations = [];
        
        for (const letter in data) {
            if (data.hasOwnProperty(letter)) {
                const locations = data[letter];

                locations.forEach((location) => {
                    allLocations.push({
                        code: location.code,
                        name: location.name,
                        country: location.country,
                        countryName: location.countryName
                    });
                });
            }
        }

        const brazilianLocations = allLocations.filter(
            (location) => location.country === "BR"
        );
        const internationalLocations = allLocations.filter(
            (location) => location.country !== "BR"
        );

        const topBrazilian = brazilianLocations.slice(0, qtdResults);
        const topInternational = internationalLocations.slice(0, qtdResults);
        let topLocations = [];

        if(config.tripType == "international") {
            topLocations = [...topInternational];
        }else if(config.tripType == "nacional") {
            topLocations = [...topBrazilian];
        }else{
            topLocations = [...topBrazilian, ...topInternational];
        }

        return topLocations;
    }

    function obterViagensFimDeSemana(dataSaida) {
        const dataInicial = new Date(dataSaida);
        const viagens = [];

        // Iterar pelos próximos 30 dias
        for (let i = 0; i < 30; i++) {
            const data = new Date(dataInicial);
            data.setDate(dataInicial.getDate() + i);

            // Verificar se é uma sexta-feira
            if (data.getDay() === 5) {
                const sexta = new Date(data);
                const domingo = new Date(data);
                domingo.setDate(sexta.getDate() + 2); // Adicionar 2 dias para o domingo

                // Adicionar as datas ao array de viagens
                viagens.push({
                    saida: sexta.toISOString().split('T')[0], // Formato YYYY-MM-DD
                    retorno: domingo.toISOString().split('T')[0],
                });
            }
        }

        return viagens;
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

    await main();
    return
}
module.exports = { runCrawler, createController: () => new AbortController() };