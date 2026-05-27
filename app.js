/* ==========================================================================
   PC-3104 Retro Pixel Studio - Master UI Orchestrator (app.js)
   ========================================================================== */

// --- Initialization ---
window.addEventListener("DOMContentLoaded", () => {
  setupStartMenu();
  setupTabs();
  setupWindowControls();
  setupParameters();
  setupImageLoading();
  setupCropDragging();
  setupClock();
  setupDesktopShortcuts();

  // Set initial status
  updateStatus("システム起動完了。画像を選択してください。");

  // Initialize ADG Maker Extensions
  setupADGMaker();

  // Load and restore previous window states
  loadWindowStates();
});

// --- Overlapping Focus Window manager & State Persistence ---

function saveWindowStates() {
  const state = {
    app: {
      hidden: DOM.appWindow.classList.contains("hidden"),
      minimized: DOM.appWindow.classList.contains("minimized"),
      active: DOM.appWindow.classList.contains("active")
    },
    adg: {
      hidden: DOM.adgWindow.classList.contains("hidden"),
      minimized: DOM.adgWindow.classList.contains("minimized"),
      active: DOM.adgWindow.classList.contains("active")
    }
  };
  localStorage.setItem("pic3104_window_states", JSON.stringify(state));
}

function loadWindowStates() {
  try {
    const saved = localStorage.getItem("pic3104_window_states");
    if (!saved) return;
    const state = JSON.parse(saved);

    // Restore App Window
    if (state.app.hidden) {
      DOM.appWindow.classList.add("hidden");
      DOM.taskAppTab.classList.add("hidden");
    } else {
      DOM.appWindow.classList.remove("hidden");
      DOM.taskAppTab.classList.remove("hidden");
    }
    if (state.app.minimized) {
      DOM.appWindow.classList.add("minimized");
      DOM.taskAppTab.classList.remove("active");
    } else {
      DOM.appWindow.classList.remove("minimized");
      if (state.app.active) {
        DOM.appWindow.classList.add("active");
        DOM.taskAppTab.classList.add("active");
      }
    }

    // Restore ADG Window
    if (state.adg.hidden) {
      DOM.adgWindow.classList.add("hidden");
      DOM.taskAdgTab.classList.add("hidden");
    } else {
      DOM.adgWindow.classList.remove("hidden");
      DOM.taskAdgTab.classList.remove("hidden");
    }
    if (state.adg.minimized) {
      DOM.adgWindow.classList.add("minimized");
      DOM.taskAdgTab.classList.remove("active");
    } else {
      DOM.adgWindow.classList.remove("minimized");
      if (state.adg.active) {
        DOM.adgWindow.classList.add("active");
        DOM.taskAdgTab.classList.add("active");
        if (typeof startADGAnimationLoop === "function") {
          startADGAnimationLoop();
        }
      }
    }

    // Sync active tabs correctly
    if (state.app.active && !state.app.minimized && !state.app.hidden) {
      DOM.appWindow.classList.add("active");
      DOM.taskAppTab.classList.add("active");
      DOM.adgWindow.classList.remove("active");
      DOM.taskAdgTab.classList.remove("active");
    } else if (state.adg.active && !state.adg.minimized && !state.adg.hidden) {
      DOM.adgWindow.classList.add("active");
      DOM.taskAdgTab.classList.add("active");
      DOM.appWindow.classList.remove("active");
      DOM.taskAppTab.classList.remove("active");
    }
  } catch (e) {
    console.error("Failed to load window states:", e);
  }
}

function focusApp() {
  DOM.appWindow.classList.add("active");
  DOM.adgWindow.classList.remove("active");
  DOM.taskAppTab.classList.add("active");
  DOM.taskAdgTab.classList.remove("active");
  saveWindowStates();
}

function focusAdg() {
  DOM.adgWindow.classList.add("active");
  DOM.appWindow.classList.remove("active");
  DOM.taskAdgTab.classList.add("active");
  DOM.taskAppTab.classList.remove("active");
  if (typeof startADGAnimationLoop === "function") {
    startADGAnimationLoop();
  }
  saveWindowStates();
}

