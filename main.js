import "./style.css";
import { setupGame } from "./game.js";

document.querySelector("#app").innerHTML = `
  <canvas id="game"></canvas>
`;

setupGame(document.getElementById("game"));
