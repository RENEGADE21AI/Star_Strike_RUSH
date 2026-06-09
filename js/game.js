import { loadLegacyGame } from './legacyLoader.js';
import { showLoadError } from './errorView.js';

loadLegacyGame().catch(showLoadError);