// --- System Window, Start Menu, Clock & Sound Setup ---

function setupClock() {
  const updateClock = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    DOM.trayTime.textContent = `${hours}:${minutes}`;
  };
  updateClock();
  setInterval(updateClock, 10000);
}

// Helper for unified touch and click events on mobile (safeguards iOS WebKit taps)
function bindInteractive(el, handler) {
  if (!el) return;
  let touched = false;

  const wrapper = (e) => {
    if (e.type === "touchstart") {
      touched = true;
      e.preventDefault();
      e.stopPropagation();
      handler(e);
    } else if (e.type === "click") {
      if (touched) {
        touched = false;
        return;
      }
      e.stopPropagation();
      handler(e);
    }
  };

  el.addEventListener("touchstart", wrapper, { passive: false });
  el.addEventListener("click", wrapper);
}

function setupDesktopShortcuts() {
  // My Computer opens the system information dialog
  const iconMyComputer = document.getElementById("icon-mycomputer");
  const myComputerDialog = document.getElementById("mycomputer-dialog");
  if (iconMyComputer && myComputerDialog) {
    bindInteractive(iconMyComputer, () => {
      SoundFX.playClick();
      myComputerDialog.classList.remove("hidden");
    });

    const closeButtons = myComputerDialog.querySelectorAll(".btn-mycomputer-close");
    closeButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        SoundFX.playClick();
        myComputerDialog.classList.add("hidden");
      });
    });

    // Handle explorer grid selection and dynamic status bar updates
    const myCompItems = myComputerDialog.querySelectorAll(".mycomp-item");
    const statusLeft = document.getElementById("mycomp-status-left");
    const statusRight = document.getElementById("mycomp-status-right");

    const diskInfo = {
      "floppy": { statusLeft: "1 個のオブジェクトを選択", statusRight: "空き領域: 1.44MB、総容量: 1.44MB" },
      "hdd-c": { statusLeft: "1 個のオブジェクトを選択", statusRight: "空きディスク領域 4.20GB、総容量 8.40GB" },
      "drive-d": { statusLeft: "1 個のオブジェクトを選択", statusRight: "空きディスク領域 251MB、総容量 512MB" },
      "drive-e": { statusLeft: "1 個のオブジェクトを選択", statusRight: "空きディスク領域 820MB、総容量 1.20GB" },
      "drive-f": { statusLeft: "1 個のオブジェクトを選択", statusRight: "空きディスク領域 0バイト、総容量 650MB" },
      "drive-z": { statusLeft: "1 個のオブジェクトを選択", statusRight: "ネットワーク空き領域 12.8GB、総容量 20.0GB" },
      "control": { statusLeft: "1 個のオブジェクトを選択", statusRight: "各種システム設定を行います" },
      "printers": { statusLeft: "1 個のオブジェクトを選択", statusRight: "プリンタと印刷ジョブの管理を行います" },
      "dialup": { statusLeft: "1 個のオブジェクトを選択", statusRight: "インターネット接続の構成を行います" }
    };

    myCompItems.forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        SoundFX.playClick();
        
        const id = item.getAttribute("data-id");
        if (item.classList.contains("selected") && id === "dialup" && dialupConnectDialog) {
          dialupConnectDialog.classList.remove("hidden");
        }
        
        myCompItems.forEach(i => {
          i.classList.remove("selected");
          const lbl = i.querySelector(".mycomp-label");
          if (lbl) {
            lbl.style.background = "transparent";
            lbl.style.color = "var(--win-black)";
            lbl.style.border = "1px solid transparent";
          }
        });
        item.classList.add("selected");
        const label = item.querySelector(".mycomp-label");
        if (label) {
          label.style.background = "#000080";
          label.style.color = "#fff";
          label.style.border = "1px dotted #ff0";
        }
        
        if (diskInfo[id]) {
          if (statusLeft) statusLeft.textContent = diskInfo[id].statusLeft;
          if (statusRight) statusRight.textContent = diskInfo[id].statusRight;
        }
      });
      
      item.addEventListener("dblclick", () => {
        if (item.getAttribute("data-id") === "dialup" && dialupConnectDialog) {
          dialupConnectDialog.classList.remove("hidden");
        }
      });
    });

    const explorerView = myComputerDialog.querySelector(".mycomputer-explorer-view");
    if (explorerView) {
      explorerView.addEventListener("click", () => {
        myCompItems.forEach(i => {
          i.classList.remove("selected");
          const lbl = i.querySelector(".mycomp-label");
          if (lbl) {
            lbl.style.background = "transparent";
            lbl.style.color = "var(--win-black)";
            lbl.style.border = "1px solid transparent";
          }
        });
        if (statusLeft) statusLeft.textContent = "9 個のオブジェクト";
        if (statusRight) statusRight.textContent = "マイ コンピュータ";
      });
    }

    // Dial-up Connection Dialog setup
    const dialupConnectDialog = document.getElementById("dialup-connect-dialog");
    const dialupStatusDialog = document.getElementById("dialup-status-dialog");
    const btnDialupStart = document.getElementById("btn-dialup-start");
    const dialupLoadingDots = document.getElementById("dialup-loading-dots");
    
    let dialupAudio = null;
    let dialupTimer = null;
    let bytesTimer = null;
    let isConnecting = false;
    let connectTimeout = null;

    // Close connect dialog
    if (dialupConnectDialog) {
      const closeConnectBtns = dialupConnectDialog.querySelectorAll(".btn-dialup-connect-close");
      closeConnectBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          SoundFX.playClick();
          resetDialupConnection();
          dialupConnectDialog.classList.add("hidden");
        });
      });
    }

    function resetDialupConnection() {
      isConnecting = false;
      if (dialupAudio) {
        dialupAudio.stop();
        dialupAudio = null;
      }
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      if (btnDialupStart) {
        btnDialupStart.disabled = false;
        btnDialupStart.textContent = "接続(C)";
      }
      if (dialupLoadingDots) {
        dialupLoadingDots.textContent = "";
      }
    }

    // Start dialing
    if (btnDialupStart) {
      btnDialupStart.addEventListener("click", () => {
        if (isConnecting) return;
        isConnecting = true;
        btnDialupStart.disabled = true;
        btnDialupStart.textContent = "接続中...";
        
        // Start animation wave dots in banner
        let dots = "";
        const dotsInterval = setInterval(() => {
          if (!isConnecting) {
            clearInterval(dotsInterval);
            return;
          }
          dots = dots.length >= 6 ? "" : dots + ")";
          if (dialupLoadingDots) dialupLoadingDots.textContent = dots;
        }, 180);

        // Play the procedural dialing sound!
        dialupAudio = SoundFX.playDialupSound();
        
        const totalDuration = dialupAudio ? (dialupAudio.duration * 1000) : 12000;
        
        connectTimeout = setTimeout(() => {
          clearInterval(dotsInterval);
          if (!isConnecting) return;
          
          // Connect successful!
          isConnecting = false;
          if (dialupConnectDialog) dialupConnectDialog.classList.add("hidden");
          if (dialupStatusDialog) {
            dialupStatusDialog.classList.remove("hidden");
            startActiveConnectionCounters();
          }
          resetDialupConnection();
        }, totalDuration);
      });
    }

    // Dynamic timer and bytes counter for connected status
    let secondsElapsed = 0;
    let bytesReceived = 361;
    let bytesSent = 432;
    
    const timeElapsedEl = document.getElementById("dialup-time-elapsed");
    const bytesReceivedEl = document.getElementById("dialup-bytes-received");
    const bytesSentEl = document.getElementById("dialup-bytes-sent");

    function startActiveConnectionCounters() {
      secondsElapsed = 0;
      bytesReceived = 361;
      bytesSent = 432;
      
      if (timeElapsedEl) timeElapsedEl.textContent = "000:00:00";
      if (bytesReceivedEl) bytesReceivedEl.textContent = String(bytesReceived);
      if (bytesSentEl) bytesSentEl.textContent = String(bytesSent);
      
      clearInterval(dialupTimer);
      clearInterval(bytesTimer);
      
      dialupTimer = setInterval(() => {
        secondsElapsed++;
        const hours = String(Math.floor(secondsElapsed / 3600)).padStart(3, '0');
        const mins = String(Math.floor((secondsElapsed % 3600) / 60)).padStart(2, '0');
        const secs = String(secondsElapsed % 60).padStart(2, '0');
        if (timeElapsedEl) timeElapsedEl.textContent = `${hours}:${mins}:${secs}`;
      }, 1000);
      
      bytesTimer = setInterval(() => {
        // Randomly simulate bytes transferring
        bytesReceived += Math.floor(Math.random() * 45) + 5;
        bytesSent += Math.floor(Math.random() * 20) + 2;
        if (bytesReceivedEl) bytesReceivedEl.textContent = String(bytesReceived);
        if (bytesSentEl) bytesSentEl.textContent = String(bytesSent);
      }, 1200);
    }

    // Close status / disconnect buttons
    if (dialupStatusDialog) {
      const btnOk = document.getElementById("btn-dialup-ok");
      const btnDisconnect = document.getElementById("btn-dialup-disconnect");
      const btnCloseX = dialupStatusDialog.querySelector(".btn-dialup-status-close-class");
      
      const disconnectAction = () => {
        SoundFX.playClick();
        clearInterval(dialupTimer);
        clearInterval(bytesTimer);
        dialupStatusDialog.classList.add("hidden");
      };
      
      if (btnOk) {
        btnOk.addEventListener("click", () => {
          SoundFX.playClick();
          dialupStatusDialog.classList.add("hidden");
        });
      }
      if (btnDisconnect) {
        btnDisconnect.addEventListener("click", disconnectAction);
      }
      if (btnCloseX) {
        btnCloseX.addEventListener("click", () => {
          SoundFX.playClick();
          dialupStatusDialog.classList.add("hidden");
        });
      }
    }
  }

  // Recycle Bin opens the trash dialog
  const iconRecycle = document.getElementById("icon-recycle");
  const recycleDialog = document.getElementById("recycle-dialog");
  const recycleList = document.getElementById("recycle-list");
  const btnEmptyRecycle = document.getElementById("btn-empty-recycle");
  
  if (iconRecycle && recycleDialog) {
    bindInteractive(iconRecycle, () => {
      SoundFX.playClick();
      recycleDialog.classList.remove("hidden");
    });

    const closeButtons = recycleDialog.querySelectorAll(".btn-recycle-close");
    closeButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        SoundFX.playClick();
        recycleDialog.classList.add("hidden");
      });
    });

    if (btnEmptyRecycle && recycleList) {
      btnEmptyRecycle.addEventListener("click", () => {
        const confirmWipe = confirm(
          "【システム警告】\nごみ箱の中身と一緒に、すべての保存データ（仮想ディスクの画像、ウィンドウ状態、セリフ設定など）を完全に消去して初期化します。\n本当に実行してもよろしいですか？"
        );
        if (confirmWipe) {
          // Play the satisfying synthesized crunch sound!
          SoundFX.playTrashSound();
          
          // Animate clearing the list
          recycleList.innerHTML = "<li style='text-align: center; color: #808080; padding: 24px 0; font-family: sans-serif; font-size: 11px;'>ごみ箱は空です</li>";
          btnEmptyRecycle.disabled = true;
          btnEmptyRecycle.textContent = "初期化中...";

          // Wipe localStorage
          localStorage.clear();

          // After a short delay, reload the page to simulate a clean reboot!
          setTimeout(() => {
            location.reload();
          }, 1200);
        } else {
          SoundFX.playClick();
        }
      });
    }
  }

  // App Shortcut opens app window
  bindInteractive(DOM.iconPc98, () => {
    SoundFX.playClick();
    if (DOM.appWindow.classList.contains("minimized") || DOM.appWindow.classList.contains("hidden")) {
      DOM.appWindow.classList.remove("minimized");
      DOM.appWindow.classList.remove("hidden");
      DOM.taskAppTab.classList.remove("hidden");
      focusApp();
    } else {
      if (DOM.appWindow.classList.contains("active")) {
        DOM.appWindow.classList.add("minimized");
        DOM.taskAppTab.classList.remove("active");
        saveWindowStates();
      } else {
        focusApp();
      }
    }
  });

  bindInteractive(DOM.taskAppTab, () => {
    SoundFX.playClick();
    if (DOM.appWindow.classList.contains("minimized")) {
      DOM.appWindow.classList.remove("minimized");
      focusApp();
    } else {
      if (DOM.appWindow.classList.contains("active")) {
        DOM.appWindow.classList.add("minimized");
        DOM.taskAppTab.classList.remove("active");
        saveWindowStates();
      } else {
        focusApp();
      }
    }
  });
}

