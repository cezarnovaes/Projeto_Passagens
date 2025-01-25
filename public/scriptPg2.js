document.addEventListener("DOMContentLoaded", () => {
    renderRobotConfig()

    const sendToGroupRadio = document.getElementById("sendToGroup");
    const sendToContactsRadio = document.getElementById("sendToContacts");
    const groupConfig = document.getElementById("groupConfig");
    const contactsConfig = document.getElementById("contactsConfig");

    sendToGroupRadio.addEventListener("change", () => {
        groupConfig.classList.remove("hidden");
        contactsConfig.classList.add("hidden");
    });

    sendToContactsRadio.addEventListener("change", () => {
        groupConfig.classList.add("hidden");
        contactsConfig.classList.remove("hidden");
    });
})

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