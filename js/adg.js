/* ==========================================================================
   PC-3104 Retro Pixel Studio - ADV Screen Maker Extensions (adg.js)
   ========================================================================== */

function refreshLibraryUI() {
  let library = JSON.parse(localStorage.getItem("pic3104_library") || "[]");

  // On-the-fly migration to assign unique IDs to older/legacy items that do not have an id field
  let migrated = false;
  library.forEach((item, idx) => {
    if (item.id === undefined || item.id === null) {
      item.id = Date.now() - idx;
      migrated = true;
    }
  });
  if (migrated) {
    localStorage.setItem("pic3104_library", JSON.stringify(library));
  }

  if (library.length === 0) {
    DOM.adgEmptyPlaceholder.classList.remove("hidden");
    DOM.adgPreviewCanvas.classList.add("hidden");
    DOM.libraryListUl.innerHTML = "<div style='text-align: center; color: #555; padding-top: 15px; font-size: 11px;'>空のディスク</div>";
    DOM.btnLibraryDelete.disabled = true;
    DOM.btnAdgDownload.disabled = true;
    DOM.btnAdgGifDownload.disabled = true;
    DOM.btnAdgPlay.disabled = true;
    DOM.adgStatusDisk.textContent = "ファイル: 未選択";
    return;
  }

  DOM.adgEmptyPlaceholder.classList.add("hidden");
  DOM.adgPreviewCanvas.classList.remove("hidden");
  DOM.btnAdgDownload.disabled = false;
  DOM.btnAdgGifDownload.disabled = false;
  DOM.btnAdgPlay.disabled = false;

  DOM.libraryListUl.innerHTML = "";
  library.forEach((item, idx) => {
    const li = document.createElement("li");
    li.className = "library-item";

    // Select the newly added item or previously selected item
    if (State.adgSelectedId == item.id || (!State.adgSelectedId && idx === library.length - 1)) {
      li.classList.add("selected");
      State.adgSelectedId = item.id;
      State.adgBackgroundImgData = item.data;
      DOM.adgStatusDisk.textContent = `ファイル: ${item.name}`;
      DOM.btnLibraryDelete.disabled = false;
    }

    li.innerHTML = `
      <img class="library-thumb" src="${item.data}">
      <span class="library-name">${item.name}</span>
      <span class="library-date">${item.time}</span>
    `;

    li.addEventListener("click", () => {
      SoundFX.playClick();
      State.adgSelectedId = item.id;
      State.adgBackgroundImgData = item.data;
      DOM.btnLibraryDelete.disabled = false;
      refreshLibraryUI();
      loadADGBackground();
    });

    DOM.libraryListUl.appendChild(li);
  });
}

function deleteSelectedFile() {
  if (!State.adgSelectedId) return;

  try {
    let library = JSON.parse(localStorage.getItem("pic3104_library") || "[]");
    library = library.filter(item => item.id !== State.adgSelectedId);
    localStorage.setItem("pic3104_library", JSON.stringify(library));

    State.adgSelectedId = null;
    State.adgBackgroundImgData = null;
    State.adgBackgroundImg = null;

    SoundFX.playBeepAlert();
    refreshLibraryUI();

    if (library.length > 0) {
      loadADGBackground();
    } else {
      // Clear canvas
      const ctx = DOM.adgPreviewCanvas.getContext("2d");
      ctx.clearRect(0, 0, DOM.adgPreviewCanvas.width, DOM.adgPreviewCanvas.height);
    }
  } catch (e) {
    console.error(e);
  }
}

function loadADGBackground() {
  if (!State.adgBackgroundImgData) return;

  const img = new Image();
  img.onload = () => {
    State.adgBackgroundImg = img;
    triggerTypewriter();
  };
  img.onerror = (e) => {
    console.error("Failed to load ADG background image from base64 data:", e);
  };
  img.src = State.adgBackgroundImgData;
}

function parseTypewriterText(text) {
  const steps = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "[") {
      const closingIdx = text.indexOf("]", i);
      if (closingIdx !== -1) {
        const tag = text.slice(i + 1, closingIdx);
        if (tag === "w") {
          steps.push({ type: "wait", value: 500 });
          i = closingIdx + 1;
          continue;
        } else if (tag.startsWith("s=")) {
          const speed = parseInt(tag.slice(2)) || 45;
          steps.push({ type: "speed", value: speed });
          i = closingIdx + 1;
          continue;
        } else if (tag === "flash") {
          steps.push({ type: "flash" });
          i = closingIdx + 1;
          continue;
        } else if (tag === "p") {
          steps.push({ type: "page" });
          i = closingIdx + 1;
          continue;
        } else if (tag.startsWith("choices=")) {
          const choicesStr = tag.slice(8);
          const choicesList = choicesStr.split(",").map(c => {
            let t = c.trim();
            let act = false;
            if (t.startsWith("*")) {
              act = true;
              t = t.slice(1).trim();
            }
            return { text: t, active: act };
          });
          steps.push({ type: "choices", list: choicesList });
          i = closingIdx + 1;
          continue;
        }
      }
    }
    // Standard character
    steps.push({ type: "char", value: text[i] });
    i++;
  }
  return steps;
}