function setupStartMenu() {
  bindInteractive(DOM.btnStart, () => {
    SoundFX.playClick();
    DOM.startMenuBox.classList.toggle("hidden");
  });

  document.addEventListener("click", () => {
    DOM.startMenuBox.classList.add("hidden");
  });

  // Also close start menu on touch outside
  document.addEventListener("touchstart", (e) => {
    if (!DOM.startMenuBox.contains(e.target) && e.target !== DOM.btnStart) {
      DOM.startMenuBox.classList.add("hidden");
    }
  });

  DOM.startMenuBox.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  DOM.startMenuBox.addEventListener("touchstart", (e) => {
    e.stopPropagation();
  });

  bindInteractive(DOM.startResetApp, () => {
    SoundFX.playClick();
    DOM.startMenuBox.classList.add("hidden");
    location.reload();
  });

  bindInteractive(DOM.startSoundToggle, () => {
    toggleSound();
    DOM.startMenuBox.classList.add("hidden");
  });

  bindInteractive(DOM.traySoundIcon, () => {
    toggleSound();
  });

  bindInteractive(DOM.startAbout, () => {
    SoundFX.playClick();
    DOM.startMenuBox.classList.add("hidden");
    DOM.aboutDialog.classList.remove("hidden");
  });

  document.getElementById("menu-about").addEventListener("click", () => {
    SoundFX.playClick();
    DOM.aboutDialog.classList.remove("hidden");
  });

  DOM.btnModalCloses.forEach(btn => {
    btn.addEventListener("click", () => {
      SoundFX.playClick();
      DOM.aboutDialog.classList.add("hidden");
    });
  });

  DOM.btnExportCloses.forEach(btn => {
    btn.addEventListener("click", () => {
      SoundFX.playClick();
      DOM.exportDialog.classList.add("hidden");
    });
  });
}

