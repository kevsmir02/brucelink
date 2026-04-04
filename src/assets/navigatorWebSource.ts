import { Image } from 'react-native';

const navigatorHtmlAsset = require('./navigator.html');
const resolvedNavigatorHtmlAsset = Image.resolveAssetSource(navigatorHtmlAsset);

const navigatorHtmlUri = resolvedNavigatorHtmlAsset?.uri ?? 'about:blank';

export const navigatorWebSource = {
  uri: navigatorHtmlUri,
};
