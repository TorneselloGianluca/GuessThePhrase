import React, { useEffect, useCallback } from "react";
import { Container, Button, Stack, Badge, Alert } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import { logoutHandler, getSession } from "../api/API.mjs";
import "../css/HomePage.css";

function HomePage({ isLogged, player, setLogin, setPlayer }) {

  const navigate = useNavigate();
  const location = useLocation();

  const coins = Number(player?.monete ?? 0);
  const displayName =
    (player && typeof player === "object"
      ? player.name ?? player.username
      : undefined) ?? "giocatore";



  //inizio partita modalità ospite
  const handleGuestPlay = async () => {
    try {
      await logoutHandler();
    } catch (e) {
      console.warn("logout per guest non riuscito, continuo come client-guest", e);
    }
    /* imposta setLogin setPlayer per la modalità ospite*/
    setLogin(false);  
    setPlayer({ name: "ospite", monete: 0 }); 
    navigate("/game");
  };



  //controlla se il giocatore ha monete per portarlo alla pagina di gioco
  const handlePlayLogged = () => {
    if (coins <= 0) return;
    navigate("/game");
  };

  async function handleLogout() {
    try {
      await logoutHandler();
      setLogin(false);
      setPlayer(null);
      navigate("/");
    } catch (err) {
      console.error(err);
    }
  }

  const handleGoLogin = () => {
    navigate("/login");
  };


  const refreshPlayer = useCallback(async () => {
    try {
      const { isLogged: srvIsLogged, user } = await getSession();
      setLogin(!!srvIsLogged);
      setPlayer(user ?? null);
    } catch (e) {
      console.warn("Impossibile aggiornare il player:", e);
    }
  }, [setLogin, setPlayer]);

  useEffect(() => {
    refreshPlayer();
  }, [refreshPlayer, location.pathname]);

  useEffect(() => {
    const onFocus = () => refreshPlayer();
    const onVisibility = () => {
      if (!document.hidden) refreshPlayer();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshPlayer]);



  
  return (
    <div className="home-page">
      <Container className="home-content">

        {!isLogged && (
          <img
            src="/immagini/logo.png"
            alt="Logo Indovina Frase"
            className="logo-tight"
          />
        )}

        {isLogged && (
          <>
            <div className="welcome-text text-center mt-3">
              <h2 className="fw-bold display-4 mb-1">
                👋 Ciao <span className="username">{displayName}</span>!
              </h2>
              

              <div className="mt-5">
                <Badge bg="warning" text="dark" className="coin-badge fs-3 px-3 py-2">
                  🪙 Monete: {coins}
                </Badge>
              </div>
            </div>

            {coins <= 0 && (
              <Alert variant="warning" className="py-2 mt-2 mb-2">
                Non hai monete sufficienti per avviare una partita.
              </Alert>
            )}
          </>
        )}


        {isLogged ? (
          <Stack
            direction="horizontal"
            gap={3}
            className="home-actions justify-content-center flex-wrap mt-5"
          >
            <Button
              className="btn-fancy"
              onClick={handlePlayLogged}
              size="lg"
              disabled={coins <= 0}
              title={coins <= 0 ? "Monete insufficienti" : "Inizia a giocare"}
              aria-label="Gioca"
            >
              <span className="btn-ico" aria-hidden>🎮</span>
              Gioca
            </Button>

            <Button
              className="btn-ghost"
              onClick={handleLogout}
              size="lg"
              aria-label="Esci"
            >
              <span className="btn-ico" aria-hidden>🚪</span>
              Esci
            </Button>
          </Stack>
        ) : (
          <Stack
            direction="horizontal"
            gap={3}
            className="home-actions justify-content-center flex-wrap mt-3"
          >
            <Button
              className="btn-fancy"
              onClick={handleGoLogin}
              size="lg"
              aria-label="Accedi"
            >
              <span className="btn-ico" aria-hidden>🔐</span>
              Accedi
            </Button>

            <Button
              className="btn-ghost"
              onClick={handleGuestPlay}
              size="lg"
              aria-label="Gioca come Ospite"
            >
              <span className="btn-ico" aria-hidden>🧑‍🚀</span>
              Gioca come Ospite
            </Button>
          </Stack>
        )}
      </Container>

      {!isLogged && (
        <Container>
          <p className="fw-bold fs-4 text-dark text-center mt-2 mb-2">
            Utilizza le tue monete per acquistare lettere
          </p>
          <Container className="mt-2">
            <video
              width="640"
              height="360"
              src="/video/video1.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="video-bordered"
            >
              Il tuo browser non supporta il tag video.
            </video>
          </Container>

          <p className="fw-bold fs-4 text-dark text-center mt-3 mb-2">
            ⚠️ Attenzione a non sbagliare: perderai monete doppie rispetto al costo reale!
          </p>
          <Container className="mt-2">
            <video
              width="640"
              height="360"
              src="/video/video2.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="video-bordered"
            >
              Il tuo browser non supporta il tag video.
            </video>
          </Container>

          <p className="fw-bold fs-4 text-dark text-center mt-3 mb-2">
            Prova ad indovinare la frase
          </p>
          <Container className="mt-2">
            <video
              width="640"
              height="360"
              src="/video/video3.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="video-bordered"
            >
              Il tuo browser non supporta il tag video.
            </video>
          </Container>
        </Container>
      )}
    </div>
  );
}

export default HomePage;
