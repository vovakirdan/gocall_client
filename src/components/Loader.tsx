import React from "react";
import "../styles/loader.scss"; // Подключаем стили

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
