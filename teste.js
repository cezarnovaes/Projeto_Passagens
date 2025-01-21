const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');//escrevendo em um arquivo
// const db = require("./dbteste");
var caminhoLog = null;
var caminhoLogSql = null;

var products = [];
var categorias_nomes = [];
var subcategorias_nomes = [];
var cidadeCategoria = '';

(async () => {
    function log(texto) {
        if (texto != null) {
            const data = new Date()
            const meses = [
                'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
            ];
        
            // Obtém o dia, mês e ano da data
            const dia = data.getDate();
            const mesIndex = data.getMonth();
            const ano = data.getFullYear();
            const hora = data.getHours();
            const minutos = data.getMinutes();
        
            // Formata a data para o formato desejado
            const dataFormatada = `${dia} ${meses[mesIndex]} ${ano} - ${hora}:${minutos}`;

            texto = "LOG-CRAWLER-SAVEGNAGO|" + dataFormatada + "|" + texto + "\r\n";

            //Adicionando ao final do arquivo
            fs.appendFileSync(caminhoLog, texto, "UTF-8");
        }
    }
    function logSql(sql) {
        sql = sql.replace("\r\n", "").replace("\r", "").replace("\n", "") + "\r\n";

        //Adicionando ao final do arquivo
        fs.appendFileSync(caminhoLogSql, sql, "UTF-8");
    }

    async function main() {
        const diretorioAtual = __dirname;
        //Gerando o arquivo de log
        //Construindo um caminho relativo a partir do diretório atual
        caminhoLog = path.join(diretorioAtual, 'logs', idcrawlerlink + "-" + fase + "-log.txt");
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
        caminhoLogSql = path.join(diretorioAtual, 'logs', idcrawlerlink + "-" + fase + ".sql");
        //Deletando o arquivo
        fs.unlink(caminhoLogSql, (err) => {
            if (err) {
                console.log('Ocorreu um erro ao deletar o arquivo logsql:' + err);
                return;
            }
            console.log('Arquivo logsql deletado com sucesso.');
        });
        //Criando e escrevendo no arquivo
        fs.writeFile(caminhoLogSql, "", 'utf-8', (err) => {
            if (err) {
                console.log('Ocorreu um erro ao criar o arquivo logsql:' + err);
                return;
            }
            console.log('Arquivo logsql criado com sucesso e conteúdo escrito.');
        });
        const browser = await puppeteer.launch({
            headless: true,
            defaultViewport: null,
            // args: [`--window-size=1920,1080`]
        })
        const page = await browser.newPage()
        page.setDefaultNavigationTimeout(900000);
        await page.setViewport({ width: 1280, height: 720 })
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
        await page.setCacheEnabled(false);
        await page.goto('https://www.savegnago.com.br/', { waitUntil: 'networkidle0' });
        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        await sleep(5000)

        //    API CONSULTA VOOS BOOKING - GET
        // https://flights.booking.com/api/flights/?type=ROUNDTRIP&adults=1&cabinClass=ECONOMY&children=&from=BSB.AIRPORT&to=SAO.CITY&fromCountry=BR&toCountry=BR&fromLocationName=Aeroporto+Internacional+de+Bras%C3%ADlia+-+Presidente+Juscelino+Kubitschek&toLocationName=S%C3%A3o+Paulo&depart=2025-02-15&return=2025-02-22&sort=BEST&travelPurpose=leisure&ca_source=flights_index_sb&aid=304142&label=gen173bo-1DEg1mbGlnaHRzX2luZGV4KIICQgVpbmRleEgfWANoIIgBAZgBH7gBF8gBDNgBA-gBAfgBBogCAZgCAqgCA7gCiMSfvAbAAgHSAiQ1MTUwMjVjYi0yMmZjLTQ0ZWUtODAzOC0wZDE5ODIzY2RjODLYAgTgAgE&adplat=www-index-web_shell_header-flight-missing_creative-5SQfleC4AaLbSmEg097WTh&enableVI=1

        // API BUSCA AEROPORTOS BOOKING - GET
        // https://flights.booking.com/api/autocomplete/pt?q=A

        // await abrelink();

        async function abrelink() {
            log('RECUPERANDO LINKS <SUBCATEGORIAS>')
            for (const link in todoslink.link) {
                // log('link aberto: ' + link)
                // if(todoslink.link[link].startsWith('https://www.savegnago.com.brhttps//www.savegnago.com.br/')){
                    todoslink.link[link].replace('https://www.savegnago.com.brhttps//www.savegnago.com.br/', 'https://www.savegnago.com.br/')
                // }
                await page.setViewport({ width: 1280, height: 720 })
                await page.goto(todoslink.link[link], { waitUntil: 'networkidle2' })
                await sleep(3000);
                // await autoScroll(page);
                try {
                    // await sleep(10000)
                    var subcategoriaEl = await page.evaluate(() => {
                        var list = []
                        document.querySelector('.vtex-search-result-3-x-filterContent').querySelectorAll('.vtex-checkbox__label').forEach(el => list.push(el.textContent))
                        return list
                    })
                    var hrefValues = await page.evaluate(() => {
                        var list = []
                        document.querySelector('.vtex-search-result-3-x-filterContent').querySelectorAll('.vtex-checkbox__label').forEach(el => list.push(el.getAttribute('for').replace('category-2-', '')))
                        return list
                    })


                    // break
                } catch (error) {
                    log("ERRO" + error)
                    log('link sem produtos' + todoslink.link[link])
                }
                // break
            }

    
            await salvaProduto();

            await browser.close();
            browser.disconnect()
        }
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
    await main(idcrawlerlink, fase);
    return
})();
