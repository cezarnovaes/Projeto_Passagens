let groupedLocationsConfig = null
var contatos = []

document.addEventListener("DOMContentLoaded", () => {
  fetchLocations()

  const stopRobotButton = document.getElementById("stopRobotButton")

  renderPeriodSelector()
  renderFlightConfig()
  renderLocationSelector()
  renderAdditionalFilters()
  renderRobotConfig()
  setupFieldValidations()
  setupTripOptionsBehavior()

  const submitButton = document.querySelector('button[type="submit"]')
  submitButton.disabled = true
  stopRobotButton.addEventListener("click", handleStopRobot)

  const nextButton = document.getElementById("nextButton")
  const backButton = document.querySelectorAll("#backButton")
  const searchForm = document.getElementById("searchForm")
  const page1 = document.getElementById("page1")
  const page2 = document.getElementById("page2")

  nextButton.addEventListener("click", () => {
    validatePage1()
  })

  backButton.forEach((el) => {
    if (el.classList.contains("backRobot")) {
      el.disabled = true
    }
    el.addEventListener("click", () => {
      page2.classList.add("hidden")
      page1.classList.remove("hidden")
    });
  })

  searchForm.addEventListener("submit", handleSubmit)

  const departureDate = document.getElementById("departureDate")
  const today = new Date()
  const day = ("0" + today.getDate()).slice(-2)
  const month = ("0" + (today.getMonth() + 1)).slice(-2)
  const year = today.getFullYear()

  const formattedDate = year + "-" + month + "-" + day
  departureDate.value = formattedDate
})

function setupFieldValidations() {
  // Campos obrigatórios
  const requiredFields = [
    { id: "adults", minValue: 1 },
    { id: "resultCount", minValue: 1 },
  ]

  requiredFields.forEach(({ id, minValue }) => {
    const field = document.getElementById(id)
    if (field) {
      field.required = true
      field.addEventListener("input", () => {
        if (field.value < minValue) {
          field.value = minValue
        }
      })

      // Adiciona o asterisco vermelho
      const label = field.closest("div").querySelector("label")
      if (label) {
        label.innerHTML += ' <span style="color: red;">*</span>'
      }
    }
  })

  // Validação para datas
  const periodTypeInputs = document.querySelectorAll('input[name="periodType"]')
  periodTypeInputs.forEach((input) => {
    input.addEventListener("change", (e) => {
      const departureDate = document.getElementById("departureDate")
      const returnDate = document.getElementById("returnDate")
      const returnDateLabel = document.querySelector('label[for="returnDate"]')

      if (e.target.value === "specific") {
        returnDate.required = true
        returnDate.disabled = false
        returnDateLabel.innerHTML += ' <span style="color: red;">*</span>'
      } else {
        var today = new Date();
        // Formata a data para o padrão yyyy-mm-dd
        var day = ("0" + today.getDate()).slice(-2)
        var month = ("0" + (today.getMonth() + 1)).slice(-2)
        var year = today.getFullYear()

        var formattedDate = year + "-" + month + "-" + day
        departureDate.value = formattedDate
        returnDate.required = false
        returnDate.disabled = true
        returnDateLabel.innerHTML = returnDateLabel.innerHTML.replace(/<span style="color: red;">\*<\/span>/, "")
      }
    })
  })
}

function setupTripOptionsBehavior() {
  const tripOptions = document.getElementById("tripOptions");

  if (!tripOptions) {
    console.error("Elemento tripOptions não encontrado.");
    return;
  }

  tripOptions.addEventListener("change", (e) => {
    const returnDateField = document.getElementById("returnDate");
    const returnDateLabel = document.querySelector('label[for="returnDate"]');

    if (!returnDateField || !returnDateLabel) {
      console.error("Campo ou label de destino não encontrado.");
      return;
    }

    if (e.target.value === "ONEWAY") {
      returnDateField.disabled = true;
      returnDateField.value = ""; // Limpa o valor selecionado

      // Remove o asterisco do label de destino
      returnDateLabel.innerHTML = returnDateLabel.innerHTML.replace(/<span style="color: red;">\*<\/span>/, "");
    } else {
      const periodTypeInputs = document.querySelectorAll('input[name="periodType"]')
      periodTypeInputs.forEach((input) => {
        if (input.checked) {
          if (input.value === "specific") {
            returnDateField.disabled = false;
            returnDateField.required = true;

            // Adiciona o asterisco ao label, caso não exista
            if (!returnDateLabel.innerHTML.includes("*")) {
              returnDateLabel.innerHTML += ' <span style="color: red;">*</span>';
            }
          }
        }
      })

    }
  });
}

