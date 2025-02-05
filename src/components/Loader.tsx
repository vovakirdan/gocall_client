import React from "react";
import "../styles/loader.css"; // Подключаем стили

const Loader: React.FC = () => {
  return (
    <div className="loader">
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  );
};

export default Loader;
