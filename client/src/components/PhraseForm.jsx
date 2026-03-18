import { Form, Button } from "react-bootstrap";

function PhraseForm({
  phraseInput,
  setPhraseInput,
  gridFeedback,
  setGridFeedback,
  handleSubmitPhrase,
  gameOver,
}) {
  return (
    <Form onSubmit={handleSubmitPhrase}>
      <Form.Group className="mb-2" controlId="phraseInput">
        <Form.Label><strong>Inserisci la frase</strong></Form.Label>
        <Form.Control
          type="text"
          value={phraseInput}
          onChange={(e) => {
            setPhraseInput(e.target.value);
            if (gridFeedback !== "none") setGridFeedback("none");
          }}
          placeholder="Prova a indovinare la frase intera"
          autoComplete="off"
          disabled={gameOver}
        />
      </Form.Group>
      <Button type="submit" variant="success" className="w-100" disabled={gameOver}>
        Invia frase
      </Button>
    </Form>
  );
}

export default PhraseForm;
