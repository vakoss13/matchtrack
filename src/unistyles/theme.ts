// src/unistyles/theme.ts

export const darkTheme = {
  colors: {
    // Основа (Крипто-минимализм)
    background: '#000000',   // Глубокий черный фон
    surface: '#0D0D0E',      // Фон карточек (чуть светлее)
    surfaceCard: '#161618',  // Внутренние элементы (например, кружки логотипов)
    border: '#1F1F22',       // Очень тонкие, почти заметные границы

    // Акценты
    primary: '#00FF85',      // Неоновый зеленый (для активных элементов, времени матча)
    secondary: '#7000FF',    // Электрический фиолетовый для контраста
    live: '#FF3B30',         // Красный для LIVE статуса
    accent: '#00FF85',       // То же, что и primary
    danger: '#FF453A',
    error: '#FF453A',
    success: '#32D74B',

    // Текст
    text: '#FFFFFF',         // Основной текст (белый)
    subtext: '#6B6B6E',      // Приглушенный текст (серый)
    textInactive: '#404043', // Совсем тусклый текст (для неактивных табов)
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 16,                  // Мягкие, но строгие углы для карточек
    lg: 24,
    xl: 32,
    full: 99,
  },
  typography: {
    h1: 32,
    h2: 24,
    h3: 20,
    body: 16,
    subtitle: 14,
    caption: 12,
    tiny: 10,
  }
} as const;

export const lightTheme = {
  ...darkTheme,
  colors: {
    // Основа (Чистый премиальный вид)
    background: '#F2F2F7',    // Светло-серый фон (как в системе iOS)
    surface: '#FFFFFF',       // Белоснежные карточки (эффект глубины)
    surfaceCard: '#F8F8F8',   // Элементы внутри карточек
    border: '#E5E5EA',        // Едва заметные границы

    // Акценты (Адаптированные под светлый фон)
    primary: '#00C36B',       // Чуть более насыщенный зеленый для читаемости
    secondary: '#5856D6',     // Индиго
    live: '#FF3B30',          
    accent: '#00C36B',
    danger: '#FF3B30',
    error: '#FF3B30',
    success: '#34C759',

    // Текст
    text: '#1C1C1E',          // Почти черный для контраста
    subtext: '#8E8E93',       // Серый текст
    textInactive: '#C7C7CC',  // Очень светлый серый
  },
} as const;

export type AppTheme = typeof darkTheme;