import { useEffect, useRef, useState, useMemo } from "react";
import { Container, Form, Spinner, Alert, Button,  Row, Col, Card,} from "react-bootstrap";
import {
  gameInit,
  gameLetter,
  gamePhrase,
  gameAbandon,
  gameTimeout,
  getLetterPrices,
} from "../api/API.mjs";
import { useNavigate } from "react-router-dom";
import Griglia from "./Griglia";
import GameOverOverlay from "./GameOverOverlay";

import SidebarInfo from "./SideBarInfo";
import PhraseForm from "./PhraseForm";
import LetterPrices from "./LetterPrices";

import "../css/GamePage.css";



//conversione formato secondi
function formatSeconds(s) {
  const sec = Math.max(0, Math.floor(s));
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

const VOWELS = ["A", "E", "I", "O", "U"];
const isVowel = (ch = "") => VOWELS.includes(String(ch).toLocaleUpperCase());

function GamePage({ isLogged, player }) {
  const navigate = useNavigate();


  const [phrase, setPhrase] = useState(null);  //frase completa
  const [masked, setMasked] = useState("");    //frase mascherata
  const [numLetters, setNumLetters] = useState(0);

  const [loading, setLoading] = useState(true);  //Carimento iniziale
  const [error, setError] = useState("");       //errori 
  const [serverMsg, setServerMsg] = useState("");   //messaggio dal server

  const [phraseInput, setPhraseInput] = useState("");   //input frase utente

  const [letterList, setLetterList] = useState([]);   //lettere provate
  const [monete, setMonete] = useState(player?.monete ?? 0);

  const [srvIsLogged, setSrvIsLogged] = useState(isLogged ?? false);
  const [srvPlayer, setSrvPlayer] = useState(player ?? null);

  const [gameOver, setGameOver] = useState(false);
  const [recap, setRecap] = useState(null);
  const [warning, setWarning] = useState("");

  //timer
  const [timeLeft, setTimeLeft] = useState(60);
  const deadlineRef = useRef(null);
  const tickRef = useRef(null);

  //listino lettere
  const [letterPrices, setLetterPrices] = useState([]);

  //feedback della griglia
  const [gridFeedback, setGridFeedback] = useState("none");
  const [highlightIndices, setHighlightIndices] = useState([]);
  const gridFlashTimeoutRef = useRef(null);
  const highlightTimeoutRef = useRef(null);

  const [vowelsHintActive, setVowelsHintActive] = useState(false);

  const [purchaseFlash, setPurchaseFlash] = useState({
    active: false,
    variant: "secondary",
    amount: null,
  });
  const purchaseFlashTimeoutRef = useRef(null);


  // (lato frontend)
  //rimuove il flash d'acquisto se ancora attivo
  const clearPurchaseFlash = () => {
    if (purchaseFlashTimeoutRef.current) {
      clearTimeout(purchaseFlashTimeoutRef.current);
      purchaseFlashTimeoutRef.current = null;
    }
  };


  /* COUNTDOWN PRE PARTITA*/ 
  const [preGameCountdown, setPreGameCountdown] = useState(null);
  const countdownRef = useRef(null);


  /* ------------------ FUNZIONI UTILI ------------------*/

  //avvia il countdown di 3 secondi prima di iniziare la partita
  const startPreGameCountdown = (onFinish) => {
    setPreGameCountdown(3);
    let counter = 3;
    countdownRef.current = setInterval(() => {
      counter--;
      if (counter <= 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        setPreGameCountdown(null);
        onFinish();
      } else {
        setPreGameCountdown(counter);
      }
    }, 1000);
  };

  const warningTimeoutRef = useRef(null);


  const clearWarningTimeout = () => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
  };
  useEffect(() => {
    clearWarningTimeout();
    if (!warning) return;
    warningTimeoutRef.current = setTimeout(() => {
      setWarning("");
      warningTimeoutRef.current = null;
    }, 1500);
    return clearWarningTimeout;
  }, [warning]);

  //stoppa il flash rosso/verde sulla griglia
  const clearGridFlashTimeout = () => {
    if (gridFlashTimeoutRef.current) {
      clearTimeout(gridFlashTimeoutRef.current);
      gridFlashTimeoutRef.current = null;
    }
  };

  //Stoppa l'evidenziatore delle lettere corrette appena trovate
  const clearHighlightTimeout = () => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
  };

  //ferma il timer della partita
  const stopTimer = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    deadlineRef.current = null;
  };


  //RESET COMPLETO DELLO STATO LOCALE
  const resetLocalState = () => {
    stopTimer();
    clearGridFlashTimeout();
    clearHighlightTimeout();
    clearWarningTimeout();
    clearPurchaseFlash();

    setPhrase(null);
    setMasked("");
    setNumLetters(0);
    setLetterList([]);
    setServerMsg("");
    setError("");
    setWarning("");
    setGameOver(false);
    setRecap(null);
    setTimeLeft(60);
    setPhraseInput("");
    setGridFeedback("none");
    setHighlightIndices([]);
    setVowelsHintActive(false);
    setPurchaseFlash({ active: false, variant: "secondary", amount: null });
  };

  //Avvio timer di gioco
  const startTimer = (serverNow, expiresAt) => {
    const nowClient = Date.now();
    const offset = expiresAt - serverNow;
    const clientDeadline = nowClient + offset;
    deadlineRef.current = clientDeadline;

    if (tickRef.current) clearInterval(tickRef.current);

    const update = () => {
      const msLeft = Math.max(0, deadlineRef.current - Date.now());
      setTimeLeft(msLeft / 1000);
      if (msLeft <= 0) {
        clearInterval(tickRef.current);
        tickRef.current = null;
        (async () => {
          try {
            const res = await gameTimeout();
            if (res.gameOver) {
              setGridFeedback("error");
              setGameOver(true);
              setRecap(res.summary || null);
              if (typeof res.monete === "number") setMonete(res.monete);
              if (typeof res.isLogged === "boolean") setSrvIsLogged(res.isLogged);
              if (res.player) setSrvPlayer(res.player);
            }
          } catch (e) {
            setError(e.message || "Errore nel timeout");
          }
        })();
      }
    };
    update();
    tickRef.current = setInterval(update, 250);
  };

  useEffect(() => {
    if (srvIsLogged) {
      getLetterPrices().then((p) => setLetterPrices(p)).catch(() => { });
    } else {
      setLetterPrices([]);
    }
  }, [srvIsLogged]);

  const letterStatus = useMemo(() => {
    const map = {};
    const currentMasked = String(masked || "").toLocaleUpperCase();
    (letterList || []).forEach((ch) => {
      const key = String(ch || "").toLocaleUpperCase();
      if (!key) return;
      map[key] = currentMasked.includes(key) ? "correct" : "wrong";
    });
    if (vowelsHintActive) {
      VOWELS.forEach((v) => {
        if (!map[v]) map[v] = "hint";
      });
    }
    return map;
  }, [letterList, masked, vowelsHintActive]);

  const upsertTriedLetter = (ch) => {
    const key = String(ch || "").toLocaleUpperCase();
    if (!key) return;
    setLetterList((prev) =>
      prev.some((c) => String(c).toLocaleUpperCase() === key) ? prev : [...prev, key]
    );
  };

  const [guestExhausted, setGuestExhausted] = useState(false);

  const submitLetter = async (rawLetter) => {
    setServerMsg("");
    setError("");
    setWarning("");

    const l = String(rawLetter || "").trim();
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]$/.test(l)) {
      setError("Inserisci una sola lettera (A-Z).");
      return;
    }
    if (srvIsLogged && (Number(monete) || 0) <= 0) {
      setWarning("Non hai monete sufficienti.");
      return;
    }

    try {
      const prevMasked = masked;
      const prevCoins = Number(monete) || 0;
      const res = await gameLetter(l);

      if (res.gameOver && res.redirectHome) {
        stopTimer();
        setGameOver(true);
        setGridFeedback("error");
        setRecap(res.summary || null);
        if (typeof res.monete === "number") setMonete(res.monete);
        if (typeof res.isLogged === "boolean") setSrvIsLogged(res.isLogged);
        if (res.player) setSrvPlayer(res.player);
        return;
      }

      if (!vowelsHintActive && isVowel(l)) setVowelsHintActive(true);

      const newMasked = typeof res.masked === "string" ? res.masked : prevMasked;
      const justRevealed = [];
      for (let i = 0; i < Math.min(prevMasked.length, newMasked.length); i++) {
        if (prevMasked[i] !== newMasked[i] && newMasked[i] !== "_" && newMasked[i] !== " ") {
          if (newMasked[i].toLocaleLowerCase() === l.toLocaleLowerCase()) justRevealed.push(i);
        }
      }

      if (Array.isArray(res.letterList)) setLetterList(res.letterList);
      else upsertTriedLetter(l);

      if (typeof res.masked === "string") setMasked(res.masked);
      if (typeof res.numLetters === "number") setNumLetters(res.numLetters);
      if (res.message) setServerMsg(res.message);
      if (typeof res.monete === "number") setMonete(res.monete);
      if (res.warning) setWarning(res.warning);
      if (typeof res.isLogged === "boolean") setSrvIsLogged(res.isLogged);
      if (res.player) setSrvPlayer(res.player);

      if (srvIsLogged && typeof res.monete === "number") {
        const delta = res.monete - prevCoins;
        const success = justRevealed.length > 0;
        clearPurchaseFlash();
        setPurchaseFlash({
          active: true,
          variant: success ? "success" : "danger",
          amount: Math.abs(delta),
        });
        purchaseFlashTimeoutRef.current = setTimeout(() => {
          setPurchaseFlash({ active: false, variant: "secondary", amount: null });
        }, 1200);
      }

      if (justRevealed.length === 0) {
        setGridFeedback("error");
        clearGridFlashTimeout();
        gridFlashTimeoutRef.current = setTimeout(() => setGridFeedback("none"), 700);
      } else {
        setHighlightIndices(justRevealed);
        clearHighlightTimeout();
        highlightTimeoutRef.current = setTimeout(() => setHighlightIndices([]), 700);
      }

      if (res.serverNow && res.expiresAt) startTimer(res.serverNow, res.expiresAt);


      if (res.gameOver) {
        stopTimer();
        setGameOver(true);
        const fullPhrase = res.summary?.phrase || masked;
        setMasked(fullPhrase);
        setRecap({
          ...res.summary,
          phrase: fullPhrase
        });
      }
    } catch (err) {
      setError(err.message || "Errore invio lettera.");
    }
  };

  const handleSubmitPhrase = async (e) => {
    e.preventDefault();
    setServerMsg("");
    setError("");
    setWarning("");

    const text = (phraseInput || "").trim();
    if (!text) {
      setError("Inserisci una frase.");
      return;
    }
    setPhraseInput("");

    try {
      const res = await gamePhrase(text);

      if (res.gameOver && res.redirectHome) {
        stopTimer();
        setGameOver(true);
        setGridFeedback("error");
        setRecap(res.summary || { reason: "lose", phrase: res.summary?.phrase || masked });
        if (typeof res.monete === "number") setMonete(res.monete);
        if (typeof res.isLogged === "boolean") setSrvIsLogged(res.isLogged);
        if (res.player) setSrvPlayer(res.player);
        return;
      }

      if (res.correct === true) {
        stopTimer();
        setGridFeedback("success");
        if (typeof res.monete === "number") setMonete(res.monete);
        if (typeof res.isLogged === "boolean") setSrvIsLogged(res.isLogged);
        if (res.player) setSrvPlayer(res.player);
        setGameOver(true);
        setRecap(res.summary || { reason: "win", phrase: res.masked });
        if (typeof res.masked === "string") setMasked(res.masked);
        return;
      }

      setGridFeedback("error");
      clearGridFlashTimeout();
      gridFlashTimeoutRef.current = setTimeout(() => setGridFeedback("none"), 700);

      if (typeof res.masked === "string") setMasked(res.masked);
      if (res.serverNow && res.expiresAt) startTimer(res.serverNow, res.expiresAt);

      // 🟨 Frase sbagliata e partita persa → mostra la frase completa
      if (res.gameOver) {
        stopTimer();
        setGameOver(true);
        const fullPhrase = res.summary?.phrase || masked;
        setMasked(fullPhrase);  
        setRecap({
          ...res.summary,
          phrase: fullPhrase      
        });
      }
    } catch (err) {
      setError(err.message || "Errore invio frase.");
    }
  };

  const handlePlayAgain = async () => {
    const isOutOfCoins = srvIsLogged && ((Number(monete) || 0) <= 0);
    if (isOutOfCoins) {
      setWarning("Hai terminato le monete a disposizione.");
      return;
    }

    stopTimer(); resetLocalState(); setGuestExhausted(false);

    startPreGameCountdown(async () => {
      try {
        const res = await gameInit();
        if (res.guestExhausted || res.gameOver) {
          setGuestExhausted(true); setGameOver(true); setGridFeedback("error");
          setRecap(res.summary || { reason: "guest_exhausted" });
          setSrvIsLogged(!!res.isLogged); setSrvPlayer(res.player ?? null);
          setMonete(res.monete ?? 0);
        } else {
          setPhrase(res.phrase); setMasked(res.masked); setNumLetters(res.numLetters);
          setLetterList(res.letterList ?? []); setMonete(res.monete ?? res.player?.monete ?? 0);
          setSrvIsLogged(!!res.isLogged); setSrvPlayer(res.player ?? null);
          if (res.serverNow && res.expiresAt) startTimer(res.serverNow, res.expiresAt);
        }
      } catch (e) { setError(e.message || "Errore nuova partita"); }
    });
  };

  const handleAbandon = async () => {
    try {
      const res = await gameAbandon();
      stopTimer(); setGameOver(true); setGridFeedback("error");
      setRecap(res.summary || { reason: "abandon", phrase: res.summary?.phrase || masked });
      if (typeof res.isLogged === "boolean") setSrvIsLogged(res.isLogged);
      if (res.player) setSrvPlayer(res.player);
      if (typeof res.monete === "number") setMonete(res.monete);
    } catch (err) { setError(err.message || "Errore abbandono"); }
  };

  /* ------------------ USEEFFECT INIZIALE ------------------ */
  //carica la prima partita all'avvio della pagina

  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      try {
        setLoading(true); setError("");
        startPreGameCountdown(async () => {
          const res = await gameInit();
          if (!mounted) return;
          if (res.guestExhausted || res.gameOver) {
            setGuestExhausted(true); setGameOver(true); setGridFeedback("error");
            setRecap(res.summary || { reason: "guest_exhausted" });
            setSrvIsLogged(!!res.isLogged); setSrvPlayer(res.player ?? null);
            setMonete(res.monete ?? 0);
          } else {
            setPhrase(res.phrase); setMasked(res.masked); setNumLetters(res.numLetters);
            setLetterList(res.letterList ?? []); setMonete(res.monete ?? res.player?.monete ?? 0);
            setSrvIsLogged(!!res.isLogged); setSrvPlayer(res.player ?? null);
            if (res.serverNow && res.expiresAt) startTimer(res.serverNow, res.expiresAt);
          }
          setLoading(false);
        });
      } catch (err) {
        if (mounted) setError(err?.message || "Errore caricamento");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadAll();
    return () => {
      mounted = false;
      stopTimer();
      clearGridFlashTimeout();
      clearHighlightTimeout();
      clearWarningTimeout();
      clearPurchaseFlash();
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [navigate]);


  //serve per mostrare il recap a fine partita con la frase completa
  const maskedToShow = gameOver && recap?.phrase ? recap.phrase : masked;

  //classe CSS per la griglia 
  //in base allo stato della partita 
  const gridWrapperClass =
    gridFeedback === "success" ? "griglia griglia-success"
      : gridFeedback === "error" ? "griglia griglia-error"
        : "griglia";

  //disabilitare la scelta lettere se la partita è finita 
  //o se l'utente non ha piu monete
  const pickDisabled = gameOver || (srvIsLogged && (Number(monete) || 0) <= 0);


  //lettere per l'utente ospite con costo 0
  const fallbackLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((ch) => ({ char: ch, price: "0" }));


  const letters = (letterPrices?.length ? letterPrices : fallbackLetters)
    .slice()
    .sort((a, b) => String(a.char).localeCompare(String(b.char)));

  const showMeta = srvIsLogged;


  // Stato per il “flash d’acquisto” (quando pago monete per una lettera)
  // purchaseActive → mostra/nascondi
  // purchaseAmount → numero monete perse/guadagnate
  // purchaseVariant → colore (verde = corretto, rosso = sbagliato)
  
  const purchaseActive = !!purchaseFlash?.active;
  const purchaseAmount = typeof purchaseFlash?.amount === "number" ? purchaseFlash.amount : null;
  const purchaseVariant = purchaseFlash?.variant;

  //true se l'utente loggato ha terminato le monete
  const isOutOfCoins = srvIsLogged && ((Number(monete) || 0) <= 0);



  return (
    <Container className="game-page">
      {loading && (
        <div className="d-flex justify-content-center align-items-center my-3">
          <Spinner animation="border" role="status" className="me-2" />
          <span>Caricamento...</span>
        </div>
      )}

      {preGameCountdown !== null && (
        <div className="pre-game-countdown">{preGameCountdown}</div>
      )}

      {!!error && <Alert variant="danger" className="mt-2">{error}</Alert>}
      {!!serverMsg && !error && <Alert variant="info" className="mt-2">{serverMsg}</Alert>}
      {!!warning && !error && <Alert variant="warning" className="mt-2">{warning}</Alert>}

      <Row className="mt-1">
        <Col lg={12} className="text-center">
          {gameOver && (
            <GameOverOverlay
              recap={recap}
              guestExhausted={guestExhausted}
              isOutOfCoins={isOutOfCoins}
              srvIsLogged={srvIsLogged}
              handlePlayAgain={handlePlayAgain}
            />
          )}

          <div className={gridWrapperClass}>
            <Griglia
              masked={maskedToShow}
              numLetters={numLetters}
              gameOver={gameOver}
              feedback={gridFeedback}
              highlightIndices={highlightIndices}
            />
          </div>

          <Card className="letter-prices-card mt-2">
            <Card.Header className="fw-bold">
              {srvIsLogged
                ? `${srvPlayer?.username ?? player?.username ?? ""}, indovina qui la tua frase`
                : "Indovina qui la tua frase"}
            </Card.Header>
            <Card.Body className="py-2 slim-card-body">
              <div className="lp-row d-flex gap-3 flex-wrap align-items-start">
                <SidebarInfo
                  showMeta={showMeta}
                  monete={monete}
                  purchaseActive={purchaseActive}
                  purchaseVariant={purchaseVariant}
                  purchaseAmount={purchaseAmount}
                  timeLeft={timeLeft}
                  formatSeconds={formatSeconds}
                  handleAbandon={handleAbandon}
                  gameOver={gameOver}
                />

                <div className="lp-right flex-grow-1">
                  <Form.Label><strong>Acquista una lettera</strong></Form.Label>
                  <LetterPrices
                    letters={letters}
                    letterStatus={letterStatus}
                    pickDisabled={pickDisabled}
                    submitLetter={submitLetter}
                  />

                  <hr className="my-2" />
                  <PhraseForm
                    phraseInput={phraseInput}
                    setPhraseInput={setPhraseInput}
                    gridFeedback={gridFeedback}
                    setGridFeedback={setGridFeedback}
                    handleSubmitPhrase={handleSubmitPhrase}
                    gameOver={gameOver}
                  />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default GamePage;
