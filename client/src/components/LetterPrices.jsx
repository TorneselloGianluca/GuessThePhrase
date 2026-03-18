import { Badge } from "react-bootstrap";

function LetterPrices({ letters, letterStatus, pickDisabled, submitLetter }) {
  return (
    <div className="d-flex flex-wrap justify-content-center letter-prices">
      {letters.map((l) => {
        const key = String(l.char || "").toLocaleUpperCase();
        const st = letterStatus[key];
        let bg = "light";
        let text = "dark";
        if (st === "correct") { bg = "success"; text = "white"; }
        else if (st === "wrong") { bg = "danger"; text = "white"; }
        else if (st === "hint") { bg = "warning"; text = "dark"; }

        const alreadyTried = st === "correct" || st === "wrong";
        const disabled = pickDisabled || alreadyTried;

        return (
          <Badge
            as="button"
            type="button"
            key={key}
            bg={bg}
            text={text}
            className={`p-2 border letter-price-badge ${st ? "lp-selected" : ""} ${disabled ? "lp-disabled" : "lp-clickable"}`}
            onClick={() => !disabled && submitLetter(key)}
          >
            <span className="fw-bold text-uppercase me-1">{key}</span>
            <span>{l.price}</span>
          </Badge>
        );
      })}
    </div>
  );
}

export default LetterPrices;