function triggerTypewriter() {
  if (State.adgTypewriterTimer) clearTimeout(State.adgTypewriterTimer);

  // Initialize new state variables on typewriter restart
  State.adgPagePaused = false;
  State.adgActiveChoices = null;
  State.adgChoicesPaused = false;

  const charName = DOM.adgCharName.value.trim();
  const dialogValue = DOM.adgDialogText.value || "あっ、センパイ おそいですよ。&#13;&#10;かくしょへ れんらくは しておきました。&#13;&#10;げんばけんしょうも はジまっています。";

  let fullText = "";
  if (State.adgLayoutStyle === "detective-command" || State.adgLayoutStyle === "sound-novel") {
    // Detective ADV and Sound Novel style: pre-formatted inline name and brackets
    // If the dialogue value itself starts with a line containing a tag like [XL] or [L],
    // prepending name would break line.startsWith("[XL]") on the very first line!
    // To solve this, we parse the lines of dialogValue and prepend the name correctly.
    if (charName) {
      const dialogLines = dialogValue.split("\n");
      if (dialogLines.length > 0) {
        const firstLine = dialogLines[0];
        if (firstLine.startsWith("[XL]")) {
          dialogLines[0] = `[XL]${charName}「${firstLine.slice(4)}`; // keep tag at absolute start!
        } else if (firstLine.startsWith("[L]")) {
          dialogLines[0] = `[L]${charName}「${firstLine.slice(3)}`;
        } else {
          dialogLines[0] = `${charName}「${firstLine}`;
        }
        // Append closing bracket to the very end of dialogue
        dialogLines[dialogLines.length - 1] = dialogLines[dialogLines.length - 1] + "」";
        fullText = dialogLines.join("\n");
      } else {
        fullText = `${charName}「」`;
      }
    } else {
      fullText = dialogValue;
    }
  } else {
    // PC-3104 standard style: separate name plate and pure dialogue text
    fullText = dialogValue;
  }

  // If we are recording a GIF, we always use the typewriter animation!
  const useTypewriter = State.adgIsRecordingGif ? true : DOM.adgTypewriter.checked;

  if (!useTypewriter) {
    // Strip tags and collect last choices/page states
    let cleanText = "";
    let lastChoices = null;
    const parsed = parseTypewriterText(fullText);
    parsed.forEach(step => {
      if (step.type === "char") {
        cleanText += step.value;
      } else if (step.type === "page") {
        cleanText = ""; // Clear text for new page
      } else if (step.type === "choices") {
        lastChoices = step.list;
      }
    });
    State.adgDisplayedText = cleanText;
    State.adgActiveChoices = lastChoices;
    State.adgTypingComplete = true;
    drawADGComposition();
    return;
  }

  State.adgDisplayedText = "";
  State.adgTypewriterIndex = 0;
  State.adgTypingComplete = false;

  const steps = parseTypewriterText(fullText);
  let currentDelay = 45;

  const runStep = () => {
    if (State.adgTypewriterIndex < steps.length) {
      const step = steps[State.adgTypewriterIndex];
      State.adgTypewriterIndex++;

      let nextDelay = currentDelay;

      if (step.type === "char") {
        State.adgDisplayedText += step.value;
        if (step.value !== " " && step.value !== "\n") {
          SoundFX.playClick();
        }
        drawADGComposition();
      } else if (step.type === "speed") {
        currentDelay = step.value;
        nextDelay = 0; // instantly run next step
      } else if (step.type === "wait") {
        nextDelay = step.value;
      } else if (step.type === "flash") {
        SoundFX.playThunder();
        State.adgThunderFlashTime = Date.now();
        drawADGComposition();
        nextDelay = 0; // instantly run next step
      } else if (step.type === "page") {
        if (State.adgIsRecordingGif) {
          // Pause and record frames in GIF
          let pageFrameCount = 20;
          const pushPageFrame = () => {
            if (pageFrameCount > 0) {
              pageFrameCount--;
              drawADGComposition();
              State.adgGifFrames.push(DOM.adgPreviewCanvas.toDataURL("image/png"));
              DOM.adgStatusText.textContent = `GIF録画中 (改ページ一時停止): ${Math.round((20 - pageFrameCount) / 20 * 100)}%`;
              setTimeout(pushPageFrame, 45);
            } else {
              State.adgDisplayedText = "";
              runStep(); // resume
            }
          };
          pushPageFrame();
          return;
        } else {
          State.adgPagePaused = true;
          SoundFX.playPageAdvance();
          drawADGComposition();
          return; // pause
        }
      } else if (step.type === "choices") {
        if (State.adgIsRecordingGif) {
          State.adgActiveChoices = step.list;
          State.adgChoicesPaused = true;
          SoundFX.playMenuSelect();
          let choiceFrameCount = 35;
          const pushChoiceFrame = () => {
            if (choiceFrameCount > 0) {
              choiceFrameCount--;
              drawADGComposition();
              State.adgGifFrames.push(DOM.adgPreviewCanvas.toDataURL("image/png"));
              DOM.adgStatusText.textContent = `GIF録画中 (選択肢表示): ${Math.round((35 - choiceFrameCount) / 35 * 100)}%`;
              setTimeout(pushChoiceFrame, 45);
            } else {
              State.adgActiveChoices = null;
              State.adgChoicesPaused = false;
              runStep(); // resume
            }
          };
          pushChoiceFrame();
          return;
        } else {
          State.adgActiveChoices = step.list;
          State.adgChoicesPaused = true;
          SoundFX.playMenuSelect();
          drawADGComposition();
          return; // pause
        }
      }

      // Capture frame for GIF
      if (State.adgIsRecordingGif && step.type === "char") {
        State.adgGifFrames.push(DOM.adgPreviewCanvas.toDataURL("image/png"));
        const progress = Math.min(80, Math.round((State.adgTypewriterIndex / steps.length) * 80));
        DOM.adgStatusText.textContent = `GIF録画中 (タイピング): ${progress}%`;
      }

      State.adgTypewriterTimer = setTimeout(runStep, nextDelay);
    } else {
      // Typing finished
      if (State.adgIsRecordingGif) {
        if (State.adgBlinkFramesCount > 0) {
          State.adgBlinkFramesCount--;
          State.adgTypingComplete = true;
          drawADGComposition();

          State.adgGifFrames.push(DOM.adgPreviewCanvas.toDataURL("image/png"));
          const totalBlinkFrames = 60;
          const progress = 80 + Math.round(((totalBlinkFrames - State.adgBlinkFramesCount) / totalBlinkFrames) * 20);
          DOM.adgStatusText.textContent = `GIF録画中 (カーソル点滅): ${progress}%`;

          State.adgTypewriterTimer = setTimeout(runStep, 45);
        } else {
          State.adgTypingComplete = true;
          drawADGComposition();
          compileADGGif();
        }
      } else {
        State.adgTypingComplete = true;
        drawADGComposition();
      }
    }
  };

  // Expose closure runStep so event handlers can resume playback asynchronously
  State.adgResumeTypewriter = () => {
    runStep();
  };

  State.adgTypewriterTimer = setTimeout(runStep, currentDelay);
}

// --- Non-Anti-Aliased Pixelated Text Rendering Utility ---
function drawPixelatedText(ctx, text, x, y, font, color, drawShadow = false) {
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const textWidth = Math.ceil(metrics.width) + 12;

  let fontSize = 15;
  const match = font.match(/(\d+)px/);
  if (match) fontSize = parseInt(match[1]);
  const textHeight = Math.ceil(fontSize * 1.5) + 6;

  if (textWidth <= 0 || textHeight <= 0) return;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = textWidth;
  tempCanvas.height = textHeight;
  const tempCtx = tempCanvas.getContext("2d");

  tempCtx.font = font;
  tempCtx.textBaseline = "top";

  if (drawShadow) {
    // SFC Kamaitachi no Yoru style: bold black stroke border around text!
    // We draw the text offset in 8 directions around it in a grey/white key color first,
    // then draw the center in another key color, so we can convert them to perfectly crisp pixel outlines.

    // Draw 8-direction shadow block in color #000001 (stands for shadow pixels)
    tempCtx.fillStyle = "#000001";
    for (let dx = 0; dx <= 2; dx++) {
      for (let dy = 0; dy <= 2; dy++) {
        if (dx === 1 && dy === 1) continue;
        tempCtx.fillText(text, dx, dy);
      }
    }
    // Draw center in color #ffffff (stands for body pixels)
    tempCtx.fillStyle = "#ffffff";
    tempCtx.fillText(text, 1, 1);
  } else {
    // Normal text
    tempCtx.fillStyle = "#ffffff";
    tempCtx.fillText(text, 0, 0);
  }

  const imgData = tempCtx.getImageData(0, 0, textWidth, textHeight);
  const pixels = imgData.data;

  let targetR = 255, targetG = 255, targetB = 255;
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 6) {
      targetR = parseInt(hex.slice(0, 2), 16);
      targetG = parseInt(hex.slice(2, 4), 16);
      targetB = parseInt(hex.slice(4, 6), 16);
    }
  }

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const alpha = pixels[i + 3];

    if (drawShadow) {
      if (alpha > 80) {
        // Is it the center/body pixel? (#ffffff)
        if (r > 200 && g > 200 && b > 200) {
          pixels[i] = targetR;
          pixels[i + 1] = targetG;
          pixels[i + 2] = targetB;
          pixels[i + 3] = 255;
        } else {
          // It's the shadow border (#000001)
          pixels[i] = 0;
          pixels[i + 1] = 0;
          pixels[i + 2] = 0;
          pixels[i + 3] = 255;
        }
      } else {
        pixels[i + 3] = 0;
      }
    } else {
      if (alpha > 80) { // threshold value to clear anti-aliasing
        pixels[i] = targetR;
        pixels[i + 1] = targetG;
        pixels[i + 2] = targetB;
        pixels[i + 3] = 255;
      } else {
        pixels[i + 3] = 0;
      }
    }
  }

  tempCtx.putImageData(imgData, 0, 0);

  // Align position based on offset
  const renderX = drawShadow ? x - 1 : x;
  const renderY = drawShadow ? y - 1 : y;
  ctx.drawImage(tempCanvas, renderX, renderY);
}

