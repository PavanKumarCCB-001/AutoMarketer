import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [darkMode, setDarkMode] = useState(true);  // Default dark like Agentathon

    useEffect(() => {
        document.body.className = darkMode ? 'bg-dark text-light' : 'bg-light text-dark';
    }, [darkMode]);
    return (
        <ThemeContext.Provider value={{ darkMode, toggleTheme: () => setDarkMode(!darkMode) }}>
            {children}
        </ThemeContext.Provider>);
};  