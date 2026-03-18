import { Badge, Button } from "react-bootstrap";

function SidebarInfo({
  monete,
  purchaseActive,
  purchaseVariant,
  purchaseAmount,
  timeLeft,
  formatSeconds,
  handleAbandon,
  gameOver,
}) {
  return (
    <div className="lp-left d-flex flex-row align-items-center gap-3 flex-wrap">
      {/* Tempo */}
      <div className="d-flex align-items-center gap-2">
        <strong>Tempo:</strong>
        <Badge bg={timeLeft <= 10 ? "danger" : "primary"}>
          {formatSeconds(timeLeft)}
        </Badge>
      </div>

      {/* Monete */}
      <div className="d-flex align-items-center gap-2">
        <strong>Monete:</strong>
        <Badge bg="warning" text="dark">{monete}</Badge>
      </div>

      {/* Feedback acquisto */}
      <div
        className={`feedback-square border rounded d-flex align-items-center justify-content-center ${purchaseActive
          ? purchaseVariant === "success"
            ? "bg-success text-white"
            : purchaseVariant === "danger"
              ? "bg-danger text-white"
              : ""
          : ""
          }`}
      >
        {purchaseActive && typeof purchaseAmount === "number"
          ? `-${Math.abs(purchaseAmount)} monete`
          : "—"}
      </div>

      {/* Pulsante abbandona */}
      <Button
        variant="outline-danger"
        size="sm"
        onClick={handleAbandon}
        disabled={gameOver}
      >
        ABBANDONA LA PARTITA
      </Button>
    </div>
  );
}

export default SidebarInfo;