// Convert background images to Gameboy green 4-color tones on-the-fly preserving original aspect ratio
function drawGameboyImage(ctx, img, dx, dy, dw, dh) {
  // Original aspect ratio of img
  const imgAspect = img.width / img.height;

  // Calculate size to fit inside (dw, dh) while preserving aspect ratio
  let targetW = dw;
  let targetH = dh;

  if (imgAspect > (dw / dh)) {
    // Image is wider than container
    targetH = dw / imgAspect;
  } else {
    // Image is taller than container
    targetW = dh * imgAspect;
  }

  // Center alignment inside (dx, dy, dw, dh)
  const targetX = dx + (dw - targetW) / 2;
  const targetY = dy + (dh - targetH) / 2;

  // Let's create a temporary canvas with exact pixel scale
  const tempW = Math.round(targetW);
  const tempH = Math.round(targetH);
  if (tempW <= 0 || tempH <= 0) return;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = tempW;
  tempCanvas.height = tempH;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(img, 0, 0, tempW, tempH);

  const imgData = tempCtx.getImageData(0, 0, tempW, tempH);
  const data = imgData.data;

  const gbColors = [
    { r: 15, g: 56, b: 15 },
    { r: 48, g: 98, b: 48 },
    { r: 139, g: 172, b: 15 },
    { r: 155, g: 188, b: 15 }
  ];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const lightness = 0.299 * r + 0.587 * g + 0.114 * b;

    let colorIdx = 3;
    if (lightness < 64) {
      colorIdx = 0;
    } else if (lightness < 128) {
      colorIdx = 1;
    } else if (lightness < 192) {
      colorIdx = 2;
    }

    const color = gbColors[colorIdx];
    data[i] = color.r;
    data[i + 1] = color.g;
    data[i + 2] = color.b;
  }

  tempCtx.putImageData(imgData, 0, 0);

  // Fill the container background with the darkest green first to act as a matte
  ctx.fillStyle = "#0f380f";
  ctx.fillRect(dx, dy, dw, dh);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tempCanvas, targetX, targetY, targetW, targetH);
}

