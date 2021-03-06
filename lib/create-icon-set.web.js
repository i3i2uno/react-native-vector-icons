import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
    NativeModules,
    Platform,
    PixelRatio,
    processColor,
    Text,
    Animated,
    StyleSheet
} from './react-native';

import 'material-design-icons/iconfont/material-icons.css';
import 'font-awesome/css/font-awesome.min.css';

import createIconButtonComponent from './icon-button';
import createTabBarItemIOSComponent from './tab-bar-item-ios';
import createToolbarAndroidComponent from './toolbar-android';

const NativeIconAPI =
    NativeModules.RNVectorIconsManager || NativeModules.RNVectorIconsModule;

const DEFAULT_ICON_SIZE = 12;
const DEFAULT_ICON_COLOR = 'black';

export default function createIconSet(glyphMap, fontFamily, fontFile) {
    let fontReference = fontFamily;
    // Android doesn't care about actual fontFamily name, it will only look in fonts folder.
    if (Platform.OS === 'android' && fontFile) {
        fontReference = fontFile.replace(/\.(otf|ttf)$/, '');
    }

    if (Platform.OS === 'windows' && fontFile) {
        fontReference = `Assets/${fontFile}#${fontFamily}`;
    }

    const IconNamePropType = PropTypes.oneOf(Object.keys(glyphMap));

    class Icon extends Component {
        static propTypes = {
            name: IconNamePropType,
            color: PropTypes.string,
            children: PropTypes.node,
            style: PropTypes.any, // eslint-disable-line react/forbid-prop-types
        };

        static defaultProps = {
            size: DEFAULT_ICON_SIZE,
            allowFontScaling: false,
        };

        setNativeProps(nativeProps) {
            if (this.root) {
                this.root.setNativeProps(nativeProps);
            }
        }

        root = null;
        handleRef = ref => {
            this.root = ref;
        };

        getTotalDims(size, sstyle) {
            sstyle = sstyle || {};
            let w = size;
            let h = size;

            if (sstyle.padding || sstyle.paddingHorizontal || sstyle.paddingLeft || sstyle.paddingRight) {
                if (sstyle.padding || sstyle.paddingHorizontal) { w += ((sstyle.padding || sstyle.paddingHorizontal) * 2) }
                w += (sstyle.paddingLeft || 0) + (sstyle.paddingRight || 0);
            }

            if (sstyle.padding || sstyle.paddingVertical || sstyle.paddingTop || sstyle.paddingBottom) {
                if (sstyle.padding || sstyle.paddingVertical) { h += ((sstyle.padding || sstyle.paddingVertical) * 2) }
                h += (sstyle.paddingTop || 0) + (sstyle.paddingBottom || 0);
            }

            return {
                width: w,
                height: h
            }
        }

        render() {
            const { name, size, color, style, animated, ...props } = this.props;

            const dims = this.getTotalDims(size, StyleSheet.flatten(style));
            const styleDefaults = {
                fontSize: size,
                color,
                ...dims
            };

            const styleOverrides = {
                fontFamily: fontReference,
                fontWeight: 'normal',
                fontStyle: 'normal',
            };

            props.style = [styleDefaults, style, styleOverrides];
            props.ref = this.handleRef;

            let glyph;
            if (fontReference === 'FontAwesome') {
                glyph = (<i style={styleDefaults} className={"fa fa-" + name} />)
            } else { //only set for fontawesome and materialicons
                let nname = name.split('-').join('_');
                glyph = (<i style={styleDefaults} className={"material-icons"}>{nname}</i>)
            }

            const Comp = animated ? Animated.Text : Text;

            return (<Comp {...props} className={"icon"}>{glyph}{this.props.children}</Comp>);
        }
    }

    const imageSourceCache = {};

    function ensureNativeModuleAvailable() {
        if (!NativeIconAPI) {
            if (Platform.OS === 'android') {
                throw new Error(
                    'RNVectorIconsModule not available, did you properly integrate the module? Try running `react-native link react-native-vector-icons` and recompiling.'
                );
            }
            throw new Error(
                'RNVectorIconsManager not available, did you add the library to your project and link with libRNVectorIcons.a? Try running `react-native link react-native-vector-icons` and recompiling.'
            );
        }
    }

    function getImageSource(
        name,
        size = DEFAULT_ICON_SIZE,
        color = DEFAULT_ICON_COLOR
    ) {
        ensureNativeModuleAvailable();

        let glyph = glyphMap[name] || '?';
        if (typeof glyph === 'number') {
            glyph = String.fromCharCode(glyph);
        }

        const processedColor = processColor(color);
        const cacheKey = `${glyph}:${size}:${processedColor}`;
        const scale = PixelRatio.get();

        return new Promise((resolve, reject) => {
            const cached = imageSourceCache[cacheKey];
            if (typeof cached !== 'undefined') {
                if (!cached || cached instanceof Error) {
                    reject(cached);
                } else {
                    resolve({ uri: cached, scale });
                }
            } else {
                NativeIconAPI.getImageForFont(
                    fontReference,
                    glyph,
                    size,
                    processedColor,
                    (err, image) => {
                        const error = typeof err === 'string' ? new Error(err) : err;
                        imageSourceCache[cacheKey] = image || error || false;
                        if (!error && image) {
                            resolve({ uri: image, scale });
                        } else {
                            reject(error);
                        }
                    }
                );
            }
        });
    }

    function loadFont(file = fontFile) {
        if (Platform.OS === 'ios') {
            ensureNativeModuleAvailable();
            if (!file) {
                return Promise.reject(
                    new Error('Unable to load font, because no file was specified. ')
                );
            }
            return NativeIconAPI.loadFontWithFileName(...file.split('.'));
        }
        return Promise.resolve();
    }

    Icon.Button = createIconButtonComponent(Icon);
    Icon.TabBarItem = createTabBarItemIOSComponent(
        IconNamePropType,
        getImageSource
    );
    Icon.TabBarItemIOS = Icon.TabBarItem;
    Icon.ToolbarAndroid = createToolbarAndroidComponent(
        IconNamePropType,
        getImageSource
    );
    Icon.getImageSource = getImageSource;
    Icon.loadFont = loadFont;

    return Icon;
}
