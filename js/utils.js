/* ==========================================================================
   PC-3104 Retro Pixel Studio - Utility Helpers & Converters (utils.js)
   ========================================================================== */

// --- Global UI Helpers ---

function showLoading(show) {
  if (show) {
    DOM.loadingOverlay.classList.remove("hidden");
  } else {
    DOM.loadingOverlay.classList.add("hidden");
  }
}

function updateStatus(text) {
  DOM.statusText.textContent = text;
}

// --- Color Conversion & Preprocessing Helpers ---

// Convert flat pixels buffer to grayscale
function convertToGrayscale(pixels) {
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    // Perceptual grayscale formula
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    pixels[i] = gray;
    pixels[i + 1] = gray;
    pixels[i + 2] = gray;
  }
}

// Transform any palette into green scales based on perceived brightness
function makeMonochromePalette(basePalette) {
  return basePalette.map(color => {
    const gray = Math.round(0.299 * color.r + 0.587 * color.g + 0.114 * color.b);
    return {
      r: Math.round(gray * 0.1),  // subtle dark base
      g: gray,                    // scale pure bright green
      b: Math.round(gray * 0.15)  // subtle tint phosphor glow
    };
  });
}

// Draw color slots in "パレット" tab
function renderPalettePreview(palette) {
  DOM.paletteColors.innerHTML = "";
  if (!palette) {
    DOM.paletteColors.innerHTML = "<div style='grid-column: 1/-1; text-align: center; color: #555; padding-top: 15px;'>フルカラーモード（制限なし）</div>";
    return;
  }

  palette.forEach(color => {
    const swatch = document.createElement("div");
    swatch.className = "color-swatch";
    swatch.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
    swatch.title = `RGB: ${color.r}, ${color.g}, ${color.b}`;
    DOM.paletteColors.appendChild(swatch);
  });
}

// Find closest RGB color using Euclidean distance formula
function findClosestColor(r, g, b, palette) {
  let closestColor = palette[0];
  let minDistanceSq = Infinity;

  // Linear scan - highly optimized loop
  for (let i = 0; i < palette.length; i++) {
    const pal = palette[i];
    const dr = r - pal.r;
    const dg = g - pal.g;
    const db = b - pal.b;

    // Perceptual weighting provides more natural visual mapping
    const dSq = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;

    if (dSq < minDistanceSq) {
      minDistanceSq = dSq;
      closestColor = pal;
    }
  }

  return closestColor;
}

// --- CIELAB (Lab) Perceptually Uniform Color Space Conversion Utilities ---

// Convert RGB to XYZ (under D65 standard illuminant reference point)
function rgbToXyz(r, g, b) {
  let rNormal = r / 255;
  let gNormal = g / 255;
  let bNormal = b / 255;

  // Inverse sRGB gamma companding to linear RGB
  rNormal = rNormal > 0.04045 ? Math.pow((rNormal + 0.055) / 1.055, 2.4) : rNormal / 12.92;
  gNormal = gNormal > 0.04045 ? Math.pow((gNormal + 0.055) / 1.055, 2.4) : gNormal / 12.92;
  bNormal = bNormal > 0.04045 ? Math.pow((bNormal + 0.055) / 1.055, 2.4) : bNormal / 12.92;

  // Matrix multiplication for D65 white reference
  const x = rNormal * 0.4124 + gNormal * 0.3576 + bNormal * 0.1805;
  const y = rNormal * 0.2126 + gNormal * 0.7152 + bNormal * 0.0722;
  const z = rNormal * 0.0193 + gNormal * 0.1192 + bNormal * 0.9505;

  return { x: x * 100, y: y * 100, z: z * 100 };
}

// Convert XYZ to CIELAB (Lab) color space
function xyzToLab(x, y, z) {
  const refX = 95.047;
  const refY = 100.000;
  const refZ = 108.883;

  let xN = x / refX;
  let yN = y / refY;
  let zN = z / refZ;

  const fx = xN > 0.008856 ? Math.pow(xN, 1 / 3) : (7.787 * xN) + (16 / 116);
  const fy = yN > 0.008856 ? Math.pow(yN, 1 / 3) : (7.787 * yN) + (16 / 116);
  const fz = zN > 0.008856 ? Math.pow(zN, 1 / 3) : (7.787 * zN) + (16 / 116);

  const L = yN > 0.008856 ? (116 * Math.pow(yN, 1 / 3)) - 16 : 903.3 * yN;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return { L, a, b };
}

// Direct helper to convert RGB to CIELAB space
function rgbToLab(r, g, b) {
  const xyz = rgbToXyz(r, g, b);
  return xyzToLab(xyz.x, xyz.y, xyz.z);
}

// Find closest color using perceptually uniform Lab distance
function findClosestColorLab(r, g, b, paletteLab, useLightnessOnly) {
  const pixelLab = rgbToLab(r, g, b);
  let closestColor = paletteLab[0].color;
  let minDistanceSq = Infinity;

  for (let i = 0; i < paletteLab.length; i++) {
    const item = paletteLab[i];
    const dL = pixelLab.L - item.Lab.L;

    let dSq;
    if (useLightnessOnly) {
      dSq = dL * dL; // Match purely by lightness/brightness!
    } else {
      const da = pixelLab.a - item.Lab.a;
      const db = pixelLab.b - item.Lab.b;
      dSq = dL * dL + da * da + db * db;
    }

    if (dSq < minDistanceSq) {
      minDistanceSq = dSq;
      closestColor = item.color;
    }
  }

  return closestColor;
}

// --- Binary / Base64 File Handling Utilities ---

// Convert standard base64 dataURL to raw binary Blob
function dataURLtoBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)[1];
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Convert dataURL to safe local Blob URL for iOS animated GIF saving compatibility
function dataURLtoBlobURL(dataUrl) {
  try {
    const blob = dataURLtoBlob(dataUrl);
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Failed to convert dataURL to BlobURL", e);
    return dataUrl; // fallback
  }
}

// Show preview dialog for iOS long-press saving
function showExportPreview(src) {
  if (DOM.exportPreviewImg && DOM.exportDialog) {
    let finalSrc = src;
    // For iOS Safari animated GIF saving compatibility, we MUST use a Blob URL instead of a raw base64 data URL.
    // Raw base64 data URLs for GIFs often get saved as static PNGs of the first frame on iOS.
    if (src && src.startsWith("data:image/gif")) {
      finalSrc = dataURLtoBlobURL(src);
    }
    DOM.exportPreviewImg.src = finalSrc;

    // Setup "Open in New Tab" helper link for mobile browsers (especially Chrome/Safari on iOS)
    const btnOpenNewTab = document.getElementById("btn-export-open-new-tab");
    if (btnOpenNewTab) {
      if (finalSrc) {
        btnOpenNewTab.href = finalSrc;
        btnOpenNewTab.style.display = "inline-block";
        if (src.startsWith("data:image/gif")) {
          btnOpenNewTab.download = `pc3104_adg_animation_${Date.now()}.gif`;
        } else {
          btnOpenNewTab.download = `pc3104_adg_${Date.now()}.png`;
        }
      } else {
        btnOpenNewTab.style.display = "none";
      }
    }

    DOM.exportDialog.classList.remove("hidden");
  }
}
