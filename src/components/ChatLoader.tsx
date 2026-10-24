"use client";
import dynamic from "next/dynamic";

// Chat JS loads only after the page is interactive (faster first paint).
const ChatWidget = dynamic(() => import("./ChatWidget"), { ssr: false });

export default ChatWidget;
