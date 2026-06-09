import { LOAD_ERROR_MESSAGE } from "./config.js";

export function showLoadError(error) {
  console.error(error);

  const message = document.createElement("pre");
  message.textContent = LOAD_ERROR_MESSAGE;
  message.style.position = "fixed";
  message.style.inset = "16px";
  message.style.color = "white";
  message.style.font = "16px Arial, sans-serif";
  message.style.whiteSpace = "pre-wrap";

  document.body.appendChild(message);
}
