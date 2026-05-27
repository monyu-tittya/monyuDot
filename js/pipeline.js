/* ==========================================================================
   PC-3104 Retro Pixel Studio - Image Processing Pipeline (pipeline.js)
   ========================================================================== */

// Debounce helper to make sliders extremely smooth
let debounceTimeout = null;

function renderPipelineDebounced() {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    renderPipeline();
  }, 20); // 20ms threshold
}

// --- Image Loading and Rotation Utility Helpers ---

function rotateSource() {
  if (!State.sourceImage) return;
  State.currentRotation = (State.currentRotation + 270) % 360; // 90 deg counter-clockwise
  applyRotationToCanvas();
  resetCrop();
}

function applyRotationToCanvas() {
  const canvas = State.rotatedCanvas;
  const ctx = canvas.getContext("2d");
  const img = State.sourceImage;

  if (State.currentRotation === 0) {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
  } else if (State.currentRotation === 90) {
    canvas.width = img.height;
    canvas.height = img.width;
    ctx.translate(canvas.width, 0);
    ctx.rotate(90 * Math.PI / 180);
    ctx.drawImage(img, 0, 0);
  } else if (State.currentRotation === 180) {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate(180 * Math.PI / 180);
    ctx.drawImage(img, 0, 0);
  } else if (State.currentRotation === 270) {
    canvas.width = img.height;
    canvas.height = img.width;
    ctx.translate(0, canvas.height);
    ctx.rotate(270 * Math.PI / 180);
    ctx.drawImage(img, 0, 0);
  }
}

function resetCrop() {
  State.crop.zoom = 1.0;
  State.crop.panX = 0.0;
  State.crop.panY = 0.0;

  DOM.cropZoom.value = 1.0;
  DOM.zoomValue.textContent = "100%";

  renderPipeline();
}

// Get the selected aspect ratio ratio value
function getSelectedAspectRatio() {
  let mode = "4-3";
  DOM.aspectRadios.forEach(radio => {
    if (radio.checked) mode = radio.value;
  });

  if (mode === "4-3") return 4 / 3;
  if (mode === "1-1") return 1;
  return -1; // -1 means free aspect ratio
}

// --- Image Processing Pipeline (Core Algorithms) ---

