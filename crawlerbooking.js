const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');//escrevendo em um arquivo
const { loadEnvFile } = require('process');
var caminhoLog = null;
var caminhoLogSql = null;
var nomePasta;
var nomeCategoria;

(async () => {
    function log(texto) {
        if (texto != null) {
            console.log(texto);
            texto = "CRAWLER-BOOKING|" + (new Date()) + "|" + texto + "\r\n";
            //Adicionando ao final do arquivo
            fs.appendFileSync(caminhoLog, texto, "UTF-8");
        }
    }
    function logSql(sql) {;
        //Adicionando ao final do arquivo
        fs.appendFileSync(caminhoLogSql, sql, "UTF-8");
    }

    function logJson(json) {
        // sql = sql.replace("\r\n", "").replace("\r", "").replace("\n", "") + "\r\n";

        //Adicionando ao final do arquivo
        fs.appendFileSync(caminhoLogSql, JSON.stringify(json), "UTF-8");
    }

    const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

    async function main() {
        const diretorioAtual = __dirname;
        //Gerando o arquivo de logs
        //Construindo um caminho relativo a partir do diretório atual
        caminhoLog = path.join(diretorioAtual, 'logs', "-log.txt");
        //Deletando o arquivo
        fs.unlink(caminhoLog, (err) => {
            if (err) {
                console.log('Ocorreu um erro ao deletar o arquivo log:' + err);
                return;
            }
            console.log('Arquivo log deletado com sucesso.');
        });
        //Criando e escrevendo no arquivo
        fs.writeFile(caminhoLog, "", 'utf-8', (err) => {
            if (err) {
                console.log('Ocorreu um erro ao criar o arquivo log:' + err);
                return;
            }
            console.log('Arquivo log criado com sucesso e conteúdo escrito.');
        });
        //Gerando o arquivo de SQL
        //Construindo um caminho relativo a partir do diretório atual
        // caminhoLogSql = path.join(diretorioAtual, 'logs', idcrawlerlink + "-" + fase + ".json");
        //Deletando o arquivo

        //Criando e escrevendo no arquivo


        const browser = await puppeteer.launch({
            headless: false,
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

        nomeCategoria = 'PASSAGENS'

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

        const baseURLOrigens = 'https://flights.booking.com/api/autocomplete/pt?q=';
        const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const resultsOrigens = {};

        for (const letra of alfabeto) {
            await sleep(100)
            const fetchURL = `${baseURLOrigens}${letra}`;
            log(`Fetching: ${fetchURL}`);
            try {
                const response = await page.evaluate(async (fetchURL) => {
                    return await fetch(fetchURL).then(async (res) => {
                        return await res.json()
                    })
                }, fetchURL)
                if (!response) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const data = response;
                resultsOrigens[letra] = data; // Armazena o resultado para a letra atual
            } catch (error) {
                console.error(`Failed to fetch data for ${letra}: ${error.message}`);
                resultsOrigens[letra] = { error: error.message }; // Armazena o erro associado à letra
            }
        }

        var jsonGerados = 0
        function generateBookingURLs(resultsOrigens) {
            const baseURL = "https://flights.booking.com/api/flights/";
            const baseParams = {
                type: "ONEWAY",
                adults: "1",
                cabinClass: "ECONOMY",
                children: "",
                sort: "BEST",
                travelPurpose: "leisure",
                ca_source: "flights_index_sb",
                aid: "304142",
                label: "gen173bo-1DEg1mbGlnaHRzX2luZGV4KIICQgVpbmRleEgfWANoIIgBAZgBH7gBF8gBDNgBA-gBAfgBBogCAZgCAqgCA7gCmb25vAbAAgHSAiQ4MmQzM2I1OC02ZDM0LTRiYzYtODIzYS1iMGRkZjY3MDAxY2HYAgTgAgE",
                adplat: "www-index-web_shell_header-flight-missing_creative-2VlI6ThuqGTRdPGFqUvfiU",
                enableVI: "1"
            };

            const urls = [];
            const allDestinations = Object.values(resultsOrigens).flat();

            for (const origin of allDestinations) {
                for (const destination of allDestinations) {
                    if (origin.code !== destination.code) {
                        const params = new URLSearchParams({
                            ...baseParams,
                            from: (origin.type ? `${origin.code}.${origin.type}` : origin.code),
                            to: (destination.type ? `${destination.code}.${destination.type}` : destination.code),
                            fromCountry: origin.country,
                            toCountry: destination.country,
                            fromLocationName: origin.name,
                            toLocationName: destination.name,
                            depart: "2025-02-22" // You might want to make this dynamic
                        });

                        const url = `${baseURL}?${params.toString()}`;
                        urls.push(url);
                    }
                }
            }

            return urls
        }
        const generatedURLs = generateBookingURLs(resultsOrigens);

        log(`Total URLs generated: ${generatedURLs.length}`);

        function randomDelay() {
            return Math.floor(Math.random() * (150 - 70 + 1) + 70);
        }

        // Função para fazer o fetch de uma única URL
        async function fetchUrl(url) {
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
                log(`Fetch passagem url: ${url}`)
                return { url, status: 'success', data };
            } catch (error) {
                log(`Fetch passagem erro: ${error.message}`)
                return { url, status: 'error', error: error.message };
            }
        }

        // Função principal para fazer o fetch de todas as URLs
        async function fetchAllUrls(urls) {
            const results = [];
            const totalUrls = urls.length;
            const startTime = Date.now();

            log(`Iniciando fetch de ${totalUrls} URLs`);

            for (let i = 0; i < totalUrls; i++) {
                const url = urls[i];
                const result = await fetchUrl(url);
                results.push(result);

                // Calcular e exibir o progresso
                const elapsedTime = (Date.now() - startTime) / 1000;
                const estimatedTotalTime = (elapsedTime / (i + 1)) * totalUrls;
                const remainingTime = estimatedTotalTime - elapsedTime;

                log(`Progresso: ${i + 1}/${totalUrls} (${((i + 1) / totalUrls * 100).toFixed(2)}%)`);
                log(`Tempo estimado restante: ${remainingTime.toFixed(2)} segundos`);
                log(`Status da última requisição: ${result.status}`);

                if (i < totalUrls - 1) {
                    const delay = randomDelay();
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            return results;
        }

        function getTopOriginsDestinations(data) {
            const allLocations = [];
          
            // Iterar pelas letras no JSON
            for (const letter in data) {
              if (data.hasOwnProperty(letter)) {
                const locations = data[letter];
          
                // Adicionar locais ao array, mantendo apenas aeroportos
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
          
            // Separar locais brasileiros e internacionais
            const brazilianLocations = allLocations.filter(
              (location) => location.country === "BR"
            );
            const internationalLocations = allLocations.filter(
              (location) => location.country !== "BR"
            );
          
            // Selecionar os 20 principais de cada grupo
            const topBrazilian = brazilianLocations.slice(0, 20);
            const topInternational = internationalLocations.slice(0, 20);
          
            // Combinar os dois grupos
            const topLocations = [...topBrazilian, ...topInternational];
          
            return topLocations;
        }

        const urls = generateBookingURLs(getTopOriginsDestinations(resultsOrigens));

        log(`Total de URLs geradas: ${urls.length}`);
        log(`Recuperando passagens`)
        await sleep(5000)

        const results = await fetchAllUrls(urls);

        caminhoLogSql = path.join(caminhoNovaPasta, "passagensResult.json");
        fs.unlink(caminhoLogSql, (err) => {
            fs.writeFile(caminhoLogSql, "", 'utf-8', (err) => {
                if (err) {
                    console.log('Ocorreu um erro ao criar o arquivo logJSON: ' + jsonGerados + ' => ' + err);
                    return;
                }
                console.log('Arquivo JSON criado com sucesso e conteúdo escrito ' + jsonGerados);
                logJson(results)
            })
        })
        await sleep(120000)
        await browser.close()
        browser.disconnect()
        process.exit()

        if (produtos) {
            log('PRODUTOS RECUPERADOS: ' + produtos.products.length + ' / ' + produtos.settings.totalItemCount)

            for (p of produtos.products) {
                var url_produto = 'https://www.lacquadifiori.com.br/' + p.urlFriendly

                var produto_detail = null

                page.on('response', async (resp) => {
                    if (resp.url().includes('https://www.lacquadifiori.com.br/api')) {
                        try {
                            if ((await resp.text()).includes('"productImages":')) {
                                produto_detail = await resp.json()
                            }
                        } catch (error) { }
                    }
                })
                log('ENTRANDO PRODUTO: ' + url_produto)
                await page.goto(url_produto, { waitUntil: ['domcontentloaded', 'networkidle0'] })
                // await sleep(5000)
                log('RECUPERANDO INFORMAÇÕES')

                var descricao = p.name
                var referencia = p.code
                var marca = p.brand.name
                var preco = p.price
                var preco_desconto = p.pricePromotion
                if (preco_desconto == 0) {
                    preco_desconto = preco
                }
                var cor = 'N/A'
                var cor_url = 'N/A'

                if (produto_detail) {
                    var codbarras = produto_detail.gtin
                    var descricao_completa = produto_detail.descriptionDetailWithoutHtml
                    var descricao_breve = produto_detail.descriptionDetailSummaryWithoutHtml
                    var composicao = 'N/A'
                    var carrocel_imagens = []
                    produto_detail.productImages.forEach(el => carrocel_imagens.push('https:' + el.imageHighResolution))
                } else {
                    log('PRODUTO_DETAIL NÃO ENCONTRADO')
                }

                var jsonPassagens = {
                    link: url_produto,
                    descricao: descricao,
                    referencia: referencia,
                    marca: 'LACQUA DI FIORI',
                    cor: 'N/A',
                    tonalidade: 'N/A',
                    tonalidade_hexadecimal: 'N/A',
                    tonalidade_url: cor_url,
                    descricao_completa: descricao_completa.replace(/<[^>]+>/g, '').replace(/&nbsp;|\r|\n/g, ''),
                    descricao_breve: descricao_breve.replace(/<[^>]+>/g, '').replace(/&nbsp;|\r|\n/g, ''),
                    nome: descricao,
                    composicao: composicao,
                    categoria: nomePasta != '' ? nomeCategoria + ' > ' + nomePasta : nomeCategoria,
                    fotos: carrocel_imagens,
                    tamanhos: [
                        {
                            tamanho: 'ÚNICO',
                            codigobarras: codbarras,
                            sku: referencia,
                            preco: preco,
                            preco_desconto: preco_desconto,
                        }
                    ],
                }

                caminhoLogSql = path.join(caminhoNovaPasta, jsonGerados + "-" + fase + ".json");
                fs.unlink(caminhoLogSql, (err) => {
                    fs.writeFile(caminhoLogSql, "", 'utf-8', (err) => {
                        if (err) {
                            console.log('Ocorreu um erro ao criar o arquivo logJSON: ' + jsonGerados + ' => ' + err);
                            return;
                        }
                        console.log('Arquivo JSON criado com sucesso e conteúdo escrito ' + jsonGerados);
                        logJson(jsonPassagens)
                    })
                })
                log('PRODUTO: ' + descricao)
                log('JSON GERADO COM SUCESSO ' + jsonGerados)
                log('')
                jsonGerados++
                // break
            }
        }

        log('FINALIZANDO JSON GERADOS: ' + jsonGerados + ' / ' + produtos.settings.totalItemCount)
        await browser.close()
        browser.disconnect()
        process.exit()
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

    const idcrawlerlink = process.argv[2];
    const fase = process.argv[3];
    await main();
    return
})();