function drawADGComposition() {
  const canvas = DOM.adgPreviewCanvas;
  const ctx = canvas.getContext("2d");

  // Lock canvas resolution to authentic 4:3 stretched PC-3104 resolution: 640 x 480
  canvas.width = 640;
  canvas.height = 480;

  const textColor = DOM.adgTextColor.value;

  if (State.adgLayoutStyle === "detective-command") {
    // --- Layout 2: Classic Detective Command ADV Layout (Portopia / Okhotsk Style) ---

    // 1. Draw solid black backdrop
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 640, 480);

    // 2. Draw Bounding Frame around top-left Still image box (X=24, Y=24, W=320, H=240) - Authentic 4:3 box!
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, 320, 240);

    // Draw background pixel art still inside framed window
    if (State.adgBackgroundImg) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(State.adgBackgroundImg, 24, 24, 320, 240);
    } else {
      // gray placeholder screen
      ctx.fillStyle = "#333333";
      ctx.fillRect(24, 24, 320, 240);
    }

    // 3. Draw Command Menu list on the top-right
    const commandsText = DOM.adgCommandsList.value || "ばしょいどう\nはなせ\nしらべろ\nみせろ\nよべ\nスマホつかえ\nもちものみろ";
    const commands = commandsText.split("\n").map(c => c.trim()).filter(c => c.length > 0);

    const startMenuX = 370;
    const startMenuY = 28;
    const menuSpacing = 24;
    const activeCursorIndex = parseInt(DOM.adgCommandCursor.value) || 0;

    commands.forEach((cmd, idx) => {
      if (idx < 7) { // limit to 7 lines max
        const lineY = startMenuY + (idx * menuSpacing);
        if (idx === activeCursorIndex) {
          // Draw active selector pointer "▷" next to active item - open triangle cursor (historically accurate PC-98 style!)
          // Rendered using direct canvas vector path to guarantee crisp edges and 100% immune to iOS system font-loading tofu blocks!
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.lineJoin = "miter";
          ctx.beginPath();
          ctx.moveTo(startMenuX + 2, lineY + 2);
          ctx.lineTo(startMenuX + 11, lineY + 8);
          ctx.lineTo(startMenuX + 2, lineY + 14);
          ctx.closePath();
          ctx.stroke();

          drawPixelatedText(ctx, cmd, startMenuX + 20, lineY, "16px 'DotGothic16', monospace", "#ffffff");
        } else {
          drawPixelatedText(ctx, cmd, startMenuX + 20, lineY, "16px 'DotGothic16', monospace", "#ffffff");
        }
      }
    });

    // 4. Draw Bottom Dialogue box (X=24, Y=284, W=592, H=172)
    // Custom rounded rect border path
    const drawRoundedRect = (c, x, y, width, height, r) => {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + width - r, y);
      c.quadraticCurveTo(x + width, y, x + width, y + r);
      c.lineTo(x + width, y + height - r);
      c.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      c.lineTo(x + r, y + height);
      c.quadraticCurveTo(x, y + height, x, y + height - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    };

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 24, 284, 592, 172, 8);
    ctx.stroke();

    // 5. Draw Dialogue inside bottom box (X=40, Y=302)
    const lines = State.adgDisplayedText.split("\n");
    const startX = 40;
    const startY = 302; // 284 + 18 offset
    let currentY = startY;

    lines.forEach((line, idx) => {
      if (idx < 5) { // Draw up to 5 lines inside rounded rect
        let currentFont = "15px 'DotGothic16', monospace";
        let drawText = line;
        let lineSpacing = 24; // standard spacing for 15px font

        if (line.startsWith("[XL]")) {
          currentFont = "bold 24px 'DotGothic16', monospace";
          drawText = line.slice(4);
          lineSpacing = 32; // larger spacing to prevent overlap
        } else if (line.startsWith("[L]")) {
          currentFont = "bold 19px 'DotGothic16', monospace";
          drawText = line.slice(3);
          lineSpacing = 28;
        }

        drawPixelatedText(ctx, drawText, startX, currentY, currentFont, textColor);
        currentY += lineSpacing;
      }
    });

    // 6. Draw Flashing cursor triangle ▼ at the bottom-right corner of bottom box
    if (State.adgTypingComplete || State.adgPagePaused) {
      if (Math.floor(Date.now() / 300) % 2 === 0) {
        ctx.fillStyle = textColor;
        ctx.beginPath();
        ctx.moveTo(580, 424);
        ctx.lineTo(592, 424);
        ctx.lineTo(586, 432);
        ctx.fill();
      }
    }

  } else if (State.adgLayoutStyle === "sound-novel") {
    // --- Layout 3: Sound Novel Style (Kamaitachi no Yoru / Otogirisou style) ---

    // 1. Draw Background
    if (State.adgBackgroundImg) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(State.adgBackgroundImg, 0, 0, 640, 480);
    } else {
      ctx.fillStyle = "#000080"; // Deep Indigo blue
      ctx.fillRect(0, 0, 640, 480);
    }

    // 2. Full-screen dark semi-transparent tint overlay for perfect text legibility
    ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
    ctx.fillRect(0, 0, 640, 480);

    // 3. Draw Dialogue lines spanning the full screen (Authentic large font SFC style)
    const lines = State.adgDisplayedText.split("\n");
    const startX = 48;
    const startY = 54;
    let currentY = startY;

    lines.forEach((line, idx) => {
      if (idx < 10) { // Limit to 10 lines max for classic spacious look
        let currentFont = "22px 'DotGothic16', monospace";
        let drawText = line;
        let lineSpacing = 36; // standard line spacing for 22px

        if (line.startsWith("[XL]")) {
          currentFont = "bold 34px 'DotGothic16', monospace";
          drawText = line.slice(4);
          lineSpacing = 52; // larger spacing to prevent overlap
        } else if (line.startsWith("[L]")) {
          currentFont = "bold 27px 'DotGothic16', monospace";
          drawText = line.slice(3);
          lineSpacing = 44;
        }

        drawPixelatedText(ctx, drawText, startX, currentY, currentFont, textColor, true); // true sets drawShadow/outline on!
        currentY += lineSpacing;
      }
    });

    // 4. Draw Flashing cursor triangle ▼ when typing is completed (bottom right)
    if (State.adgTypingComplete || State.adgPagePaused) {
      if (Math.floor(Date.now() / 300) % 2 === 0) {
        ctx.fillStyle = textColor;
        ctx.beginPath();
        ctx.moveTo(590, 438);
        ctx.lineTo(602, 438);
        ctx.lineTo(596, 446);
        ctx.fill();
      }
    }

  } else if (State.adgLayoutStyle === "gameboy") {
    // --- Layout 4: Game Boy Retro DMG-01 Console Style ---

    // 1. Draw solid grey plastic Gameboy shell background (#c5c6b6 is the classic DMG grey!)
    ctx.fillStyle = "#c5c6b6";
    ctx.fillRect(0, 0, 640, 480);

    // 2. Draw screen dark bezel frame (Bezel dimensions: X=80, Y=15, W=480, H=370, R=15)
    ctx.fillStyle = "#6d7373"; // Screen glass/bezel grey

    // Draw rounded bezel
    const drawBezel = (c, x, y, width, height, r) => {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + width - r, y);
      c.quadraticCurveTo(x + width, y, x + width, y + r);
      c.lineTo(x + width, y + height - r);
      c.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      c.lineTo(x + r, y + height);
      c.quadraticCurveTo(x, y + height, x, y + height - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
      c.fill();
    };
    drawBezel(ctx, 80, 15, 480, 370, 12);

    // 3. Draw Blue/Red accent stripes at the top of the bezel
    ctx.fillStyle = "#b10202ff"; // Magenta stripe
    ctx.fillRect(80, 30, 480, 2);
    ctx.fillStyle = "#ffdb10ff"; // Blue stripe
    ctx.fillRect(80, 36, 480, 2);

    // 4. Draw Bezel text "DOT MATRIX WITH STEREO SOUND"
    ctx.fillStyle = "#95a5a6";
    ctx.font = "bold 9px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DOT MATRIX WITH STEREO SOUND", 320, 26);

    // 5. Draw Battery Indicator LED on the left
    ctx.fillStyle = "#2c3e50"; // Dark outer circle
    ctx.beginPath();
    ctx.arc(106, 170, 7, 0, Math.PI * 2);
    ctx.fill();

    // Battery LED (glowing red when active!)
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.arc(106, 170, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#95a5a6";
    ctx.font = "bold 8px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BATTERY", 106, 192);

    // 6. Draw actual Game Boy Green LCD screen area (Active screen dimensions: X=136, Y=54, W=368, H=294)
    ctx.fillStyle = "#9bbc0f"; // Lightest GB Green
    ctx.fillRect(136, 54, 368, 294);

    // Draw LCD screen inner drop shadow border (1px black line)
    ctx.strokeStyle = "#0f380f";
    ctx.lineWidth = 2;
    ctx.strokeRect(136, 54, 368, 294);

    // 7. Draw background image in Gameboy 4 green tones!
    if (State.adgBackgroundImg) {
      drawGameboyImage(ctx, State.adgBackgroundImg, 136, 54, 368, 204); // Leave bottom 90px for dialogue box
    } else {
      // Draw background pattern/fill inside screen
      ctx.fillStyle = "#8bac0f";
      ctx.fillRect(136, 54, 368, 204);
    }

    // 8. Draw classic Game Boy style dialogue box at the bottom of the screen (X=144, Y=264, W=352, H=76)
    ctx.fillStyle = "#9bbc0f";
    ctx.fillRect(144, 264, 352, 76);

    ctx.strokeStyle = "#0f380f";
    ctx.lineWidth = 3;
    ctx.strokeRect(144, 264, 352, 76);

    // Draw a retro Gameboy-style nameplate box on the top edge of the dialogue box if a name is input
    const charName = DOM.adgCharName.value.trim();
    if (charName) {
      ctx.font = "bold 11px 'DotGothic16', monospace";
      const nameWidth = Math.ceil(ctx.measureText(charName).width) + 12;

      // Draw nameplate box
      ctx.fillStyle = "#9bbc0f";
      ctx.fillRect(150, 248, nameWidth, 18);
      ctx.strokeStyle = "#0f380f";
      ctx.lineWidth = 2;
      ctx.strokeRect(150, 248, nameWidth, 18);

      // Draw name text
      drawPixelatedText(ctx, charName, 156, 251, "bold 11px 'DotGothic16', monospace", "#0f380f");
    }

    // 9. Draw Dialogue text in deepest green (#0f380f)
    const lines = State.adgDisplayedText.split("\n");
    const lineSpacing = 18; // Balanced line spacing for 13px font
    const startX = 154;
    const startY = 276; // Shifted up for vertical centering and balance!

    lines.forEach((line, idx) => {
      if (idx < 3) { // Gameboy standard: up to 3 lines in text box
        drawPixelatedText(ctx, line, startX, startY + (idx * lineSpacing), "13px 'DotGothic16', monospace", "#0f380f");
      }
    });

    // 10. Draw Flashing cursor triangle ▼ when typing is completed (bottom-right of dialogue box)
    if (State.adgTypingComplete || State.adgPagePaused) {
      if (Math.floor(Date.now() / 300) % 2 === 0) {
        ctx.fillStyle = "#0f380f";
        ctx.beginPath();
        ctx.moveTo(480, 324);
        ctx.lineTo(488, 324);
        ctx.lineTo(484, 330);
        ctx.fill();
      }
    }

    // 11. Draw lower Gameboy console details (Nintendo logo, grey plastic ridges at the bottom of canvas)
    ctx.fillStyle = "#9ba3a3";
    ctx.font = "italic bold 14px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Blackdo", 320, 420);

    // Draw classic A and B buttons partially visible or text
    ctx.fillStyle = "#a8acac";
    ctx.fillText("SATO BOY", 320, 442);

  } else {
    // --- Layout 1: Classic Full-Screen Slide Layout (PC-3104 Standard) ---

    // 1. Draw Background
    if (State.adgBackgroundImg) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(State.adgBackgroundImg, 0, 0, 640, 480);
    } else {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, 640, 480);
    }

    // 2. Draw Dialogue Textbox Overlay at the bottom
    ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
    ctx.fillRect(16, 340, 608, 124);

    // Outer Gray border
    ctx.strokeStyle = "#808080";
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 340, 608, 124);

    // Inner White border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(18, 342, 604, 120);

    // 3. Draw Character Name plate
    const charName = DOM.adgCharName.value.trim();
    if (charName) {
      drawPixelatedText(ctx, `【${charName}】`, 32, 350, "bold 15px 'DotGothic16', monospace", "#00ffff"); // Pushed up further to Y=350 to avoid crowding
    }

    // 4. Draw Dialogue lines
    const lines = State.adgDisplayedText.split("\n");
    const startX = 32;
    const startY = charName ? 388 : 370; // Pushed down to Y=388 to leave a comfortable 38px gap from Y=350 (approx 23px of clear space between text blocks)
    let currentY = startY;

    lines.forEach((line, idx) => {
      if (idx < 3) { // Draw up to 3 lines max
        let currentFont = "15px 'DotGothic16', monospace";
        let drawText = line;
        let lineSpacing = 24; // standard spacing for 15px font

        if (line.startsWith("[XL]")) {
          currentFont = "bold 24px 'DotGothic16', monospace";
          drawText = line.slice(4);
          lineSpacing = 32;
        } else if (line.startsWith("[L]")) {
          currentFont = "bold 19px 'DotGothic16', monospace";
          drawText = line.slice(3);
          lineSpacing = 28;
        }
        drawPixelatedText(ctx, drawText, startX, currentY, currentFont, textColor);
        currentY += lineSpacing;
      }
    });

    // 5. Draw Flashing cursor triangle ▼ when typing is completed
    if (State.adgTypingComplete || State.adgPagePaused) {
      if (Math.floor(Date.now() / 300) % 2 === 0) {
        ctx.fillStyle = textColor;
        ctx.beginPath();
        ctx.moveTo(590, 438);
        ctx.lineTo(602, 438);
        ctx.lineTo(596, 446);
        ctx.fill();
      }
    }
  }

  // --- Environment / Weather Effect Visual Overlays (Rendered on top of all layouts) ---
  if (State.adgWeatherEffect === "rain") {
    if (State.adgLayoutStyle === "gameboy") {
      // Draw inside Gameboy active screen area only (X=136, Y=54, W=368, H=294)
      ctx.strokeStyle = "rgba(15, 56, 15, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.save();
      ctx.beginPath();
      ctx.rect(136, 54, 368, 294);
      ctx.clip();
      for (let i = 0; i < 20; i++) {
        const seed = Math.sin(i * 123.45 + Date.now() / 150);
        const x = 136 + (Math.abs(seed * 368) % 368);
        const y = 54 + ((Math.abs(seed * 48271) + (Date.now() / 2) % 294) % 294);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 1.5, y + 12);
        ctx.stroke();
      }
      ctx.restore();
    } else if (State.adgLayoutStyle === "detective-command") {
      // Draw inside top-left Still image box only (X=24, Y=24, W=320, H=240)
      ctx.strokeStyle = "rgba(180, 210, 255, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.save();
      ctx.beginPath();
      ctx.rect(24, 24, 320, 240);
      ctx.clip();
      for (let i = 0; i < 20; i++) {
        const seed = Math.sin(i * 123.45 + Date.now() / 150);
        const x = 24 + (Math.abs(seed * 320) % 320);
        const y = 24 + ((Math.abs(seed * 48271) + (Date.now() / 1.5) % 240) % 240);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 2, y + 14);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // Full screen rain for still-full and sound-novel styles: Make it bold, high-contrast, beautiful retro pixel-art drops!
      ctx.strokeStyle = "rgba(180, 210, 255, 0.7)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 35; i++) {
        const seed = Math.sin(i * 123.45 + Date.now() / 150);
        const x = Math.abs(seed * 640) % 640;
        const y = (Math.abs(seed * 48271) + (Date.now() / 1.5) % 480) % 480;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3, y + 18); // Slanted longer rain drops
        ctx.stroke();
      }
    }
  } else if (State.adgWeatherEffect === "blizzard") {
    if (State.adgLayoutStyle === "gameboy") {
      // Draw inside Gameboy active screen area only (X=136, Y=54, W=368, H=294)
      ctx.fillStyle = "rgba(139, 172, 15, 0.9)";
      ctx.save();
      ctx.beginPath();
      ctx.rect(136, 54, 368, 294);
      ctx.clip();
      for (let i = 0; i < 25; i++) {
        const seed = Math.cos(i * 987.65 + Date.now() / 120);
        const x = 136 + ((Math.abs(seed * 468) - (Date.now() / 1.5) % 468 + 468) % 368);
        const y = 54 + ((Math.abs(seed * 294) + (Date.now() / 2.5) % 294) % 294);
        const size = Math.abs(seed * 123) % 2 + 1;
        ctx.fillRect(x, y, size, size);
      }
      ctx.restore();
    } else if (State.adgLayoutStyle === "detective-command") {
      // Draw inside top-left Still image box only (X=24, Y=24, W=320, H=240)
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.save();
      ctx.beginPath();
      ctx.rect(24, 24, 320, 240);
      ctx.clip();
      for (let i = 0; i < 20; i++) {
        const seed = Math.cos(i * 987.65 + Date.now() / 120);
        const x = 24 + ((Math.abs(seed * 420) - (Date.now() / 1.5) % 420 + 420) % 320);
        const y = 24 + ((Math.abs(seed * 240) + (Date.now() / 2.5) % 240) % 240);
        const size = Math.abs(seed * 123) % 2 + 1;
        ctx.fillRect(x, y, size, size);
      }
      ctx.restore();
    } else {
      // Full screen blizzard for still-full and sound-novel styles
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      for (let i = 0; i < 50; i++) {
        const seed = Math.cos(i * 987.65 + Date.now() / 120);
        const x = (Math.abs(seed * 840) - (Date.now() / 1.5) % 840 + 840) % 640;
        const y = (Math.abs(seed * 480) + (Date.now() / 2.5) % 480) % 480;
        const size = Math.abs(seed * 123) % 3 + 1;
        ctx.fillRect(x, y, size, size);
      }
    }
  }

  // --- Thunder Flash Overlay (Rendered globally on top of the layout bounds) ---
  if (State.adgThunderFlashTime > 0) {
    const elapsed = Date.now() - State.adgThunderFlashTime;
    if (elapsed < 150) {
      if (State.adgLayoutStyle === "gameboy") {
        // Game Boy screen thunder flash (lightest shade of green)
        ctx.fillStyle = "rgba(155, 188, 15, 0.95)";
        ctx.fillRect(136, 54, 368, 294);
      } else if (State.adgLayoutStyle === "detective-command") {
        // Flash only inside the still window
        ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
        ctx.fillRect(24, 24, 320, 240);
      } else {
        // Full screen flash
        ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
        ctx.fillRect(0, 0, 640, 480);
      }
    } else if (elapsed < 300) {
      if (State.adgLayoutStyle === "gameboy") {
        ctx.fillStyle = "rgba(155, 188, 15, 0.5)";
        ctx.fillRect(136, 54, 368, 294);
      } else if (State.adgLayoutStyle === "detective-command") {
        ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
        ctx.fillRect(24, 24, 320, 240);
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
        ctx.fillRect(0, 0, 640, 480);
      }
    } else {
      State.adgThunderFlashTime = 0; // reset
    }
  }

  // --- Retro Choices Overlay Box (Rendered on top of all visuals) ---
  if (State.adgActiveChoices && State.adgActiveChoices.length > 0) {
    const choices = State.adgActiveChoices;
    const boxW = 360;
    const boxH = (choices.length * 28) + 24;
    const boxX = 320 - boxW / 2;
    const boxY = 240 - boxH / 2;

    // Draw solid retro dark navy background
    ctx.fillStyle = "rgba(0, 0, 70, 0.94)";
    ctx.fillRect(boxX, boxY, boxW, boxH);

    // Draw Outer double border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Draw Inner border
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX + 4, boxY + 4, boxW - 8, boxH - 8);

    // Draw items
    choices.forEach((choice, idx) => {
      const itemY = boxY + 16 + idx * 28;
      if (choice.active) {
        // Draw selection cursor triangle "▷" (PC-98 style!)
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 2;
        ctx.lineJoin = "miter";
        ctx.beginPath();
        ctx.moveTo(boxX + 16, itemY + 2);
        ctx.lineTo(boxX + 25, itemY + 8);
        ctx.lineTo(boxX + 16, itemY + 14);
        ctx.closePath();
        ctx.stroke();

        // High-contrast yellow text
        drawPixelatedText(ctx, choice.text, boxX + 34, itemY, "15px 'DotGothic16', monospace", "#ffff00");
      } else {
        // Standard white text
        drawPixelatedText(ctx, choice.text, boxX + 34, itemY, "15px 'DotGothic16', monospace", "#ffffff");
      }
    });
  }
}

