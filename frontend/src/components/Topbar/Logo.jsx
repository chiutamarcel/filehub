import React, { useState, useEffect, useRef } from "react";

import "./index_header.css";

function Logo() {
  return (
    <div className="relative inline-block">
      <div className="w-24 h-24 bg-logo rounded-full bg-cover bg-center cursor-pointer flex items-center justify-center"></div>
    </div>
  );
}

export default Logo;
