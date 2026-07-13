import { useState } from "react";
import AIBanner from "./AiBanner";
import ChatInput from "./ChatInput";
import MessageList from "./MessageList";
import Navbar from "./Navbar";

function ChatArea() {
  const [banner, setBanner] = useState({
    open: false,
    title: "",
    message: "",
  });
  const [suggestion, setSuggestion] = useState({ id: 0, text: "" });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Navbar />
      <MessageList
        onSuggestion={(text) => setSuggestion({ id: Date.now(), text })}
      />
      <AIBanner
        open={banner.open}
        title={banner.title}
        message={banner.message}
        onClose={() =>
          setBanner({
            ...banner,
            open: false,
          })
        }
      />
      <ChatInput setBanner={setBanner} suggestion={suggestion} />
    </div>
  );
}

export default ChatArea;
