import { useState, useEffect, useRef, useCallback } from "react";

const SAMPLE_PROMPTS = [
  "A golden retriever running through a sunlit meadow with wildflowers swaying in the breeze, cinematic lighting, slow motion",
  "Aerial drone shot of ocean waves crashing against dramatic cliffs at golden hour sunset, 4K quality",
  "A cozy coffee shop scene with rain falling outside the window, steam rising from a latte, warm interior lighting",
  "Time-lapse of a city skyline transitioning from day to night with thousands of lights turning on",
  "A butterfly emerging from its cocoon in extreme macro detail, soft bokeh background, nature documentary style",
  "Snow falling gently over a quiet Japanese temple garden with koi pond, serene atmosphere",
  "A stylish woman walks down a Tokyo street filled with warm glowing neon signs, cinematic tracking shot",
  "Underwater footage of a coral reef with colorful fish swimming, sunlight filtering through crystal clear water"
];

const MODELS = [
  { id: "fal-ai/wan-t2v", name: "Wan 2.1", desc: "Fast & high quality", badge: "FREE", cost: "~$0.04" },
  { id: "fal-ai/hunyuan-video", name: "Hunyuan Video", desc: "Tencent's open model", badge: "FREE", cost: "~$0.08" },
  { id: "fal-ai/fast-svd/text-to-video", name: "Stable Video", desc: "Quick generation", badge: "FREE", cost: "~$0.01" },
  { id: "fal-ai/kling-video/v2.1/master/text-to-video", name: "Kling 2.1", desc: "Premium cinematic", badge: "PRO", cost: "~$0.30" },
];

const ASPECT_RATIOS = [
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
  { label: "1:1", value: "1:1" },
];

const STYLES = [
  { label: "Cinematic", value: "cinematic", emoji: "🎬" },
  { label: "Documentary", value: "documentary", emoji: "📹" },
  { label: "Dreamy", value: "dreamy", emoji: "✨" },
  { label: "Anime", value: "anime", emoji: "🎨" },
  { label: "Noir", value: "noir", emoji: "🌑" },
  { label: "Nature", value: "nature", emoji: "🌿" },
];

function ParticleField() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: Math.random() * 3 + 1 + "px",
          height: Math.random() * 3 + 1 + "px",
          background: `rgba(${120 + Math.random() * 80}, ${80 + Math.random() * 60}, ${200 + Math.random() * 55}, ${0.15 + Math.random() * 0.25})`,
          borderRadius: "50%",
          left: Math.random() * 100 + "%",
          top: Math.random() * 100 + "%",
          animation: `floatP ${8 + Math.random() * 12}s ease-in-out infinite`,
          animationDelay: `-${Math.random() * 10}s`,
        }} />
      ))}
    </div>
  );
}

function WaveformLoader() {
  return (
    <div style={{ display: "flex", gap: "3px", alignItems: "center", height: "32px", justifyContent: "center" }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} style={{
          width: "3px", borderRadius: "2px",
          background: "linear-gradient(180deg, #a78bfa, #7c3aed, #4c1d95)",
          animation: `waveB 1.2s ease-in-out infinite`,
          animationDelay: `${i * 0.06}s`,
        }} />
      ))}
    </div>
  );
}

