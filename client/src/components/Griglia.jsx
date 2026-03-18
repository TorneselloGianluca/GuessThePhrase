import { Row, Col } from "react-bootstrap";
import "../css/Griglia.css";


/* 
 * Funzione che trasforma la stringa mascherata in “token”
 * - Se trova spazi consecutivi → li raggruppa in un blocco "space"
 * - Se trova caratteri (parola) → li raggruppa in un blocco "word" con le singole lettere

 */


function tokenize(masked = "") {

  const out = [];
  let i = 0;
  while (i < masked.length) {
    if (masked[i] === " ") {
      let count = 0;
      while (i < masked.length && masked[i] === " ") {
        count++;
        i++;
      }
      out.push({ type: "space", count });
    } else {
      // Raggruppa lettere finché non trova uno spazio
      const letters = [];
      while (i < masked.length && masked[i] !== " ") {
        letters.push({ ch: masked[i], index: i });
        i++;
      }
      out.push({ type: "word", letters });
    }
  }
  return out;
}

export default function Griglia({
  masked = "",
  numLetters = 0,
  gameOver,
  feedback = "none",
  highlightIndices = [],
}) {
  const tokens = tokenize(masked);

  const gridClass =
    feedback === "success"
      ? "griglia-container success"
      : feedback === "error"
      ? "griglia-container error"
      : "griglia-container";

  const isHighlighted = (idx) => highlightIndices.includes(idx);

  return (
    <>
      <Row className="justify-content-center mt-3">
        <p>Indovina la seguente frase:</p>
        <Col xs="auto">
          <div className={gridClass}>
            {tokens.map((t, i) => {
              if (t.type === "space") {
                // Tessere nere per ogni spazio (il wrap avviene tra parole e blocchi spazio)
                return (
                  <div key={`s-${i}`} className="space-block" aria-hidden>
                    {Array.from({ length: t.count }).map((_, k) => (
                      <div key={k} className="space-cell" />
                    ))}
                  </div>
                );
              }

              // Parola NON spezzabile
              return (
                <div className="word" key={`w-${i}`}>
                  {t.letters.map(({ ch, index }) => (
                    <div
                      key={index}
                      className={`letter-cell${
                        isHighlighted(index) ? " highlight" : ""
                      }`}
                      aria-label={`char-${index}`}
                    >
                      {ch}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </Col>
      </Row>

      <Row className="justify-content-center mt-2">
        <Col xs="auto">
          <p className="num-letters">Numero di lettere: {numLetters}</p>
        </Col>
      </Row>
    </>
  );
}