// Composition loop to keep weather effects and blinking cursors animating smoothly in real-time
function startADGAnimationLoop() {
  if (State.adgLoopRunning) return;
  State.adgLoopRunning = true;

  const loop = () => {
    if (DOM.adgWindow.classList.contains("hidden") || DOM.adgWindow.classList.contains("minimized")) {
      State.adgLoopRunning = false;
      return;
    }

    // Constant redraw at 60 FPS for fluid environmental/text typing animations
    drawADGComposition();

    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function setupADGMaker() {
  // Full initialization when the ADG window is first opened or restored from hidden/minimized
  const openAdg = () => {
    focusAdg();
    refreshLibraryUI();
    loadADGBackground();
  };

  DOM.appWindow.addEventListener("mousedown", focusApp);
  DOM.appWindow.addEventListener("touchstart", focusApp, { passive: true });
  DOM.adgWindow.addEventListener("mousedown", focusAdg);
  DOM.adgWindow.addEventListener("touchstart", focusAdg, { passive: true });

  // Start Menu Programs launch
  bindInteractive(DOM.startProgramPixel, () => {
    SoundFX.playClick();
    DOM.startMenuBox.classList.add("hidden");
    DOM.appWindow.classList.remove("minimized");
    DOM.appWindow.classList.remove("hidden");
    DOM.taskAppTab.classList.remove("hidden");
    focusApp();
  });

  bindInteractive(DOM.startProgramAdg, () => {
    SoundFX.playClick();
    DOM.startMenuBox.classList.add("hidden");
    DOM.adgWindow.classList.remove("hidden");
    DOM.adgWindow.classList.remove("minimized");
    DOM.taskAdgTab.classList.remove("hidden");
    openAdg();
  });

  // App Shortcut Icon setup
  bindInteractive(DOM.iconAdgMaker, () => {
    SoundFX.playClick();
    DOM.adgWindow.classList.remove("hidden");
    DOM.adgWindow.classList.remove("minimized");
    DOM.taskAdgTab.classList.remove("hidden");
    openAdg();
  });

  // Taskbar Tab setup
  bindInteractive(DOM.taskAdgTab, () => {
    SoundFX.playClick();
    if (DOM.adgWindow.classList.contains("minimized")) {
      DOM.adgWindow.classList.remove("minimized");
      openAdg();
    } else {
      if (DOM.adgWindow.classList.contains("active")) {
        DOM.adgWindow.classList.add("minimized");
        DOM.taskAdgTab.classList.remove("active");
        saveWindowStates();
      } else {
        focusAdg();
      }
    }
  });

  // Title bar drag for ADG Maker window
  let isDraggingWindow = false;
  let dragOffset = { x: 0, y: 0 };
  const titleBar = DOM.adgWindow.querySelector(".title-bar");

  titleBar.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    isDraggingWindow = true;
    dragOffset.x = e.clientX - DOM.adgWindow.offsetLeft;
    dragOffset.y = e.clientY - DOM.adgWindow.offsetTop;
    focusAdg();
    titleBar.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDraggingWindow) return;
    DOM.adgWindow.style.left = `${e.clientX - dragOffset.x}px`;
    DOM.adgWindow.style.top = `${e.clientY - dragOffset.y}px`;
    DOM.adgWindow.style.transform = "none";
  });

  document.addEventListener("mouseup", () => {
    isDraggingWindow = false;
    titleBar.style.cursor = "grab";
  });

  // ADG Window buttons
  document.getElementById("btn-adg-minimize").addEventListener("click", (e) => {
    SoundFX.playClick();
    DOM.adgWindow.classList.add("minimized");
    DOM.taskAdgTab.classList.remove("active");
    saveWindowStates();
    e.stopPropagation();
  });

  document.getElementById("btn-adg-close").addEventListener("click", (e) => {
    SoundFX.playClick();
    DOM.adgWindow.classList.add("hidden");
    DOM.taskAdgTab.classList.add("hidden");
    DOM.taskAdgTab.classList.remove("active");
    saveWindowStates();
    e.stopPropagation();
  });

  document.getElementById("menu-adg-close").addEventListener("click", () => {
    SoundFX.playClick();
    DOM.adgWindow.classList.add("hidden");
    DOM.taskAdgTab.classList.add("hidden");
    DOM.taskAdgTab.classList.remove("active");
    saveWindowStates();
  });

  document.getElementById("menu-adg-clear").addEventListener("click", () => {
    SoundFX.playClick();
    DOM.adgDialogText.value = "";
    triggerTypewriter();
  });

  // Controls bindings
  DOM.btnLibraryRefresh.addEventListener("click", () => {
    SoundFX.playClick();
    refreshLibraryUI();
    loadADGBackground();
  });

  DOM.btnLibraryDelete.addEventListener("click", () => {
    deleteSelectedFile();
  });

  DOM.adgCharName.addEventListener("input", () => {
    saveADGSettings();
    if (!DOM.adgTypewriter.checked) {
      triggerTypewriter();
    } else {
      drawADGComposition();
    }
  });

  DOM.adgDialogText.addEventListener("input", () => {
    saveADGSettings();
    // If not typewriter, render instantly on type
    if (!DOM.adgTypewriter.checked) {
      triggerTypewriter();
    }
  });

  // Bind Retro tags insert toolbar buttons
  const adgTagButtons = DOM.adgWindow.querySelectorAll(".btn-adg-tag");
  adgTagButtons.forEach(btn => {
    bindInteractive(btn, () => {
      SoundFX.playClick();
      const tag = btn.dataset.tag;
      const textarea = DOM.adgDialogText;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      textarea.value = val.substring(0, start) + tag + val.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + tag.length;
      textarea.focus();

      textarea.dispatchEvent(new Event("input"));
      triggerTypewriter();
    });
  });

  DOM.adgTextColor.addEventListener("change", () => {
    SoundFX.playClick();
    saveADGSettings();
    drawADGComposition();
  });

  DOM.adgLayoutStyle.addEventListener("change", (e) => {
    SoundFX.playClick();
    State.adgLayoutStyle = e.target.value;
    if (State.adgLayoutStyle === "detective-command") {
      DOM.adgDetectiveControls.classList.remove("hidden");
    } else {
      DOM.adgDetectiveControls.classList.add("hidden");
    }
    saveADGSettings();
    triggerTypewriter();
  });

  DOM.adgCommandsList.addEventListener("input", () => {
    saveADGSettings();
    drawADGComposition();
  });

  DOM.adgCommandCursor.addEventListener("change", () => {
    SoundFX.playClick();
    saveADGSettings();
    drawADGComposition();
  });

  DOM.adgWeatherEffect.addEventListener("change", (e) => {
    SoundFX.playClick();
    State.adgWeatherEffect = e.target.value;
    saveADGSettings();
    updateWeatherAudio();
    drawADGComposition();
  });

  DOM.adgBgmPreset.addEventListener("change", (e) => {
    SoundFX.playClick();
    State.adgBgmPreset = e.target.value;
    saveADGSettings();
    SoundFX.bgmPlayer.start(e.target.value);
  });

  DOM.btnAdgThunder.addEventListener("click", () => {
    SoundFX.playThunder();
    State.adgThunderFlashTime = Date.now();
    drawADGComposition();
  });

  const handleADGAdvance = () => {
    if (State.adgPagePaused) {
      SoundFX.playPageAdvance();
      State.adgPagePaused = false;
      State.adgDisplayedText = "";
      if (typeof State.adgResumeTypewriter === "function") {
        State.adgResumeTypewriter();
      }
    } else if (State.adgChoicesPaused) {
      SoundFX.playPageAdvance();
      State.adgActiveChoices = null;
      State.adgChoicesPaused = false;
      if (typeof State.adgResumeTypewriter === "function") {
        State.adgResumeTypewriter();
      }
    }
  };

  DOM.adgPreviewCanvas.addEventListener("click", () => {
    handleADGAdvance();
  });

  DOM.btnAdgPlay.addEventListener("click", () => {
    if (State.adgPagePaused || State.adgChoicesPaused) {
      handleADGAdvance();
    } else {
      SoundFX.playClick();
      triggerTypewriter();
    }
  });

  // ADG Synthesizer trigger on tab clicks
  const adgTabs = DOM.adgWindow.querySelectorAll(".tab");
  const adgPanes = DOM.adgWindow.querySelectorAll(".tab-pane");

  adgTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      SoundFX.playTabClick();
      const tabId = tab.dataset.tab;

      adgTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      adgPanes.forEach(pane => {
        pane.classList.remove("active");
        if (pane.id === tabId) {
          pane.classList.add("active");
        }
      });
    });
  });

  // ADG Screen Exporter PNG
  DOM.btnAdgDownload.addEventListener("click", () => {
    SoundFX.playClick();
    downloadADGImage();
  });

  document.getElementById("menu-adg-save").addEventListener("click", () => {
    SoundFX.playClick();
    downloadADGImage();
  });

  // ADG Screen Exporter GIF
  DOM.btnAdgGifDownload.addEventListener("click", () => {
    startADGGifRecording();
  });

  document.getElementById("menu-adg-save-gif").addEventListener("click", () => {
    startADGGifRecording();
  });

  // Load persisted settings on startup!
  loadADGSettings();

  // If ADG window is visible initially, load the background and start loop!
  if (!DOM.adgWindow.classList.contains("hidden") && !DOM.adgWindow.classList.contains("minimized")) {
    refreshLibraryUI();
    loadADGBackground();
    if (typeof startADGAnimationLoop === "function") {
      startADGAnimationLoop();
    }
  }
}