export default function DreamMotion() {
  const [apiKey, setApiKey] = useState("");
  const [showApiSetup, setShowApiSetup] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [style, setStyle] = useState("cinematic");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [enhancing, setEnhancing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState([]);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + "px";
    }
  }, [prompt]);

  // Load saved API key
  useEffect(() => {
    try {
      const saved = window.sessionStorage?.getItem?.("fal_key");
      if (saved) { setApiKey(saved); setShowApiSetup(false); }
    } catch(e) {}
  }, []);

  const saveApiKey = () => {
    if (apiKey.trim()) {
      try { window.sessionStorage?.setItem?.("fal_key", apiKey.trim()); } catch(e) {}
      setShowApiSetup(false);
    }
  };

  const fillSample = () => {
    setPrompt(SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)]);
  };

  const enhancePrompt = async () => {
    if (!prompt.trim()) return;
    setEnhancing(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a cinematic video prompt engineer. Enhance this text-to-video prompt to be more vivid and detailed for AI video generation. Add camera movements, lighting, atmosphere, and visual style cues. Style: ${style}. Keep under 150 words. Output ONLY the enhanced prompt.\n\nOriginal: ${prompt}`
          }]
        })
      });
      const data = await response.json();
      const enhanced = data.content?.[0]?.text || prompt;
      setPrompt(enhanced);
    } catch (err) {
      console.error("Enhancement failed:", err);
    }
    setEnhancing(false);
  };

  // Build the input payload based on the selected model
  const buildInput = () => {
    const stylePrefix = {
      cinematic: "Cinematic, film grain, dramatic lighting, ",
      documentary: "Documentary style, natural lighting, realistic, ",
      dreamy: "Dreamy, ethereal, soft focus, pastel colors, ",
      anime: "Anime style, vibrant colors, cel shaded, ",
      noir: "Film noir, black and white, high contrast, shadows, ",
      nature: "Nature documentary, 4K, David Attenborough style, ",
    };

    const styledPrompt = (stylePrefix[style] || "") + prompt;

    if (selectedModel.includes("wan-t2v")) {
      return {
        prompt: styledPrompt,
        aspect_ratio: aspectRatio,
        resolution: "720p",
        enable_prompt_expansion: true,
      };
    } else if (selectedModel.includes("hunyuan-video")) {
      return {
        prompt: styledPrompt,
        aspect_ratio: aspectRatio,
        resolution: "720p",
        num_inference_steps: 30,
      };
    } else if (selectedModel.includes("fast-svd")) {
      return {
        prompt: styledPrompt,
        motion_bucket_id: 127,
      };
    } else if (selectedModel.includes("kling")) {
      return {
        prompt: styledPrompt,
        aspect_ratio: aspectRatio,
        duration: "5",
      };
    }
    return { prompt: styledPrompt };
  };

  const generateVideo = async () => {
    if (!prompt.trim() || !apiKey.trim()) {
      if (!apiKey.trim()) { setShowApiSetup(true); setError("Please enter your fal.ai API key first."); }
      return;
    }

    setGenerating(true);
    setProgress(0);
    setPhase("Submitting to queue...");
    setError(null);
    setVideoUrl(null);
    setLogs([]);

    try {
      // Step 1: Submit to queue
      const submitRes = await fetch(`https://queue.fal.run/${selectedModel}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Key ${apiKey.trim()}`,
        },
        body: JSON.stringify(buildInput()),
      });

      if (!submitRes.ok) {
        const errData = await submitRes.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || `API error: ${submitRes.status}`);
      }

      const { request_id } = await submitRes.json();
      setPhase("Request queued, waiting...");
      setProgress(10);
      setLogs(prev => [...prev, `Request ID: ${request_id}`]);

      // Step 2: Poll for status
      let completed = false;
      let attempts = 0;
      const maxAttempts = 120; // 10 min max

      while (!completed && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 5000));
        attempts++;

        const statusRes = await fetch(
          `https://queue.fal.run/${selectedModel}/requests/${request_id}/status`,
          {
            headers: { "Authorization": `Key ${apiKey.trim()}` },
          }
        );

        const statusData = await statusRes.json();

        if (statusData.status === "COMPLETED") {
          completed = true;
          setProgress(90);
          setPhase("Fetching result...");
        } else if (statusData.status === "FAILED") {
          throw new Error(statusData.error || "Generation failed on the server.");
        } else if (statusData.status === "IN_QUEUE") {
          const pos = statusData.queue_position ?? "?";
          setPhase(`In queue (position: ${pos})...`);
          setProgress(Math.min(20 + attempts, 40));
        } else if (statusData.status === "IN_PROGRESS") {
          setPhase("Generating video...");
          setProgress(Math.min(40 + attempts * 2, 85));
          if (statusData.logs) {
            const newLogs = statusData.logs.map(l => l.message || l);
            setLogs(prev => [...new Set([...prev, ...newLogs])]);
          }
        }
      }

      if (!completed) throw new Error("Generation timed out. Try again.");

      // Step 3: Get result
      const resultRes = await fetch(
        `https://queue.fal.run/${selectedModel}/requests/${request_id}`,
        {
          headers: { "Authorization": `Key ${apiKey.trim()}` },
        }
      );

      const result = await resultRes.json();
      
      // Different models return video URL in different structures
      let url = null;
      if (result.video?.url) url = result.video.url;
      else if (result.video) url = typeof result.video === "string" ? result.video : null;
      else if (result.output?.url) url = result.output.url;
      else if (typeof result.output === "string") url = result.output;
      else if (Array.isArray(result.videos) && result.videos[0]?.url) url = result.videos[0].url;

      if (!url) {
        console.log("Full result:", JSON.stringify(result));
        throw new Error("Could not find video URL in response. Check console for details.");
      }

      setVideoUrl(url);
      setProgress(100);
      setPhase("Complete!");
      setHistory(prev => [{ prompt, url, model: selectedModel, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 10));

    } catch (err) {
      setError(err.message);
      setProgress(0);
      setPhase("");
    }
    setGenerating(false);
  };

  const modelObj = MODELS.find(m => m.id === selectedModel);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes floatP { 0%,100%{transform:translate(0,0) scale(1);opacity:.3} 50%{transform:translate(-20px,-60px) scale(.8);opacity:.15} }
        @keyframes waveB { 0%,100%{height:4px} 50%{height:28px} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.6} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 20px rgba(124,58,237,.15)} 50%{box-shadow:0 0 40px rgba(124,58,237,.3)} }

        .root { min-height:100vh; background:#09090f; color:#e2e0ea; font-family:'Sora',sans-serif; position:relative; }
        .gbg { position:fixed; inset:0; background:radial-gradient(ellipse at 20% 0%,rgba(124,58,237,.1) 0%,transparent 50%),radial-gradient(ellipse at 80% 100%,rgba(59,7,100,.12) 0%,transparent 50%); z-index:0; }
        .mx { position:relative; z-index:1; max-width:820px; margin:0 auto; padding:32px 20px 80px; }
        
        .hdr { text-align:center; margin-bottom:40px; animation:fadeUp .7s ease-out; }
        .logo { display:inline-flex; align-items:center; justify-content:center; width:52px; height:52px; border-radius:14px; background:linear-gradient(135deg,#7c3aed,#a78bfa,#4c1d95); margin-bottom:16px; font-size:22px; box-shadow:0 8px 32px rgba(124,58,237,.3); }
        .ttl { font-size:36px; font-weight:700; letter-spacing:-1.5px; background:linear-gradient(135deg,#e2e0ea,#a78bfa,#7c3aed); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; line-height:1.1; margin-bottom:6px; }
        .sub { font-size:14px; color:#7c6fa0; font-weight:300; }

        .card { background:rgba(18,16,32,.85); border:1px solid rgba(124,58,237,.12); border-radius:18px; padding:20px; backdrop-filter:blur(16px); margin-bottom:16px; animation:fadeUp .7s ease-out both; }
        .card:focus-within { border-color:rgba(124,58,237,.35); }
        
        .lbl { font-size:11px; font-weight:500; color:#7c6fa0; text-transform:uppercase; letter-spacing:1.2px; margin-bottom:8px; font-family:'Space Mono',monospace; }
        
        .ta { width:100%; background:transparent; border:none; color:#e2e0ea; font-family:'Sora',sans-serif; font-size:15px; line-height:1.6; resize:none; outline:none; min-height:70px; }
        .ta::placeholder { color:#3d375a; }
        
        .acts { display:flex; gap:6px; margin-top:12px; flex-wrap:wrap; }
        .sbtn { padding:7px 12px; border-radius:9px; border:1px solid rgba(124,58,237,.18); background:rgba(124,58,237,.05); color:#a78bfa; font-size:11.5px; font-family:'Sora',sans-serif; cursor:pointer; transition:all .2s; display:flex; align-items:center; gap:5px; }
        .sbtn:hover { background:rgba(124,58,237,.13); border-color:rgba(124,58,237,.35); }
        .sbtn:disabled { opacity:.4; cursor:default; }
        
        .grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
        .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        
        .opts { display:flex; gap:5px; flex-wrap:wrap; }
        .ob { padding:6px 11px; border-radius:8px; border:1px solid rgba(124,58,237,.12); background:transparent; color:#7c6fa0; font-size:11.5px; font-family:'Sora',sans-serif; cursor:pointer; transition:all .2s; }
        .ob:hover { background:rgba(124,58,237,.08); }
        .ob.ac { background:rgba(124,58,237,.18); border-color:#7c3aed; color:#a78bfa; }
        
        .mcard { background:rgba(18,16,32,.6); border:1px solid rgba(124,58,237,.1); border-radius:14px; padding:14px; cursor:pointer; transition:all .25s; }
        .mcard:hover { background:rgba(124,58,237,.06); transform:translateY(-1px); }
        .mcard.ac { background:rgba(124,58,237,.12); border-color:#7c3aed; box-shadow:0 4px 20px rgba(124,58,237,.12); }
        .mname { font-size:13px; font-weight:600; color:#c4bfda; margin-bottom:2px; }
        .mcard.ac .mname { color:#e2e0ea; }
        .mdesc { font-size:10.5px; color:#5a5470; }
        .mbadge { display:inline-block; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:700; font-family:'Space Mono',monospace; margin-left:6px; }
        .mbadge.free { background:rgba(52,211,153,.12); color:#34d399; }
        .mbadge.pro { background:rgba(251,191,36,.1); color:#fbbf24; }
        
        .scard { background:rgba(18,16,32,.5); border:1px solid rgba(124,58,237,.08); border-radius:12px; padding:12px; cursor:pointer; transition:all .2s; text-align:center; }
        .scard:hover { background:rgba(124,58,237,.06); }
        .scard.ac { background:rgba(124,58,237,.12); border-color:#7c3aed; }
        .semoji { font-size:20px; margin-bottom:3px; }
        .slbl { font-size:11px; color:#7c6fa0; }
        .scard.ac .slbl { color:#a78bfa; }
        
        .gbtn { width:100%; padding:16px; border-radius:14px; border:none; background:linear-gradient(135deg,#7c3aed,#6d28d9,#5b21b6); color:white; font-family:'Sora',sans-serif; font-size:15px; font-weight:600; cursor:pointer; transition:all .3s; position:relative; overflow:hidden; margin-top:20px; }
        .gbtn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 12px 40px rgba(124,58,237,.3); }
        .gbtn:disabled { opacity:.45; cursor:not-allowed; }
        .gbtn::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent); background-size:200% 100%; animation:shimmer 2.5s infinite; }
        
        .prog { margin-top:20px; animation:fadeUp .4s ease-out; }
        .pbar { width:100%; height:5px; background:rgba(124,58,237,.08); border-radius:3px; overflow:hidden; margin:12px 0; }
        .pfill { height:100%; background:linear-gradient(90deg,#7c3aed,#a78bfa); border-radius:3px; transition:width .8s ease; }
        .pphase { font-size:12.5px; color:#a78bfa; animation:pulse 2s infinite; }
        .ppct { font-size:11px; color:#5a5470; font-family:'Space Mono',monospace; }
        
        .vcon { border-radius:18px; overflow:hidden; animation:fadeUp .5s ease-out,glow 3s infinite; margin-top:20px; background:rgba(18,16,32,.85); border:1px solid rgba(124,58,237,.2); }
        .vplayer { width:100%; display:block; }
        .vinfo { padding:16px; }
        .vprompt { font-size:12px; color:#7c6fa0; line-height:1.5; margin-bottom:12px; }
        .vacts { display:flex; gap:8px; }
        .abtn { padding:9px 18px; border-radius:9px; border:1px solid rgba(124,58,237,.25); background:rgba(124,58,237,.08); color:#a78bfa; font-family:'Sora',sans-serif; font-size:12px; cursor:pointer; transition:all .2s; text-decoration:none; }
        .abtn:hover { background:rgba(124,58,237,.18); }
        .abtn.pri { background:linear-gradient(135deg,#7c3aed,#5b21b6); border-color:transparent; color:white; }
        
        .ebox { padding:14px 18px; border-radius:11px; background:rgba(239,68,68,.06); border:1px solid rgba(239,68,68,.18); color:#fca5a5; font-size:12.5px; margin-top:16px; line-height:1.5; }
        
        .demo { display:inline-block; padding:5px 12px; border-radius:7px; background:rgba(251,191,36,.08); border:1px solid rgba(251,191,36,.18); color:#fbbf24; font-size:11px; font-family:'Space Mono',monospace; margin-bottom:12px; }
        
        .apibox { background:rgba(18,16,32,.9); border:1px solid rgba(124,58,237,.2); border-radius:18px; padding:24px; margin-bottom:24px; animation:fadeUp .5s ease-out; }
        .apiinp { width:100%; padding:12px 14px; border-radius:10px; border:1px solid rgba(124,58,237,.2); background:rgba(10,10,20,.6); color:#e2e0ea; font-family:'Space Mono',monospace; font-size:13px; outline:none; transition:border-color .2s; }
        .apiinp:focus { border-color:rgba(124,58,237,.5); }
        .apiinp::placeholder { color:#3d375a; }
        
        .abtn2 { padding:10px 20px; border-radius:10px; border:none; background:linear-gradient(135deg,#7c3aed,#5b21b6); color:white; font-family:'Sora',sans-serif; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; margin-top:12px; }
        .abtn2:hover { box-shadow:0 4px 20px rgba(124,58,237,.3); }
        .abtn2:disabled { opacity:.4; }
        
        .logsbox { margin-top:12px; padding:10px; background:rgba(0,0,0,.3); border-radius:8px; max-height:120px; overflow-y:auto; font-family:'Space Mono',monospace; font-size:10px; color:#5a5470; line-height:1.6; }
        
        .spin { width:13px; height:13px; border:2px solid rgba(167,139,250,.2); border-top-color:#a78bfa; border-radius:50%; animation:spin .8s linear infinite; }
        
        .hist { margin-top:32px; }
        .hitem { display:flex; gap:12px; align-items:center; padding:10px; border-radius:10px; background:rgba(18,16,32,.4); border:1px solid rgba(124,58,237,.06); margin-bottom:8px; cursor:pointer; transition:all .2s; }
        .hitem:hover { background:rgba(124,58,237,.06); }
        .hthumb { width:48px; height:36px; border-radius:6px; background:rgba(124,58,237,.1); display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
        .htext { font-size:11.5px; color:#8b85a0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; }
        .htime { font-size:10px; color:#4a4460; font-family:'Space Mono',monospace; flex-shrink:0; }

        .keybtn { display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:8px; border:1px solid rgba(124,58,237,.15); background:rgba(124,58,237,.05); color:#7c6fa0; font-size:11px; cursor:pointer; transition:all .2s; font-family:'Sora',sans-serif; }
        .keybtn:hover { background:rgba(124,58,237,.1); color:#a78bfa; }

        @media(max-width:640px) { .grid3{grid-template-columns:1fr 1fr} .grid2{grid-template-columns:1fr} .ttl{font-size:28px} }
      `}</style>

      <div className="root">
        <div className="gbg" />
        <ParticleField />

        <div className="mx">
          {/* Header */}
          <div className="hdr">
            <div className="logo">▶</div>
            <h1 className="ttl">Dream Motion</h1>
            <p className="sub">Transform text into lifelike AI video · Powered by fal.ai</p>
          </div>

          {/* API Key Setup */}
          {showApiSetup && (
            <div className="apibox">
              <div className="lbl" style={{ marginBottom: 12, color: "#a78bfa" }}>🔑 Connect your fal.ai API Key</div>
              <p style={{ fontSize: 12.5, color: "#7c6fa0", lineHeight: 1.6, marginBottom: 14 }}>
                Get a <strong style={{ color: "#a78bfa" }}>free API key</strong> from{" "}
                <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener noreferrer" style={{ color: "#a78bfa", textDecoration: "underline" }}>
                  fal.ai/dashboard/keys
                </a>{" "}
                — sign up with Google, no credit card needed. New accounts get free credits!
              </p>
              <input
                className="apiinp"
                type="password"
                placeholder="Paste your fal.ai API key here..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveApiKey()}
              />
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
                <button className="abtn2" onClick={saveApiKey} disabled={!apiKey.trim()}>
                  Connect & Start Creating
                </button>
                <span style={{ fontSize: 10, color: "#4a4460" }}>Key is stored in session only</span>
              </div>
            </div>
          )}

          {/* Connected indicator */}
          {!showApiSetup && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button className="keybtn" onClick={() => setShowApiSetup(true)}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} /> API Connected
              </button>
            </div>
          )}

          {/* Prompt Input */}
          <div className="card" style={{ animationDelay: ".1s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span className="lbl">Describe your scene</span>
              <span style={{ fontSize: 10, color: "#3d375a", fontFamily: "'Space Mono',monospace" }}>{prompt.length} chars</span>
            </div>
            <textarea
              ref={textareaRef}
              className="ta"
              placeholder="A cinematic shot of a lone astronaut walking across Mars, dust particles floating in the amber atmosphere, Earth visible as a pale blue dot..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={generating}
            />
            <div className="acts">
              <button className="sbtn" onClick={fillSample}>🎲 Random</button>
              <button className="sbtn" onClick={enhancePrompt} disabled={!prompt.trim() || enhancing || generating}>
                {enhancing ? <><span className="spin" /> Enhancing...</> : <>✨ AI Enhance</>}
              </button>
              {prompt && <button className="sbtn" onClick={() => setPrompt("")}>✕ Clear</button>}
            </div>
          </div>

          {/* Model Selection */}
          <div className="card" style={{ animationDelay: ".15s" }}>
            <div className="lbl" style={{ marginBottom: 10 }}>AI Model</div>
            <div className="grid2">
              {MODELS.map(m => (
                <div
                  key={m.id}
                  className={`mcard ${selectedModel === m.id ? "ac" : ""}`}
                  onClick={() => setSelectedModel(m.id)}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span className="mname">{m.name}</span>
                    <span className={`mbadge ${m.badge === "FREE" ? "free" : "pro"}`}>{m.badge}</span>
                  </div>
                  <div className="mdesc">{m.desc} · {m.cost}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls Row */}
          <div className="card" style={{ animationDelay: ".2s" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div className="lbl">Aspect Ratio</div>
                <div className="opts">
                  {ASPECT_RATIOS.map(ar => (
                    <button key={ar.value} className={`ob ${aspectRatio === ar.value ? "ac" : ""}`} onClick={() => setAspectRatio(ar.value)}>
                      {ar.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="lbl">Visual Style</div>
                <div className="opts" style={{ flexWrap: "wrap" }}>
                  {STYLES.map(s => (
                    <button key={s.value} className={`ob ${style === s.value ? "ac" : ""}`} onClick={() => setStyle(s.value)}>
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button className="gbtn" onClick={generateVideo} disabled={!prompt.trim() || generating || !apiKey.trim()}>
            {generating ? "Generating..." : `Generate Video with ${modelObj?.name || "AI"} →`}
          </button>

          {/* Progress */}
          {generating && (
            <div className="card prog">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="pphase">{phase}</span>
                <span className="ppct">{progress}%</span>
              </div>
              <div className="pbar"><div className="pfill" style={{ width: `${progress}%` }} /></div>
              <WaveformLoader />
              {logs.length > 0 && (
                <div className="logsbox">
                  {logs.map((l, i) => <div key={i}>→ {l}</div>)}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && <div className="ebox">⚠ {error}</div>}

          {/* Result */}
          {videoUrl && (
            <div className="vcon">
              <video className="vplayer" src={videoUrl} controls autoPlay loop muted playsInline />
              <div className="vinfo">
                <p className="vprompt">"{prompt.slice(0, 200)}{prompt.length > 200 ? '...' : ''}"</p>
                <div style={{ fontSize: 10, color: "#4a4460", marginBottom: 10 }}>
                  Model: {modelObj?.name} · Aspect: {aspectRatio} · Style: {style}
                </div>
                <div className="vacts">
                  <a href={videoUrl} download="dream-motion.mp4" className="abtn pri" target="_blank" rel="noopener noreferrer">
                    ↓ Download MP4
                  </a>
                  <button className="abtn" onClick={() => { setVideoUrl(null); setError(null); setProgress(0); }}>
                    ✦ New Video
                  </button>
                  <button className="abtn" onClick={() => { navigator.clipboard?.writeText(videoUrl); }}>
                    📋 Copy URL
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="hist">
              <div className="lbl" style={{ marginBottom: 10 }}>Generation History</div>
              {history.map((h, i) => (
                <div key={i} className="hitem" onClick={() => { setVideoUrl(h.url); }}>
                  <div className="hthumb">🎬</div>
                  <div className="htext">{h.prompt}</div>
                  <div className="htime">{h.time}</div>
                </div>
              ))}
            </div>
          )}

          {/* Info Footer */}
          <div className="card" style={{ marginTop: 32, animationDelay: ".3s", background: "rgba(18,16,32,.4)" }}>
            <div className="lbl" style={{ marginBottom: 8, color: "#5a5470" }}>How it works</div>
            <p style={{ fontSize: 11.5, color: "#4a4460", lineHeight: 1.7 }}>
              <strong style={{ color: "#5a5470" }}>1.</strong> Get a free API key from <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener noreferrer" style={{ color: "#7c6fa0" }}>fal.ai</a> (Google sign-up, no credit card)
              <br />
              <strong style={{ color: "#5a5470" }}>2.</strong> Write a prompt or use AI Enhance to make it cinematic
              <br />
              <strong style={{ color: "#5a5470" }}>3.</strong> Choose a model — Wan 2.1 is fast & free-tier friendly (~$0.04/video)
              <br />
              <strong style={{ color: "#5a5470" }}>4.</strong> Hit generate and get a real AI-generated video in 30-120 seconds
              <br /><br />
              <span style={{ color: "#3d375a" }}>Uses fal.ai's queue API for reliable generation. Your API key stays in your browser session only.</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
