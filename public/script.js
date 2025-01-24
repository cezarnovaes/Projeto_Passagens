let groupedLocationsConfig = null

document.addEventListener("DOMContentLoaded", () => {
  fetchLocations()

  const form = document.getElementById("searchForm")
  const stopRobotButton = document.getElementById("stopRobotButton")

  renderPeriodSelector()
  renderFlightConfig()
  renderLocationSelector()
  renderAdditionalFilters()
  renderRobotConfig()
  setupFieldValidations()
  setupTripOptionsBehavior()

  form.addEventListener("submit", handleSubmit)
  const submitButton = document.querySelector('button[type="submit"]')
  submitButton.disabled = true
  stopRobotButton.addEventListener("click", handleStopRobot)
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
      const specificDates = document.getElementById("specificDates")
      const departureDate = document.getElementById("departureDate")
      const returnDate = document.getElementById("returnDate")

      if (e.target.value === "specific") {
        specificDates.classList.remove("hidden")
        departureDate.required = true
        returnDate.required = true
      } else {
        specificDates.classList.add("hidden")
        departureDate.required = false
        returnDate.required = false
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
      returnDateField.disabled = false;
      returnDateField.required = true;

      // Adiciona o asterisco ao label, caso não exista
      if (!returnDateLabel.innerHTML.includes("*")) {
        returnDateLabel.innerHTML += ' <span style="color: red;">*</span>';
      }
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
    }else{
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
      ${ city ? `
        <div class="result-group">
          ${
            city
              ? `
            <div class="result-item" data-value="${city.code}-${city.country}-${city.name}" data-type="CITY">
              ${city.name} (Todos os Aeroportos)
            </div>
          `
              : ""
          }
          ${airports
            .map(
              (airport) => `
            <div class="result-item" data-value="${airport.code}-${airport.country}-${airport.name}" data-type="AIRPORT">
              ${airport.name} (Aeroporto)
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
        <div class="result-group-title others">Outras</div>
        ${otherGroup
          .map(
            (location) => `
          <div class="result-item" data-value="${location.code}-${location.country}-${location.name}" data-type="${location.type}">
            ${location.name} (${location.type})
          </div>
        `,
          )
          .join("")}
      </div>
    `
      : ""
  ].join("")

  container.innerHTML = html

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
        <div id="specificDates" class="hidden">
            <div class="flex">
                <div>
                    <label for="departureDate">Data de Saída<span style="color: red;">*</span></label>
                    <input type="date" id="departureDate" name="departureDate">
                </div>
                <div>
                    <label for="returnDate">Data de Retorno<span style="color: red;">*</span></label>
                    <input type="date" id="returnDate" name="returnDate">
                </div>
            </div>
        </div>
    `

  const periodTypeInputs = container.querySelectorAll('input[name="periodType"]')
  const specificDates = document.getElementById("specificDates")

  periodTypeInputs.forEach((input) => {
    input.addEventListener("change", (e) => {
      specificDates.classList.toggle("hidden", e.target.value !== "specific")
    })
  })
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

function renderRobotConfig() {
  const container = document.getElementById("robotConfig")
  container.innerHTML = `
        <h2>Configuração do Robô</h2>
        <div class="space-y-4">
            ${renderIntervalInput("updateInterval", "Intervalo de Atualização")}
            ${renderIntervalInput("messageInterval", "Intervalo de Envio de Mensagens")}
        </div>
    `
}

function renderIntervalInput(name, label) {
  return `
        <div>
            <label>${label}</label>
            <div class="interval-input">
                <div>
                    <label for="${name}_days">Dias &#8203;</label>
                    <input type="number" id="${name}_days" name="${name}_days" min="0" value="0">
                </div>
                <div>
                    <label for="${name}_hours">Horas &#8203;</label>
                    <input type="number" id="${name}_hours" name="${name}_hours" min="0" value="1">
                </div>
                <div>
                    <label for="${name}_minutes">Minutos &#8203;</label>
                    <input type="number" id="${name}_minutes" name="${name}_minutes" min="0" value="0">
                </div>
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
    const formData = new FormData(form)
    const data = Object.fromEntries(formData)

    const originInput = document.getElementById("originSearch")
    const destinationInput = document.getElementById("destinationSearch")

    data.origin = originInput.getAttribute("data-code") + "-" + originInput.getAttribute("data-country") + "-" + originInput.value
    data.destination = destinationInput.value != "" ? destinationInput.getAttribute("data-code") + "-" + destinationInput.getAttribute("data-country") + "-" + destinationInput.value : ""

    data.updateInterval = convertToMinutes(data, "updateInterval")
    data.messageInterval = convertToMinutes(data, "messageInterval")

    if (data.updateInterval < 30 || data.messageInterval < 30) {
      alert("O intervalo de atualização e envio de mensagens devem ser pelo menos de 30 minutos.")
      return
    }

    data.groupedLocationsConfig = filterGroupedLocations(groupedLocationsConfig)
    data.showMainResults = false

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
  const logsContainer = document.getElementById("robotLogs")
  if (logsContainer) {
    logsContainer.innerHTML += `<p>${logMessage}</p>`
    logsContainer.scrollTop = logsContainer.scrollHeight
  }
})

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

