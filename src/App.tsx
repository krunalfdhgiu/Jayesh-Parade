import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  BarChart2, 
  BatteryCharging, 
  ChevronRight, 
  Cpu, 
  MessageSquare, 
  Play, 
  Settings, 
  Share2, 
  ThumbsUp, 
  TrendingUp, 
  User, 
  Zap,
  Target,
  RefreshCcw,
  Sparkles,
  Flame,
  Swords,
  LogOut,
  UtensilsCrossed,
  X,
  ShoppingCart,
  CheckCircle2
} from 'lucide-react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, auth } from './lib/firebase';

const DRAMATIC_STORIES = [
  "\"GT just turned pressure into a playlist drop 🔥\"",
  "\"LSG's hopes hanging by a thread as Rashid weaves his magic!\"",
  "\"Absolute cinema! The required rate climbs like a rollercoaster.\"",
  "\"Can LSG pull off a heist? The AI predicts a 15-run over incoming!\"",
  "\"Momentum swings wildly! A classic IPL death-over thriller blooming.\""
];

const MEMESTORY = [
  "Rashid Khan said: main hu na 😎",
  "LSG batters right now: 😵‍💫",
  "GT Fans clearing their throats for the roar 🦁",
  "Scriptwriters working overtime tonight ✍️"
];

