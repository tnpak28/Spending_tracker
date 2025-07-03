import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1976D2',
    secondary: '#FF9800',
    surface: '#FFFFFF',
    background: '#F5F5F5',
    error: '#F44336',
    success: '#4CAF50',
    warning: '#FF9800',
    info: '#2196F3',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#2196F3',
    secondary: '#FFC107',
    surface: '#121212',
    background: '#000000',
    error: '#CF6679',
    success: '#81C784',
    warning: '#FFB74D',
    info: '#64B5F6',
  },
};

export const theme = lightTheme; // You can switch to darkTheme or implement dynamic switching