function renderLocationSelector() {
  const container = document.getElementById("locationSelector")
  container.innerHTML = `
  <div id="locationSelector">
    <h2>Origem e Destino</h2>
    <div class="flex">
      <div>
        <label for="originSearch">Pesquisar Origem &#8203;<span style="color: red;">*</span> </label>
        <div class="input-wrapper">
          <input type="text" id="originSearch" placeholder="Digite para pesquisar" autocomplete="off" required>
          <span class="arrow"></span>
          <div id="originResults" class="results-container" style="display: none"></div>
        </div>
      </div>
      <div>
        <label for="destinationSearch">Pesquisar Destino</label>
        <div class="input-wrapper">
          <input type="text" id="destinationSearch" placeholder="Digite para pesquisar" autocomplete="off">
          <span class="arrow"></span>
          <div id="destinationResults" class="results-container" style="display: none"></div>
        </div>
      </div>
    </div>
  </div>
  `

  const originInput = document.getElementById("originSearch")
  const originResults = document.getElementById("originResults")
  const destinationInput = document.getElementById("destinationSearch")
  const destinationResults = document.getElementById("destinationResults")

  setupSearchBehavior(originInput, originResults)
  setupSearchBehavior(destinationInput, destinationResults)
}

async function setupSearchBehavior(inputElement, resultsContainer) {
  let timeoutId
  let abortController

  inputElement.addEventListener("input", () => {
    const query = inputElement.value.trim()

    if (query.length < 3) {
      resultsContainer.style.display = "none"
      resultsContainer.innerHTML = ""
      return
    }

    if (abortController) {
      abortController.abort()
    }

    resultsContainer.style.display = "block"
    resultsContainer.classList.add("loading")
    resultsContainer.innerHTML = ""

    clearTimeout(timeoutId)
    timeoutId = setTimeout(async () => {
      try {
        abortController = new AbortController()
        results = await fetchDynamicLocations(query, abortController.signal)
        displayResults(results, resultsContainer)
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Erro ao buscar locais:", error)
          resultsContainer.innerHTML = "<p>Erro ao carregar resultados.</p>"
        }
      } finally {
        resultsContainer.classList.remove("loading")
      }
    }, 500)
  })

  // Abre o menu de resultados ao clicar no campo, se houver resultados
  inputElement.addEventListener("focus", () => {
    if (resultsContainer.innerHTML.trim() !== "" || resultsContainer.classList.contains("loading")) {
      resultsContainer.style.display = "block"
    }
  })

  // Fecha o menu de resultados ao clicar fora
  document.addEventListener("click", (e) => {
    if (!inputElement.contains(e.target) && !resultsContainer.contains(e.target)) {
      resultsContainer.style.display = "none"
    }
  })
}

async function fetchDynamicLocations(query, signal) {
  const response = await fetch(`/api/search-locations?query=${encodeURIComponent(query)}`, { signal })
  if (!response.ok) {
    throw new Error(`Erro na requisição: ${response.status}`)
  }
  const data = await response.json()

  const grouped = { others: [] }
  data.forEach((location) => {
    const cityCode = (location.type === "CITY" ? location.code : location.city) || "others"
    if (!grouped[cityCode]) {
      grouped[cityCode] = { city: null, airports: [] }
    }
    if (location.type === "CITY") {
      grouped[cityCode].city = location
    } else if (location.type === "AIRPORT" && grouped[cityCode].city !== null) {
      grouped[cityCode].airports.push(location)
    } else {
      grouped.others.push(location)
    }
  })

  return grouped
}

