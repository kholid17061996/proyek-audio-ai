/**
 * Chronicle — Documentary Voice Studio (Charon) Engine
 * Exact reproduction of the Classical Panoramic Documentary Interface
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const inputText = document.getElementById('inputText');
  const wordCount = document.getElementById('wordCount');
  const estDuration = document.getElementById('estDuration');
  const btnGenerate = document.getElementById('btnGenerate');
  const generateBtnText = document.getElementById('generateBtnText');

  // Format Selector & Voice Limiter Elements
  const audioFormatInput = document.getElementById('audioFormatInput');
  const formatPillBtns = document.querySelectorAll('.format-pill-btn');
  const voiceCounterPill = document.getElementById('voiceCounterPill');
  const voiceCounterText = document.getElementById('voiceCounterText');
  const bulkLimitWarning = document.getElementById('bulkLimitWarning');
  const bulkLimitWarningMsg = document.getElementById('bulkLimitWarningMsg');

  // Bulk Results Container Elements
  const bulkResultsSection = document.getElementById('bulkResultsSection');
  const bulkResultsTitle = document.getElementById('bulkResultsTitle');
  const bulkResultsSubtitle = document.getElementById('bulkResultsSubtitle');
  const btnDownloadBulkZip = document.getElementById('btnDownloadBulkZip');
  const bulkVoiceList = document.getElementById('bulkVoiceList');
  const btnDownloadAudioText = document.getElementById('btnDownloadAudioText');

  // Status & Nav
  const navStatusPill = document.getElementById('navStatusPill');
  const statusLabel = document.getElementById('statusLabel');

  // Charon Jeda Dramatis Segmented Switcher
  const dramaticPauseInput = document.getElementById('dramaticPauseInput');
  const pauseHelperCaption = document.getElementById('pauseHelperCaption');
  const segmentBtns = document.querySelectorAll('.segment-btn');

  // Audio Player Elements
  const audioElement = document.getElementById('audioElement');
  const btnPlayPause = document.getElementById('btnPlayPause');
  const playIconSvg = document.getElementById('playIconSvg');
  const pauseIconSvg = document.getElementById('pauseIconSvg');
  const currentTimeDisplay = document.getElementById('currentTimeDisplay');
  const totalDurationDisplay = document.getElementById('totalDurationDisplay');
  const btnDownloadAudio = document.getElementById('btnDownloadAudio');
  const waveformCanvas = document.getElementById('waveformCanvas');
  const waveformScrubberArea = document.getElementById('waveformScrubberArea');
  const playerVolumeSlider = document.getElementById('playerVolumeSlider');
  const btnMuteToggle = document.getElementById('btnMuteToggle');
  const btnDotsMenu = document.getElementById('btnDotsMenu');
  const speedPopupMenu = document.getElementById('speedPopupMenu');
  const speedOptBtns = document.querySelectorAll('.speed-opt-btn');

  // Modals
  const btnContohNaskah = document.getElementById('btnContohNaskah');
  const modalContohNaskah = document.getElementById('modalContohNaskah');
  const btnOpenPanduan = document.getElementById('btnOpenPanduan');
  const modalPanduan = document.getElementById('modalPanduan');
  const btnTipsJeda = document.getElementById('btnTipsJeda');
  const btnHelpJeda = document.getElementById('btnHelpJeda');
  const modalTipsJeda = document.getElementById('modalTipsJeda');
  const btnOpenSettings = document.getElementById('btnOpenSettings');
  const modalSettings = document.getElementById('modalSettings');
  const btnOpenHistory = document.getElementById('btnOpenHistory');
  const modalRiwayat = document.getElementById('modalRiwayat');

  // Settings & Fine-tuning Sliders
  const settingsGeminiKey = document.getElementById('settingsGeminiKey');
  const btnSaveKeyInModal = document.getElementById('btnSaveKeyInModal');
  const engineActiveLabel = document.getElementById('engineActiveLabel');
  const modalSliderRate = document.getElementById('modalSliderRate');
  const modalRateDisplay = document.getElementById('modalRateDisplay');
  const modalSliderPitch = document.getElementById('modalSliderPitch');
  const modalPitchDisplay = document.getElementById('modalPitchDisplay');

  // History & Toast
  const historyListBox = document.getElementById('historyListBox');
  const emptyHistoryNotice = document.getElementById('emptyHistoryNotice');
  const historyCountBadge = document.getElementById('historyCountBadge');
  const toastContainer = document.getElementById('toastContainer');

  // --- State Variables ---
  let storedGeminiKey = localStorage.getItem('chronicle_gemini_key') || '';
  let selectedAudioFormat = localStorage.getItem('chronicle_audio_format') || 'wav';
  let currentPlaybackRate = 1.0;
  let waveData = [];
  let isGenerating = false;

  // Inisialisasi Pilihan Format Audio
  function initFormatSelector() {
    if (audioFormatInput) audioFormatInput.value = selectedAudioFormat;
    formatPillBtns.forEach(btn => {
      const fmt = btn.getAttribute('data-format');
      if (fmt === selectedAudioFormat) {
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-checked', 'false');
      }

      btn.addEventListener('click', () => {
        formatPillBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        selectedAudioFormat = fmt;
        if (audioFormatInput) audioFormatInput.value = fmt;
        localStorage.setItem('chronicle_audio_format', fmt);
        if (btnDownloadAudioText) {
          btnDownloadAudioText.textContent = `Unduh Audio (.${fmt})`;
        }
        showToast(`Format audio diatur ke ${fmt.toUpperCase()} (${fmt === 'wav' ? 'Studio 24kHz' : 'Universal 192k'})`, 'info');
      });
    });

    if (btnDownloadAudioText) {
      btnDownloadAudioText.textContent = `Unduh Audio (.${selectedAudioFormat})`;
    }
  }
  initFormatSelector();

  if (settingsGeminiKey && storedGeminiKey) {
    settingsGeminiKey.value = storedGeminiKey;
    updateEngineLabel(true);
  } else {
    updateEngineLabel(false);
  }

  function updateEngineLabel(hasCustomKey) {
    if (!engineActiveLabel) return;
    if (hasCustomKey) {
      engineActiveLabel.textContent = 'Google Gemini TTS (API Key Pribadi Anda — Aktif)';
      engineActiveLabel.parentElement.style.color = '#16a34a';
    } else {
      engineActiveLabel.textContent = 'Google Gemini TTS (Kunci Bawaan Sistem — Aktif)';
      engineActiveLabel.parentElement.style.color = '#7c3aed';
    }
  }

  // ==========================================================================
  // Helper: Toast Notification
  // ==========================================================================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 3800);
  }

  // ==========================================================================
  // Helper: Dapatkan baris-baris naskah murni (1x Enter = 1 suara)
  // ==========================================================================
  function getScriptLines() {
    if (!inputText) return [];
    return inputText.value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  // ==========================================================================
  // Naskah Word Count, Estimated Duration, & Limit Real-time (Max 30)
  // ==========================================================================
  function updateTextStats() {
    const text = inputText.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    wordCount.textContent = `${words} kata`;

    const lines = getScriptLines();
    const lineCount = lines.length;

    // Evaluasi batas maksimal 30 suara
    if (lineCount === 0) {
      if (voiceCounterText) voiceCounterText.textContent = `0 / 30 suara`;
      if (voiceCounterPill) voiceCounterPill.className = 'voice-counter-pill';
      if (bulkLimitWarning) bulkLimitWarning.classList.add('hidden');
      if (btnGenerate) {
        btnGenerate.disabled = false;
        btnGenerate.classList.remove('btn-disabled-limit');
      }
      if (generateBtnText) generateBtnText.textContent = 'Generate Narration';
    } else if (lineCount <= 30) {
      if (voiceCounterText) voiceCounterText.textContent = `${lineCount} / 30 suara`;
      if (voiceCounterPill) voiceCounterPill.className = 'voice-counter-pill active';
      if (bulkLimitWarning) bulkLimitWarning.classList.add('hidden');
      if (btnGenerate) {
        btnGenerate.disabled = false;
        btnGenerate.classList.remove('btn-disabled-limit');
      }
      if (generateBtnText) {
        if (lineCount === 1) {
          generateBtnText.textContent = 'Generate Narration (voice 1)';
        } else {
          generateBtnText.textContent = `Generate Narration (${lineCount} Suara: voice 1 - ${lineCount})`;
        }
      }
    } else {
      // MELEBIHI BATAS (>30)
      if (voiceCounterText) voiceCounterText.textContent = `⚠️ ${lineCount} / 30 suara`;
      if (voiceCounterPill) voiceCounterPill.className = 'voice-counter-pill danger';
      if (bulkLimitWarning) {
        bulkLimitWarning.classList.remove('hidden');
        if (bulkLimitWarningMsg) {
          bulkLimitWarningMsg.textContent = `Naskah terdeteksi ${lineCount} baris. Maksimal 30 suara sekali generate (1x Enter = 1 suara terpisah). Harap kurangi baris naskah untuk melanjutkan.`;
        }
      }
      if (btnGenerate) {
        btnGenerate.disabled = true;
        btnGenerate.classList.add('btn-disabled-limit');
      }
      if (generateBtnText) {
        generateBtnText.textContent = `⚠️ Melebihi Batas (${lineCount} / 30 Suara)`;
      }
    }

    // Perkiraan durasi membaca Charon
    const rateVal = parseInt(modalSliderRate?.value || 0, 10);
    const speedFactor = 1 + (rateVal / 100);
    const wordsPerSec = (130 / 60) * Math.max(0.4, speedFactor);
    const estSec = words > 0 ? Math.round(words / wordsPerSec) : 0;

    if (estSec < 60) {
      estDuration.textContent = `~${estSec} detik`;
    } else {
      const mins = Math.floor(estSec / 60);
      const secs = estSec % 60;
      estDuration.textContent = `~${mins}m ${secs}d`;
    }
  }

  inputText.addEventListener('input', updateTextStats);

  // ==========================================================================
  // Intensitas Jeda Dramatis Segmented Control
  // ==========================================================================
  const PAUSE_CAPTIONS = {
    subtle: 'Jeda halus dan dinamis. Cocok untuk narasi santai & cerita cepat.',
    normal: 'Jeda alami pada tanda baca (... , ., dan .). Cocok untuk narasi dokumenter.',
    high: 'Jeda hening intens dan panjang. Cocok untuk adegan horor, ketegangan, atau klimaks misteri.'
  };

  segmentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      segmentBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');

      const pauseVal = btn.getAttribute('data-pause');
      dramaticPauseInput.value = pauseVal;
      pauseHelperCaption.textContent = PAUSE_CAPTIONS[pauseVal] || PAUSE_CAPTIONS.normal;
    });
  });

  // ==========================================================================
  // Waveform Canvas Visualizer & Scrubber
  // ==========================================================================
  const ctx = waveformCanvas.getContext('2d');
  const TOTAL_BARS = 68;

  function generateMockWaveform() {
    waveData = [];
    for (let i = 0; i < TOTAL_BARS; i++) {
      // Natural speech rhythm wave shape
      const base = 0.25 + 0.65 * Math.sin((i / TOTAL_BARS) * Math.PI);
      const noise = (Math.random() * 0.4) - 0.2;
      const height = Math.max(0.15, Math.min(0.95, base + noise));
      waveData.push(height);
    }
  }

  function drawWaveform(progress = 0) {
    const width = waveformCanvas.width;
    const height = waveformCanvas.height;
    ctx.clearRect(0, 0, width, height);

    if (waveData.length === 0) generateMockWaveform();

    const barWidth = 3;
    const barGap = (width - (TOTAL_BARS * barWidth)) / (TOTAL_BARS - 1);

    for (let i = 0; i < TOTAL_BARS; i++) {
      const x = i * (barWidth + barGap);
      const barHeight = waveData[i] * (height - 6);
      const y = (height - barHeight) / 2;

      const isPlayed = (i / TOTAL_BARS) <= progress;

      // Unplayed: light slate gray; Played: radiant primary blue
      ctx.fillStyle = isPlayed ? '#2563eb' : '#cbd5e1';

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 2, 2]);
      ctx.fill();
    }
  }

  // Scrubber click on waveform
  waveformScrubberArea.addEventListener('click', (e) => {
    if (!audioElement.duration) return;
    const rect = waveformScrubberArea.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    audioElement.currentTime = pct * audioElement.duration;
    updateProgressUI();
  });

  // ==========================================================================
  // Audio Player Logic
  // ==========================================================================
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function updatePlayBtnUI(isPlaying) {
    if (isPlaying) {
      playIconSvg.classList.add('hidden');
      pauseIconSvg.classList.remove('hidden');
      if (statusLabel) statusLabel.textContent = 'Playing';
      if (navStatusPill) navStatusPill.classList.add('playing');
    } else {
      playIconSvg.classList.remove('hidden');
      pauseIconSvg.classList.add('hidden');
      if (statusLabel) statusLabel.textContent = 'Ready';
      if (navStatusPill) navStatusPill.classList.remove('playing');
    }
  }

  btnPlayPause.addEventListener('click', () => {
    if (!audioElement.src) return;
    if (audioElement.paused) {
      audioElement.play().catch(e => console.log(e));
    } else {
      audioElement.pause();
    }
  });

  audioElement.addEventListener('play', () => updatePlayBtnUI(true));
  audioElement.addEventListener('pause', () => updatePlayBtnUI(false));
  audioElement.addEventListener('ended', () => {
    updatePlayBtnUI(false);
    drawWaveform(0);
    currentTimeDisplay.textContent = '0:00';
  });

  function updateProgressUI() {
    const cur = audioElement.currentTime || 0;
    const dur = audioElement.duration || 0;
    currentTimeDisplay.textContent = formatTime(cur);

    if (dur > 0) {
      const progress = cur / dur;
      drawWaveform(progress);
    }
  }

  audioElement.addEventListener('timeupdate', updateProgressUI);

  audioElement.addEventListener('loadedmetadata', () => {
    totalDurationDisplay.textContent = formatTime(audioElement.duration);
    btnPlayPause.disabled = false;
    generateMockWaveform();
    drawWaveform(0);
  });

  // Volume
  playerVolumeSlider.addEventListener('input', () => {
    audioElement.volume = playerVolumeSlider.value / 100;
  });

  btnMuteToggle.addEventListener('click', () => {
    if (audioElement.volume > 0) {
      audioElement.volume = 0;
      playerVolumeSlider.value = 0;
    } else {
      audioElement.volume = 1;
      playerVolumeSlider.value = 100;
    }
  });

  // 3-dots speed menu
  btnDotsMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    speedPopupMenu.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    speedPopupMenu.classList.add('hidden');
  });

  speedOptBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedOptBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const rate = parseFloat(btn.getAttribute('data-speed'));
      audioElement.playbackRate = rate;
      currentPlaybackRate = rate;
      showToast(`Kecepatan putar diatur ke ${rate}x`, 'info');
      speedPopupMenu.classList.add('hidden');
    });
  });

  // ==========================================================================
  // Generate Narration Action (Mendukung 1 s/d 30 Suara Terpisah & Format WAV/MP3)
  // ==========================================================================
  async function handleGenerate() {
    if (isGenerating) return;

    const lines = getScriptLines();
    if (lines.length === 0) {
      showToast('Harap tuliskan naskah narasi terlebih dahulu!', 'error');
      inputText.focus();
      return;
    }

    if (lines.length > 30) {
      showToast(`⚠️ Naskah melebihi batas! Maksimal 30 suara sekali generate (terdeteksi ${lines.length} baris).`, 'error');
      return;
    }

    isGenerating = true;
    btnGenerate.classList.add('loading');
    btnGenerate.disabled = true;

    const count = lines.length;
    const format = audioFormatInput?.value || selectedAudioFormat || 'wav';
    generateBtnText.textContent = count > 1 
      ? `Generating ${count} Suara (${format.toUpperCase()})...` 
      : `Generating Narration (${format.toUpperCase()})...`;

    if (statusLabel) statusLabel.textContent = `Processing (${count} Suara)...`;

    const rate = parseInt(modalSliderRate?.value || 0, 10);
    const pitch = parseInt(modalSliderPitch?.value || 0, 10);
    const dramatic_pause = dramaticPauseInput?.value || 'normal';
    const api_key = storedGeminiKey || '';

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText.value.trim(),
          format: format,
          rate,
          pitch,
          volume: 0,
          dramatic_pause,
          api_key
        })
      });

      const result = await response.json();

      if (result.success) {
        const items = result.items || (result.item ? [result.item] : []);
        const primaryItem = result.item || items[0];

        // Pasang audio suara pertama ke pemutar utama
        if (primaryItem) {
          audioElement.src = primaryItem.audio_url;
          btnDownloadAudio.href = primaryItem.download_url || `/api/download/${primaryItem.filename}?as=${primaryItem.display_name}.${primaryItem.format}`;
          btnDownloadAudio.setAttribute('download', `${primaryItem.display_name}.${primaryItem.format}`);
          if (btnDownloadAudioText) {
            btnDownloadAudioText.textContent = `Unduh ${primaryItem.display_name} (.${primaryItem.format})`;
          }
          btnDownloadAudio.classList.remove('disabled');
        }

        // Jika menghasilkan bulk (> 1 suara)
        if (result.is_bulk && items.length > 1) {
          if (bulkResultsSection) bulkResultsSection.classList.remove('hidden');
          if (bulkResultsTitle) {
            bulkResultsTitle.textContent = `${items.length} Suara Berhasil Dibuat (${format.toUpperCase()})`;
          }
          if (bulkResultsSubtitle) {
            bulkResultsSubtitle.textContent = `Format: ${format.toUpperCase()} • voice 1 s/d voice ${items.length} • Total: ${result.total_duration}`;
          }

          if (btnDownloadBulkZip && result.zip_url) {
            btnDownloadBulkZip.href = result.zip_url;
            btnDownloadBulkZip.setAttribute('download', `Chronicle_Voices_Bulk_1_sampai_${items.length}_${format.toUpperCase()}.zip`);
          }

          // Render daftar kartu suara bulk
          renderBulkVoiceList(items);

          showToast(`✅ Berhasil membuat ${items.length} suara narasi terpisah (voice 1 s/d voice ${items.length})!`, 'success');
        } else {
          // Hanya 1 suara
          if (bulkResultsSection) bulkResultsSection.classList.add('hidden');
          showToast(`✅ Narasi ${primaryItem?.display_name || 'voice 1'} (${format.toUpperCase()}) berhasil digenerate!`, 'success');
        }

        // Putar langsung suara pertama
        audioElement.play().catch(e => console.log('Autoplay handled:', e));

        // Segarkan riwayat
        loadHistory();
      } else {
        showToast(result.error || 'Terjadi kesalahan saat membuat narasi', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal menghubungi server lokal. Pastikan server aktif.', 'error');
    } finally {
      isGenerating = false;
      btnGenerate.classList.remove('loading');
      updateTextStats();
      if (statusLabel && audioElement.paused) statusLabel.textContent = 'Ready';
    }
  }

  // ==========================================================================
  // Render Daftar Suara Bulk (voice 1 s/d voice N)
  // ==========================================================================
  function renderBulkVoiceList(items) {
    if (!bulkVoiceList) return;
    bulkVoiceList.innerHTML = '';

    items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = `bulk-voice-card ${index === 0 ? 'active-playing' : ''}`;
      card.id = `bvc-${item.id}`;

      card.innerHTML = `
        <div class="bvc-left">
          <div class="bvc-badge">${item.display_name}</div>
          <button type="button" class="btn-bvc-play" title="Putar ${item.display_name}">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 4 20 12 6 20 6 4"></polygon>
            </svg>
          </button>
          <div class="bvc-info">
            <span class="bvc-text" title="${item.text}">${item.text}</span>
            <span class="bvc-meta">
              <span>${item.file_size}</span> &bull; 
              <span>${(item.format || 'wav').toUpperCase()}</span>
            </span>
          </div>
        </div>
        <div class="bvc-actions">
          <a href="${item.download_url}" class="btn-bvc-download" download="${item.display_name}.${item.format || 'wav'}" title="Unduh ${item.display_name}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Unduh</span>
          </a>
        </div>
      `;

      // Event listener klik tombol putar pada tiap kartu suara
      card.querySelector('.btn-bvc-play').addEventListener('click', () => {
        document.querySelectorAll('.bulk-voice-card').forEach(c => c.classList.remove('active-playing'));
        card.classList.add('active-playing');

        audioElement.src = item.audio_url;
        btnDownloadAudio.href = item.download_url;
        btnDownloadAudio.setAttribute('download', `${item.display_name}.${item.format || 'wav'}`);
        if (btnDownloadAudioText) {
          btnDownloadAudioText.textContent = `Unduh ${item.display_name} (.${item.format || 'wav'})`;
        }
        btnDownloadAudio.classList.remove('disabled');

        audioElement.play().catch(e => console.log('Play error:', e));
        showToast(`Memutar ${item.display_name}...`, 'info');
      });

      bulkVoiceList.appendChild(card);
    });
  }

  btnGenerate.addEventListener('click', handleGenerate);

  // Shortcut Ctrl + Enter
  inputText.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  });

  // ==========================================================================
  // Modal Handlers & Drawers
  // ==========================================================================
  function openModal(modalEl) {
    if (modalEl) modalEl.classList.remove('hidden');
  }

  function closeModal(modalEl) {
    if (modalEl) modalEl.classList.add('hidden');
  }

  // Open triggers
  btnContohNaskah?.addEventListener('click', () => openModal(modalContohNaskah));
  btnOpenPanduan?.addEventListener('click', () => openModal(modalPanduan));
  btnTipsJeda?.addEventListener('click', () => openModal(modalTipsJeda));
  btnHelpJeda?.addEventListener('click', () => openModal(modalTipsJeda));
  btnOpenSettings?.addEventListener('click', () => openModal(modalSettings));
  btnOpenHistory?.addEventListener('click', () => {
    loadHistory();
    openModal(modalRiwayat);
  });

  // Tombol putar audio acuan baku (gunung_padang_1791693456211.wav)
  const btnPlayReferenceAudio = document.getElementById('btnPlayReferenceAudio');
  btnPlayReferenceAudio?.addEventListener('click', () => {
    const refUrl = '/static/outputs/gunung_padang_1791693456211.wav';
    audioElement.src = refUrl;
    btnDownloadAudio.href = refUrl;
    btnDownloadAudio.setAttribute('download', 'gunung_padang_1791693456211.wav');
    if (btnDownloadAudioText) {
      btnDownloadAudioText.textContent = 'Unduh Audio (.wav)';
    }
    btnDownloadAudio.classList.remove('disabled');
    audioElement.play().catch(e => console.log('Autoplay error:', e));
    showToast('Memutar audio acuan baku: gunung_padang_1791693456211.wav (Charon 24kHz)', 'info');
  });

  // Close triggers
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-close-modal');
      closeModal(document.getElementById(targetId));
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeModal(backdrop);
      }
    });
  });

  // Contoh naskah click to paste
  document.querySelectorAll('.script-preset-item').forEach(item => {
    item.addEventListener('click', () => {
      const p = item.querySelector('p');
      if (p) {
        inputText.value = p.textContent.trim();
        updateTextStats();
        closeModal(modalContohNaskah);
        showToast('Naskah contoh berhasil dimuat ke editor!', 'success');
      }
    });
  });

  // ==========================================================================
  // Settings Sliders & API Key
  // ==========================================================================
  modalSliderRate?.addEventListener('input', () => {
    const val = parseInt(modalSliderRate.value, 10);
    modalRateDisplay.textContent = val === 0 ? 'Normal (1.0x)' : `${val > 0 ? '+' : ''}${val}% (${(1 + val/100).toFixed(2)}x)`;
    updateTextStats();
  });

  modalSliderPitch?.addEventListener('input', () => {
    const val = parseInt(modalSliderPitch.value, 10);
    modalPitchDisplay.textContent = val === 0 ? '0 Hz (Normal Sinematik)' : `${val > 0 ? '+' : ''}${val} Hz`;
  });

  btnSaveKeyInModal?.addEventListener('click', () => {
    const val = settingsGeminiKey.value.trim();
    storedGeminiKey = val;
    if (val) {
      localStorage.setItem('chronicle_gemini_key', val);
      updateEngineLabel(true);
      showToast('Kunci Gemini API pribadi berhasil disimpan & aktif!', 'success');
    } else {
      localStorage.removeItem('chronicle_gemini_key');
      updateEngineLabel(false);
      showToast('Menggunakan Kunci Gemini API bawaan sistem.', 'info');
    }
    closeModal(modalSettings);
  });

  // ==========================================================================
  // Riwayat Audio Management
  // ==========================================================================
  async function loadHistory() {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.success) {
        renderHistoryList(data.history || []);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }

  function renderHistoryList(history) {
    if (historyCountBadge) historyCountBadge.textContent = history.length;

    if (history.length === 0) {
      emptyHistoryNotice.classList.remove('hidden');
      historyListBox.innerHTML = '';
      historyListBox.appendChild(emptyHistoryNotice);
      return;
    }

    emptyHistoryNotice.classList.add('hidden');
    historyListBox.innerHTML = '';

    history.forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-item-row';
      const isRef = item.is_reference || item.filename === 'gunung_padang_1791693456211.wav';
      const labelBadge = item.display_name ? `🎯 ${item.display_name}` : (isRef ? '🎯 Acuan Baku' : (item.voice_display || '🌘 Charon'));
      const formatExt = item.format ? `.${item.format}` : (item.filename.endsWith('.mp3') ? '.mp3' : '.wav');
      const downloadName = item.display_name ? `${item.display_name}${formatExt}` : item.filename;
      const downloadUrl = item.download_url || `/api/download/${item.filename}?as=${downloadName}`;

      const deleteBtnHtml = isRef ? '' : `
          <button type="button" class="btn-hist-act delete" title="Hapus">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
      `;

      row.innerHTML = `
        <div class="history-item-main">
          <button type="button" class="btn-hist-play" title="Putar Narasi">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 4 20 12 6 20 6 4"></polygon>
            </svg>
          </button>
          <div class="hist-info-block">
            <div class="hist-text-preview" title="${item.text}">${item.text}</div>
            <div class="hist-meta-info">
              <span>${labelBadge}</span> &bull; 
              <span>${item.file_size}</span> &bull; 
              <span>${item.created_at}</span>
            </div>
          </div>
        </div>
        <div class="hist-actions">
          <a href="${downloadUrl}" class="btn-hist-act" title="Unduh" download="${downloadName}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </a>
          ${deleteBtnHtml}
        </div>
      `;

      // Play click
      row.querySelector('.btn-hist-play').addEventListener('click', () => {
        audioElement.src = item.audio_url;
        btnDownloadAudio.href = downloadUrl;
        btnDownloadAudio.setAttribute('download', downloadName);
        if (btnDownloadAudioText) {
          btnDownloadAudioText.textContent = `Unduh ${item.display_name || 'Audio'} (${formatExt})`;
        }
        btnDownloadAudio.classList.remove('disabled');

        closeModal(modalRiwayat);
        audioElement.play().catch(e => console.log(e));
        showToast(`Memutar ${item.display_name || 'audio riwayat'}...`, 'info');
      });

      // Delete click
      if (!isRef) {
        row.querySelector('.btn-hist-act.delete')?.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm('Hapus file audio ini dari riwayat?')) {
            try {
              const delRes = await fetch(`/api/history/${item.id}`, { method: 'DELETE' });
              const delData = await delRes.json();
              if (delData.success) {
                showToast('Audio berhasil dihapus dari riwayat', 'info');
                loadHistory();
              }
            } catch (err) {
              showToast('Gagal menghapus file', 'error');
            }
          }
        });
      }

      historyListBox.appendChild(row);
    });
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================
  updateTextStats();
  drawWaveform(0);
  loadHistory();
});
