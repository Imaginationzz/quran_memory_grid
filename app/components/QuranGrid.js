'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import surahData, { surahList, getAyahColor } from '@/data/surahData';

export default function QuranGrid() {
  const [selectedSurah, setSelectedSurah] = useState('al-fatiha');
  const [mode, setMode] = useState('learn'); // learn | hint | test
  const [cardOrder, setCardOrder] = useState([]);
  const [round, setRound] = useState(1);
  const [checks, setChecks] = useState(0);
  const [successes, setSuccesses] = useState(0);
  const [checkResults, setCheckResults] = useState(null); // null | array of booleans
  const [banner, setBanner] = useState(null); // null | { type: 'success'|'error', text }
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const advanceTimerRef = useRef(null);

  // Touch drag state
  const touchDragRef = useRef({
    active: false,
    startIndex: null,
    currentElement: null,
    cloneNode: null,
  });

  const surah = surahData[selectedSurah];

  // Initialize on mount
  useEffect(() => {
    const indices = surah.ayahs.map((_, i) => i);
    setCardOrder(indices);
    setMounted(true);
  }, []);

  // Reset when surah changes (skip first render handled by mount effect)
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
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
  }, [selectedSurah]);

  // Shuffle helper
  const shuffleArray = useCallback((arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);

  const handleSurahChange = (e) => {
    setSelectedSurah(e.target.value);
  };

  const handleModeChange = (newMode) => {
    setCheckResults(null);
    setBanner(null);
    if (newMode === 'learn') {
      const indices = surah.ayahs.map((_, i) => i);
      setCardOrder(indices);
    } else {
      setCardOrder((prev) => shuffleArray(prev));
    }
    setMode(newMode);
  };

  const handleShuffle = () => {
    if (mode === 'learn') return;
    setCheckResults(null);
    setBanner(null);
    setCardOrder((prev) => shuffleArray(prev));
  };

  const handleCheckOrder = () => {
    const isCorrect = cardOrder.every((ayahIndex, pos) => ayahIndex === pos);
    const results = cardOrder.map((ayahIndex, pos) => ayahIndex === pos);
    setCheckResults(results);
    setChecks((prev) => prev + 1);

    if (isCorrect) {
      setSuccesses((prev) => prev + 1);
      setBanner({ type: 'success', text: '🎉 Excellent! All ayahs are in the correct order!' });

      advanceTimerRef.current = setTimeout(() => {
        setBanner(null);
        setCheckResults(null);
        setRound((prev) => prev + 1);

        if (mode === 'learn') {
          setMode('hint');
          setCardOrder(shuffleArray(surah.ayahs.map((_, i) => i)));
        } else if (mode === 'hint') {
          setMode('test');
          setCardOrder(shuffleArray(surah.ayahs.map((_, i) => i)));
        } else {
          // Stay in test mode, reshuffle
          setCardOrder(shuffleArray(surah.ayahs.map((_, i) => i)));
        }
      }, 1800);
    } else {
      setBanner({ type: 'error', text: 'Some ayahs are out of order — try again!' });
    }
  };

  // Swap two cards
  const swapCards = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    setCardOrder((prev) => {
      const newOrder = [...prev];
      [newOrder[fromIndex], newOrder[toIndex]] = [newOrder[toIndex], newOrder[fromIndex]];
      return newOrder;
    });
    setCheckResults(null);
    setBanner(null);
  };

  // ===== Desktop Drag Handlers =====
  const handleDragStart = (e, index) => {
    if (mode === 'learn') {
      e.preventDefault();
      return;
    }
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    swapCards(fromIndex, toIndex);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // ===== Touch Drag Handlers =====
  const handleTouchStart = (e, index) => {
    if (mode === 'learn') return;

    const touch = e.touches[0];
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();

    // Create a visual clone
    const clone = target.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    clone.style.left = rect.left + 'px';
    clone.style.top = rect.top + 'px';
    clone.style.zIndex = '10000';
    clone.style.pointerEvents = 'none';
    clone.style.opacity = '0.85';
    clone.style.transform = 'scale(1.04)';
    clone.style.boxShadow = '0 8px 30px rgba(0,0,0,0.4)';
    clone.style.transition = 'none';
    document.body.appendChild(clone);

    touchDragRef.current = {
      active: true,
      startIndex: index,
      currentElement: null,
      cloneNode: clone,
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
    };

    setDragIndex(index);
  };

  const handleTouchMove = (e, index) => {
    if (!touchDragRef.current.active) return;
    e.preventDefault();

    const touch = e.touches[0];
    const clone = touchDragRef.current.cloneNode;

    if (clone) {
      clone.style.left = (touch.clientX - touchDragRef.current.offsetX) + 'px';
      clone.style.top = (touch.clientY - touchDragRef.current.offsetY) + 'px';
    }

    // Find element under touch
    if (clone) clone.style.display = 'none';
    const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
    if (clone) clone.style.display = '';

    if (elementUnder) {
      const card = elementUnder.closest('[data-card-index]');
      if (card) {
        const overIdx = parseInt(card.dataset.cardIndex, 10);
        setDragOverIndex(overIdx);
      } else {
        setDragOverIndex(null);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!touchDragRef.current.active) return;

    const { startIndex, cloneNode } = touchDragRef.current;

    if (cloneNode) {
      cloneNode.remove();
    }

    if (dragOverIndex !== null && dragOverIndex !== startIndex) {
      swapCards(startIndex, dragOverIndex);
    }

    touchDragRef.current = { active: false, startIndex: null, currentElement: null, cloneNode: null };
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // ===== Render Helpers =====
  const getCardText = (ayahIndex) => {
    const fullText = surah.ayahs[ayahIndex];
    if (mode === 'learn' || (checkResults && checkResults[cardOrder.indexOf(ayahIndex)])) {
      return fullText;
    }
    const firstWord = fullText.split(' ')[0];
    return firstWord + ' ...';
  };

  const getCardTextClass = () => {
    if (mode === 'hint') return 'ayah-text hint';
    if (mode === 'test') return 'ayah-text test';
    return 'ayah-text';
  };

  const getBadgeText = (ayahIndex, posIndex) => {
    if (mode === 'learn') return ayahIndex + 1;
    if (checkResults && checkResults[posIndex]) return ayahIndex + 1;
    return '?';
  };

  const accuracy = checks === 0 ? 100 : Math.round((successes / checks) * 100);

  if (!mounted) return null;

  return (
    <div className="app-container">
      {/* Top Bar Navigation */}
      <div className="top-nav">
        <button className="help-btn" onClick={() => setShowHelp(true)}>
          <span className="help-icon">ℹ</span> How it Works / كيف يعمل
        </button>
      </div>

      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">Quran Memory Grid</h1>
        <p className="app-title-ar">شبكة حفظ القرآن</p>
        <p className="app-subtitle">Memorize through spatial memory &amp; color coding</p>
      </header>

      {/* Surah Selector */}
      <div className="selector-wrapper">
        <select
          className="surah-selector"
          value={selectedSurah}
          onChange={handleSurahChange}
          id="surah-select"
        >
          {surahList.map((s) => (
            <option key={s.key} value={s.key}>
              {s.name} — {s.nameAr}
            </option>
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
        {['learn', 'hint', 'test'].map((m) => (
          <button
            key={m}
            className={`mode-btn ${mode === m ? 'active' : ''}`}
            onClick={() => handleModeChange(m)}
            id={`mode-${m}`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Instruction */}
      <p className="instruction-text">
        Arrange ayahs in order: right → left, top → bottom (Ayah 1 at top-right)
      </p>

      {/* Banner */}
      {banner && (
        <div className={`banner ${banner.type}`} id="banner">
          {banner.text}
        </div>
      )}

      {/* Card Grid */}
      <div className="card-grid">
        {cardOrder.map((ayahIndex, posIndex) => {
          const color = getAyahColor(ayahIndex);
          const bgColor = color + '1F'; // ~12% opacity
          const borderColor = color + '44'; // ~27% opacity
          const isCorrect = checkResults && checkResults[posIndex] === true;
          const isWrong = checkResults && checkResults[posIndex] === false;

          let cardClass = 'ayah-card';
          if (mode === 'learn') cardClass += ' no-drag';
          if (dragIndex === posIndex) cardClass += ' dragging';
          if (dragOverIndex === posIndex && dragIndex !== posIndex) cardClass += ' drag-over';
          if (isCorrect) cardClass += ' correct';
          if (isWrong) cardClass += ' wrong';

          return (
            <div
              key={`${ayahIndex}-${posIndex}`}
              className={cardClass}
              data-card-index={posIndex}
              draggable={mode !== 'learn'}
              onDragStart={(e) => handleDragStart(e, posIndex)}
              onDragOver={(e) => handleDragOver(e, posIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, posIndex)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, posIndex)}
              onTouchMove={(e) => handleTouchMove(e, posIndex)}
              onTouchEnd={handleTouchEnd}
              style={{
                backgroundColor: isCorrect
                  ? undefined
                  : isWrong
                  ? undefined
                  : bgColor,
                borderColor: isCorrect
                  ? undefined
                  : isWrong
                  ? undefined
                  : borderColor,
              }}
            >
              {/* Badge */}
              <span
                className="ayah-badge"
                style={{ backgroundColor: color + '33', color }}
              >
                {getBadgeText(ayahIndex, posIndex)}
              </span>

              {/* Text */}
              <span className={getCardTextClass()}>
                {getCardText(ayahIndex)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          className="btn-primary"
          onClick={handleCheckOrder}
          id="check-order-btn"
          disabled={mode === 'learn'}
          style={mode === 'learn' ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
        >
          ✓ Check Order
        </button>
        <button
          className="btn-secondary"
          onClick={handleShuffle}
          disabled={mode === 'learn'}
          id="shuffle-btn"
        >
          ⟳ Shuffle
        </button>
      </div>

      {/* Footer */}
      <footer className="app-footer">
        <p>Created by <strong>Yazid Rahmouni</strong></p>
      </footer>

      {/* Help Modal Overlay */}
      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowHelp(false)}>✕</button>
            <div className="modal-body">
              <h2>How it Works</h2>
              <p>1. <strong>Learn Mode:</strong> Cards are ordered safely. Read and memorize the spatial layout and colors.</p>
              <p>2. <strong>Hint Mode:</strong> Colors remain, but text fades to test your spatial memory.</p>
              <p>3. <strong>Test Mode:</strong> Text is hidden. Rely only on your spatial orientation and color mapping to reorder!</p>
              <p><em>* Always arrange ayahs starting from the top-right corner.</em></p>
              
              <hr />

              <h2 className="arabic-text">كيف يعمل</h2>
              <p dir="rtl">1. <strong>وضع التعلم:</strong> البطاقات مرتبة، اقرأ واحفظ مواقعها وألوانها.</p>
              <p dir="rtl">2. <strong>وضع التلميح:</strong> الألوان تبقى، لكن النص يبهت لاختبار ذاكرتك المكانية.</p>
              <p dir="rtl">3. <strong>وضع الاختبار:</strong> النص مخفي. اعتمد على الذاكرة المكانية والألوان فقط لترتيبها!</p>
              <p dir="rtl"><em>* رتّب الآيات دائماً ابتداءً من أعلى اليمين.</em></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
