import { useState, useEffect, useRef, useMemo } from "react";
import { Send, Paperclip, Square, Zap, MessageSquare, Code2, Presentation, Image as ImageIcon, Globe, FileText, X, Mic, MicOff } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { addMessage, setArtifacts, setIsLoading } from "../redux/message.slice";
import { sendPrompt } from "../features/agent.api";
import { createConversation, updateConversations } from "../features/conversation.api";
import { addConversation, setConvTitle, setSelectedConversation } from "../redux/conversation.slice";
import { APP_NAME } from "../constants/brand";
import axios from "axios";

export default function ChatInput({
  setBanner,
  suggestion = { id: 0, text: "" },
}) {
  const [selectedAgent, setSelectedAgent] = useState("auto");
  const [value, setValue] = useState("");
  const [appliedSuggestionId, setAppliedSuggestionId] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState("");

  const recognitionRef = useRef(null);
  const speechBaseRef = useRef("");
  const shouldListenRef = useRef(false);
  const fileRef = useRef(null);
  const abortRef = useRef(null);
  const previewUrlRef = useRef(null);
  const dispatch = useDispatch();
  const { selectedConversation } = useSelector((state) => state.conversation);
  const { isLoading } = useSelector((state) => state.message);

  const [selectedFile, setSelectedFile] = useState(null);

  if (suggestion?.id && suggestion.id !== appliedSuggestionId) {
    setAppliedSuggestionId(suggestion.id);
    setValue(suggestion.text || "");
  }

  const placeholders = {
    auto: `Ask ${APP_NAME}...`,
    chat: `Chat with ${APP_NAME}...`,
    coding: "Describe the software you want...",
    pdf: "Generate a PDF about...",
    ppt: "Create a presentation about...",
    image: "Describe the image...",
    search: "Search the web...",
  };

  const agents = [
    { id: "auto", icon: Zap, label: "Auto" },
    { id: "chat", icon: MessageSquare, label: "Chat" },
    { id: "coding", icon: Code2, label: "Coding" },
    { id: "pdf", icon: FileText, label: "PDF" },
    { id: "ppt", icon: Presentation, label: "PPT" },
    { id: "image", icon: ImageIcon, label: "Image" },
    { id: "search", icon: Globe, label: "Search" },
  ];

  const previewUrl = useMemo(() => {
    if (!selectedFile?.type?.startsWith("image/")) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = previewUrl;
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      recognitionRef.current = null;
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalChunk += transcript;
        } else {
          interimChunk += transcript;
        }
      }

      if (finalChunk) {
        const next = `${speechBaseRef.current}${finalChunk}`.replace(/\s+/g, " ");
        speechBaseRef.current = next.endsWith(" ") ? next : `${next} `;
        setValue(speechBaseRef.current.trimStart());
      } else if (interimChunk) {
        setValue(`${speechBaseRef.current}${interimChunk}`.trimStart());
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      shouldListenRef.current = false;
      setIsListening(false);

      const messages = {
        "not-allowed": "Microphone permission denied. Allow mic access in the browser.",
        "no-speech": "No speech detected. Try again.",
        "audio-capture": "No microphone found.",
        network: "Speech recognition network error. Check your connection.",
        "service-not-allowed": "Speech recognition is blocked in this browser context.",
      };

      setMicError(messages[event.error] || `Mic error: ${event.error}`);
    };

    recognition.onend = () => {
      if (shouldListenRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
          return;
        } catch {
          // already started
        }
      }
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const toggleMic = async () => {
    setMicError("");

    if (!recognitionRef.current) {
      setMicError("Speech recognition is not supported in this browser. Use Chrome.");
      return;
    }

    if (isListening) {
      shouldListenRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      setIsListening(false);
      return;
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch {
      setMicError("Microphone permission denied. Allow mic access and try again.");
      return;
    }

    speechBaseRef.current = value ? `${value.trim()} ` : "";
    shouldListenRef.current = true;

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      shouldListenRef.current = false;
      setIsListening(false);
      setMicError(error?.message || "Could not start microphone.");
    }
  };

  const stopMicIfNeeded = () => {
    if (!isListening) return;
    shouldListenRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setIsListening(false);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch(setIsLoading(false));
  };

  const handleSend = async () => {
    if (isLoading) {
      handleStop();
      return;
    }

    const prompt = value.trim();
    if (!prompt && !selectedFile) return;

    const displayPrompt =
      prompt || (selectedFile ? `Analyze this file: ${selectedFile.name}` : "");

    stopMicIfNeeded();
    dispatch(setIsLoading(true));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let conversation = selectedConversation;

      if (!conversation) {
        const newConversation = await createConversation();
        dispatch(addConversation(newConversation));
        dispatch(setSelectedConversation(newConversation));
        conversation = newConversation;
      }

      if (conversation.title === "New Chat") {
        await updateConversations(conversation._id, displayPrompt.slice(0, 40));
        dispatch(
          setConvTitle({
            conversationId: conversation._id,
            title: displayPrompt.slice(0, 40),
          })
        );
      }

      dispatch(addMessage({ role: "user", content: displayPrompt }));
      setValue("");
      speechBaseRef.current = "";

      const formData = new FormData();
      formData.append("conversationId", conversation._id);
      formData.append("prompt", displayPrompt);
      formData.append("agent", selectedAgent);

      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";

      const data = await sendPrompt(formData, { signal: controller.signal });

      dispatch(
        addMessage({
          role: "assistant",
          content: data.answer,
          images: data.images,
        })
      );

      if (data.artifacts) {
        dispatch(setArtifacts(data.artifacts));
      }
    } catch (error) {
      if (axios.isCancel?.(error) || error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
        setBanner({
          open: true,
          title: "Stopped",
          message: "Generation was cancelled.",
        });
      } else {
        setBanner({
          open: true,
          title: error.response?.data?.title || "Something went wrong",
          message:
            error.response?.data?.message || error.message || "Please try again.",
        });
      }
    } finally {
      abortRef.current = null;
      dispatch(setIsLoading(false));
    }
  };

  const canSend = Boolean(value.trim() || selectedFile);

  return (
    <div className="w-full overflow-hidden px-3 md:px-5 py-4 border-t border-white/[0.06] bg-[#0d0f14]">
      <div className="flex flex-col gap-2 bg-white/[0.03] border border-white/[0.07] rounded-2xl px-4 pt-3.5 pb-3">
        <div className="flex w-[80%] gap-2 pr-2 flex-wrap">
          {agents.map((agent) => {
            const Icon = agent.icon;
            const isActive = selectedAgent === agent.id;

            return (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent.id)}
                className={`
            flex-shrink-0
            inline-flex
            items-center
            gap-1.5
            px-3
            py-2
            rounded-full
            text-xs
            font-medium
            border
            transition-all
            ${
              isActive
                ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent shadow-[0_1px_8px_rgba(99,102,241,.35)]"
                : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:bg-white/[0.07]"
            }
          `}
              >
                <Icon
                  size={14}
                  className={isActive ? "text-white" : "text-slate-500"}
                />
                {agent.label}
              </button>
            );
          })}
        </div>

        {selectedFile && (
          <div className="my-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
              {selectedFile.type === "application/pdf" ? (
                <FileText size={16} className="text-red-400" />
              ) : (
                selectedFile?.type.startsWith("image/") &&
                previewUrl && (
                  <img
                    src={previewUrl}
                    alt={selectedFile.name}
                    className="h-10 w-10 rounded-xl object-cover"
                  />
                )
              )}

              <div>
                <p className="text-xs text-white">{selectedFile.name}</p>
                <p className="text-[10px] text-slate-500">
                  {Math.ceil(selectedFile.size / 1024)} KB
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="ml-2 bg-transparent border-none cursor-pointer"
              >
                <X size={14} className="text-slate-500 hover:text-white" />
              </button>
            </div>
          </div>
        )}

        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholders[selectedAgent]}
          rows={3}
          disabled={isLoading}
          className="w-full bg-transparent outline-none resize-none text-[14px] text-slate-200 placeholder:text-slate-600 leading-relaxed [scrollbar-width:none] [&::-webkit-scrollbar]:hidden disabled:opacity-50"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".pdf,image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setSelectedFile(file);
              }}
            />
            <button
              type="button"
              title="Attach PDF or image"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-all duration-150 bg-transparent cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip size={14} />
            </button>
            <button
              type="button"
              title={isListening ? "Stop listening" : "Speak to type"}
              onClick={toggleMic}
              className={`
                flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer border-none
                ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-transparent text-slate-600 hover:bg-white/[0.05] hover:text-slate-400"
                }
              `}
            >
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!isLoading && !canSend}
            title={isLoading ? "Stop generation" : "Send"}
            className={`flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all duration-150
              ${
                isLoading
                  ? "bg-white text-[#0d0f14] hover:bg-slate-200"
                  : canSend
                    ? "bg-gradient-to-br from-indigo-500 to-violet-700 hover:opacity-90 text-white"
                    : "bg-white/[0.05] text-slate-600 cursor-not-allowed"
              }`}
          >
            {isLoading ? <Square size={12} fill="currentColor" /> : <Send size={14} />}
          </button>
        </div>
      </div>

      {micError && (
        <p className="text-center text-[11px] text-amber-400/90 mt-2">{micError}</p>
      )}

      <p className="text-center text-[10.5px] text-slate-600 mt-2.5">
        {APP_NAME} can make mistakes. Verify important info.
      </p>
    </div>
  );
}
