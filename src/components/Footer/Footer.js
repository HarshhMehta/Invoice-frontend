import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const Footer = () => {
    const location = useLocation()

    useEffect(() => {
        // Option 1: Remove the unused code entirely (recommended)
        // This removes the ESLint warning
        
        // If you plan to use user data later, you can implement it when needed
        // For now, this effect runs on location changes but doesn't do anything
        
        console.log('Location changed:', location.pathname) // Optional: for debugging
    }, [location])

    return (
        <footer>
            {/* Footer content goes here */}
        </footer>
    )
}

export default Footer