let groupedLocationsConfig = null;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("searchForm");
  const robotStatus = document.getElementById("robotStatus");
  const stopRobotButton = document.getElementById("stopRobotButton");

  renderPeriodSelector();
  renderLocationSelector();
  renderFlightConfig();
  renderAdditionalFilters();
  renderRobotConfig();

  form.addEventListener("submit", handleSubmit);
  stopRobotButton.addEventListener("click", handleStopRobot);
});

async function renderLocationSelector() {
  const container = document.getElementById("locationSelector");
  container.innerHTML = '<h2>Origem e Destino</h2> <div class="loading"></div>'; // Indicador de carregamento

  try {
    const groupedLocations = await fetchLocations();

    container.innerHTML = `
      <h2>Origem e Destino</h2>
      <div class="flex">
        <div>
          <label for="origin">Origem</label>
          <select id="origin" name="origin">
            <option value="">Selecione a origem</option>
            ${renderLocationOptions(groupedLocations)}
          </select>
        </div>
        <div>
          <label for="destination">Destino</label>
          <select id="destination" name="destination">
            <option value="">Todos os destinos</option>
            ${renderLocationOptions(groupedLocations)}
          </select>
        </div>
      </div>
    `;

    const originSelect = document.getElementById("origin")
    const saoPauloOption = Array.from(originSelect.options).find(
      (option) => option.text.toLowerCase().includes("são paulo") && option.value.startsWith("SAO"),
    )
    if (saoPauloOption) {
      saoPauloOption.selected = true
      // Trigger a change event to update any dependent fields
      const event = new Event("change")
      originSelect.dispatchEvent(event)
    }
  } catch (error) {
    console.error("Error fetching locations:", error);
    container.innerHTML = "<h2>Origem e Destino</h2> <p>Erro ao carregar localizações. Por favor, tente novamente mais tarde.</p>";
  }
}

async function fetchLocations() {
  try {
    const response = await fetch('/api/fetch-locations-booking');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const results = await response.json();
    return groupLocationsByCityCode(flattenResults(results));
  } catch (error) {
    console.error("Error fetching locations:", error);
    throw error;
  }
}


function flattenResults(results) {
  return Object.values(results).flat();
}

function groupLocationsByCityCode(locations) {
  const grouped = {};
  locations.forEach((location) => {
    const cityCode = location.city || location.code;
    if (!grouped[cityCode]) {
      grouped[cityCode] = [];
    }
    grouped[cityCode].push(location);
  });
  return grouped;
}