function downloadADGImage() {
  if (!State.adgBackgroundImg) return;

  const canvas = DOM.adgPreviewCanvas;

  // Upscale composited ADG window by 2x for sharp full visual novel 1280x960 resolution!
  const upscaleCanvas = document.createElement("canvas");
  upscaleCanvas.width = 1280;
  upscaleCanvas.height = 960;

  const ctx = upscaleCanvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;

  ctx.drawImage(canvas, 0, 0, 1280, 960);

  const link = document.createElement("a");
  link.download = `pc3104_adg_${Date.now()}.png`;
  const dataUrl = upscaleCanvas.toDataURL("image/png");
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Show preview dialog for iOS long-press saving
  showExportPreview(dataUrl);

  DOM.adgStatusText.textContent = "アドベンチャー画像の保存に成功しました！";
}

function enableADGButtons(enable) {
  DOM.btnAdgPlay.disabled = !enable;
  DOM.btnAdgDownload.disabled = !enable;
  DOM.btnAdgGifDownload.disabled = !enable;
  DOM.adgCharName.disabled = !enable;
  DOM.adgDialogText.disabled = !enable;
  DOM.adgTextColor.disabled = !enable;
  DOM.btnLibraryRefresh.disabled = !enable;
  DOM.btnLibraryDelete.disabled = !enable;
}

