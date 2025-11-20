const DATA_URL =
  "https://pub-003150e7951b49dcafdf09e331520cd5.r2.dev/productos.json";
let productosCache = null;
let productosDescargados = false;

const codigoInput = document.getElementById("codigoInput");
const descripcionInput = document.getElementById("descripcionInput");
const buscarCodigoBtn = document.getElementById("buscarCodigoBtn");
const scanCodigoBtn = document.getElementById("scanCodigoBtn");
const scannerContainer = document.getElementById("scanner-container");
// Detectar si es móvil
function esMovil() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(
    navigator.userAgent
  );
}

if (scanCodigoBtn) {
  scanCodigoBtn.style.display = esMovil() ? "" : "none";
  if (esMovil()) {
    scanCodigoBtn.onclick = () => {
      // Crear contenedor para el escáner si no existe
      let scannerDiv = document.getElementById("scanner-container");
      if (!scannerDiv) {
        scannerDiv = document.createElement("div");
        scannerDiv.id = "scanner-container";
        scannerDiv.style.marginTop = "16px";
        scannerDiv.style.width = "100vw";
        scannerDiv.style.maxWidth = "500px";
        scannerDiv.style.height = "400px";
        scannerDiv.style.margin = "0 auto";
        document.body.appendChild(scannerDiv);
      }
      scannerDiv.innerHTML = ""; // Limpiar contenido previo

      // Inicializar el escáner con área más grande
      const html5QrCode = new Html5Qrcode("scanner-container");
      html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 350, height: 350 }
        },
        (decodedText, decodedResult) => {
          // Cuando se escanea un código, ponerlo en el input y detener el escáner
          codigoInput.value = decodedText;
          html5QrCode.stop();
          scannerDiv.innerHTML = "";
          buscarCodigo();
        },
        (errorMessage) => {
          // Puedes mostrar errores si lo deseas
        }
      ).catch((err) => {
        scannerDiv.innerHTML = "No se pudo iniciar el escáner.";
      });
    };
  }
}

let scannerActivo = false;
// Funcionalidad de escaneo eliminada
const buscarDescripcionBtn = document.getElementById("buscarDescripcionBtn");
const resultsEl = document.getElementById("results");
const statusEl = document.getElementById("status");
const ivaInput = document.getElementById("ivaInput");
const limpiarBtn = document.getElementById("limpiarBtn");

function decodeLatin1(str) {
  // Decodifica caracteres mal codificados (ej: Cl�sica -> Clásica)
  try {
    // Convierte la cadena en bytes y decodifica como latin1
    const bytes = new Uint8Array(str.split('').map(c => c.charCodeAt(0)));
    let decoded = new TextDecoder('WINDOWS-1252').decode(bytes);
    // Solo reemplazo de ñ
    decoded = decoded.replace(/ý/g, 'ñ').replace(/Ý/g, 'Ñ');
    // Corrección específica para 'Cafñ' -> 'Café'
    decoded = decoded.replace(/Cafñ/g, 'Café');
    // Corrección específica para 'Azñcar' -> 'Azúcar'
    decoded = decoded.replace(/Azñcar/g, 'Azúcar');
    // Corrección para 'ñn' -> 'ón' (ejemplo Tradiciñn -> Tradición)
    decoded = decoded.replace(/ñn/g, 'ón');
    return decoded;
  } catch {
    return str;
  }
}