function toggleSound() {
  SoundFX.enabled = !SoundFX.enabled;
  if (SoundFX.enabled) {
    SoundFX.init();
    DOM.traySoundIcon.className = "sound-icon-on";
    DOM.startSoundToggle.innerHTML = '<span class="menu-icon icon-audio"></span>サウンド効果: オン';
    SoundFX.playClick();

    // Resume BGM if any was selected
    const selectedBgm = DOM.adgBgmPreset ? DOM.adgBgmPreset.value : "none";
    SoundFX.bgmPlayer.start(selectedBgm);
  } else {
    DOM.traySoundIcon.className = "sound-icon-off";
    DOM.startSoundToggle.innerHTML = '<span class="menu-icon icon-audio"></span>サウンド効果: オフ';

    // Stop BGM
    SoundFX.bgmPlayer.stop();
  }
}

function setupWindowControls() {
  DOM.btnMinimize.addEventListener("click", (e) => {
    SoundFX.playClick();
    DOM.appWindow.classList.add("minimized");
    DOM.taskAppTab.classList.remove("active");
    saveWindowStates();
    e.stopPropagation();
  });

  DOM.btnClose.addEventListener("click", (e) => {
    SoundFX.playClick();
    DOM.appWindow.classList.add("hidden");
    DOM.taskAppTab.classList.add("hidden");
    DOM.taskAppTab.classList.remove("active");
    saveWindowStates();
    e.stopPropagation();
  });

  // Windows Menu Actions
  document.getElementById("menu-upload").addEventListener("click", () => {
    SoundFX.playClick();
    DOM.imageInput.click();
  });

  document.getElementById("menu-save").addEventListener("click", () => {
    if (State.sourceImage) {
      downloadResultImage();
    } else {
      SoundFX.playBeepAlert();
    }
  });

  document.getElementById("menu-reset").addEventListener("click", () => {
    SoundFX.playClick();
    location.reload();
  });

  document.getElementById("menu-crop-toggle").addEventListener("click", () => {
    SoundFX.playClick();
    resetCrop();
  });

  // Allow title bar dragging on desktop
  let isDraggingWindow = false;
  let dragOffset = { x: 0, y: 0 };
  const titleBar = document.querySelector(".title-bar");

  titleBar.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    isDraggingWindow = true;
    dragOffset.x = e.clientX - DOM.appWindow.offsetLeft;
    dragOffset.y = e.clientY - DOM.appWindow.offsetTop;
    DOM.appWindow.classList.add("active");
    titleBar.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDraggingWindow) return;
    DOM.appWindow.style.left = `${e.clientX - dragOffset.x}px`;
    DOM.appWindow.style.top = `${e.clientY - dragOffset.y}px`;
    DOM.appWindow.style.transform = "none"; // disable default centering
  });

  document.addEventListener("mouseup", () => {
    isDraggingWindow = false;
    titleBar.style.cursor = "grab";
  });
}

