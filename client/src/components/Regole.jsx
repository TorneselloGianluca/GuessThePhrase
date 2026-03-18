// Regole.jsx
import React from "react";
import { Container, Row, Col, Card } from "react-bootstrap";
import "../css/Regole.css";

const Mark = ({ children }) => (
  <mark style={{ backgroundColor: "transparent", color: "#c1121f", fontWeight: 700 }}>
    {children}
  </mark>
);

export default function Regole() {
  return (
    <Container className="regole-page py-4" style={{ maxWidth: 900 }}>
      <Row>
        <Col>
          <h1 className="display-5 fw-bold">Indovina la Frase</h1>

          <Card className="shadow-sm border-0 mb-3">
            <Card.Body className="fs-5">
              <p>
                Benvenuto su <strong>INDOVINA LA FRASE</strong>, un gioco che unisce i classici
                <strong> IMPICCATO</strong> e <strong> LA RUOTA DELLA FORTUNA</strong>…
              </p>

              <p>
                A ciascun giocatore viene assegnata una dotazione iniziale di
                <strong> 100 monete</strong>, che possono essere spese e guadagnate durante le partite.
              </p>

              <h2 className="h5 mt-3"><Mark>A cosa servono le monete?</Mark></h2>
              <p>
                Potrai iniziare una nuova partita solo se hai un numero positivo di monete
                (<strong>attento a non perderle</strong>); inoltre potranno essere acquistate lettere
                secondo la seguente logica:
              </p>
              <ul>
                <li><strong>Vocali:</strong> una sola per partita al costo di 10 monete.</li>
                <li><strong>Consonanti:</strong> quante vuoi, purché tu abbia le monete.</li>
              </ul>
              <p><strong>ATTENTO! Sbagliare una lettera ti costerà il doppio del suo reale costo.</strong></p>

              <h2 className="h5 mt-3"><Mark>Come indovino la frase?</Mark></h2>
              <p>Avrai a disposizione un form in cui inserire la tua frase. Se sbagli non ti verranno addebitate monete.</p>

              <h2 className="h5 mt-3"><Mark>Quanto tempo ho a disposizione?</Mark></h2>
              <p>Avrai a disposizione 60 secondi.</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