function renderProducto(prod) {
  const div = document.createElement("div");
  div.className = "card";

  const pVenta = Number(prod.PVENTA || 0);
  const formatoCLP = (valor) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(valor);
  const descripcionUTF8 = decodeLatin1(prod.DESCRIPCION);

  // Contenido a copiar
  const textoCopiar = `${prod.CODIGO} — ${descripcionUTF8} — ${formatoCLP(
    pVenta
  )}`;

  div.innerHTML = `
    <div style="position:relative;">
      <span style="position:absolute;top:0;left:0;font-size:0.66em;font-weight:bold;color:#555;">${
        prod.CODIGO
      }</span>
      <div style="display:flex;flex-direction:column;">
              <div style="display:flex;align-items:center;justify-content:flex-end;">
          <button class="copiar-btn" title="Copiar" style="font-size:0.9em;padding:4px 10px;margin-left:10px;cursor:pointer;">📋</button>
        </div>
        <span style="font-size:1.1em;font-weight:bold;margin-bottom:4px;">
          ${descripcionUTF8}
        </span>

      </div>
    </div>
    <div style="font-size:2em;color:#1976d2;font-weight:bold;margin-bottom:8px;">
      ${formatoCLP(pVenta)}
    </div>
  `;

  // Funcionalidad copiar
  const btn = div.querySelector(".copiar-btn");
  btn.onclick = () => {
    // Método moderno
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textoCopiar).then(() => {
        btn.textContent = "✔";
        setTimeout(() => {
          btn.textContent = "📋";
        }, 1200);
      });
    } else {
      // Método alternativo para navegadores sin clipboard API
      const temp = document.createElement("textarea");
      temp.value = textoCopiar;
      temp.setAttribute("readonly", "");
      temp.style.position = "absolute";
      temp.style.left = "-9999px";
      document.body.appendChild(temp);
      temp.select();
      try {
        document.execCommand("copy");
        btn.textContent = "✔";
        setTimeout(() => {
          btn.textContent = "📋";
        }, 1200);
      } catch (e) {
        alert("No se pudo copiar");
      }
      document.body.removeChild(temp);
    }
  };

  return div;
}

async function buscarCodigo() {
  const c = codigoInput.value.trim();
  if (!c) return;
  statusEl.textContent = "Buscando...";
  resultsEl.innerHTML = "";

  if (!productosCache) {
    statusEl.textContent = "Cargando productos...";
    return;
  }
  // Buscar por código exacto
  const encontrados = productosCache.data.filter(
    (p) => String(p.CODIGO).trim().includes(c)
  );
  encontrados.forEach((p) => resultsEl.appendChild(renderProducto(p)));
  statusEl.textContent = "";
}

async function buscarDescripcion() {
  const q = descripcionInput.value.trim().toLowerCase();
  if (!q) return;
  statusEl.textContent = "Buscando...";
  resultsEl.innerHTML = "";

  if (!productosCache) {
    statusEl.textContent = "Cargando productos...";
    return;
  }
  // Buscar por descripción (contiene, insensible a mayúsculas)
  const encontrados = productosCache.data.filter((p) =>
    decodeLatin1(p.DESCRIPCION).toLowerCase().includes(q)
  );
  encontrados.forEach((p) => resultsEl.appendChild(renderProducto(p)));
  statusEl.textContent = "";
}

descripcionInput.addEventListener("input", buscarDescripcion);
codigoInput.addEventListener("input", buscarCodigo);
limpiarBtn.onclick = () => {
  resultsEl.innerHTML = "";
  statusEl.textContent = "";
  codigoInput.value = "";
  descripcionInput.value = "";
  descripcionInput.focus();
};

// Descargar y cachear productos al cargar la página
window.addEventListener("DOMContentLoaded", async () => {
  limpiarBtn.click();
  if (!productosDescargados) {
    try {
      const res = await fetch(DATA_URL);
      productosCache = await res.json();
      productosDescargados = true;
      // Mostrar leyenda de fecha de creación si existe
      if (productosCache && productosCache.creationDate) {
        let leyenda = document.getElementById("leyenda-fecha");
        if (leyenda) {
          // Formatear la fecha a yyyy-MM-dd hh:mm:ss
          const fecha = new Date(productosCache.creationDate);
          const yyyy = fecha.getFullYear();
          const MM = String(fecha.getMonth() + 1).padStart(2, '0');
          const dd = String(fecha.getDate()).padStart(2, '0');
          const hh = String(fecha.getHours()).padStart(2, '0');
          const mm = String(fecha.getMinutes()).padStart(2, '0');
          const ss = String(fecha.getSeconds()).padStart(2, '0');
          const fechaFormateada = `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
          leyenda.textContent = `Actualización: ${fechaFormateada}`;
        }
      }
    } catch (e) {
      statusEl.innerHTML = `Error al descargar productos. <button id='recargarBtn' style='margin-left:12px;padding:6px 18px;font-size:1em;border-radius:6px;border:none;background:#1976d2;color:#fff;cursor:pointer;'>Recargar</button>`;
      const recargarBtn = document.getElementById('recargarBtn');
      if (recargarBtn) {
        recargarBtn.onclick = () => window.location.reload();
      }
    }
  }
});
