import { LOAD_ERROR_MESSAGE } from './config.js';

export function showLoadError(error) {
  console.error(error);

  const message = document.createElement('pre');
  message.className = 'load-error';
  message.textContent = LOAD_ERROR_MESSAGE;

  document.body.appendChild(message);
}
