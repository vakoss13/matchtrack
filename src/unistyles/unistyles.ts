import { StyleSheet } from 'react-native-unistyles'
import { darkTheme, lightTheme } from './theme'
import { breakpoints } from './breakpoints'

// --- TYPES FOR AUTOSUGGEST ---
type AppBreakpoints = typeof breakpoints
type AppThemes = {
    light: typeof lightTheme,
    dark: typeof darkTheme
}

declare module 'react-native-unistyles' {
    export interface UnistylesBreakpoints extends AppBreakpoints { }
    export interface UnistylesThemes extends AppThemes { }
}

// --- CONFIGURATION ---
StyleSheet.configure({
    breakpoints,
    themes: {
        light: lightTheme,
        dark: darkTheme
    },
    settings: {
        adaptiveThemes: false,
        initialTheme: 'dark'
    }
})

