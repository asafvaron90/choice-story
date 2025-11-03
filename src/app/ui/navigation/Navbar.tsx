"use client";

import React from "react";

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  return (
    <nav className="navbar">
      <button onClick={onMenuClick}>Menu</button>
      <style jsx>{`
        .navbar {
          height: 60px;
          background: #333;
          color: white;
          display: flex;
          align-items: center;
          padding: 0 20px;
        }
        button {
          background: none;
          border: none;
          color: white;
          font-size: 16px;
          cursor: pointer;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