function startADGGifRecording() {
  if (!State.adgBackgroundImg) {
    SoundFX.playBeepAlert();
    return;
  }

  SoundFX.playClick();
  State.adgIsRecordingGif = true;
  State.adgGifFrames = [];
  State.adgBlinkFramesCount = 30; // 30 frames = approx 1.35 seconds of finished text pause with blinking cursor (faster, optimized!)

  DOM.adgStatusText.textContent = "GIF録画準備中...";
  enableADGButtons(false);

  // Trigger typewriter from character 0 for recording!
  triggerTypewriter();
}

function compileADGGif() {
  DOM.adgStatusText.textContent = "GIFエンコード中 (処理しています...)";

  if (typeof gifshot === "undefined") {
    console.error("gifshot is not loaded!");
    DOM.adgStatusText.textContent = "ERROR: gifshotライブラリがロードされていません。";
    SoundFX.playBeepAlert();
    State.adgIsRecordingGif = false;
    State.adgGifFrames = [];
    enableADGButtons(true);
    return;
  }

  gifshot.createGIF({
    images: State.adgGifFrames,
    gifWidth: 640,
    gifHeight: 480,
    interval: 0.045, // 45ms per frame matching typewriter delay
    numFrames: State.adgGifFrames.length,
    sampleInterval: 20, // Faster color quantization sampling rate for responsive encoding
    numWorkers: 2 // Use Web Workers (via safe blob urls) to process in background, keeping UI responsive!
  }, function (obj) {
    if (!obj.error) {
      const link = document.createElement("a");
      link.download = `pc3104_adg_animation_${Date.now()}.gif`;
      link.href = obj.image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show preview dialog for iOS long-press saving
      showExportPreview(obj.image);

      DOM.adgStatusText.textContent = "GIFアニメの保存に成功しました！";
      SoundFX.playRenderChime();
    } else {
      console.error(obj.error);
      DOM.adgStatusText.textContent = "ERROR: GIF生成中にエラーが発生しました。";
      SoundFX.playBeepAlert();
    }

    State.adgIsRecordingGif = false;
    State.adgGifFrames = [];
    enableADGButtons(true);
  });
}

