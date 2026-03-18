import { Alert, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

function GameOverOverlay({ recap, guestExhausted, isOutOfCoins, srvIsLogged, handlePlayAgain }) {
  const navigate = useNavigate();

  const reason = recap?.reason;
  const isWin = reason === "win";
  const isAbandon = reason === "abandon";
  const isGuestOut = guestExhausted || reason === "guest_exhausted";

  let coinsDelta = 0;
  if (!isGuestOut) {
    if (typeof recap?.coinsDelta === "number") coinsDelta = recap.coinsDelta;
    else if (isWin) coinsDelta = 100;
    else if (!isAbandon) coinsDelta = -20;
  }

  let heroTitle = "";
  let heroClass = "hero-title";
  if (isGuestOut) {
    heroTitle = "HAI FINITO I TENTATIVI NELLA MODALITÀ OSPITE";
    heroClass += " hero-guest";
  } else if (isWin) {
    heroTitle = srvIsLogged
      ? `Hai vinto!! ${coinsDelta >= 0 ? "+" : ""}${coinsDelta} monete`
      : "Hai vinto!! 🎉";
    heroClass += " hero-win";
  } else if (isAbandon) {
    heroTitle = "Partita abbandonata";
    heroClass += " hero-abandon";
  } else {
    heroTitle = srvIsLogged
      ? `Hai perso! ${coinsDelta} monete :(`
      : "Hai perso! 😢";
    heroClass += " hero-lose";
  }

  return (
    <div className="gameover-overlay" role="dialog" aria-modal="true">
      <div className="gameover-panel">
        <Alert variant="light" className="mt-2 border gameover-banner">
          <div className={heroClass}>{heroTitle}</div>

          <div className="mt-2 small text-muted">
            {/* 👇 Ora la frase persa è sempre mostrata se disponibile */}
            {recap?.phrase && (
              <div>
                Frase: <strong><em>{recap.phrase}</em></strong>
              </div>
            )}
            {typeof recap?.durationSec === "number" && (
              <div>Durata: {Math.round(recap.durationSec)}s</div>
            )}
            {Array.isArray(recap?.lettersTried) && recap.lettersTried.length > 0 && (
              <div>Lettere provate: {recap.lettersTried.join(", ")}</div>
            )}
            {!isGuestOut && srvIsLogged && !isAbandon && typeof coinsDelta === "number" && (
              <div>Variazione monete: {coinsDelta >= 0 ? "+" : ""}{coinsDelta}</div>
            )}
          </div>

          <div className="mt-2 d-flex gap-2 justify-content-center">
            {guestExhausted ? (
              <>
                <Button variant="secondary" onClick={() => navigate("/")}>
                  Torna alla Home
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={() => navigate("/login")}
                >
                  Accedi
                </Button>
              </>
            ) : isOutOfCoins ? (
              <Button variant="secondary" onClick={() => navigate("/")}>
                Torna alla Home
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={() => navigate("/")}>
                  Torna alla Home
                </Button>
                <Button variant="primary" onClick={handlePlayAgain}>
                  Gioca di nuovo
                </Button>
              </>
            )}
          </div>
        </Alert>
      </div>
    </div>
  );
}

export default GameOverOverlay;