function setupTabs() {
  DOM.tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      SoundFX.playTabClick();
      const tabId = tab.dataset.tab;

      DOM.tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      DOM.tabPanes.forEach(pane => {
        pane.classList.remove("active");
        if (pane.id === tabId) {
          pane.classList.add("active");
        }
      });
    });
  });
}

// --- Parameter Change Handlers ---

function setupParameters() {
  // Crop Zoom Slider
  DOM.cropZoom.addEventListener("input", (e) => {
    State.crop.zoom = parseFloat(e.target.value);
    DOM.zoomValue.textContent = `${Math.round(State.crop.zoom * 100)}%`;
    renderPipelineDebounced();
  });

  // Aspect ratio radio selectors
  DOM.aspectRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      SoundFX.playClick();
      resetCrop(); // Reset crop when changing aspect ratio to fit bounds
    });
  });

  // Rotate button
  DOM.btnRotate.addEventListener("click", () => {
    SoundFX.playClick();
    rotateSource();
  });

  // Crop reset button
  DOM.btnCropReset.addEventListener("click", () => {
    SoundFX.playClick();
    resetCrop();
  });

  // Pixel resolution slider
  DOM.pixelWidth.addEventListener("input", (e) => {
    State.targetWidth = parseInt(e.target.value);
    DOM.widthValue.textContent = `${State.targetWidth}px`;
    renderPipelineDebounced();
  });

  // Color selection
  DOM.colorCount.addEventListener("change", (e) => {
    SoundFX.playClick();
    State.colorCount = parseInt(e.target.value);
    renderPipeline();
  });

  // Dithering selection
  DOM.ditherType.addEventListener("change", (e) => {
    SoundFX.playClick();
    State.ditherType = e.target.value;

    // Show/hide dither weight slider based on dithering type
    const weightRow = document.getElementById("dither-weight-row");
    if (weightRow) {
      if (State.ditherType === "none") {
        weightRow.style.display = "none";
      } else {
        weightRow.style.display = "flex";
      }
    }
    renderPipeline();
  });

  // Dither Weight Slider
  DOM.ditherWeight.addEventListener("input", (e) => {
    State.ditherWeight = parseFloat(e.target.value);
    DOM.ditherWeightValue.textContent = `${Math.round(State.ditherWeight * 100)}%`;
    renderPipelineDebounced();
  });

  // Scanlines switch
  DOM.retroScanlines.addEventListener("change", (e) => {
    SoundFX.playClick();
    State.scanlines = e.target.checked;
    if (State.scanlines) {
      DOM.previewContainer.classList.add("scanlines-active");
    } else {
      DOM.previewContainer.classList.remove("scanlines-active");
    }
  });

  // Monochromatic green mode switch
  DOM.monochromeMode.addEventListener("change", (e) => {
    SoundFX.playClick();
    State.monochrome = e.target.checked;
    renderPipeline();
  });

  // High quality downscaling smooth switch
  DOM.retroSmoothScaling.addEventListener("change", (e) => {
    SoundFX.playClick();
    renderPipeline();
  });

  // Palette Preset selection
  DOM.palettePreset.addEventListener("change", (e) => {
    SoundFX.playClick();
    State.paletteType = e.target.value;
    renderPipeline();
  });

  // Download Image Button
  DOM.btnDownload.addEventListener("click", () => {
    SoundFX.playClick();
    downloadResultImage();
  });

  // Save to Virtual Disk Button
  DOM.btnSaveDisk.addEventListener("click", () => {
    saveResultToDisk();
  });

  // Save to Virtual Disk Menu Action
  document.getElementById("menu-save-disk").addEventListener("click", () => {
    saveResultToDisk();
  });
}

