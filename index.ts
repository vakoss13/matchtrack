import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import './src/unistyles/unistyles';
import './src/locales/i18n';
import { registerRootComponent } from 'expo';

import App from './src/app/App';

registerRootComponent(App);