function displayResults(groupedLocations, container) {
  const cityGroups = Object.entries(groupedLocations)
    .filter(([key]) => key !== "others")
    .sort(([a], [b]) => a.localeCompare(b))

  const otherGroup = groupedLocations.others || []

  const html = [
    ...cityGroups.map(
      ([key, { city, airports }]) => `
      ${city ? `
        <div class="result-group">
          ${city
            ? `
            <div class="result-item" data-value="${city.code}-${city.country}-${city.name}" data-type="CITY">
              ${city.name} (Todos os Aeroportos)
              <span class="subresult-item">${city.cityName ? city.cityName + ", " : ""}${city.regionName ? city.regionName + ", "	: ""}${city.countryName}</span>
            </div>
          `
            : ""
          }
          ${airports
            .map(
              (airport) => `
            <div class="result-item" data-value="${airport.code}-${airport.country}-${airport.name}" data-type="AIRPORT">
              ${airport.name} (Aeroporto)
              <span class="subresult-item">${city.cityName ? city.cityName  + ", " : ""}${city.regionName ? city.regionName + ", " : ""}${city.countryName}</span>
            </div>
          `,
            )
            .join("")}
        </div>  
      ` : ""}
    `,
    ),
    otherGroup.length > 0
      ? `
      <div class="result-group">
        <div class="result-group-title others">Outros Resultados</div>
        ${otherGroup
        .map(
          (location) => `
          <div class="result-item" data-value="${location.code}-${location.country}-${location.name}" data-type="${location.type}">
            ${location.name} (${location.type})
            <span class="subresult-item">${location.cityName ? location.cityName + ", " : ""}${location.regionName ? location.regionName + ", "	: ""}${location.countryName}</span>
          </div>
        `,
        )
        .join("")}
      </div>
    `
      : ""
  ].join("")

  container.innerHTML = html || `<div class="no-results">Nenhum resultado encontrado</div>`;

  container.querySelectorAll(".result-item").forEach((item) => {
    item.addEventListener("click", () => {
      const value = item.getAttribute("data-value")
      const type = item.getAttribute("data-type")
      const [code, country, name] = value.split("-")
      const input = container.closest(".input-wrapper").querySelector("input")
      input.value = name
      input.setAttribute("data-code", code)
      input.setAttribute("data-country", country)
      input.setAttribute("data-type", type)
      container.style.display = "none"
    })
  })
}

async function fetchLocations() {
  try {
    const response = await fetch("/api/fetch-locations-booking")
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
    const results = await response.json()
    const submitButton = document.querySelector('button[type="submit"]')
    submitButton.disabled = false
    groupedLocationsConfig = results
    return
    // return groupLocationsByCityCode(flattenResults(results))
  } catch (error) {
    console.error("Error fetching locations:", error)
    throw error
  }
}

function flattenResults(results) {
  return Object.values(results).flat()
}

function groupLocationsByCityCode(locations) {
  const grouped = {}
  locations.forEach((location) => {
    const cityCode = location.city || location.code
    if (!grouped[cityCode]) {
      grouped[cityCode] = []
    }
    grouped[cityCode].push(location)
  })
  return grouped
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function handleStopRobot() {
  try {
    const stopRobotResponse = await fetch("/api/stop-robos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"target": "todos"}',
    })

    if (!stopRobotResponse.ok) {
      throw new Error("Failed to stop the robot")
    }

    alert("Robô parado com sucesso!")
    // Voltar para o estado inicial
    document.getElementById("searchForm").style.display = "block"
    document.getElementById("robotStatus").classList.add("hidden")
  } catch (error) {
    console.error("Error:", error)
    alert("Ocorreu um erro ao parar o robô. Por favor, tente novamente.")
  }
}

