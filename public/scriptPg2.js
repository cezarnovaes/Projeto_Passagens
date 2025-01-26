document.addEventListener("DOMContentLoaded", () => {
  renderRobotConfig()

  const sendToGroupRadio = document.getElementById("sendToGroup");
  const sendToContactsRadio = document.getElementById("sendToContacts");
  const groupConfig = document.getElementById("groupConfig");
  const contactsConfig = document.getElementById("contactsConfig");

  sendToGroupRadio.addEventListener("change", () => {
    if (sendToGroupRadio.checked) {
      sendToContactsRadio.checked = false
    } else {
      sendToContactsRadio.checked = true
    }
    groupConfig.classList.remove("hidden");
    contactsConfig.classList.add("hidden");
  });

  sendToContactsRadio.addEventListener("change", () => {
    if (sendToContactsRadio.checked) {
      sendToGroupRadio.checked = false
    } else {
      sendToGroupRadio.checked = true
    }
    groupConfig.classList.add("hidden");
    contactsConfig.classList.remove("hidden");
  });
  const phoneInputs = document.querySelectorAll(".number-format");

  const addContactButton = document.getElementById("addContactButton");
  const contactsTable = document.getElementById("contactsTable").querySelector("tbody");

  addContactButton.addEventListener("click", () => {
    const contactNumber = document.getElementById("contactNumber").value;
    const contactName = document.getElementById("contactName").value;
    const groupName = document.getElementById("groupName").value;

    const sendToGroupRadio = document.getElementById("sendToGroup");
    const sendToContactsRadio = document.getElementById("sendToContacts");

    if (sendToContactsRadio.checked) {
      if (contactNumber && contactName) {
        contatos.push({ number: removeFormatting(contactNumber).replace("+", ""), name: contactName });

        const row = document.createElement("tr");
        row.innerHTML = `
              <td>${contactNumber}</td>
              <td>${contactName}</td>
              <td><button type="button" class="btn-danger removeContactButton">Remover</button></td>
          `;
        contactsTable.appendChild(row);

        document.getElementById("contactNumber").value = "";
        document.getElementById("contactName").value = "";

        row.querySelector(".removeContactButton").addEventListener("click", () => {
          contactsTable.removeChild(row);
          contatos = contatos.filter(contact => contact.number !== contactNumber);
        });
      } else {
        if (!contactNumber) {
          document.getElementById("contactNumber").focus()
        } else {
          document.getElementById("contactName").focus()
        }
      }
    } else if (sendToGroupRadio.checked) {
      if (groupName) {
        contatos.push({ number: "Grupo", name: groupName });

        const row = document.createElement("tr");
        row.innerHTML = `
              <td>Grupo</td>
              <td>${groupName}</td>
              <td><button type="button" class="btn-danger removeContactButton">Remover</button></td>
          `;
        contactsTable.appendChild(row);

        document.getElementById("groupName").value = "";

        row.querySelector(".removeContactButton").addEventListener("click", () => {
          contactsTable.removeChild(row);
          contatos = contatos.filter(contact => contact.name !== groupName);
        });
      } else {
        document.getElementById("groupName").focus()
      }
    }
  });

  phoneInputs.forEach((input) => {
    input.addEventListener("input", (e) => {
      let value = e.target.value;
      const maxLength = 19;
      value = value.replace(/[^+\d]/g, "");

      if (!value.startsWith("+")) {
        value = "+" + value;
      }

      if (value.length > 3) {
        value = value.replace(/^(\+\d{2})(\d)/, "$1 $2");
      }
      if (value.length > 6) {
        value = value.replace(/^(\+\d{2})\s(\d{2})(\d)/, "$1 ($2) $3");
      }
      if (value.length > 12) {
        value = value.replace(/^(\+\d{2})\s\((\d{2})\)\s(\d{5})(\d)/, "$1 ($2) $3-$4");
      }

      if (value.length > maxLength) {
        value = value.slice(0, maxLength);
      }

      e.target.value = value;
    });
  });
  sendToGroupRadio.checked = true;
  sendToGroupRadio.dispatchEvent(new Event("change"))
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
                      <label for="${name}_days">Dias</label>
                      <input type="number" id="${name}_days" name="${name}_days" min="0" value="0">
                  </div>
                  <div>
                      <label for="${name}_hours">Horas</label>
                      <input type="number" id="${name}_hours" name="${name}_hours" min="0" value="1">
                  </div>
                  <div>
                      <label for="${name}_minutes">Minutos</label>
                      <input type="number" id="${name}_minutes" name="${name}_minutes" min="0" value="0">
                  </div>
              </div>
          </div>
      `
}