// --- Persist ADG Maker inputs to localStorage ---
function saveADGSettings() {
  const settings = {
    charName: DOM.adgCharName.value,
    dialogText: DOM.adgDialogText.value,
    layoutStyle: State.adgLayoutStyle,
    textColor: DOM.adgTextColor.value,
    commandsList: DOM.adgCommandsList.value,
    commandCursor: DOM.adgCommandCursor.value,
    weatherEffect: DOM.adgWeatherEffect.value,
    bgmPreset: DOM.adgBgmPreset.value
  };
  localStorage.setItem("pic3104_adg_settings", JSON.stringify(settings));
}

function loadADGSettings() {
  try {
    const raw = localStorage.getItem("pic3104_adg_settings");
    if (!raw) return;
    const settings = JSON.parse(raw);
    if (settings.charName !== undefined) DOM.adgCharName.value = settings.charName;
    if (settings.dialogText !== undefined) DOM.adgDialogText.value = settings.dialogText;
    if (settings.layoutStyle !== undefined) {
      State.adgLayoutStyle = settings.layoutStyle;
      DOM.adgLayoutStyle.value = settings.layoutStyle;
      if (settings.layoutStyle === "detective-command") {
        DOM.adgDetectiveControls.classList.remove("hidden");
      } else {
        DOM.adgDetectiveControls.classList.add("hidden");
      }
    }
    if (settings.textColor !== undefined) DOM.adgTextColor.value = settings.textColor;
    if (settings.commandsList !== undefined) DOM.adgCommandsList.value = settings.commandsList;
    if (settings.commandCursor !== undefined) DOM.adgCommandCursor.value = settings.commandCursor;
    if (settings.weatherEffect !== undefined) {
      DOM.adgWeatherEffect.value = settings.weatherEffect;
      State.adgWeatherEffect = settings.weatherEffect;
      setTimeout(updateWeatherAudio, 100); // Wait for AudioContext initialization
    }
    if (settings.bgmPreset !== undefined) {
      DOM.adgBgmPreset.value = settings.bgmPreset;
      State.adgBgmPreset = settings.bgmPreset;
      setTimeout(() => {
        SoundFX.bgmPlayer.start(settings.bgmPreset);
      }, 200); // Wait for AudioContext initialization
    }
  } catch (e) {
    console.error("Failed to load ADG settings:", e);
  }
}

// --- Synthesized Weather Environmental Sound Effects ---
function updateWeatherAudio() {
  try {
    if (!SoundFX.enabled) {
      stopWeatherAudio();
      return;
    }
    SoundFX.init();
    if (!SoundFX.ctx) return;

    stopWeatherAudio();

    const effect = State.adgWeatherEffect;
    if (effect === "none") return;

    State.adgWeatherAudioNodes = [];

    // Safely get sampleRate with a solid fallback (essential for iOS Safari)
    const sampleRate = SoundFX.ctx.sampleRate || 44100;
    const bufferSize = sampleRate * 2.0;

    if (effect === "rain") {
      // Rain pitter patter: modulated white noise bandpass filter
      const buffer = SoundFX.ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = SoundFX.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = SoundFX.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1400; // Rain frequency
      filter.Q.value = 1.0;

      const gain = SoundFX.ctx.createGain();
      gain.gain.value = 0.02; // soft hum

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(SoundFX.ctx.destination);

      noise.start(0);
      State.adgWeatherAudioNodes.push(noise, gain);
    } else if (effect === "blizzard") {
      // Blizzard wind: Sweeping white noise modulated with a slow LFO
      const buffer = SoundFX.ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = SoundFX.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = SoundFX.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 550;
      filter.Q.value = 2.0;

      const gain = SoundFX.ctx.createGain();
      gain.gain.value = 0.035; // wind howling

      // Slow sweeping LFO oscillator (modulates wind frequency)
      const osc = SoundFX.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 0.15; // 0.15Hz slow sweep

      const oscGain = SoundFX.ctx.createGain();
      oscGain.gain.value = 300; // +/- 300Hz sweep range

      osc.connect(oscGain);
      oscGain.connect(filter.frequency);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(SoundFX.ctx.destination);

      noise.start(0);
      osc.start(0);
      State.adgWeatherAudioNodes.push(noise, osc, gain);
    }
  } catch (e) {
    console.warn("Weather audio synthesis failed or blocked by browser autoplay policy:", e);
  }
}

function stopWeatherAudio() {
  try {
    if (State.adgWeatherAudioNodes) {
      State.adgWeatherAudioNodes.forEach(node => {
        try {
          node.stop();
        } catch (e) { }
        try {
          node.disconnect();
        } catch (e) { }
      });
      State.adgWeatherAudioNodes = [];
    }
  } catch (e) {
    console.warn("Failed to stop weather audio cleanly:", e);
  }
}