function renderPipeline() {
  if (!State.sourceImage) return;

  showLoading(true);
  updateStatus("減色・ディザリング処理を実行中...");

  // Force brief UI render repaint before heavy canvas CPU crunching
  requestAnimationFrame(() => {
    setTimeout(() => {
      const startTime = performance.now();

      const rotated = State.rotatedCanvas;
      const targetW = State.targetWidth;
      const aspect = getSelectedAspectRatio();

      // Calculate target resolution
      let targetH;
      if (aspect === -1) {
        // Free Aspect Ratio (keeps original rotated aspect ratio)
        targetH = Math.round(targetW * (rotated.height / rotated.width));
      } else {
        // Fixed Aspect Ratio
        targetH = Math.round(targetW / aspect);
      }

      // Make height an even number (optional but cleaner)
      if (targetH % 2 !== 0) targetH++;

      // Math for Crop source sub-rect coordinates (sx, sy, sw, sh)
      let sw, sh;
      if (aspect === -1) {
        sw = rotated.width;
        sh = rotated.height;
      } else {
        if (rotated.width / rotated.height > aspect) {
          sh = rotated.height;
          sw = rotated.height * aspect;
        } else {
          sw = rotated.width;
          sh = rotated.width / aspect;
        }
      }

      // Zoom factor shrinks the crop source dimensions (zooming in)
      const zoom = State.crop.zoom;
      sw = sw / zoom;
      sh = sh / zoom;

      // Pan moves the crop center within source boundaries
      // Maximum movement bounds:
      const maxPanX = rotated.width - sw;
      const maxPanY = rotated.height - sh;

      const cx = (rotated.width / 2) + (State.crop.panX * maxPanX);
      const cy = (rotated.height / 2) + (State.crop.panY * maxPanY);

      // Compute final top-left crop source coordinates clamped to actual limits
      const sx = Math.max(0, Math.min(rotated.width - sw, cx - (sw / 2)));
      const sy = Math.max(0, Math.min(rotated.height - sh, cy - (sh / 2)));

      // Offscreen canvas downscaler
      const offscreen = document.createElement("canvas");
      offscreen.width = targetW;
      offscreen.height = targetH;
      const offCtx = offscreen.getContext("2d");

      // Configure image smoothing based on "retro-smooth-scaling" checkbox
      const smoothScaling = DOM.retroSmoothScaling ? DOM.retroSmoothScaling.checked : true;
      offCtx.imageSmoothingEnabled = smoothScaling;
      if (smoothScaling) {
        offCtx.imageSmoothingQuality = "high";
      }
      offCtx.drawImage(rotated, sx, sy, sw, sh, 0, 0, targetW, targetH);

      const imgData = offCtx.getImageData(0, 0, targetW, targetH);
      const pixels = imgData.data; // flat Uint8ClampedArray [R, G, B, A]

      // Step 1: Monochrome Preprocessor (if checked)
      if (State.monochrome) {
        convertToGrayscale(pixels);
      }

      // Step 2: Extract or Apply Palette
      let palette = [];
      if (State.paletteType === "adaptive") {
        if (State.colorCount === 0) {
          // Full color - no color reduction
          palette = null;
        } else {
          // Dynamic Median Cut palette
          palette = getAdaptivePalette(pixels, State.colorCount);
        }
      } else {
        // Preset Palettes
        let basePalette = PalettePresets[State.paletteType] || PalettePresets["pc98-system"];

        // If monochrome checkbox is checked, map the preset's colors to green shades!
        if (State.monochrome) {
          palette = makeMonochromePalette(basePalette);
        } else {
          palette = basePalette;
        }
      }

      State.currentPalette = palette;
      renderPalettePreview(palette);

      // Convert palette to Lab space for high-fidelity perceptually uniform color mapping
      let paletteLab = null;
      if (palette && palette.length > 0) {
        paletteLab = palette.map(color => ({
          color: color,
          Lab: rgbToLab(color.r, color.g, color.b)
        }));
      }

      // Check if palette is monochrome/single-hue (Gameboy or monochrome green mode active)
      const useLightnessOnly = (State.paletteType === "gameboy" || State.monochrome);

      // Step 3: Run Quantization and Dithering
      if (paletteLab && paletteLab.length > 0) {
        const ditherWeight = State.ditherWeight !== undefined ? State.ditherWeight : 0.7;
        if (State.ditherType === "floyd") {
          applyFloydSteinbergDithering(pixels, targetW, targetH, paletteLab, ditherWeight, useLightnessOnly);
        } else if (State.ditherType === "bayer") {
          applyBayerOrderedDithering(pixels, targetW, targetH, paletteLab, State.colorCount, ditherWeight, useLightnessOnly);
        } else {
          applyNoneQuantization(pixels, paletteLab, useLightnessOnly);
        }
      }

      // Write results back to offscreen canvas
      offCtx.putImageData(imgData, 0, 0);

      // Draw offscreen result to primary output canvas
      DOM.outputCanvas.width = targetW;
      DOM.outputCanvas.height = targetH;

      const ctx = DOM.outputCanvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offscreen, 0, 0);

      // Step 4: Finish up!
      const endTime = performance.now();
      const processingTime = Math.round(endTime - startTime);

      // Update UI Status and diagnostics
      DOM.statusResolution.textContent = `解像度: ${targetW} x ${targetH}`;
      DOM.statusTime.textContent = `処理速度: ${processingTime}ms`;
      updateStatus("レンダリング完了。");
      showLoading(false);
    }, 30);
  });
}

