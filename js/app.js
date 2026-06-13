console.log("APP OK");

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let arquivos = [];
let resultados = [];

const dropArea = document.getElementById("dropArea");
const fileInput = document.getElementById("fileInput");

// Selecionar arquivos
document.getElementById("btnSelecionar").addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", (e) => {
  arquivos = [...e.target.files];
  atualizarStatus();
});

// Drag and drop
dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("dragover");
});

dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("dragover");
});

dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("dragover");

  arquivos = [...e.dataTransfer.files].filter((f) =>
    f.name.toLowerCase().endsWith(".pdf")
  );

  atualizarStatus();
});

// Botões
document
  .getElementById("btnProcessar")
  .addEventListener("click", processarPDFs);

document.getElementById("btnZip").addEventListener("click", baixarZIP);
document.getElementById("btnExcel").addEventListener("click", exportarExcel);
document.getElementById("btnLimpar").addEventListener("click", limparTudo);
document.getElementById("pesquisa").addEventListener("input", pesquisar);

// ================= FUNÇÕES =================

function atualizarStatus() {
  document.getElementById(
    "status"
  ).textContent = `${arquivos.length} PDF(s) selecionado(s)`;
}

async function extrairTexto(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let texto = "";

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    texto += content.items.map((i) => i.str).join(" ");
    texto += "\n";
  }

  return texto;
}

function extrairCampo(regex, texto, padrao) {
  const m = texto.match(regex);
  return m ? m[1].trim() : padrao;
}

function limparNome(nome) {
  return nome
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function processarPDFs() {
  resultados = [];
  document.getElementById("resultado").innerHTML = "";

  let processados = 0;

  for (const arquivo of arquivos) {
    try {
      const texto = await extrairTexto(arquivo);

      let cte = extrairCampo(/NÚMERO\s+([\d\.]+)/i, texto, "SEM_CTE");
      cte = cte.replace(/\./g, "");

      const motorista = limparNome(
        extrairCampo(
          /Motorista:\s*(.*?)\s*-\s*RG/i,
          texto,
          "SEM_MOTORISTA"
        )
      );

      const id = extrairCampo(/ID\s+([A-Z0-9\-]+)/i, texto, "SEM_ID");

      const origem = extrairCampo(
        /ORIGEM DA PRESTAÇÃO\s+([A-Z\/ ]+)/i,
        texto,
        "-"
      );

      const destino = extrairCampo(
        /DESTINO DA PRESTAÇÃO\s+([A-Z\/ ]+)/i,
        texto,
        "-"
      );

      const placa = extrairCampo(/PLACA:\s*([A-Z0-9]+)/i, texto, "-");

      const valor = extrairCampo(
        /VALOR A RECEBER\s+([\d\.\,]+)/i,
        texto,
        "-"
      );

      const novoNome = `CTE ${cte} - ${id} - ${motorista}.pdf`;

      resultados.push({
        arquivo,
        cte,
        id,
        motorista,
        origem,
        destino,
        placa,
        valor,
        novoNome,
      });

      adicionarLinha(resultados[resultados.length - 1]);
    } catch (err) {
      console.error(arquivo.name, err);
    }

    processados++;
    atualizarProgresso(processados, arquivos.length);
  }

  atualizarCards();
}

function adicionarLinha(d) {
  document.getElementById("resultado").innerHTML += `
        <tr>
            <td>${d.arquivo.name}</td>
            <td>${d.cte}</td>
            <td>${d.id}</td>
            <td>${d.motorista}</td>
            <td>${d.origem}</td>
            <td>${d.destino}</td>
            <td>${d.valor}</td>
            <td>${d.placa}</td>
            <td>${d.novoNome}</td>
        </tr>
    `;
}

function atualizarProgresso(atual, total) {
  const pct = Math.round((atual / total) * 100);

  document.getElementById("progressBar").style.width = pct + "%";
  document.getElementById("status").textContent = `${pct}% concluído`;
}

function atualizarCards() {
  document.getElementById("totalArquivos").textContent = resultados.length;

  const motoristas = new Set(resultados.map((x) => x.motorista));
  document.getElementById("totalMotoristas").textContent = motoristas.size;

  const destinos = new Set(resultados.map((x) => x.destino));
  document.getElementById("totalDestinos").textContent = destinos.size;
}

async function baixarZIP() {
  if (!resultados.length) {
    alert("Processe os PDFs primeiro.");
    return;
  }

  const zip = new JSZip();

  for (const item of resultados) {
    const bytes = await item.arquivo.arrayBuffer();
    zip.file(item.novoNome, bytes);
  }

  const blob = await zip.generateAsync({ type: "blob" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "CTEs_Renomeados.zip";
  a.click();
}

function exportarExcel() {
  const dados = resultados.map((r) => ({
    CTE: r.cte,
    ID: r.id,
    Motorista: r.motorista,
    Origem: r.origem,
    Destino: r.destino,
    Valor: r.valor,
    Placa: r.placa,
    Arquivo: r.novoNome,
  }));

  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "CTEs");
  XLSX.writeFile(wb, "CTEs.xlsx");
}

function pesquisar() {
  const termo = this.value.toLowerCase();

  document.querySelectorAll("#resultado tr").forEach((tr) => {
    tr.style.display = tr.innerText.toLowerCase().includes(termo)
      ? ""
      : "none";
  });
}

function limparTudo() {
  arquivos = [];
  resultados = [];

  fileInput.value = "";

  document.getElementById("resultado").innerHTML = "";
  document.getElementById("progressBar").style.width = "0%";

  document.getElementById("status").textContent =
    "Aguardando arquivos...";

  document.getElementById("totalArquivos").textContent = "0";
  document.getElementById("totalMotoristas").textContent = "0";
  document.getElementById("totalDestinos").textContent = "0";
}
