import { Navbar, Nav, Container, Button } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { logoutHandler } from "../api/API.mjs";

function AppNavbar({ isLogged, player, setLogin, setPlayer, inGame = false }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutHandler();
    } catch (e) {
      console.warn("Logout fallito lato server:", e);
    }
    setLogin(false);
    setPlayer(null);
    navigate("/");
  };

  return (
    <Navbar bg="dark" variant="dark" expand="md" fixed="top">
      <Container>
        <Navbar.Brand as={Link} to="/">
          Indovina la Frase
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="me-auto">
            {!inGame && <Nav.Link as={Link} to="/">Home</Nav.Link>}
            {!inGame && <Nav.Link as={Link} to="/regole">Regole</Nav.Link>}
          </Nav>

          <Nav>
            {isLogged ? (
              <>
                <Navbar.Text className="me-3">
                  👤 {player?.username ?? player?.email}
                </Navbar.Text>
                <Navbar.Text className="me-3">
                  🪙 {player?.monete ?? 0}
                </Navbar.Text>
                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button
                as={Link}
                to="/login"
                variant="outline-light"
                size="sm"
              >
                Accedi
              </Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;
