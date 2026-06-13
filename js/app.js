pdfjsLib.GlobalWorkerOptions.workerSrc =   'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

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

    arquivos = [...e.dataTransfer.files].filter(f =>
        f.name.toLowerCase().endsWith(".pdf")
    );

    atualizarStatus();
});

// Botões
document.getElementById("btnProcessar").addEventListener("click", processarPDFs);
document.getElementById("btnZip").addEventListener("click", baixarZIP);
document.getElementById("btnExcel").addEventListener("click", exportarExcel);
document.getElementById("btnLimpar").addEventListener("click", limparTudo);
document.getElementById("pesquisa").addEventListener("input", pesquisar);

// Funções
function atualizarStatus() {
    document.getElementById("status").textContent =
        `${arquivos.length} PDF(s) selecionado(s)`;
}

async function extrairTexto(file) {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    let texto = "";

    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();

        texto += content.items.map(i => i.str).join(" ");
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

            const placa = extrairCampo(
                /PLACA:\s*([A-Z0-9]+)/i,
                texto,
                "-"
            );

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
                novoNome
            });

            adicionarLinha(resultados[resultados.length - 1]);

        } catch (err) {
            console.error(arquivo.name, err);
        }

        processados++;