function renderLocationOptions(groupedLocations) {
  // Inicializa os grupos de cidades e locais sem agrupamento
  const cityGroups = []
  const ungroupedLocations = []
  groupedLocationsConfig = groupedLocations
  // Itera sobre os grupos de localização
  Object.entries(groupedLocations).forEach(([cityCode, locations]) => {
    const city = locations.find((loc) => loc.type === "CITY")
    const airports = locations.filter((loc) => loc.type === "AIRPORT")

    if (city) {
      // Agrupa a cidade com seus aeroportos
      const options = [
        `<option value="${city.code}-${city.country}-${city.name}">
          ${city.name} (CITY)
        </option>`,
        ...airports.map(
          (airport) => `
          <option value="${airport.code}-${airport.country}-${airport.name}">
            ${airport.name} (AIRPORT)
          </option>
        `,
        ),
      ].join("")

      // Adiciona ao grupo de cidades
      cityGroups.push({
        name: city.name,
        html: `
          <optgroup label="${city.name}">
            ${options}
          </optgroup>
        `,
      })
    } else {
      // Locais que não possuem uma cidade relacionada
      ungroupedLocations.push(...locations)
    }
  })

  // Ordena os grupos de cidades alfabeticamente
  cityGroups.sort((a, b) => a.name.localeCompare(b.name)) 

  // Ordena os locais não agrupados
  ungroupedLocations.sort((a, b) => (a.name || "").localeCompare(b.name || ""))

  // Cria as opções dos locais não agrupados
  const ungroupedOptions = ungroupedLocations
    .map(
      (location) => `
        <option value="${location.code}-${location.country}-${location.name}">
          ${location.name} (${location.type})
        </option>
      `,
    )
    .join("")

  // Combina os grupos de cidades ordenados com os locais não agrupados
  return `
    ${cityGroups.map((group) => group.html).join("")}
    ${ungroupedLocations.length > 0 ? `<optgroup label="Outros">${ungroupedOptions}</optgroup>` : ""}
  `
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleStopRobot() {
  try {
    const stopRobotResponse = await fetch("/api/stop-robos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: 'todos',
    });

    if (!stopRobotResponse.ok) {
      throw new Error("Failed to stop the robot");
    }

    alert("Robô parado com sucesso!");
    // Voltar para o estado inicial
    document.getElementById("searchForm").style.display = "block";
    document.getElementById("robotStatus").classList.add("hidden");
  } catch (error) {
    console.error("Error:", error);
    alert("Ocorreu um erro ao parar o robô. Por favor, tente novamente.");
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
                    <label for="departureDate">Data de Saída</label>
                    <input type="date" id="departureDate" name="departureDate">
                </div>
                <div>
                    <label for="returnDate">Data de Retorno</label>
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
                <input type="number" id="resultCount" name="resultCount" min="1" value="10">
            </div>
            <div class="checkbox-container">
                <input type="checkbox" id="useTopDestinations" name="useTopDestinations">
                <label for="useTopDestinations">
                    Mostrar apenas os principais resultados
                    <span class="tooltip">ℹ️
                        <span class="tooltiptext">
                            Esta opção filtra os resultados para mostrar
                            apenas as principais origens e destinos
                            com base em popularidade e frequência
                            de viagens.
                        </span>
                    </span>
                </label>
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
                    <input type="number" id="${name}_weeks" name="${name}_weeks" min="0" value="0">
                    <label for="${name}_weeks">Semanas</label>
                </div>
                <div>
                    <input type="number" id="${name}_days" name="${name}_days" min="0" value="0">
                    <label for="${name}_days">Dias</label>
                </div>
                <div>
                    <input type="number" id="${name}_hours" name="${name}_hours" min="0" value="0">
                    <label for="${name}_hours">Horas</label>
                </div>
                <div>
                    <input type="number" id="${name}_minutes" name="${name}_minutes" min="0" value="0">
                    <label for="${name}_minutes">Minutos</label>
                </div>
            </div>
        </div>
    `
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  // Converte intervalos para minutos
  data.updateInterval = convertToMinutes(data, "updateInterval");
  data.messageInterval = convertToMinutes(data, "messageInterval");

  // Adiciona groupedLocationsConfig ao objeto data
  data.groupedLocationsConfig = groupedLocationsConfig;

  // Captura o estado do checkbox "Mostrar apenas os principais resultados"
  const checkbox = form.querySelector('input[name="showMainResults"]');
  data.showMainResults = checkbox ? checkbox.checked : false;

  console.log(data);

  try {
    const startCrawlerResponse = await fetch("/api/run-crawler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const startLeitorResponse = await fetch("/api/run-leitor-passagens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!startCrawlerResponse.ok) {
      throw new Error("Erro ao iniciar robô");
    } else if (!startLeitorResponse.ok) {
      throw new Error("Erro ao iniciar leitor");
    }

    // Esconde o formulário e exibe o status do robô
    form.style.display = "none";
    document.getElementById("robotStatus").classList.remove("hidden");
  } catch (error) {
    console.error("Error:", error);
    alert("Ocorreu um erro ao iniciar o robô. Por favor, tente novamente.");
  }
}


function convertToMinutes(data, intervalName) {
  return (
    Number.parseInt(data[`${intervalName}_weeks`] || 0) * 7 * 24 * 60 +
    Number.parseInt(data[`${intervalName}_days`] || 0) * 24 * 60 +
    Number.parseInt(data[`${intervalName}_hours`] || 0) * 60 +
    Number.parseInt(data[`${intervalName}_minutes`] || 0)
  )
}