function App() {
  const [matchData, setMatchData] = useState({
    score: "156/4",
    overs: "17.2",
    striker: "R. Khan 24* (12)",
    bowler: "M. Wood 2-28 (3.2)",
    requiredRunRate: "9.8",
    lastBalls: ['1', '4', 'W', '2', '6'],
    gtWinProbability: 62,
    lsgWinProbability: 38,
    momentum: "Momentum shifting towards GT",
    status: "GT building pressure in death overs"
  });

  const [aiData, setAiData] = useState({
    commentary: "GT just turned pressure into a playlist drop 🔥",
    meme: "Rashid Khan said: main hu na 😎",
    tacticalNudge: "LSG should introduce spin now.",
    story: "\"GT just turned pressure into a playlist drop 🔥\"",
    sentiment: "Fans say GT dominating"
  });

  const [pollData, setPollData] = useState<any>({
    question: "Next over 10+ runs?",
    yesPercent: 64,
    noPercent: 36,
    gtCheer: 72,
    lsgCheer: 58,
    teamA: "GT",
    teamB: "LSG",
    teamAPercent: 64,
    teamBPercent: 36,
    teamACheer: 72,
    teamBCheer: 58
  });

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState("");

  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [isGeneratingMeme, setIsGeneratingMeme] = useState(false);
  const [isGeneratingTactics, setIsGeneratingTactics] = useState(false);
  const [isGeneratingSentiment, setIsGeneratingSentiment] = useState(false);
  
  const [matchMode, setMatchMode] = useState<"demo"|"live">("demo");
  const [availableLiveMatches, setAvailableLiveMatches] = useState<any[]>([]);
  const [selectedApiMatchId, setSelectedApiMatchId] = useState("");
  const [apiSyncMessage, setApiSyncMessage] = useState("");
  const [isFetchingMatches, setIsFetchingMatches] = useState(false);

  // MatchBites AI State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [foodPrompt, setFoodPrompt] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("Ahmedabad");
  const [isFoodLoading, setIsFoodLoading] = useState(false);
  const [foodResult, setFoodResult] = useState<any>(null);
  const [selectedDish, setSelectedDish] = useState<any>(null);
  const [cart, setCart] = useState<{name: string, price: number}[]>([]);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch(e) {}
  };

  const openZomatoForDish = async (dish: any, cityToUse?: string) => {
    if (!dish) return;
    try {
      if (user) {
        await setDoc(doc(db, 'partner_events', Date.now().toString()), {
          type: "zomato_dish_redirect",
          dishName: dish.name,
          searchQuery: dish.searchQuery,
          source: "MatchBites AI",
          match: matchData?.matchName || "Live Match",
          userId: user.uid,
          createdAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.warn("Could not log Zomato redirect", e);
    }
    const dishName = dish.name || "Paneer Tikka Roll";
    const city = cityToUse || deliveryCity || "Ahmedabad";
    const query = encodeURIComponent(dish.searchQuery || `${dishName} in ${city}`);
    const url = `https://www.zomato.com/search?q=${query}`;
    window.open(url, "_blank", "noopener,noreferrer");
    copyToClipboard(dishName);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  // MatchBites AI draggable state
  const [iconPosition, setIconPosition] = useState({ x: 24, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 300 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);
  const iconRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const savedPos = localStorage.getItem('matchbites-icon-position');
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setIconPosition({ x: parsed.x, y: parsed.y });
        }
      } catch (e) {
        setIconPosition({ x: 24, y: window.innerHeight / 2 });
      }
    } else {
      setIconPosition({ x: 24, y: window.innerHeight / 2 });
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Only handle main button click or touch
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    
    const el = iconRef.current;
    if (!el) return;

    el.setPointerCapture(e.pointerId);
    setIsDragging(true);
    hasDragged.current = false;
    dragStartPos.current = { 
      x: e.clientX - iconPosition.x, 
      y: e.clientY - iconPosition.y 
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;

    if (!hasDragged.current) {
      const dx = e.clientX - (dragStartPos.current.x + iconPosition.x);
      const dy = e.clientY - (dragStartPos.current.y + iconPosition.y);
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasDragged.current = true;
      }
    }

    if (hasDragged.current) {
      const el = iconRef.current;
      const rect = el?.getBoundingClientRect();
      const width = rect?.width || 56;
      const height = rect?.height || 56;

      const clampedX = Math.max(0, Math.min(newX, window.innerWidth - width));
      const clampedY = Math.max(0, Math.min(newY, window.innerHeight - height));

      setIconPosition({ x: clampedX, y: clampedY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const el = iconRef.current;
    if (el) el.releasePointerCapture(e.pointerId);

    if (!hasDragged.current) {
      setIsDrawerOpen(true);
    } else {
      localStorage.setItem('matchbites-icon-position', JSON.stringify(iconPosition));
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    setIsDragging(false);
    const el = iconRef.current;
    if (el) el.releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser) {
        try {
          await setDoc(doc(db, 'users', currentUser.uid), {
            uid: currentUser.uid,
            name: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            lastLoginAt: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.error("Failed to write user profile:", e);
        }
      }
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubMatch = onSnapshot(doc(db, 'matches', 'gt-vs-lsg-live'), (docSnap) => {
      if (docSnap.exists()) {
        setMatchData(prev => ({ ...prev, ...docSnap.data() as any }));
        setIsFirebaseConnected(true);
      }
    }, (err) => {
      console.warn("Match sub err (using fallback data):", err.message);
      setIsFirebaseConnected(false);
    });

    const unsubAi = onSnapshot(doc(db, 'ai_insights', 'latest'), (docSnap) => {
      if (docSnap.exists()) {
        setAiData(prev => ({ ...prev, ...docSnap.data() as any }));
      }
    }, (err) => console.warn("AI sub err:", err.message));

    const unsubPolls = onSnapshot(doc(db, 'fan_polls', 'next-over-10-runs'), (docSnap) => {
      if (docSnap.exists()) {
        setPollData(prev => ({ ...prev, ...docSnap.data() as any }));
      }
    }, (err) => console.warn("Poll sub err:", err.message));

    return () => {
      unsubMatch();
      unsubAi();
      unsubPolls();
    };
  }, [user]);

  const triggerUpdateAnimation = () => {
    setPulseAnimation(true);
    setTimeout(() => setPulseAnimation(false), 500);
  };

  const simulateBoundary = async () => {
    const isLive = matchMode === "live" || matchData?.source === "cricket_api";
    const currentA = isLive ? (matchData.teamAWinProbability ?? 50) : matchData.gtWinProbability;
    const newA = Math.min(100, currentA + Math.floor(Math.random() * 4) + 4);
    const newB = 100 - newA;
    setMatchData(prev => ({ 
      ...prev, 
      ...(isLive ? { teamAWinProbability: newA, teamBWinProbability: newB } : { gtWinProbability: newA, lsgWinProbability: newB })
    }));
    triggerUpdateAnimation();
    try {
      await setDoc(doc(db, 'matches', 'gt-vs-lsg-live'), {
        ...(isLive ? { teamAWinProbability: newA, teamBWinProbability: newB } : { gtWinProbability: newA, lsgWinProbability: newB }),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch(e) { console.error("Simulate boundary err", e); }
  };

  const simulateWicket = async () => {
    const isLive = matchMode === "live" || matchData?.source === "cricket_api";
    const currentA = isLive ? (matchData.teamAWinProbability ?? 50) : matchData.gtWinProbability;
    const newA = Math.max(0, currentA - (Math.floor(Math.random() * 5) + 6));
    const newB = 100 - newA;
    setMatchData(prev => ({ 
      ...prev, 
      ...(isLive ? { teamAWinProbability: newA, teamBWinProbability: newB } : { gtWinProbability: newA, lsgWinProbability: newB })
    }));
    triggerUpdateAnimation();
    try {
      await setDoc(doc(db, 'matches', 'gt-vs-lsg-live'), {
        ...(isLive ? { teamAWinProbability: newA, teamBWinProbability: newB } : { gtWinProbability: newA, lsgWinProbability: newB }),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch(e) { console.error("Simulate wicket err", e); }
  };

  const updateWinProbability = async () => {
    const isLive = matchMode === "live" || matchData?.source === "cricket_api";
    const newGt = Math.floor(Math.random() * 80) + 10;
    const newLsg = 100 - newGt;
    setMatchData(prev => ({ 
      ...prev, 
      ...(isLive ? { teamAWinProbability: newGt, teamBWinProbability: newLsg } : { gtWinProbability: newGt, lsgWinProbability: newLsg })
    }));
    triggerUpdateAnimation();
    try {
      await setDoc(doc(db, 'matches', 'gt-vs-lsg-live'), {
        ...(isLive ? { teamAWinProbability: newGt, teamBWinProbability: newLsg } : { gtWinProbability: newGt, lsgWinProbability: newLsg }),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch(e) { console.error("Update win prob err", e); }
  };

  const generateAIStory = async () => {
    if (isGeneratingStory) return;
    setIsGeneratingStory(true);
    setAiData(prev => ({ ...prev, story: "Generating AI insight..." }));
    try {
      const response = await fetch('/api/generate-story', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchData: matchDataWithFallback })
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      if (data.story) {
        setAiData(prev => ({ ...prev, story: data.story }));
        try {
          await setDoc(doc(db, 'ai_insights', 'latest'), { story: data.story, updatedAt: serverTimestamp() }, { merge: true });
        } catch(e) { console.error("Write err", e); }
      }
    } catch (error) {
      console.error('Failed to generate AI story:', error);
      const nextStory = DRAMATIC_STORIES[Math.floor(Math.random() * DRAMATIC_STORIES.length)];
      setAiData(prev => ({ ...prev, story: nextStory }));
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const generateMeme = async () => {
    if (isGeneratingMeme) return;
    setIsGeneratingMeme(true);
    setAiData(prev => ({ ...prev, meme: "Generating meme..." }));
    try {
      const response = await fetch('/api/generate-meme', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchData: matchDataWithFallback })
      });
      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      if (data.meme || data.commentary) {
        setAiData(prev => ({ ...prev, meme: data.meme || prev.meme, commentary: data.commentary || prev.commentary }));
        await setDoc(doc(db, 'ai_insights', 'latest'), { meme: data.meme, commentary: data.commentary, updatedAt: serverTimestamp() }, { merge: true });
      }
    } catch (e) {
      console.error(e);
      setAiData(prev => ({ ...prev, meme: "Meme network error!" }));
    } finally {
      setIsGeneratingMeme(false);
    }
  };

  const generateTactics = async () => {
    if (isGeneratingTactics) return;
    setIsGeneratingTactics(true);
    setAiData(prev => ({ ...prev, tacticalNudge: "Analysing tactics..." }));
    try {
      const response = await fetch('/api/generate-tactics', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchData: matchDataWithFallback })
      });
      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      if (data.suggestion) {
        setAiData(prev => ({ ...prev, tacticalNudge: data.suggestion }));
        await setDoc(doc(db, 'ai_insights', 'latest'), { tacticalNudge: data.suggestion, updatedAt: serverTimestamp() }, { merge: true });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingTactics(false);
    }
  };

  const generateSentiment = async () => {
    if (isGeneratingSentiment) return;
    setIsGeneratingSentiment(true);
    setAiData(prev => ({ ...prev, sentiment: "Checking fan pulse..." }));
    try {
      const response = await fetch('/api/generate-sentiment', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchData: matchDataWithFallback })
      });
      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      if (data.sentiment) {
        setAiData(prev => ({ ...prev, sentiment: data.sentiment }));
        await setDoc(doc(db, 'ai_insights', 'latest'), { sentiment: data.sentiment, updatedAt: serverTimestamp() }, { merge: true });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingSentiment(false);
    }
  };

  const resetToDemo = async () => {
    if (!user) return;
    setMatchMode("demo");
    setApiSyncMessage("Resetting to IPL Demo mode...");
    try {
      await setDoc(doc(db, 'matches', 'gt-vs-lsg-live'), {
        teamA: "GT",
        teamB: "LSG",
        matchName: "GT vs LSG",
        venue: "Narendra Modi Stadium",
        status: "LIVE",
        score: "156/4",
        overs: 17.2,
        striker: "R. Khan 24* (12)",
        bowler: "M. Wood 2-28 (3.2)",
        requiredRunRate: 9.8,
        lastBalls: ["1", "4", "W", "2", "6"],
        gtWinProbability: 62,
        lsgWinProbability: 38,
        teamAWinProbability: 62,
        teamBWinProbability: 38,
        momentum: "Momentum shifting towards GT",
        source: "demo",
        apiMatchId: "",
        updatedAt: serverTimestamp()
      });
      await setDoc(doc(db, 'ai_insights', 'latest'), {
        commentary: "GT just turned pressure into a playlist drop 🔥",
        meme: "Rashid Khan said: main hu na 😎",
        tacticalNudge: "LSG should introduce spin now.",
        story: "\"GT just turned pressure into a playlist drop 🔥\"",
        sentiment: "Fans say GT dominating",
        updatedAt: serverTimestamp()
      });
      await setDoc(doc(db, 'fan_polls', 'next-over-10-runs'), {
        question: "Next over 10+ runs?",
        yesPercent: 64,
        noPercent: 36,
        gtCheer: 72,
        lsgCheer: 58,
        teamA: "GT",
        teamB: "LSG",
        teamAPercent: 64,
        teamBPercent: 36,
        teamACheer: 72,
        teamBCheer: 58,
        updatedAt: serverTimestamp()
      });
      setApiSyncMessage("IPL Demo mode active.");
      setTimeout(() => setApiSyncMessage(""), 4000);
    } catch (e) {
      console.error("Failed to reset to demo", e);
    }
  };

  const fetchLiveMatches = async () => {
    // If we're currently syncing or already have matches, we might just re-fetch, but let's reset message
    setIsFetchingMatches(true);
    setApiSyncMessage("Fetching live matches...");
    try {
      const resp = await fetch("/api/fetch-live-matches", { method: "POST" });
      if (!resp.ok) throw new Error("Network response was not ok");
      const data = await resp.json();
      if (data.matches && data.matches.length > 0) {
        setAvailableLiveMatches(data.matches);
        
        let selectedId = data.matches[0].id;
        const gtLsgMatch = data.matches.find((m: any) => 
          (m.name.toLowerCase().includes('gujarat') || m.name.toLowerCase().includes('titans') || m.name.toLowerCase().includes('gt')) && 
          (m.name.toLowerCase().includes('lucknow') || m.name.toLowerCase().includes('lsg') || m.name.toLowerCase().includes('super giants'))
        );
        const singleTeamMatch = data.matches.find((m: any) => 
          m.name.toLowerCase().includes('gujarat') || m.name.toLowerCase().includes('titans') || m.name.toLowerCase().includes('gt') ||
          m.name.toLowerCase().includes('lucknow') || m.name.toLowerCase().includes('lsg') || m.name.toLowerCase().includes('super giants')
        );
        
        if (gtLsgMatch) {
          selectedId = gtLsgMatch.id;
        } else if (singleTeamMatch) {
          selectedId = singleTeamMatch.id;
        }
        
        setSelectedApiMatchId(selectedId);
        setApiSyncMessage("Live matches loaded. Select one to sync.");
      } else {
        setAvailableLiveMatches([]);
        setApiSyncMessage("No live matches found. Use IPL Demo mode.");
      }
    } catch (err) {
      console.warn("API Error", err);
      setAvailableLiveMatches([]);
      setApiSyncMessage("Could not fetch live cricket data. Use IPL Demo mode.");
    } finally {
      setIsFetchingMatches(false);
    }
  };

  const syncSelectedLiveMatch = async () => {
    if (!user) return;
    const match = availableLiveMatches.find((m: any) => m.id === selectedApiMatchId || String(m.id) === String(selectedApiMatchId));
    if (!match) return;

    setMatchMode("live");
    
    // normalization Rules
    let tA = "Team A";
    let tB = "Team B";
    if (match.teams && match.teams.length >= 2) {
      tA = match.teams[0];
      tB = match.teams[1];
    } else if (match.name) {
      const parts = match.name.split(/\s+vs\s+|\s+v\s+/i);
      if (parts.length >= 2) {
        tA = parts[0];
        tB = parts[1];
      }
    }

    let scoreStr = "Score not available";
    let oversNum = 0;
    let scoreLinesArr: string[] = [];

    if (match.score && Array.isArray(match.score)) {
      scoreLinesArr = match.score.map((s: any) => `${s.inning}: ${s.r}/${s.w} (${s.o} ov)`);
      if (match.score.length > 0) {
        const currentInning = match.score[match.score.length - 1];
        scoreStr = `${currentInning.r}/${currentInning.w}`;
        oversNum = currentInning.o || 0;
      }
    }

    const payload = {
        apiMatchId: match.id || "unknown",
        source: "cricket_api",
        matchName: match.name || `${tA} vs ${tB}`,
        teamA: tA,
        teamB: tB,
        venue: match.venue || "Venue not available",
        status: match.status || "LIVE",
        score: scoreStr,
        overs: oversNum,
        scoreLines: scoreLinesArr,
        striker: "Not available",
        bowler: "Not available",
        requiredRunRate: "Not available",
        lastBalls: ["•", "•", "•", "•", "•"],
        gtWinProbability: 50,
        lsgWinProbability: 50,
        teamAWinProbability: 50,
        teamBWinProbability: 50,
        momentum: "Live score synced from cricket API. AI momentum analysis ready.",
        updatedAt: serverTimestamp()
    };

    console.log("Selected match normalized");

    try {
      await setDoc(doc(db, 'matches', 'gt-vs-lsg-live'), payload);
      await setDoc(doc(db, 'ai_insights', 'latest'), {
        commentary: `${tA} vs ${tB} is live. AI insights are syncing.`,
        meme: "Live cricket mood: every update changes the vibe.",
        tacticalNudge: `AI coach is analysing ${tA} vs ${tB}.`,
        story: `Live story is being generated for ${match.name || `${tA} vs ${tB}`}.`,
        sentiment: `Fans are following ${tA} vs ${tB} live.`,
        updatedAt: serverTimestamp()
      });
      await setDoc(doc(db, 'fan_polls', 'next-over-10-runs'), {
        question: "Who will control the next phase?",
        yesPercent: 50,
        noPercent: 50,
        gtCheer: 50,
        lsgCheer: 50,
        teamA: tA,
        teamB: tB,
        teamAPercent: 50,
        teamBPercent: 50,
        teamACheer: 50,
        teamBCheer: 50,
        updatedAt: serverTimestamp()
      });
      console.log("Firestore updated with selected live match");
      setApiSyncMessage("Selected live match synced successfully.");
      setTimeout(() => setApiSyncMessage(""), 4000);
    } catch (e) {
      console.error("Failed to sync match", e);
      setApiSyncMessage("Failed to sync selected match.");
    }
  };

  const parsePlayerObject = (val: string) => {
    if (!val) return { name: '', stat1: '', stat2: '' };
    const parts = val.split(' ');
    if (parts.length >= 3) {
      const stat2 = parts.pop() || '';
      const stat1 = parts.pop() || '';
      const name = parts.join(' ');
      return { name, stat1, stat2 };
    }
    return { name: val, stat1: '', stat2: '' };
  };

  const strikerInfo = parsePlayerObject(matchData.striker || 'R. Khan 24* (12)');
  const bowlerInfo = parsePlayerObject(matchData.bowler || 'M. Wood 2-28 (3.2)');
  const parsedScore = (matchData.score || '156/4').split('/');

  const matchDataWithFallback = matchData || {};
  const isDemo = matchDataWithFallback.source !== "cricket_api";
  const matchName = matchDataWithFallback.matchName || (isDemo ? "GT vs LSG" : "Live Match");
  const teamA = matchDataWithFallback.teamA || (isDemo ? "GT" : "Team A");
  const teamB = matchDataWithFallback.teamB || (isDemo ? "LSG" : "Team B");
  const venue = matchDataWithFallback.venue || (isDemo ? "Narendra Modi Stadium" : "Stadium");
  
  const getCurrentTeamA = () => teamA;
  const getCurrentTeamB = () => teamB;
  const getCurrentMatchName = () => matchName;
  const isDemoMode = () => isDemo;

  const status = matchDataWithFallback.status || "LIVE";
  const scoreStr = matchDataWithFallback.score || "156/4";
  const oversNum = matchDataWithFallback.overs ?? 17.2;

  const tAWinProb = isDemo ? (matchDataWithFallback.gtWinProbability ?? 62) : (matchDataWithFallback.teamAWinProbability ?? 50);
  const tBWinProb = isDemo ? (matchDataWithFallback.lsgWinProbability ?? 38) : (matchDataWithFallback.teamBWinProbability ?? 50);

  const striker = matchDataWithFallback.striker || "R. Khan 24* (12)";
  const bowler = matchDataWithFallback.bowler || "M. Wood 2-28 (3.2)";
  const requiredRunRate = matchDataWithFallback.requiredRunRate || "9.8";
  const lastBalls = matchDataWithFallback.lastBalls || ["1", "4", "W", "2", "6"];
  const momentumDesc = matchDataWithFallback.momentum || "Momentum shifting towards GT";
  const scoreLines = matchDataWithFallback.scoreLines || [];

  const handleAskMatchBites = async () => {
    if (!foodPrompt || isFoodLoading) return;
    setIsFoodLoading(true);
    setFoodResult(null);
    setSelectedDish(null);
    setCheckoutMessage("");
    
    try {
      const response = await fetch('/api/generate-food', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: foodPrompt, deliveryCity, matchData: matchDataWithFallback, matchStatus: status })
      });
      if (!response.ok) throw new Error("API not found or failed");
      const data = await response.json();
      
      let parsed = null;
      if (data.result) {
        try {
          parsed = JSON.parse(data.result.replace(/```json/g, '').replace(/```/g, '').trim());
          
          const vagueWords = ["spicy rolls", "snacks", "fast food", "combo", "food", "meal", "something", "dish", "quick bites", "party snack"];
          const fallbackDishes = [
            "Paneer Tikka Roll",
            "Peri Peri Fries",
            "Veg Cheese Burger",
            "Margherita Pizza",
            "Cheese Garlic Bread",
            "Cold Coffee",
            "Masala Dosa",
            "Veg Biryani",
            "Chole Bhature",
            "Aloo Tikki Burger"
          ];
          
          if (parsed && Array.isArray(parsed.items)) {
            parsed.items = parsed.items.map((item: any, i: number) => {
               const lowerName = (item.name || "").toLowerCase();
               const isVague = vagueWords.some(w => lowerName.includes(w));
               if (isVague) {
                 const newName = fallbackDishes[i % fallbackDishes.length];
                 return { ...item, name: newName, searchQuery: `${newName} in ${deliveryCity}` };
               }
               return item;
            });
          }
        } catch(e) {
          throw new Error("Failed to parse JSON");
        }
      } else {
        throw new Error("No result in response");
      }
      setFoodResult(parsed);
      saveSessionToFirestore(foodPrompt, parsed);
    } catch (e) {
      console.warn("Using mock MatchBites AI fallback...", e);
      const fallbackResult = {
        "mood": "Death-over hunger mode activated 🔥",
        "items": [
          {
            "name": "Spicy Paneer Roll",
            "priceEstimate": "₹179",
            "timeEstimate": "25 min",
            "whyItFits": "quick and filling for a tense chase",
            "searchQuery": `Spicy Paneer Roll in ${deliveryCity}`
          },
          {
            "name": "Masala Fries",
            "priceEstimate": "₹129",
            "timeEstimate": "18 min",
            "whyItFits": "perfect shareable match snack",
            "searchQuery": `Masala Fries in ${deliveryCity}`
          },
          {
            "name": "Cold Coffee",
            "priceEstimate": "₹99",
            "timeEstimate": "15 min",
            "whyItFits": "cools the pressure during death overs",
            "searchQuery": `Cold Coffee in ${deliveryCity}`
          }
        ],
        "comboLine": "Pressure match, spicy snacks, perfect combo."
      };
      
      // Artificial delay for UX
      await new Promise(resolve => setTimeout(resolve, 1500));
      setFoodResult(fallbackResult);
      saveSessionToFirestore(foodPrompt, fallbackResult);
    } finally {
      setIsFoodLoading(false);
    }
  };

  const saveSessionToFirestore = async (promptStr: string, resObj: any) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'food_sessions', 'latest'), {
         userPrompt: promptStr,
         result: resObj,
         cartItems: cart,
         cartTotal: cartTotal,
         updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn("Could not save food session to Firestore:", e);
    }
  };

  const handleLogin = async () => {
    setLoginError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      console.error("Login err: ", e);
      // Give a helpful error if it's an unauthorized domain or unconfigured provider
      if (e.code === 'auth/unauthorized-domain' || e.message?.includes('unauthorized')) {
        setLoginError(`Domain not authorized. Add exactly "${window.location.hostname}" to Firebase -> Authentication -> Settings -> Authorized Domains.`);
      } else if (e.code === 'auth/operation-not-allowed') {
        setLoginError("Google Sign-in is not enabled in Firebase Authentication console.");
      } else if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
        setLoginError("Login popup was closed before completing. Please try again.");
      } else {
        setLoginError(`Login failed (${e.code || 'Error'}). Add "${window.location.hostname}" to Authorized Domains in Firebase if 'invalid action' is shown in popup.`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout err: ", e);
    }
  };

  const handleGenerateFood = async (promptToUse = foodPrompt) => {
    setIsFoodLoading(true);
    setFoodResult("");
    
    try {
      const response = await fetch('/api/generate-food', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: promptToUse, 
          matchData: matchDataWithFallback,
          matchStatus: `Score: ${scoreStr}, Overs: ${oversNum}, Win Prob ${teamA}: ${tAWinProb}%, Status: ${status}`,
          deliveryCity: deliveryCity
        })
      });
      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      setFoodResult(data.result);
      
      try {
        await setDoc(doc(db, 'food_sessions', 'latest'), {
          userPrompt: promptToUse,
          result: data.result,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (e) { console.error("Food session save err", e); }
    } catch (error) {
      console.error("Food fallback triggered", error);
      const fallbackResult = `Mood: Death-over hunger mode activated 🔥\nItems:\n1. Spicy Paneer Roll — ₹179 — 25 min — quick and filling for a tense chase\n2. Masala Fries — ₹129 — 18 min — perfect shareable match snack\n3. Cold Coffee — ₹99 — 15 min — cools the pressure during death overs\nCombo line: Pressure match, spicy snacks, perfect combo.`;
      setFoodResult(fallbackResult);
    } finally {
      setIsFoodLoading(false);
      setFoodPrompt("");
    }
  };

  const addToCart = (item: {name: string, price: number}) => {
    setCart(prev => [...prev, item]);
    setToastMessage(`Added ${item.name} to cart`);
    setTimeout(() => setToastMessage(""), 3000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center">
          <Activity className="w-10 h-10 text-cyan-400 animate-pulse mb-4" />
          <p className="text-slate-300 text-lg font-bold tracking-widest uppercase">Preparing CricSense AI...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-cyan-500/30 flex items-center justify-center p-4">
        {/* Background glow for login */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] max-w-[600px] h-[600px] bg-blue-600/20 mix-blend-screen blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] max-w-[400px] h-[400px] bg-purple-600/20 mix-blend-screen blur-[120px] rounded-full pointer-events-none"></div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-md w-full relative z-10 shadow-2xl text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tighter font-display text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-2">
            CricSense AI
          </h1>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-8 block">AI-powered IPL live match companion</p>
          
          <h2 className="text-xl font-bold text-white mb-8">Sign in to enter the live match room</h2>

          {loginError && (
             <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg flex items-center justify-center gap-2 mb-6">
               <AlertTriangle className="w-4 h-4" />
               {loginError}
             </div>
          )}

          <button 
            onClick={handleLogin}
            className="w-full relative group overflow-hidden bg-[#030712]/50 border border-white/10 hover:border-cyan-400/50 rounded-xl p-4 flex items-center justify-center gap-3 transition-colors"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            <span className="font-bold text-slate-200 group-hover:text-white transition-colors relative z-10">Continue with Google</span>
          </button>

          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-6">Demo access for judges and fans</p>
          <div className="mt-8 text-xs text-slate-400 border border-white/5 bg-[#030712]/30 p-3 rounded-lg text-left">
            <p className="font-bold mb-1 text-cyan-400">Important Firebase Setup:</p>
            <p>If you see "The requested action is invalid" in the Google window, you must add <strong className="text-white select-all">{window.location.hostname}</strong> to <strong>Authorized Domains</strong> in your Firebase Console (Authentication &gt; Settings).</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-cyan-500/30">
      
      {/* 1. Premium Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#030712]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-1.5 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tighter font-display text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
            CricSense AI
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-400">
          <span className="text-slate-200">Match: <strong className="text-white">{matchName}</strong></span>
          <span>Venue: {venue}</span>
          {!isFirebaseConnected && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              <span className="font-bold tracking-widest text-[10px] uppercase">Using demo fallback data</span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span className="font-bold tracking-widest text-[10px] uppercase">Live</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="hidden sm:block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-white/10 hover:bg-white/5 transition-colors">
            Demo Mode
          </button>
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 pl-1 pr-3 py-1 rounded-full">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 p-[1px] overflow-hidden">
               {user?.photoURL ? (
                 <img src={user.photoURL} alt="User" className="w-full h-full object-cover rounded-full bg-[#030712]" />
               ) : (
                 <div className="w-full h-full rounded-full bg-[#030712] flex items-center justify-center">
                   <User className="w-4 h-4 text-slate-300" />
                 </div>
               )}
            </div>
            <span className="text-xs font-bold text-slate-200 hidden md:block">
              {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0]}
            </span>
            <button 
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 p-1 flex items-center justify-center transition-colors rounded-full hover:bg-white/5 ml-1"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-32 px-4 md:px-6 max-w-7xl mx-auto space-y-6">
        
        {/* 2. Cinematic Hero Scoreboard */}
        <section className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          {/* Background Glows */}
          <div className="absolute inset-0 bg-[#070b19]"></div>
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[150%] bg-blue-600/20 mix-blend-screen blur-[120px] rounded-full point-events-none"></div>
          <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[150%] bg-purple-600/20 mix-blend-screen blur-[120px] rounded-full point-events-none"></div>
          
          <div className="relative z-10 p-8 md:p-12 flex flex-col items-center text-center">
            <div className="flex items-center gap-3 mb-6 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full">
               <Target className="w-4 h-4 text-cyan-400" />
               <span className="text-sm font-medium text-cyan-100">{status}</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black font-display tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              {scoreStr}
            </h1>
            <p className="text-xl md:text-2xl text-cyan-400 font-medium mt-2 mb-4 tracking-widest uppercase">
              Overs {oversNum}
            </p>

            {scoreLines.length > 0 && (
              <div className="flex flex-col items-center gap-1 mb-6">
                {scoreLines.map((line: string, i: number) => (
                  <span key={i} className="text-sm font-mono text-slate-400 bg-white/5 px-3 py-1 rounded-full">{line}</span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-12 w-full max-w-3xl border-t border-white/10 pt-8 mt-2">
              <div className="flex flex-col items-center md:items-end">
                <span className="text-xs uppercase tracking-widest text-slate-500 mb-1">Striker</span>
                <span className="text-2xl font-bold truncate max-w-[150px] md:max-w-xs">{strikerInfo.name} <span className="text-cyan-400">{strikerInfo.stat1}</span> <span className="text-sm text-slate-400">{strikerInfo.stat2}</span></span>
              </div>
              <div className="hidden md:flex flex-col items-center border-x border-white/10 px-6">
                 <span className="text-xs uppercase tracking-widest text-slate-500 mb-1">Last 5 Balls</span>
                 <div className="flex gap-2">
                   {lastBalls.map((ball: string, i: number) => (
                     <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                       ball === 'W' ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 
                       ball === '4' || ball === '6' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 
                       'bg-white/5 border border-white/10 text-slate-300'
                     }`}>
                       {ball}
                     </div>
                   ))}
                 </div>
              </div>
              <div className="flex flex-col items-center md:items-start">
                <span className="text-xs uppercase tracking-widest text-slate-500 mb-1">Bowler</span>
                <span className="text-2xl font-bold truncate max-w-[150px] md:max-w-xs">{bowlerInfo.name} <span className="text-purple-400">{bowlerInfo.stat1}</span> <span className="text-sm text-slate-400">{bowlerInfo.stat2}</span></span>
              </div>
            </div>
            
            <div className="mt-6 md:hidden w-full max-w-sm">
                <span className="text-xs uppercase tracking-widest text-slate-500 mb-2 block text-center">Last 5 Balls</span>
                 <div className="flex justify-center gap-2">
                   {lastBalls.map((ball: string, i: number) => (
                     <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                       ball === 'W' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                       ball === '4' || ball === '6' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 
                       'bg-white/5 border border-white/10'
                     }`}>
                       {ball}
                     </div>
                   ))}
                 </div>
            </div>

            <div className="absolute top-6 right-6 text-right hidden lg:block">
              <span className="text-xs uppercase tracking-widest text-slate-500 block mb-1">Req Run Rate</span>
              <span className="text-3xl font-display font-bold text-orange-400">{requiredRunRate}</span>
            </div>
          </div>
        </section>

        {/* 3. Live Win Probability */}
        <section className={`bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl p-6 transition-all duration-300 ${pulseAnimation ? 'scale-[1.01] shadow-[0_0_30px_rgba(6,182,212,0.2)]' : 'shadow-xl'}`}>
          <div className="flex justify-between items-end mb-4">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-display font-black tracking-tighter text-cyan-400">{tAWinProb}%</span>
              <span className="text-lg font-bold text-slate-300 truncate max-w-[80px]">{teamA}</span>
            </div>
            <div className="text-center truncate px-2">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-1">Live Win Probability</span>
              <span className="text-xs text-slate-400">Updated after every ball</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-lg font-bold text-slate-300 truncate max-w-[80px] text-right">{teamB}</span>
              <span className="text-4xl font-display font-black tracking-tighter text-orange-500">{tBWinProb}%</span>
            </div>
          </div>
          <div className="h-4 w-full bg-[#0f172a] rounded-full overflow-hidden flex shadow-inner relative">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] relative" 
              style={{ width: `${tAWinProb}%` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/30 blur-[2px]"></div>
            </div>
            <div 
              className="h-full bg-gradient-to-l from-red-600 to-orange-400 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]" 
              style={{ width: `${tBWinProb}%` }}
            ></div>
          </div>
        </section>

        {/* CSS Grid for Bento Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (Span 8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 4. Next Over Prediction & Tactical Nudge (Split Row) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Prediction Card */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px]"></div>
                <div className="flex justify-between items-start mb-6">
                   <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                     <Cpu className="w-4 h-4 text-cyan-400" /> Next Over Prediction
                   </h3>
                   <span className="bg-cyan-500/10 text-cyan-400 text-[10px] px-2 py-0.5 rounded uppercase font-bold border border-cyan-500/20">82% Conf.</span>
                </div>
                
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-5xl font-display font-black">9-13</span>
                  <span className="text-slate-400 font-medium">Runs</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-slate-400">Boundary Chance</span><span className="text-white">41%</span></div>
                    <div className="w-full bg-[#0f172a] rounded-full h-1.5"><div className="bg-cyan-400 h-1.5 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{width: '41%'}}></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-slate-400">Wicket Prob</span><span className="text-white">28%</span></div>
                    <div className="w-full bg-[#0f172a] rounded-full h-1.5"><div className="bg-purple-400 h-1.5 rounded-full" style={{width: '28%'}}></div></div>
                  </div>
                </div>
              </div>

              {/* Tactical Nudge Card */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 relative overflow-hidden hover:border-purple-500/30 transition-colors">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px]"></div>
                 <div className="flex justify-between items-start mb-4">
                   <h3 className="text-xs uppercase tracking-widest text-purple-400 font-bold flex items-center gap-2">
                     <Sparkles className="w-4 h-4" /> AI Coach Suggestion
                   </h3>
                   <button onClick={generateTactics} disabled={isGeneratingTactics} className={`text-[10px] uppercase font-bold tracking-wider text-purple-400 hover:text-purple-300 transition-colors bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20 ${isGeneratingTactics ? 'opacity-50 cursor-not-allowed' : ''}`}>
                     Refresh
                   </button>
                 </div>
                 <p className="text-xl font-medium text-white mb-4 leading-snug">
                   "{aiData.tacticalNudge}"
                 </p>
                 <div className="bg-[#030712]/50 border border-white/5 p-4 rounded-xl">
                   <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-1">Reasoning</span>
                   <p className="text-sm text-slate-300">Live match context is being analysed from current score and status. AI determines optimal counter-strategies dynamically.</p>
                 </div>
              </div>

            </div>

             {/* 5. Momentum Shift Alert Full Width */}
             <div className="relative bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-64 bg-amber-500/10 blur-[50px]"></div>
                <div className="flex items-start gap-4 relative z-10">
                  <div className="mt-1 bg-amber-500/20 p-2 rounded-lg border border-amber-500/30">
                    <AlertTriangle className="w-6 h-6 text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold block mb-1">AI Turning Point Alert</span>
                    <h3 className="text-xl font-bold text-white mb-1">{momentumDesc}</h3>
                    <p className="text-slate-400 text-sm">Every boundary or wicket shifts the momentum. AI calculates real-time dynamic changes based on current stats.</p>
                  </div>
                </div>
             </div>

             {/* 7. AI Commentary / Meme Card */}
             <div className="bg-gradient-to-br from-[#1e1430] to-[#0A1A2F] border border-purple-500/20 rounded-2xl p-6 relative">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs uppercase tracking-widest text-purple-300 font-bold flex items-center gap-2">
                       <MessageSquare className="w-4 h-4" /> AI Story Cast
                    </h3>
                    <button onClick={generateMeme} disabled={isGeneratingMeme} className={`text-[10px] uppercase font-bold tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 ${isGeneratingMeme ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      Generate Meme
                    </button>
                 </div>
                 <div className="space-y-4">
                   <div className="bg-[#030712]/40 rounded-xl p-5 border border-white/5">
                      <p className="text-2xl font-black italic tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                        "{aiData.commentary}"
                      </p>
                   </div>
                   <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><Flame className="w-4 h-4 text-orange-500"/> {aiData.meme}</span>
                   </div>
                 </div>
             </div>
          </div>

          {/* Right Column (Span 4) */}
          <div className="lg:col-span-4 space-y-6">
             
             {/* 8. Fan Pulse Section */}
             <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2 mb-6">
                   <Activity className="w-4 h-4 text-orange-400" /> Fan Pulse
                </h3>
                
                <div className="mb-8">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-bold text-white">Live Poll: {pollData.question || "Next over 10+ runs?"}</span>
                  </div>
                  <div className="flex h-3 w-full rounded-full overflow-hidden bg-[#0f172a]">
                    <div className="bg-cyan-500" style={{ width: `${pollData.teamAPercent ?? pollData.yesPercent ?? 50}%` }}></div>
                    <div className="bg-slate-600" style={{ width: `${pollData.teamBPercent ?? pollData.noPercent ?? 50}%` }}></div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs font-bold">
                    <span className="text-cyan-400">{pollData.teamA || "Yes"} {pollData.teamAPercent ?? pollData.yesPercent ?? 50}%</span>
                    <span className="text-slate-400">{pollData.teamB || "No"} {pollData.teamBPercent ?? pollData.noPercent ?? 50}%</span>
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-[#030712]/50 rounded-xl border border-white/5">
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-2">Cheer Meter</span>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-white truncate max-w-[100px]">{pollData.teamA || "GT"} Fans</span><span className="text-cyan-400">{pollData.teamACheer ?? pollData.gtCheer ?? 50}%</span></div>
                    <div className="w-full bg-[#0f172a] rounded-full h-1.5"><div className="bg-gradient-to-r from-blue-600 to-cyan-400 h-1.5 rounded-full" style={{width: `${pollData.teamACheer ?? pollData.gtCheer ?? 50}%`}}></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-white truncate max-w-[100px]">{pollData.teamB || "LSG"} Fans</span><span className="text-orange-400">{pollData.teamBCheer ?? pollData.lsgCheer ?? 50}%</span></div>
                    <div className="w-full bg-[#0f172a] rounded-full h-1.5"><div className="bg-gradient-to-r from-red-600 to-orange-400 h-1.5 rounded-full" style={{width: `${pollData.teamBCheer ?? pollData.lsgCheer ?? 50}%`}}></div></div>
                  </div>
                </div>
                
                <div className="mt-4 flex flex-col gap-2">
                  <button onClick={generateSentiment} disabled={isGeneratingSentiment} className={`text-[10px] uppercase font-bold tracking-wider text-orange-400 hover:text-orange-300 transition-colors bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20 self-start ${isGeneratingSentiment ? 'opacity-50 cursor-not-allowed' : ''}`}>
                     Refresh
                  </button>
                  <div className="text-center text-sm font-medium text-slate-400 bg-white/5 py-2 rounded-lg">
                    Sentiment: {aiData.sentiment}
                  </div>
                </div>
             </div>

             {/* 9. Match Story Timeline */}
             <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2 mb-6">
                   <TrendingUp className="w-4 h-4 text-green-400" /> Match Story Phase
                </h3>
                
                <div className="relative border-l-2 border-white/10 ml-3 space-y-8 pb-4">
                  {isDemo ? (
                    <>
                      <div className="relative pl-6">
                        <div className="absolute w-3 h-3 bg-slate-600 rounded-full -left-[7px] top-1.5 ring-4 ring-[#030712]"></div>
                        <h4 className="text-sm font-bold text-slate-300">Powerplay (1-6)</h4>
                        <p className="text-xs text-slate-500 mt-1">LSG started exceptionally strong with boundaries.</p>
                      </div>
                      
                      <div className="relative pl-6">
                        <div className="absolute w-3 h-3 bg-purple-500 rounded-full -left-[7px] top-1.5 ring-4 ring-[#030712]"></div>
                        <h4 className="text-sm font-bold text-white">Middle Overs (7-15)</h4>
                        <p className="text-xs text-slate-400 mt-1">GT pulled it back with tight spin spells.</p>
                      </div>
    
                      <div className="relative pl-6">
                        <div className="absolute w-3 h-3 bg-cyan-400 rounded-full -left-[7px] top-1.5 ring-4 ring-[#030712] shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse"></div>
                        <h4 className="text-sm font-bold text-cyan-400">Death Overs (16-20)</h4>
                        <p className="text-xs text-cyan-100/70 mt-1">Momentum alert triggered. High tension.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative pl-6">
                        <div className="absolute w-3 h-3 bg-slate-600 rounded-full -left-[7px] top-1.5 ring-4 ring-[#030712]"></div>
                        <h4 className="text-sm font-bold text-slate-300">Phase 1</h4>
                        <p className="text-xs text-slate-500 mt-1">Live match synced from cricket API</p>
                      </div>
                      
                      <div className="relative pl-6">
                        <div className="absolute w-3 h-3 bg-purple-500 rounded-full -left-[7px] top-1.5 ring-4 ring-[#030712]"></div>
                        <h4 className="text-sm font-bold text-white">Phase 2</h4>
                        <p className="text-xs text-slate-400 mt-1">Match status: {status}</p>
                      </div>
    
                      <div className="relative pl-6">
                        <div className="absolute w-3 h-3 bg-cyan-400 rounded-full -left-[7px] top-1.5 ring-4 ring-[#030712] shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse"></div>
                        <h4 className="text-sm font-bold text-cyan-400">Phase 3</h4>
                        <p className="text-xs text-cyan-100/70 mt-1">AI insight: Momentum analysis ready for {getCurrentTeamA()} vs {getCurrentTeamB()}</p>
                      </div>
                    </>
                  )}
                </div>
             </div>

          </div>
        </div>

        {/* 10. Demo Control Panel (Bottom Fixed or Standard block) */}
        <div className="mt-12 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
           <div className="flex flex-col md:flex-row justify-between items-center mb-6">
             <div className="flex items-center gap-2 mb-4 md:mb-0">
               <Settings className="w-5 h-5 text-slate-400" />
               <h2 className="text-lg font-bold font-display text-white">Demo Control Engine</h2>
             </div>
             <span className="text-xs px-3 py-1 rounded bg-white/10 text-slate-300 font-bold tracking-widest uppercase">
               Simulation Mode Active
             </span>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Controls for IPL Demo vs Real Live Match */}
               <div className="bg-[#030712]/50 border border-white/5 rounded-xl p-4 flex flex-col justify-center">
                 <div className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-2">Match Mode</div>
                 <div className="flex gap-2 mb-3">
                   <button 
                     onClick={resetToDemo}
                     className="flex-1 bg-cyan-700/20 hover:bg-cyan-700/40 border border-cyan-500/30 text-cyan-400 text-xs py-2 rounded-lg font-bold transition-colors"
                   >
                     Use IPL Demo
                   </button>
                   <button 
                     onClick={fetchLiveMatches}
                     disabled={isFetchingMatches}
                     className={`flex-1 bg-green-700/20 hover:bg-green-700/40 border border-green-500/30 text-green-400 text-xs py-2 rounded-lg font-bold transition-colors ${isFetchingMatches ? 'opacity-50 cursor-not-allowed' : ''}`}
                   >
                     {isFetchingMatches ? 'Fetching...' : 'Fetch Live Matches'}
                   </button>
                 </div>
                 
                 {availableLiveMatches.length > 0 && (
                   <div className="flex flex-col gap-2">
                     <select 
                       className="flex-1 bg-[#030712]/80 border border-white/10 text-slate-300 text-xs rounded-lg px-2 py-2 w-full focus:outline-none focus:border-cyan-500/50"
                       value={selectedApiMatchId}
                       onChange={(e) => setSelectedApiMatchId(e.target.value)}
                     >
                       {availableLiveMatches.map(m => (
                         <option key={m.id} value={m.id}>{m.name} — {m.status}</option>
                       ))}
                     </select>
                     <button
                       onClick={syncSelectedLiveMatch}
                       className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-2 justify-center rounded-lg border border-white/10 transition-colors w-full uppercase tracking-widest font-bold mt-1"
                     >
                       Sync Selected Live Match
                     </button>
                   </div>
                 )}
                 {apiSyncMessage && (
                   <div className={`mt-2 text-[10px] font-bold ${apiSyncMessage.includes('error') || apiSyncMessage.includes('Could not') || apiSyncMessage.includes('No live matches') || apiSyncMessage.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
                     {apiSyncMessage}
                   </div>
                 )}
               </div>

             <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
               <button 
                  onClick={simulateBoundary}
                  className="group relative flex flex-col items-center justify-center p-4 rounded-xl bg-[#030712]/50 border border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all overflow-hidden"
               >
                 <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/0 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <span className="text-xl font-black font-display text-white group-hover:text-cyan-400 transition-colors">+4 / +6</span>
               </button>
  
               <button 
                  onClick={simulateWicket}
                  className="group relative flex flex-col items-center justify-center p-4 rounded-xl bg-[#030712]/50 border border-white/5 hover:border-red-500/50 hover:bg-red-500/5 transition-all overflow-hidden"
               >
                 <div className="absolute inset-0 bg-gradient-to-b from-red-500/0 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <span className="text-xl font-black font-display text-white group-hover:text-red-400 transition-colors">OUT</span>
               </button>
  
               <button 
                  onClick={updateWinProbability}
                  className="group relative flex flex-col items-center justify-center p-4 rounded-xl bg-[#030712]/50 border border-white/5 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all overflow-hidden"
               >
                 <div className="absolute inset-0 bg-gradient-to-b from-purple-500/0 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <BarChart2 className="w-6 h-6 text-white group-hover:text-purple-400 transition-colors" />
               </button>
  
               <button 
                  onClick={generateAIStory}
                  disabled={isGeneratingStory}
                  className={`group relative flex flex-col items-center justify-center p-4 rounded-xl bg-[#030712]/50 border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all overflow-hidden ${isGeneratingStory ? 'opacity-50 cursor-not-allowed' : ''}`}
               >
                 <div className="absolute inset-0 bg-gradient-to-b from-blue-500/0 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <MessageSquare className="w-6 h-6 text-white group-hover:text-blue-400 transition-colors" />
               </button>
             </div>
           </div>
        </div>

      </main>

      {/* MatchBites Floating Button */}
      {user && (
        <button 
          ref={iconRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          aria-label="Open MatchBites AI food assistant"
          style={{ 
            left: `${iconPosition.x}px`, 
            top: `${iconPosition.y}px`, 
            transform: 'translate(0, 0)',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none'
          }}
          className={`fixed z-[55] group flex items-center justify-center p-4 rounded-full bg-gradient-to-br from-red-500 to-orange-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] ${isDragging ? '' : 'transition-[background,shadow,transform]'} select-none`}
        >
          <div className="absolute inset-0 rounded-full animate-pulse bg-red-500/50 blur-md -z-10"></div>
          <UtensilsCrossed className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
          
          <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-black/80 border border-white/10 text-white text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden md:block">
            MatchBites AI
          </div>
        </button>
      )}

      {/* MatchBites Drawer */}
      <div className={`fixed inset-0 z-[60] transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
        
        <div className={`absolute top-0 right-0 w-full max-w-md h-full bg-[#030712]/95 border-l border-white/10 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          
          {/* Drawer Header */}
          <div className="p-6 border-b border-white/5 relative overflow-hidden shrink-0">
            <div className="absolute right-0 top-0 w-32 h-32 bg-orange-500/10 blur-[40px] rounded-full pointer-events-none"></div>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">MatchBites AI</h2>
                  <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">MCP-inspired demo flow</span>
                </div>
                <p className="text-sm text-slate-400">Order-worthy snacks for this {matchName} thriller</p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6 flex flex-col">
            
            {/* Input Section */}
            <div className="space-y-3 shrink-0">
              <div className="mb-4">
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Delivery city</label>
                <input 
                  type="text" 
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                  placeholder="Enter city, example: Ahmedabad, Mumbai, Delhi, Bengaluru"
                  className="w-full bg-[#030712]/50 border border-white/5 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500/30 transition-colors text-white placeholder-slate-600"
                />
              </div>

              <div className="relative">
                <input 
                  type="text" 
                  value={foodPrompt}
                  onChange={(e) => setFoodPrompt(e.target.value)}
                  placeholder="I'm hungry, suggest something spicy under ₹300..."
                  className="w-full bg-[#030712]/50 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors text-white placeholder-slate-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAskMatchBites(); }}
                />
                <button 
                  onClick={handleAskMatchBites}
                  disabled={isFoodLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-orange-500 hover:bg-orange-400 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {["Spicy under ₹300", "Snacks for 4 friends", "Quick delivery before next over", "Sweet + cold drink", "High-energy match combo"].map((chip, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setFoodPrompt(chip)}
                    className="text-[10px] px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-slate-300 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Result Area */}
            {isFoodLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-50">
                 <div className="w-8 h-8 relative">
                   <div className="absolute inset-0 border-2 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                 </div>
                 <p className="text-xs text-orange-400 uppercase tracking-widest font-bold animate-pulse">Curating specific match snacks...</p>
              </div>
            ) : foodResult ? (
              <div className="space-y-6">
                 {/* Raw AI result (Fallback layout) */}
                 <div className="bg-gradient-to-br from-orange-500/10 to-red-500/5 border border-orange-500/20 rounded-xl p-4 text-slate-300">
                    <p className="font-medium text-sm text-white mb-2">{foodResult.mood}</p>
                    {foodResult.comboLine && <p className="text-xs text-orange-400 italic">{foodResult.comboLine}</p>}
                 </div>
                 
                 {/* Mock UI Cards representing the MCP items output */}
                 <div className="space-y-3">
                    <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Recommended Items (Mock Integration)</h3>
                    
                    {(foodResult.items || []).map((item: any, i: number) => (
                      <div key={i} className={`bg-white/[0.02] border transition-colors rounded-xl p-3 ${selectedDish?.name === item.name ? 'border-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'border-white/5 hover:border-white/10'}`}>
                         <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center border border-orange-500/30 shrink-0">
                               <UtensilsCrossed className="w-5 h-5 text-orange-400" />
                            </div>
                            <div className="flex-1">
                               <div className="font-bold text-white text-sm">{item.name}</div>
                               <div className="text-xs text-slate-500 flex items-center gap-2">
                                 <span className="text-orange-400 font-medium">{item.priceEstimate}</span>
                                 <span>•</span>
                                 <span>{item.timeEstimate}</span>
                               </div>
                            </div>
                         </div>
                         <p className="text-xs text-slate-400 mb-3 line-clamp-2">{item.whyItFits}</p>
                         <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                            <button 
                              onClick={() => {
                                setSelectedDish(item);
                                setToastMessage(`Selected for Zomato: ${item.name}`);
                                setTimeout(() => setToastMessage(""), 2500);
                              }}
                              className="text-xs border border-white/10 hover:bg-white/5 text-white px-2 py-1.5 rounded transition-colors font-medium text-center"
                            >
                              Select Dish
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedDish(item);
                                const priceNum = parseInt((item.priceEstimate || "0").replace(/[^0-9]/g, '')) || 0;
                                setCart(prev => [...prev, {name: item.name, price: priceNum}]);
                                setToastMessage("Added to demo cart and selected for Zomato.");
                                setTimeout(() => setToastMessage(""), 3000);
                              }}
                              className="text-xs border border-white/10 hover:bg-white/5 text-white px-2 py-1.5 rounded transition-colors font-medium text-center"
                            >
                              Add to Demo Cart
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedDish(item);
                                setToastMessage(`Opening Zomato search for: ${item.name}`);
                                setTimeout(() => setToastMessage(""), 3000);
                                openZomatoForDish(item);
                              }}
                              className="col-span-2 lg:col-span-1 text-xs bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 px-2 py-1.5 rounded transition-colors font-medium text-center"
                            >
                              Search this dish on Zomato
                            </button>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center px-6">
                 <UtensilsCrossed className="w-12 h-12 text-slate-500 mb-4" />
                 <p className="text-sm font-medium">Ask MatchBites AI for snack recommendations based on the current match pressure.</p>
              </div>
            )}
          </div>

          {/* Drawer Footer / Cart Area */}
          <div className="p-6 border-t border-white/5 bg-[#030712] relative shrink-0">
             
             {toastMessage && (
               <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-green-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap z-50">
                 <CheckCircle2 className="w-3 h-3" />
                 {toastMessage}
               </div>
             )}

             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2 text-white font-bold">
                 <ShoppingCart className="w-5 h-5 text-slate-400" />
                 <span>Demo Cart ({cart.length})</span>
               </div>
               <span className="text-xl font-display font-black text-orange-400">₹{cartTotal}</span>
             </div>

             {checkoutMessage ? (
               <div className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs p-3 rounded-lg text-center font-medium leading-relaxed mb-4">
                 {checkoutMessage}
               </div>
             ) : (
               <div className="grid grid-cols-2 gap-3 mb-4">
                 <button 
                    onClick={() => {
                      if (cart.length === 0) {
                        setToastMessage("Cart is empty");
                        setTimeout(() => setToastMessage(""), 2000);
                        return;
                      }
                      setCheckoutMessage("This is a hackathon mock checkout. In production, this can connect to a food delivery MCP for restaurant discovery, cart creation, and checkout.");
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                 >
                   Checkout Demo
                 </button>
                 <button 
                    onClick={() => {
                      if (selectedDish) {
                        setToastMessage(`Opening Zomato search for: ${selectedDish.name} in ${deliveryCity}`);
                        setTimeout(() => setToastMessage(""), 4000);
                        openZomatoForDish(selectedDish);
                      } else {
                        const fallbackDish = (foodResult?.items?.[0]) || { name: "Paneer Tikka Roll" };
                        setToastMessage("Opening Zomato with a popular match snack search.");
                        setTimeout(() => setToastMessage(""), 3000);
                        openZomatoForDish(fallbackDish);
                      }
                    }}
                    className="bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex flex-col items-center justify-center font-display text-center leading-tight"
                 >
                   Continue on Zomato
                 </button>
               </div>
             )}

             <div className="pt-4 border-t border-white/5">
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3">
                  <span className="font-bold uppercase tracking-widest text-orange-400 text-[10px] block mb-1">Zomato Partner Mode</span>
                  <div className="text-xs text-slate-300 space-y-1">
                    <p><span className="text-slate-500">Status:</span> Redirect demo active</p>
                    <p className="truncate"><span className="text-slate-500">Selected dish:</span> {selectedDish ? selectedDish.name : "None"}</p>
                    <p><span className="text-slate-500">Real MCP checkout:</span> Future scope with official approval</p>
                    <p><span className="text-slate-500">Safety:</span> User completes order inside Zomato</p>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 leading-snug">Exact availability depends on Zomato results in your city. CricSense AI sends the selected dish as a search intent; ordering is completed safely inside Zomato.</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

