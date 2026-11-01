import React, { createContext, useContext, useState } from "react";
import { useColorScheme as useDeviceColorScheme } from "react-native";
const lightColors = {
  bg: "#f3f4f6",
  card: "#ffffff",
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
  primary: "#3b82f6",
};
const darkColors = {
  bg: "#121212",
  card: "#1e1e1e",
  text: "#f9fafb",
  muted: "#9ca3af",
  border: "#374151",
  primary: "#3b82f6",
};
const ThemeContext = createContext(undefined);
export const ThemeProvider = ({ children }) => {
  const deviceScheme = useDeviceColorScheme();
  const [theme, setTheme] = useState(
    deviceScheme === "dark" ? "dark" : "light",
  );
  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };
  const isDark = theme === "dark";
  const colors = isDark ? darkColors : lightColors;
  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};
export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within a ThemeProvider");
  }
  return context;
};
