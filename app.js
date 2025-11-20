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
      // Agregar línea roja centrada para alineación
      const lineaRoja = document.createElement("div");
      lineaRoja.style.position = "absolute";
      lineaRoja.style.top = "50%";
      lineaRoja.style.left = "50%";
      lineaRoja.style.transform = "translate(-50%, -50%)";
      lineaRoja.style.width = "350px";
      lineaRoja.style.height = "2px";
      lineaRoja.style.background = "red";
      lineaRoja.style.zIndex = "10";
      lineaRoja.id = "linea-roja-barcode";
      scannerDiv.style.position = "relative";
      scannerDiv.appendChild(lineaRoja);

      // Agregar contenedor de video para QuaggaJS
      const videoContainer = document.createElement("div");
      videoContainer.id = "quagga-video";
      videoContainer.style.width = "100%";
      videoContainer.style.height = "100%";
      scannerDiv.appendChild(videoContainer);

      // Mensaje de ayuda
      const ayuda = document.createElement("div");
      ayuda.textContent = "Enfoca el código de barras en la línea roja. Si está borroso, acerca o aleja la cámara.";
      ayuda.style.textAlign = "center";
      ayuda.style.fontSize = "1em";
      ayuda.style.marginTop = "8px";
      ayuda.style.color = "#d32f2f";
      scannerDiv.appendChild(ayuda);

      // Inicializar QuaggaJS
      if (window.Quagga) {
        window.Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: videoContainer,
            constraints: {
              facingMode: "environment"
            }
          },
          decoder: {
            readers: ["ean_reader", "ean_8_reader", "upc_reader", "upc_e_reader", "code_128_reader", "code_39_reader"]
          },
          locate: true
        }, function(err) {
          if (err) {
            scannerDiv.innerHTML = "No se pudo iniciar el escáner.";
            return;
          }
          window.Quagga.start();
        });
        window.Quagga.onDetected(function(result) {
          if (result && result.codeResult && result.codeResult.code) {
            // Animación de éxito visual
            const overlay = document.createElement("div");
            overlay.style.position = "absolute";
            overlay.style.top = "0";
            overlay.style.left = "0";
            overlay.style.width = "100%";
            overlay.style.height = "100%";
            overlay.style.background = "rgba(76,175,80,0.7)";
            overlay.style.display = "flex";
            overlay.style.alignItems = "center";
            overlay.style.justifyContent = "center";
            overlay.style.zIndex = "100";
            overlay.innerHTML = '<div style="color:#fff;font-size:2em;font-weight:bold;text-align:center;">✔ Código leído<br><span style="font-size:1.2em;">' + result.codeResult.code + '</span></div>';
            scannerDiv.appendChild(overlay);
            setTimeout(() => {
              codigoInput.value = result.codeResult.code;
              window.Quagga.stop();
              scannerDiv.innerHTML = "";
              buscarCodigo();
            }, 1200);
          }
        });
      } else {
        scannerDiv.innerHTML = "QuaggaJS no está cargado. Agrega la librería en el HTML.";
      }
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
const coincidenciasEl = document.getElementById('coincidencias');

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
  if (!c) {
    resultsEl.innerHTML = "";
    statusEl.textContent = "";
    const coincidenciasEl = document.getElementById('coincidencias');
    if (coincidenciasEl) coincidenciasEl.textContent = "";
    return;
  }
  //statusEl.textContent = "Buscando...";
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
  // Mostrar cantidad de coincidencias en el div 'coincidencias'
  const coincidenciasEl = document.getElementById('coincidencias');
  if (coincidenciasEl) {
    if (c && encontrados.length > 0) {
      if (encontrados.length === 1) {
        coincidenciasEl.textContent = '1 registro';
      } else {
        coincidenciasEl.textContent = `${encontrados.length} registros`;
      }
    } else {
      coincidenciasEl.textContent = "";
    }
  }
}

async function buscarDescripcion() {
  const q = descripcionInput.value.trim().toLowerCase();
  if (!q) {
    resultsEl.innerHTML = "";
    statusEl.textContent = "";
    const coincidenciasEl = document.getElementById('coincidencias');
    if (coincidenciasEl) coincidenciasEl.textContent = "";
    return;
  }
  //statusEl.textContent = "Buscando...";
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
  // Mostrar cantidad de coincidencias en el div 'coincidencias'
  const coincidenciasEl = document.getElementById('coincidencias');
  if (coincidenciasEl) {
    if (q && encontrados.length > 0) {
      if (encontrados.length === 1) {
        coincidenciasEl.textContent = '1 registro';
      } else {
        coincidenciasEl.textContent = `${encontrados.length} registros`;
      }
    } else {
      coincidenciasEl.textContent = "";
    }
  }
}

descripcionInput.addEventListener("input", buscarDescripcion);
codigoInput.addEventListener("input", buscarCodigo);
limpiarBtn.onclick = () => {
  resultsEl.innerHTML = "";
  statusEl.textContent = "";
  codigoInput.value = "";
  descripcionInput.value = "";
  const coincidenciasEl = document.getElementById('coincidencias');
  if (coincidenciasEl) coincidenciasEl.textContent = "";
  descripcionInput.focus();
  // Si QuaggaJS está activo, detener y limpiar el escáner
  const scannerDiv = document.getElementById("scanner-container");
  if (window.Quagga && scannerDiv && scannerDiv.childElementCount > 0) {
    try {
      window.Quagga.stop();
    } catch {}
    scannerDiv.innerHTML = "";
  }
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
          // Calcular si la fecha es menor a 1 día
          const ahora = new Date();
          const diffMs = ahora - fecha;
          const unDiaMs = 24 * 60 * 60 * 1000;
          const icono = diffMs < unDiaMs
            ? '<span style="color:#d32f2f;font-size:1.1em;vertical-align:middle;">&#128260;</span>'
            : '<span style="color:inherit;font-size:1.1em;vertical-align:middle;">&#128260;</span>';
          leyenda.innerHTML = `${icono} ${fechaFormateada}`;
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