// --- Image Loading and Rotation ---

function setupImageLoading() {
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    SoundFX.playRenderChime(); // Play retro synth welcome chime when starting image loading!

    updateStatus("画像ファイルをロードしています...");
    showLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        State.sourceImage = img;
        State.currentRotation = 0;

        // Prepare rotated Canvas container
        State.rotatedCanvas = document.createElement("canvas");
        applyRotationToCanvas();

        // Reset cropper parameters
        resetCrop();

        DOM.cropZoom.disabled = false;
        DOM.btnRotate.disabled = false;
        DOM.btnCropReset.disabled = false;
        DOM.btnDownload.disabled = false;
        DOM.btnSaveDisk.disabled = false;

        // Hide placeholder and show canvases
        DOM.uploadPlaceholder.classList.add("hidden");

        // Process pipeline
        renderPipeline();
      };
      img.onerror = () => {
        showLoading(false);
        updateStatus("ERROR: 画像を読み込めませんでした。");
        SoundFX.playBeepAlert();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  DOM.imageInput.addEventListener("change", handleFileSelect);
  DOM.imageInputSub.addEventListener("change", handleFileSelect);

  // Drag and Drop support
  DOM.previewContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  DOM.previewContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const inputVal = { target: { files: e.dataTransfer.files } };
      handleFileSelect(inputVal);
    }
  });
}