function renderPeriodSelector() {
  const container = document.getElementById("periodSelector")
  container.innerHTML = `
        <h2>Período de Pesquisa</h2>
        <div>
            <label>
                <input type="radio" name="periodType" value="next30days" checked> Próximos 30 dias
            </label>
            <label>
                <input type="radio" name="periodType" value="specific"> Data específica
            </label>
        </div>
        <div id="specificDates">
            <div class="flex">
                <div>
                    <label for="departureDate">Data de Saída &#8203;<span style="color: red;">*</span></label>
                    <input type="date" id="departureDate" name="departureDate" required>
                </div>
                <div>
                    <label for="returnDate">Data de Retorno</span></label>
                    <input type="date" id="returnDate" name="returnDate" disabled>
                </div>
            </div>
        </div>
    `

  // const periodTypeInputs = container.querySelectorAll('input[name="periodType"]')
  // const specificDates = document.getElementById("specificDates")

  // periodTypeInputs.forEach((input) => {
  //   input.addEventListener("change", (e) => {
  //     specificDates.classList.toggle("hidden", e.target.value !== "specific")
  //   })
  // })
}

function renderFlightConfig() {
  const container = document.getElementById("flightConfig")
  container.innerHTML = `
        <h2>Configuração do Voo</h2>
        <div class="flex">
            <div>
                <label for="cabinClass">Classe</label>
                <select id="cabinClass" name="cabinClass">
                    <option value="ECONOMY">Econômica</option>
                    <option value="PREMIUM_ECONOMY">Econômica Premium</option>
                    <option value="BUSINESS">Executiva</option>
                    <option value="FIRST">Primeira Classe</option>
                </select>
            </div>
            <div>
                <label for="adults">Adultos</label>
                <input type="number" id="adults" name="adults" min="1" value="1">
            </div>
            <div>
                <label for="children">Crianças</label>
                <input type="number" id="children" name="children" min="0" value="0">
            </div>
            <div>
                <label for="tripOptions">Opções de Viagem</label>
                <select id="tripOptions" name="tripOptions">
                    <option value="ROUNDTRIP">Ida e Volta</option>
                    <option value="ONEWAY">Somente Ida</option>
                </select>
            </div>
        </div>
    `
}

function renderAdditionalFilters() {
  const container = document.getElementById("additionalFilters")
  container.innerHTML = `
        <h2>Filtros Adicionais</h2>
        <div class="flex">
          <div>
              <label for="tripType">Tipo de Viagem</label>
              <select id="tripType" name="tripType">
                  <option value="all">Todas</option>
                  <option value="national">Somente Nacional</option>
                  <option value="international">Somente Internacional</option>
              </select>
          </div>
          <div>
              <label for="resultCount">Número de Resultados</label>
              <input type="number" id="resultCount" name="resultCount" min="1" value="3">
          </div>
        </div>
    `
}

function filterGroupedLocations(groupedLocations) {
  return Object.fromEntries(
    Object.entries(groupedLocations).map(([key, locations]) => [
      key,
      locations.map((location) => ({
        name: location.name,
        type: location.type,
        code: location.code,
        country: location.country,
        countryName: location.countryName,
      })),
    ]),
  )
}

function validatePage1() {
  const invalidFields = []
  const page1 = document.getElementById("page1");
  const page2 = document.getElementById("page2");

  page1.querySelectorAll("input, select").forEach((field) => {
    if (field.required && (!field.value || field.value === "")) {
      invalidFields.push(field)
    }
  })

  if (invalidFields.length > 0) {
    page2.classList.add("hidden");
    page1.classList.remove("hidden");
    invalidFields[0].focus()
    return
  }

  page1.classList.add("hidden");
  page2.classList.remove("hidden");
}