// --- MEDIAN CUT COLOR QUANTIZATION ---
function getAdaptivePalette(pixels, maxColors) {
  // Extract all RGB pixel colors, ignoring transparent ones
  const rgbColors = [];
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue; // skip transparent
    rgbColors.push({
      r: pixels[i],
      g: pixels[i + 1],
      b: pixels[i + 2]
    });
  }

  // Handle empty image fallback
  if (rgbColors.length === 0) {
    return [{ r: 0, g: 0, b: 0 }];
  }

  // If pixel volume is smaller than requested color slots, return direct colors
  if (rgbColors.length <= maxColors) {
    return rgbColors;
  }

  // Recursive block split arrays
  let boxes = [rgbColors];

  while (boxes.length < maxColors) {
    let maxSpan = -1;
    let splitBoxIndex = -1;

    // 1. Find the box with the maximum color dimension span (the box containing most color variety)
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.length < 2) continue; // cannot split single pixel

      let minR = 255, maxR = 0;
      let minG = 255, maxG = 0;
      let minB = 255, maxB = 0;

      for (let j = 0; j < box.length; j++) {
        const p = box[j];
        if (p.r < minR) minR = p.r;
        if (p.r > maxR) maxR = p.r;
        if (p.g < minG) minG = p.g;
        if (p.g > maxG) maxG = p.g;
        if (p.b < minB) minB = p.b;
        if (p.b > maxB) maxB = p.b;
      }

      const spanR = maxR - minR;
      const spanG = maxG - minG;
      const spanB = maxB - minB;
      const boxSpan = Math.max(spanR, spanG, spanB);

      if (boxSpan > maxSpan) {
        maxSpan = boxSpan;
        splitBoxIndex = i;
      }
    }

    if (splitBoxIndex === -1) break; // All blocks unsplittable

    const boxToSplit = boxes[splitBoxIndex];

    // 2. Identify widest channel inside selected box
    let minR = 255, maxR = 0;
    let minG = 255, maxG = 0;
    let minB = 255, maxB = 0;

    for (let j = 0; j < boxToSplit.length; j++) {
      const p = boxToSplit[j];
      if (p.r < minR) minR = p.r;
      if (p.r > maxR) maxR = p.r;
      if (p.g < minG) minG = p.g;
      if (p.g > maxG) maxG = p.g;
      if (p.b < minB) minB = p.b;
      if (p.b > maxB) maxB = p.b;
    }

    const spanR = maxR - minR;
    const spanG = maxG - minG;
    const spanB = maxB - minB;

    let sortChannel = 'r';
    if (spanG >= spanR && spanG >= spanB) sortChannel = 'g';
    else if (spanB >= spanR && spanB >= spanG) sortChannel = 'b';

    // 3. Sort pixels along chosen channel
    boxToSplit.sort((a, b) => a[sortChannel] - b[sortChannel]);

    // 4. Split at median index
    const median = Math.floor(boxToSplit.length / 2);
    const part1 = boxToSplit.slice(0, median);
    const part2 = boxToSplit.slice(median);

    // Replace old block with two newly split halves
    boxes.splice(splitBoxIndex, 1, part1, part2);
  }

  // 5. Build average color for each box
  const palette = boxes.map(box => {
    let sumR = 0, sumG = 0, sumB = 0;
    for (let i = 0; i < box.length; i++) {
      sumR += box[i].r;
      sumG += box[i].g;
      sumB += box[i].b;
    }
    return {
      r: Math.round(sumR / box.length),
      g: Math.round(sumG / box.length),
      b: Math.round(sumB / box.length)
    };
  });

  return palette;
}

// --- DITHERING ENGINES ---

// Floyd-Steinberg Dithering: Error Diffusion using CIELAB space
function applyFloydSteinbergDithering(pixels, width, height, paletteLab, ditherWeight, useLightnessOnly) {
  // Use a Float32Array to preserve fractional error precision
  const buffer = new Float32Array(pixels.length);
  for (let i = 0; i < pixels.length; i++) {
    buffer[i] = pixels[i];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const oldR = buffer[idx];
      const oldG = buffer[idx + 1];
      const oldB = buffer[idx + 2];

      // Match color in high-fidelity CIELAB space
      const closest = findClosestColorLab(oldR, oldG, oldB, paletteLab, useLightnessOnly);

      pixels[idx] = closest.r;
      pixels[idx + 1] = closest.g;
      pixels[idx + 2] = closest.b;
      pixels[idx + 3] = 255; // opaque alpha

      // Calculate channel error scaled by dither intensity
      const errR = (oldR - closest.r) * ditherWeight;
      const errG = (oldG - closest.g) * ditherWeight;
      const errB = (oldB - closest.b) * ditherWeight;

      // Diffuse error to neighboring pixels (Floyd-Steinberg Weights)
      // Right (+1, 0): weight 7/16
      if (x + 1 < width) {
        const targetIdx = idx + 4;
        buffer[targetIdx] += errR * 7 / 16;
        buffer[targetIdx + 1] += errG * 7 / 16;
        buffer[targetIdx + 2] += errB * 7 / 16;
      }

      // Down Left (-1, +1): weight 3/16
      if (x - 1 >= 0 && y + 1 < height) {
        const targetIdx = ((y + 1) * width + (x - 1)) * 4;
        buffer[targetIdx] += errR * 3 / 16;
        buffer[targetIdx + 1] += errG * 3 / 16;
        buffer[targetIdx + 2] += errB * 3 / 16;
      }

      // Down (0, +1): weight 5/16
      if (y + 1 < height) {
        const targetIdx = ((y + 1) * width + x) * 4;
        buffer[targetIdx] += errR * 5 / 16;
        buffer[targetIdx + 1] += errG * 5 / 16;
        buffer[targetIdx + 2] += errB * 5 / 16;
      }

      // Down Right (+1, +1): weight 1/16
      if (x + 1 < width && y + 1 < height) {
        const targetIdx = ((y + 1) * width + (x + 1)) * 4;
        buffer[targetIdx] += errR * 1 / 16;
        buffer[targetIdx + 1] += errG * 1 / 16;
        buffer[targetIdx + 2] += errB * 1 / 16;
      }
    }
  }
}

