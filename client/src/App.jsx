import { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Container } from "react-bootstrap";

import "./css/App.css";

import HomePage from "./components/HomePage";
import Login from "./components/Login";
import Regole from "./components/Regole";
import GamePage from "./components/GamePage";
import AppNavbar from "./components/AppNavbar";

function App() {
  const [isLogged, setLogin] = useState(false);
  const [player, setPlayer] = useState(null);

  // 👇 per sapere in che pagina siamo
  const location = useLocation();
  const inGame = location.pathname === "/game";

  return (
    <>
      <AppNavbar
        isLogged={isLogged}
        player={player}
        setLogin={setLogin}
        setPlayer={setPlayer}
        inGame={inGame}   
      />

      <Container fluid className="page-center">
        <div className="app-content">
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  isLogged={isLogged}
                  player={player}
                  setLogin={setLogin}
                  setPlayer={setPlayer}
                />
              }
            />

            <Route
              path="/login"
              element={
                isLogged ? (
                  <Navigate to="/" replace />
                ) : (
                  <Login setLogin={setLogin} setPlayer={setPlayer} />
                )
              }
            />

            <Route
              path="/game"
              element={
                <GamePage
                  isLogged={isLogged}
                  player={player}
                  setPlayer={setPlayer}
                />
              }
            />

            <Route path="/regole" element={<Regole />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Container>
    </>
  );
}

export default App;