async function handleSubmit(event) {
  event.preventDefault()

  const form = event.target
  const invalidFields = []

  form.querySelectorAll("input, select").forEach((field) => {
    if (field.required && !field.value) {
      invalidFields.push(field)
    }
  })

  if (invalidFields.length > 0) {
    alert("Por favor, preencha todos os campos obrigatórios.")
    invalidFields[0].focus()
    return
  }

  try {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData)

    const originInput = document.getElementById("originSearch")
    const destinationInput = document.getElementById("destinationSearch")

    data.origin = originInput.getAttribute("data-code") + "-" + originInput.getAttribute("data-country") + "-" + originInput.value
    data.destination = destinationInput.value != "" ? destinationInput.getAttribute("data-code") + "-" + destinationInput.getAttribute("data-country") + "-" + destinationInput.value : ""
    // data.senderNumber = removeFormatting(data.senderNumber).replace("+", "")
    data.updateInterval = convertToMinutes(data, "updateInterval")
    data.messageInterval = convertToMinutes(data, "messageInterval")
    if(contatos.length == 0) {
      alert("Por favor, adicione pelo menos um contato na tabela de contatos.")
      return
    }
    data.contacts = contatos

    if (data.updateInterval < 10 || data.messageInterval < 10) {
      alert("O intervalo de atualização e envio de mensagens devem ser pelo menos de 30 minutos.")
      return
    }

    data.groupedLocationsConfig = filterGroupedLocations(groupedLocationsConfig)
    data.showMainResults = false
    console.log(data)

    form.style.display = "none"
    document.getElementById("robotStatus").classList.remove("hidden")

    startRobotProgress()

    fetch("/api/run-crawler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Erro ao iniciar robô")
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        alert("Ocorreu um erro ao iniciar o robô. Por favor, tente novamente.")
      })
  } catch (error) {
    console.error("Error:", error)
    alert("Ocorreu um erro ao iniciar o robô. Por favor, tente novamente.")
  }
}

const socket = io("http://localhost:3000", {
  transports: ["websocket", "polling"],
})

socket.on("connect", () => {
  console.log("Connected to server")
})

socket.on("disconnect", () => {
  console.log("Disconnected from server")
})

socket.on("error", (error) => {
  console.error("Socket.IO Error:", error)
})

socket.on("log", (logMessage) => {
  const logsContainer = document.getElementById("robotLogs");

  if (logsContainer) {
    // Verifica se o log é um código QR com base em uma regra (exemplo: começa com "QR:")
    if (logMessage.startsWith("QR:")) {
      const qrCodeValue = logMessage.substring(3).trim(); // Remove "QR:" para obter o conteúdo
      const qrCodeCanvas = document.createElement("canvas"); // Cria um canvas para o QR Code

      // Gera o QR Code usando a biblioteca qrcode.js
      QRCode.toCanvas(qrCodeCanvas, qrCodeValue, { width: 150 }, (error) => {
        if (error) {
          console.error("Erro ao gerar QR Code:", error);
          logsContainer.innerHTML += `<p>Erro ao gerar QR Code: ${error.message}</p>`;
        } else {
          const qrLogContainer = document.createElement("div"); // Cria um container para o QR Code e a legenda
          qrLogContainer.innerHTML = `<p>Código QR:</p>`;
          qrLogContainer.appendChild(qrCodeCanvas); // Adiciona o canvas ao container

          logsContainer.appendChild(qrLogContainer); // Adiciona o container ao log
        }
        logsContainer.scrollTop = logsContainer.scrollHeight; // Rola para o final
      });
    } else if (logMessage.startsWith("Finalizando...")) {
      const backButton = document.querySelector(".backRobot")
      backButton.disabled = false
      stopRobotButton.disabled = true
      backButton.addEventListener("click", () => {
        stopRobotButton.disabled = false
        document.getElementById("searchForm").style.display = "block"
        document.getElementById("robotStatus").classList.add("hidden")
        logsContainer.innerHTML = ""; // Limpa os logs
        page2.classList.add("hidden")
        page1.classList.remove("hidden")
      })
      alert("Os robôs foram finalizados com sucesso!");
    } else {
      // Caso contrário, adiciona o log como texto normal
      logsContainer.innerHTML += `<p>${logMessage}</p>`;
      logsContainer.scrollTop = logsContainer.scrollHeight; // Rola para o final
    }
  }
});


function removeFormatting(phoneNumber) {
  return phoneNumber.replace(/[^+\d]/g, ""); // Mantém apenas números e o "+"
}

function startRobotProgress() {
  document.getElementById("robotProgressContainer").classList.remove("hidden")
}

function convertToMinutes(data, intervalName) {
  return (
    Number.parseInt(data[`${intervalName}_weeks`] || 0) * 7 * 24 * 60 +
    Number.parseInt(data[`${intervalName}_days`] || 0) * 24 * 60 +
    Number.parseInt(data[`${intervalName}_hours`] || 0) * 60 +
    Number.parseInt(data[`${intervalName}_minutes`] || 0)
  )
}

