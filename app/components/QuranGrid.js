'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import surahData, { surahList, getAyahColor } from '@/data/surahData';

// ===== User Profile & Progress Persistence =====
const STORAGE_KEY_USERS = 'quran_grid_users';       // { [name]: { progress: [], createdAt } }
const STORAGE_KEY_ACTIVE = 'quran_grid_active_user'; // string (name)

function loadAllUsers() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch {}
}

function getActiveUser() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_ACTIVE) || null;
}

function setActiveUser(name) {
  localStorage.setItem(STORAGE_KEY_ACTIVE, name);
}

function loadUserProgress(name) {
  const users = loadAllUsers();
  return users[name]?.progress || [];
}

function saveUserProgress(name, entries) {
  const users = loadAllUsers();
  if (!users[name]) {
    users[name] = { createdAt: new Date().toISOString(), progress: [] };
  }
  users[name].progress = entries;
  saveAllUsers(users);
}

const ADMIN_NAME = 'yezid'; // lowercase for comparison
const ADMIN_PIN = '1234';   // change this to your desired password

export default function QuranGrid() {
  // User state
  const [currentUser, setCurrentUser] = useState(null); // null = show login
  const [nameInput, setNameInput] = useState('');
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [allUsers, setAllUsers] = useState({});
  const [visitCount, setVisitCount] = useState(null);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // App state
  const [selectedSurah, setSelectedSurah] = useState('al-fatiha');
  const [mode, setMode] = useState('learn'); // learn | test
  const [cardOrder, setCardOrder] = useState([]);
  const [round, setRound] = useState(1);
  const [checks, setChecks] = useState(0);
  const [successes, setSuccesses] = useState(0);
  const [checkResults, setCheckResults] = useState(null);
  const [banner, setBanner] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [progressLog, setProgressLog] = useState([]);
  const advanceTimerRef = useRef(null);

  // Test mode: slots[i] = ayahIndex placed at slot i, or null if empty
  // bank = array of ayahIndices not yet placed
  const [slots, setSlots] = useState([]);
  const [bank, setBank] = useState([]);
  const [dragSource, setDragSource] = useState(null); // { from: 'bank'|'slot', index: number }

  const surah = surahData[selectedSurah];

  // Initialize on mount
  useEffect(() => {
    const users = loadAllUsers();
    setAllUsers(users);

    const active = getActiveUser();
    if (active && users[active]) {
      setCurrentUser(active);
      setProgressLog(users[active].progress || []);
      // Restore admin status if previously verified this session
      if (active.toLowerCase() === ADMIN_NAME && sessionStorage.getItem('quran_grid_admin_verified')) {
        setIsAdmin(true);
      }
    }

    const indices = surah.ayahs.map((_, i) => i);
    setCardOrder(indices);
    setMounted(true);

    // Increment global visit counter (free API, no backend needed)
    const visitKey = 'quran_grid_visited_this_session';
    if (!sessionStorage.getItem(visitKey)) {
      sessionStorage.setItem(visitKey, '1');
      fetch('https://api.counterapi.dev/v1/quran-memory-grid/visits/up')
        .then(res => res.json())
        .then(data => setVisitCount(data.count))
        .catch(() => {});
    } else {
      // Already counted this session, just fetch current count
      fetch('https://api.counterapi.dev/v1/quran-memory-grid/visits')
        .then(res => res.json())
        .then(data => setVisitCount(data.count))
        .catch(() => {});
    }
  }, []);

  // Reset when surah changes
  useEffect(() => {
    if (!mounted) return;
    const indices = surah.ayahs.map((_, i) => i);
    setCardOrder(indices);
    setMode('learn');
    setRound(1);
    setChecks(0);
    setSuccesses(0);
    setCheckResults(null);
    setBanner(null);
    setSlots([]);
    setBank([]);
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
  }, [selectedSurah]);

  // ===== User Management =====
  const handleLogin = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    // If admin name, require password
    if (trimmed.toLowerCase() === ADMIN_NAME) {
      setShowAdminPrompt(true);
      setAdminPinInput('');
      setAdminPinError(false);
      return;
    }

    completeLogin(trimmed, false);
  };

  const handleAdminPinSubmit = () => {
    if (adminPinInput === ADMIN_PIN) {
      setShowAdminPrompt(false);
      setAdminPinInput('');
      setAdminPinError(false);
      sessionStorage.setItem('quran_grid_admin_verified', '1');
      completeLogin(nameInput.trim() || ADMIN_NAME, true);
    } else {
      setAdminPinError(true);
    }
  };

  const completeLogin = (trimmed, admin) => {
    const users = loadAllUsers();
    if (!users[trimmed]) {
      users[trimmed] = { createdAt: new Date().toISOString(), progress: [] };
      saveAllUsers(users);
    }
    setAllUsers(users);
    setIsAdmin(admin);
    setActiveUser(trimmed);
    setCurrentUser(trimmed);
    setProgressLog(users[trimmed].progress || []);
    setNameInput('');
  };

  const handleSwitchUser = (name) => {
    const admin = name.toLowerCase() === ADMIN_NAME;
    if (admin) {
      setShowUserSwitcher(false);
      setNameInput(name);
      setShowAdminPrompt(true);
      setAdminPinInput('');
      setAdminPinError(false);
      return;
    }
    setIsAdmin(false);
    setActiveUser(name);
    setCurrentUser(name);
    setProgressLog(loadUserProgress(name));
    setShowUserSwitcher(false);
    // Reset game state
    setMode('learn');
    setRound(1);
    setChecks(0);
    setSuccesses(0);
    setCheckResults(null);
    setBanner(null);
    const indices = surah.ayahs.map((_, i) => i);
    setCardOrder(indices);
  };

  const handleLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('quran_grid_admin_verified');
    localStorage.removeItem(STORAGE_KEY_ACTIVE);
    setCurrentUser(null);
    setProgressLog([]);
    setShowUserSwitcher(false);
    // Reset game state
    setMode('learn');
    setRound(1);
    setChecks(0);
    setSuccesses(0);
    setCheckResults(null);
    setBanner(null);
  };

  const handleDeleteUser = (name) => {
    const users = loadAllUsers();
    delete users[name];
    saveAllUsers(users);
    setAllUsers(users);
    if (currentUser === name) {
      handleLogout();
    }
  };

  // Shuffle helper
  const shuffleArray = useCallback((arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);

  // Record progress entry
  const recordProgress = (surahKey, surahName, wasCorrect, attemptChecks, attemptSuccesses) => {
    const entry = {
      id: Date.now(),
      surahKey,
      surahName,
      date: new Date().toISOString(),
      correct: wasCorrect,
      checks: attemptChecks,
      successes: attemptSuccesses,
      accuracy: attemptChecks === 0 ? 100 : Math.round((attemptSuccesses / attemptChecks) * 100),
    };
    const updated = [entry, ...progressLog].slice(0, 100);
    setProgressLog(updated);
    if (currentUser) {
      saveUserProgress(currentUser, updated);
      // Refresh allUsers cache
      setAllUsers(loadAllUsers());
    }
  };

  const handleSurahChange = (e) => {
    setSelectedSurah(e.target.value);
  };

  const handleModeChange = (newMode) => {
    setCheckResults(null);
    setBanner(null);
    if (newMode === 'learn') {
      const indices = surah.ayahs.map((_, i) => i);
      setCardOrder(indices);
      setSlots([]);
      setBank([]);
    } else {
      // Test mode: empty slots, shuffled bank
      const emptySlots = surah.ayahs.map(() => null);
      setSlots(emptySlots);
      setBank(shuffleArray(surah.ayahs.map((_, i) => i)));
    }
    setMode(newMode);
  };

  const handleShuffle = () => {
    if (mode === 'learn') return;
    setCheckResults(null);
    setBanner(null);
    // Return all placed cards to bank and reshuffle
    const allCards = [...bank];
    slots.forEach((s) => { if (s !== null) allCards.push(s); });
    setSlots(surah.ayahs.map(() => null));
    setBank(shuffleArray(allCards));
  };

  const handleCheckOrder = () => {
    // Check if all slots are filled
    const allFilled = slots.every((s) => s !== null);
    if (!allFilled) {
      setBanner({ type: 'error', text: 'Place all ayahs in the slots first!' });
      return;
    }
    const isCorrect = slots.every((ayahIndex, pos) => ayahIndex === pos);
    const results = slots.map((ayahIndex, pos) => ayahIndex === pos);
    setCheckResults(results);
    const newChecks = checks + 1;
    const newSuccesses = isCorrect ? successes + 1 : successes;
    setChecks(newChecks);

    if (isCorrect) {
      setSuccesses(newSuccesses);
      setBanner({ type: 'success', text: '🎉 Excellent! All ayahs are in the correct order!' });

      const surahInfo = surahList.find((s) => s.key === selectedSurah);
      recordProgress(selectedSurah, surahInfo ? surahInfo.name : selectedSurah, true, newChecks, newSuccesses);

      advanceTimerRef.current = setTimeout(() => {
        setBanner(null);
        setCheckResults(null);
        setRound((prev) => prev + 1);
        setSlots(surah.ayahs.map(() => null));
        setBank(shuffleArray(surah.ayahs.map((_, i) => i)));
      }, 1800);
    } else {
      setBanner({ type: 'error', text: 'Some ayahs are out of order — try again!' });
    }
  };

  // ===== Drop Zone Logic =====
  const handlePlaceInSlot = (slotIndex, ayahIndex, from, fromIndex) => {
    setCheckResults(null);
    setBanner(null);

    const newSlots = [...slots];
    const newBank = [...bank];

    // If slot already has a card, return it to bank
    if (newSlots[slotIndex] !== null) {
      newBank.push(newSlots[slotIndex]);
    }

    // Place new card in slot
    newSlots[slotIndex] = ayahIndex;

    // Remove from source
    if (from === 'bank') {
      newBank.splice(fromIndex, 1);
    } else if (from === 'slot') {
      if (fromIndex !== slotIndex) {
        newSlots[fromIndex] = null;
      }
    }

    setSlots(newSlots);
    setBank(newBank);
  };

  const handleRemoveFromSlot = (slotIndex) => {
    if (checkResults) return; // Don't allow changes after checking
    setCheckResults(null);
    setBanner(null);
    const ayahIndex = slots[slotIndex];
    if (ayahIndex === null) return;
    const newSlots = [...slots];
    newSlots[slotIndex] = null;
    setSlots(newSlots);
    setBank((prev) => [...prev, ayahIndex]);
  };

  // ===== Desktop Drag Handlers =====
  const handleDragStartBank = (e, bankIdx) => {
    setDragSource({ from: 'bank', index: bankIdx, ayahIndex: bank[bankIdx] });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ from: 'bank', index: bankIdx, ayahIndex: bank[bankIdx] }));
  };

  const handleDragStartSlot = (e, slotIdx) => {
    if (slots[slotIdx] === null) { e.preventDefault(); return; }
    setDragSource({ from: 'slot', index: slotIdx, ayahIndex: slots[slotIdx] });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ from: 'slot', index: slotIdx, ayahIndex: slots[slotIdx] }));
  };

  const handleSlotDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSlotDrop = (e, slotIdx) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      handlePlaceInSlot(slotIdx, data.ayahIndex, data.from, data.index);
    } catch {}
    setDragSource(null);
  };

  const handleBankDrop = (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.from === 'slot') {
        handleRemoveFromSlot(data.index);
      }
    } catch {}
    setDragSource(null);
  };

  const handleDragEnd = () => { setDragSource(null); };

  // ===== Render Helpers =====
  const getCardText = (ayahIndex) => {
    const fullText = surah.ayahs[ayahIndex];
    if (mode === 'learn') return fullText;
    // Test mode: show first 2 words
    const words = fullText.split(' ');
    const preview = words.slice(0, 2).join(' ');
    return preview + (words.length > 2 ? ' ...' : '');
  };

  const getFullCardText = (ayahIndex) => {
    // Used for slots that have been checked correct
    return surah.ayahs[ayahIndex];
  };

  const accuracy = checks === 0 ? 100 : Math.round((successes / checks) * 100);

  const clearHistory = () => {
    setProgressLog([]);
    if (currentUser) {
      saveUserProgress(currentUser, []);
      setAllUsers(loadAllUsers());
    }
  };

  const formatDate = (isoStr) => {
    const d = new Date(isoStr);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!mounted) return null;

  // ===== LOGIN SCREEN =====
  if (!currentUser) {
    const userNames = Object.keys(allUsers);
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-icon">📖</div>
          <h1 className="login-title">Quran Memory Grid</h1>
          <p className="login-title-ar">شبكة حفظ القرآن</p>
          <p className="login-subtitle">Enter your name to track your progress</p>
          <p className="login-subtitle-ar">أدخل اسمك لتتبع تقدمك</p>

          <div className="login-input-group">
            <input
              type="text"
              className="login-input"
              placeholder="Your name / اسمك"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin(nameInput)}
              id="name-input"
              autoFocus
              dir="auto"
            />
            <button
              className="login-btn"
              onClick={() => handleLogin(nameInput)}
              disabled={!nameInput.trim()}
              id="login-btn"
            >
              Start / ابدأ
            </button>
          </div>

          {/* Existing users */}
          {userNames.length > 0 && (
            <div className="existing-users">
              <p className="existing-users-label">Or continue as:</p>
              <div className="existing-users-list">
                {userNames.map((name) => {
                  const user = allUsers[name];
                  const completedCount = (user.progress || []).filter(e => e.correct).length;
                  return (
                    <button
                      key={name}
                      className="existing-user-btn"
                      onClick={() => handleLogin(name)}
                    >
                      <span className="existing-user-avatar">
                        {name.charAt(0).toUpperCase()}
                      </span>
                      <span className="existing-user-info">
                        <span className="existing-user-name">{name}</span>
                        <span className="existing-user-stats">
                          {completedCount} completed
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Admin PIN Prompt */}
        {showAdminPrompt && (
          <div className="modal-overlay" onClick={() => setShowAdminPrompt(false)}>
            <div className="modal-content admin-pin-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowAdminPrompt(false)}>✕</button>
              <div className="modal-body" style={{ textAlign: 'center' }}>
                <h2>🔐 Admin Access</h2>
                <p>Enter the admin PIN to continue</p>
                <div className="login-input-group" style={{ marginTop: '1.5rem' }}>
                  <input
                    type="password"
                    className={`login-input ${adminPinError ? 'input-error' : ''}`}
                    placeholder="PIN"
                    value={adminPinInput}
                    onChange={(e) => { setAdminPinInput(e.target.value); setAdminPinError(false); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminPinSubmit()}
                    autoFocus
                    style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.3rem' }}
                  />
                  <button className="login-btn" onClick={handleAdminPinSubmit} disabled={!adminPinInput}>
                    ✓
                  </button>
                </div>
                {adminPinError && (
                  <p className="pin-error-text">Wrong PIN — try again</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== MAIN APP =====
  return (
    <div className="app-container">
      {/* Top Bar Navigation */}
      <div className="top-nav">
        <div className="user-pill" onClick={() => setShowUserSwitcher(true)} id="user-pill">
          <span className="user-pill-avatar">{currentUser.charAt(0).toUpperCase()}</span>
          <span className="user-pill-name">{currentUser}</span>
        </div>
        <div className="top-nav-right">
          <button className="help-btn" onClick={() => setShowHistory(true)} id="history-btn">
            <span className="help-icon">📊</span> Progress
          </button>
          <button className="help-btn" onClick={() => setShowHelp(true)}>
            <span className="help-icon">ℹ</span> Help
          </button>
        </div>
      </div>

      {/* Header */}
      <header className="app-header">
        <div className="logo-wrapper">
          <img src="/muslimwings-logo.png" alt="MuslimWings Logo" className="app-logo" />
        </div>
        <h1 className="app-title">Quran memory - Yazid Rahmouni</h1>
        <p className="app-title-ar">شبكة حفظ القرآن - جزء عم</p>
        <p className="app-subtitle">Memorize through spatial memory &amp; color coding</p>
        {isAdmin && visitCount !== null && (
          <p className="visit-badge-inline">👁 {visitCount.toLocaleString()} visits</p>
        )}
      </header>

      {/* Surah Selector */}
      <div className="selector-wrapper">
        <select className="surah-selector" value={selectedSurah} onChange={handleSurahChange} id="surah-select">
          {surahList.map((s) => (
            <option key={s.key} value={s.key}>{s.name} — {s.nameAr}</option>
          ))}
        </select>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-label">Ayahs</span>
          <span className="stat-value">{surah.ayahs.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Round</span>
          <span className="stat-value">{round}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Accuracy</span>
          <span className="stat-value">{accuracy}%</span>
        </div>
      </div>

      {/* Mode Buttons */}
      <div className="mode-buttons">
        {['learn', 'test'].map((m) => (
          <button
            key={m}
            className={`mode-btn ${mode === m ? 'active' : ''}`}
            onClick={() => handleModeChange(m)}
            id={`mode-${m}`}
          >
            {m === 'learn' ? '📖 Learn' : '✍️ Test'}
          </button>
        ))}
      </div>

      {/* Instruction */}
      <p className="instruction-text">
        Arrange ayahs in order: right → left, top → bottom (Ayah 1 at top-right)
      </p>

      {/* Banner */}
      {banner && (
        <div className={`banner ${banner.type}`} id="banner">{banner.text}</div>
      )}

      {/* LEARN MODE: Full ordered grid */}
      {mode === 'learn' && (
        <div className="card-grid">
          {cardOrder.map((ayahIndex, posIndex) => {
            const color = getAyahColor(ayahIndex);
            return (
              <div
                key={`learn-${ayahIndex}`}
                className="ayah-card no-drag"
                style={{
                  backgroundColor: color + '1F',
                  borderColor: color + '44',
                }}
              >
                <span className="ayah-badge" style={{ backgroundColor: color + '33', color }}>
                  {ayahIndex + 1}
                </span>
                <span className="ayah-text">
                  {surah.ayahs[ayahIndex]}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* TEST MODE: Drop slots + Card bank */}
      {mode === 'test' && (
        <>
          {/* Drop Slots */}
          <p className="section-label">📥 Drop ayahs here in order (right → left)</p>
          <div className="card-grid">
            {slots.map((ayahIndex, slotIdx) => {
              const isCorrect = checkResults && checkResults[slotIdx] === true;
              const isWrong = checkResults && checkResults[slotIdx] === false;
              const isEmpty = ayahIndex === null;
              const color = isEmpty ? null : getAyahColor(ayahIndex);

              let slotClass = 'drop-slot';
              if (isEmpty) slotClass += ' empty';
              if (isCorrect) slotClass += ' correct';
              if (isWrong) slotClass += ' wrong';

              return (
                <div
                  key={`slot-${slotIdx}`}
                  className={slotClass}
                  data-slot-index={slotIdx}
                  onDragOver={handleSlotDragOver}
                  onDrop={(e) => handleSlotDrop(e, slotIdx)}
                  onClick={() => !isEmpty && handleRemoveFromSlot(slotIdx)}
                  style={isEmpty ? {} : {
                    backgroundColor: isCorrect ? undefined : isWrong ? undefined : color + '1F',
                    borderColor: isCorrect ? undefined : isWrong ? undefined : color + '44',
                  }}
                  draggable={!isEmpty}
                  onDragStart={(e) => handleDragStartSlot(e, slotIdx)}
                  onDragEnd={handleDragEnd}
                >
                  <span className="slot-number">{slotIdx + 1}</span>
                  {isEmpty ? (
                    <span className="slot-placeholder">Drop here</span>
                  ) : (
                    <>
                      <span className="ayah-badge" style={{ backgroundColor: color + '33', color }}>
                        {isCorrect ? ayahIndex + 1 : '?'}
                      </span>
                      <span className="ayah-text test">
                        {isCorrect ? getFullCardText(ayahIndex) : getCardText(ayahIndex)}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Card Bank */}
          {bank.length > 0 && (
            <>
              <p className="section-label">📦 Card Bank — drag cards up to the slots</p>
              <div
                className="card-bank"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={handleBankDrop}
              >
                {bank.map((ayahIndex, bankIdx) => {
                  const color = getAyahColor(ayahIndex);
                  return (
                    <div
                      key={`bank-${ayahIndex}`}
                      className="bank-card"
                      draggable
                      onDragStart={(e) => handleDragStartBank(e, bankIdx)}
                      onDragEnd={handleDragEnd}
                      style={{
                        backgroundColor: color + '1F',
                        borderColor: color + '44',
                      }}
                    >
                      <span className="ayah-badge" style={{ backgroundColor: color + '33', color }}>?</span>
                      <span className="ayah-text test">{getCardText(ayahIndex)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        <button className="btn-primary" onClick={handleCheckOrder} id="check-order-btn"
          disabled={mode === 'learn'} style={mode === 'learn' ? { opacity: 0.35, cursor: 'not-allowed' } : {}}>
          ✓ Check Order
        </button>
        <button className="btn-secondary" onClick={handleShuffle} disabled={mode === 'learn'} id="shuffle-btn">
          ⟳ Reset
        </button>
      </div>

      {/* Footer */}
      <footer className="app-footer">
        <img src="/muslimwings-logo.png" alt="MuslimWings Logo" className="footer-logo" />
        <p>Created by <strong>Yazid Rahmouni</strong> — MuslimWings</p>
        <p className="footer-arabic">حفظ القرآن الكريم - جزء عم</p>
      </footer>

      {/* Help Modal */}
      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowHelp(false)}>✕</button>
            <div className="modal-body">
              <h2>How it Works</h2>
              <p>1. <strong>Learn Mode:</strong> Cards are ordered safely. Read and memorize the spatial layout and colors.</p>
              <p>2. <strong>Test Mode:</strong> Cards are shuffled. Only the first 2 words are shown — drag cards to reorder them correctly!</p>
              <p><em>* Always arrange ayahs starting from the top-right corner.</em></p>
              <hr />
              <h2 className="arabic-text">كيف يعمل</h2>
              <p dir="rtl">1. <strong>وضع التعلم:</strong> البطاقات مرتبة، اقرأ واحفظ مواقعها وألوانها.</p>
              <p dir="rtl">2. <strong>وضع الاختبار:</strong> البطاقات مخلوطة. تظهر أول كلمتين فقط — اسحب البطاقات لترتيبها بالشكل الصحيح!</p>
              <p dir="rtl"><em>* رتّب الآيات دائماً ابتداءً من أعلى اليمين.</em></p>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-content history-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowHistory(false)}>✕</button>
            <div className="modal-body">
              <h2>📊 Progress — {currentUser}</h2>
              <p className="history-subtitle">التقدم والإنجازات</p>

              {progressLog.length > 0 && (
                <div className="history-summary">
                  <div className="history-stat">
                    <span className="history-stat-value">{progressLog.length}</span>
                    <span className="history-stat-label">Total Attempts</span>
                  </div>
                  <div className="history-stat">
                    <span className="history-stat-value">{progressLog.filter(e => e.correct).length}</span>
                    <span className="history-stat-label">Correct</span>
                  </div>
                  <div className="history-stat">
                    <span className="history-stat-value">
                      {Math.round((progressLog.filter(e => e.correct).length / progressLog.length) * 100)}%
                    </span>
                    <span className="history-stat-label">Overall</span>
                  </div>
                  <div className="history-stat">
                    <span className="history-stat-value">
                      {new Set(progressLog.filter(e => e.correct).map(e => e.surahKey)).size}
                    </span>
                    <span className="history-stat-label">Surahs</span>
                  </div>
                </div>
              )}

              {progressLog.length === 0 ? (
                <div className="history-empty">
                  <p>No progress recorded yet.</p>
                  <p className="history-empty-hint">Complete a test round to see your history here!</p>
                </div>
              ) : (
                <>
                  <div className="history-list">
                    {progressLog.map((entry) => (
                      <div key={entry.id} className={`history-entry ${entry.correct ? 'correct' : 'wrong'}`}>
                        <div className="history-entry-top">
                          <span className="history-entry-surah">{entry.surahName}</span>
                          <span className={`history-entry-badge ${entry.correct ? 'correct' : 'wrong'}`}>
                            {entry.correct ? '✓ Correct' : '✗ Wrong'}
                          </span>
                        </div>
                        <div className="history-entry-bottom">
                          <span className="history-entry-time">{formatDate(entry.date)}</span>
                          <span className="history-entry-accuracy">Accuracy: {entry.accuracy}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="btn-clear-history" onClick={clearHistory} id="clear-history-btn">
                    🗑 Clear History
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Switcher Modal */}
      {showUserSwitcher && (
        <div className="modal-overlay" onClick={() => setShowUserSwitcher(false)}>
          <div className="modal-content user-switcher-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowUserSwitcher(false)}>✕</button>
            <div className="modal-body">
              <h2>👤 Switch User</h2>
              <p className="history-subtitle">تبديل المستخدم</p>

              <div className="switcher-current">
                <span className="switcher-current-label">Logged in as</span>
                <span className="switcher-current-name">{currentUser}</span>
              </div>

              <div className="existing-users-list switcher-list">
                {Object.keys(allUsers).filter(n => n !== currentUser).map((name) => {
                  const user = allUsers[name];
                  const completedCount = (user.progress || []).filter(e => e.correct).length;
                  return (
                    <div key={name} className="switcher-user-row">
                      <button className="existing-user-btn" onClick={() => handleSwitchUser(name)}>
                        <span className="existing-user-avatar">{name.charAt(0).toUpperCase()}</span>
                        <span className="existing-user-info">
                          <span className="existing-user-name">{name}</span>
                          <span className="existing-user-stats">{completedCount} completed</span>
                        </span>
                      </button>
                      <button className="delete-user-btn" onClick={() => handleDeleteUser(name)} title="Delete user">
                        🗑
                      </button>
                    </div>
                  );
                })}
              </div>

              {Object.keys(allUsers).filter(n => n !== currentUser).length === 0 && (
                <p className="switcher-empty">No other users yet.</p>
              )}

              <hr />

              <p className="switcher-new-label">Add new user:</p>
              <div className="login-input-group">
                <input
                  type="text"
                  className="login-input"
                  placeholder="New name / اسم جديد"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { handleLogin(nameInput); setShowUserSwitcher(false); }}}
                  dir="auto"
                />
                <button
                  className="login-btn small"
                  onClick={() => { handleLogin(nameInput); setShowUserSwitcher(false); }}
                  disabled={!nameInput.trim()}
                >
                  Add
                </button>
              </div>

              <button className="btn-logout" onClick={handleLogout} id="logout-btn">
                ← Logout / تسجيل خروج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