// Bayer Ordered Dithering: Organized Patterns using CIELAB space
function applyBayerOrderedDithering(pixels, width, height, paletteLab, colorCount, ditherWeight, useLightnessOnly) {
  // Determine pattern spread/contrast bias based on available colors
  // A tighter color space needs more spreading to mesh gradients correctly
  let spread = 24;
  if (colorCount === 16) spread = 52;
  else if (colorCount === 64) spread = 34;
  else if (colorCount === 256) spread = 18;

  for (let y = 0; y < height; y++) {
    const matrixRow = Bayer8x8Matrix[y % 8];
    const rowOffset = y * width;

    for (let x = 0; x < width; x++) {
      const idx = (rowOffset + x) * 4;

      // Matrix value is 0-63. Normalize to [-0.5, 0.5] bias
      const matrixVal = matrixRow[x % 8];
      const normalizedBias = (matrixVal + 0.5) / 64 - 0.5;
      const ditherAdjustment = normalizedBias * spread * ditherWeight;

      // Apply offset to original color
      const adjustedR = Math.max(0, Math.min(255, pixels[idx] + ditherAdjustment));
      const adjustedG = Math.max(0, Math.min(255, pixels[idx + 1] + ditherAdjustment));
      const adjustedB = Math.max(0, Math.min(255, pixels[idx + 2] + ditherAdjustment));

      const closest = findClosestColorLab(adjustedR, adjustedG, adjustedB, paletteLab, useLightnessOnly);

      pixels[idx] = closest.r;
      pixels[idx + 1] = closest.g;
      pixels[idx + 2] = closest.b;
      pixels[idx + 3] = 255;
    }
  }
}

// Simple nearest color mapping (no dithering) using CIELAB space
function applyNoneQuantization(pixels, paletteLab, useLightnessOnly) {
  for (let i = 0; i < pixels.length; i += 4) {
    const closest = findClosestColorLab(pixels[i], pixels[i + 1], pixels[i + 2], paletteLab, useLightnessOnly);
    pixels[i] = closest.r;
    pixels[i + 1] = closest.g;
    pixels[i + 2] = closest.b;
    pixels[i + 3] = 255;
  }
}

// --- Image Export/Download ---

function downloadResultImage() {
  if (!State.sourceImage) return;

  const canvas = DOM.outputCanvas;

  // Since output canvas size is low-res (e.g. 320x240), downloading it directly
  // creates a small file. If users open it, it might get blurred.
  // Standard high-quality retro converter practice is to upscale the export sharply!
  // Let's upscale it using nearest-neighbor by 4x or up to ~1280px wide.
  const scaleFactor = Math.max(1, Math.floor(1280 / canvas.width));

  const upscaleCanvas = document.createElement("canvas");
  upscaleCanvas.width = canvas.width * scaleFactor;
  upscaleCanvas.height = canvas.height * scaleFactor;

  const ctx = upscaleCanvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;

  ctx.drawImage(canvas, 0, 0, upscaleCanvas.width, upscaleCanvas.height);

  // Trigger file download
  const link = document.createElement("a");
  link.download = `pic2pc3104_${Date.now()}.png`;
  const dataUrl = upscaleCanvas.toDataURL("image/png");
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Show preview dialog for iOS long-press saving
  showExportPreview(dataUrl);

  updateStatus("画像の保存に成功しました！");
}

// --- VIRTUAL DISK SAVER ---

function saveResultToDisk() {
  if (!State.sourceImage) return;

  const dataUrl = DOM.outputCanvas.toDataURL("image/png");

  try {
    let library = JSON.parse(localStorage.getItem("pic3104_library") || "[]");

    // Limit to max 12 items to stay under 5MB localStorage limits
    if (library.length >= 12) {
      library.shift(); // remove oldest
    }

    const timestamp = new Date();
    const timeStr = `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}:${timestamp.getSeconds().toString().padStart(2, '0')}`;
    const fileId = Date.now();
    const fileName = `STILL_${library.length + 1}.PNG`;

    library.push({
      id: fileId,
      name: fileName,
      data: dataUrl,
      time: timeStr
    });

    localStorage.setItem("pic3104_library", JSON.stringify(library));

    updateStatus(`仮想ディスクに保存完了: ${fileName}`);
    SoundFX.playRenderChime();

    // Refresh ADG list if open
    if (typeof refreshLibraryUI === "function") {
      refreshLibraryUI();
    }
  } catch (e) {
    console.error(e);
    updateStatus("ERROR: 保存に失敗しました。容量不足の可能性があります。");
    SoundFX.playBeepAlert();
  }
}