// --- Drag & Drop/Pan Functionality directly on output Canvas ---

function setupCropDragging() {
  const getEventCoords = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const handleStart = (e) => {
    if (!State.sourceImage) return;
    State.isDragging = true;
    const coords = getEventCoords(e);
    State.dragStart = coords;
    State.dragStartPan = { x: State.crop.panX, y: State.crop.panY };

    // Disable default behavior so mobile touches do not scroll the screen while dragging crop
    if (e.type === "touchstart") {
      // Check if user is clicking on output-canvas
      if (e.target === DOM.outputCanvas) {
        e.preventDefault();
      }
    }
  };

  const handleMove = (e) => {
    if (!State.isDragging) return;
    const coords = getEventCoords(e);

    const dx = coords.x - State.dragStart.x;
    const dy = coords.y - State.dragStart.y;

    // We need to translate screen pixels dragging to normalized offset space (-0.5 to 0.5)
    // The pan shift amount depends on zoom level (more zoomed in = slower dragging)
    const bounds = DOM.outputCanvas.getBoundingClientRect();
    const dragSpeed = 1.2 / State.crop.zoom; // scaling speed

    const deltaPanX = -(dx / bounds.width) * dragSpeed;
    const deltaPanY = -(dy / bounds.height) * dragSpeed;

    State.crop.panX = Math.max(-0.5, Math.min(0.5, State.dragStartPan.x + deltaPanX));
    State.crop.panY = Math.max(-0.5, Math.min(0.5, State.dragStartPan.y + deltaPanY));

    renderPipelineDebounced();
  };

  const handleEnd = () => {
    State.isDragging = false;
  };

  DOM.outputCanvas.addEventListener("mousedown", handleStart);
  window.addEventListener("mousemove", handleMove);
  window.addEventListener("mouseup", handleEnd);

  DOM.outputCanvas.addEventListener("touchstart", handleStart, { passive: false });
  window.addEventListener("touchmove", handleMove, { passive: false });
  window.addEventListener("touchend", handleEnd);
}
