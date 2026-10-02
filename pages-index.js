// pages/index.js  — Mobile-first PWA for Android Chrome
// Bottom tab nav, large touch targets, WalletConnect for Coinbase Wallet

import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useWalletConnect } from "../hooks/useWalletConnect";
import { usePrices }        from "../hooks/usePrices";
import { useBalances }      from "../hooks/useBalances";

const C = {
  bg:"#080C14", surface:"#0F1622", surfaceHi:"#162030",
  border:"#1A2540", teal:"#00C9A7", tealDim:"#00C9A718",
  blue:"#4F8EF7", amber:"#F5A623", green:"#22C55E", red:"#EF4444",
  txt:"#DDE6F0", txtSub:"#6B83A0", txtMute:"#2E4060",
};

const CHAINS = {
  ethereum:{ name:"Ethereum",  color:"#627EEA", dex:"Uniswap v3", icon:"⟠" },
  solana:  { name:"Solana",    color:"#9945FF", dex:"Jupiter",    icon:"◎" },
  bnb:     { name:"BNB Chain", color:"#F0B90B", dex:"PancakeSwap",icon:"⬡" },
};

const fmt  = (n,d=2) => Number(n).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtU = (n) => "$"+fmt(n);
const totalVal = (p) => p.reduce((s,c)=>s+c.qty*c.price,0);
const sleep = (ms) => new Promise(r=>setTimeout(r,ms));

// ── Connect screen ────────────────────────────────────────────
function ConnectScreen({ wc }) {
  const { connect, loading, error, uri, getCoinbaseDeepLink } = wc;
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,gap:24}}>
      <div style={{width:80,height:80,borderRadius:"50%",background:"radial-gradient(circle at 35% 35%,#00C9A744,#080C14)",border:"2px solid #00C9A7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,fontWeight:900,color:C.teal,boxShadow:"0 0 32px #00C9A744"}}>N</div>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:26,fontWeight:800,color:C.txt,letterSpacing:"-0.5px"}}>NexBroker</div>
        <div style={{fontSize:14,color:C.txtSub,marginTop:6}}>AI-powered DEX trading · Multi-chain</div>
      </div>
      {!uri ? (
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12}}>
          <button onClick={connect} disabled={loading} style={{width:"100%",padding:"17px",borderRadius:14,background:C.teal,border:"none",color:C.bg,fontWeight:800,fontSize:16,cursor:"pointer",opacity:loading?0.6:1}}>
            {loading?"Connecting…":"Connect Coinbase Wallet"}
          </button>
          <div style={{textAlign:"center",fontSize:12,color:C.txtMute}}>Also works with MetaMask Mobile and any WalletConnect wallet</div>
        </div>
      ) : (
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:14,alignItems:"center"}}>
          <div style={{fontSize:13,color:C.txtSub,textAlign:"center"}}>Tap below to open your wallet app</div>
          <a href={getCoinbaseDeepLink()} style={{display:"block",width:"100%",padding:"17px",borderRadius:14,background:"#1652F0",color:"#fff",fontWeight:800,fontSize:16,textAlign:"center",textDecoration:"none"}}>
            Open in Coinbase Wallet
          </a>
          <button onClick={()=>navigator.clipboard?.writeText(uri)} style={{padding:"11px 20px",borderRadius:10,background:C.surfaceHi,border:`1px solid ${C.border}`,color:C.txtSub,fontSize:13,cursor:"pointer"}}>
            Copy Connection Code
          </button>
          <div style={{fontSize:11,color:C.txtMute,textAlign:"center"}}>If the button doesn't open your wallet, copy the code and paste it in your wallet's WalletConnect scanner.</div>
        </div>
      )}
      {error && <div style={{padding:"12px 16px",background:C.red+"22",border:`1px solid ${C.red}44`,borderRadius:10,fontSize:13,color:C.red,textAlign:"center",width:"100%"}}>{error}</div>}
      <div style={{fontSize:11,color:C.txtMute,textAlign:"center",lineHeight:1.7}}>Your private keys never leave your wallet app.{"\n"}NexBroker only executes trades you approve.</div>
    </div>
  );
}

// ── Portfolio tab ─────────────────────────────────────────────
function PortfolioTab({ portfolio, loading, error, refetch, lastFetched, onSwap }) {
  const total     = totalVal(portfolio);
  const dayChange = portfolio.reduce((s,c)=>s+c.qty*c.price*(c.change||0)/100,0);

  if (loading) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,color:C.txtSub}}>
      <div style={{fontSize:32}}>⏳</div>
      <div style={{fontSize:14,fontWeight:600}}>Reading wallet balances…</div>
    </div>
  );

  if (error) return (
    <div style={{padding:20}}>
      <div style={{padding:16,background:C.red+"11",border:`1px solid ${C.red}33`,borderRadius:12,color:C.red,fontSize:13}}>
        <strong>Balance error:</strong> {error}
        <button onClick={refetch} style={{display:"block",marginTop:10,padding:"8px 16px",borderRadius:8,border:`1px solid ${C.red}`,background:"transparent",color:C.red,fontSize:12,cursor:"pointer"}}>Retry</button>
      </div>
    </div>
  );

  if (portfolio.length===0) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,color:C.txtSub,padding:32,textAlign:"center"}}>
      <div style={{fontSize:40}}>💸</div>
      <div style={{fontSize:15,fontWeight:700,color:C.txt}}>No tokens found</div>
      <div style={{fontSize:13}}>Transfer crypto from Coinbase into Coinbase Wallet to get started.</div>
    </div>
  );

  return (
    <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
      <div style={{margin:"16px 16px 0",padding:20,background:C.surface,borderRadius:16,border:`1px solid ${C.border}`}}>
        <div style={{fontSize:11,color:C.txtMute,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Total Portfolio</div>
        <div style={{fontSize:34,fontWeight:900,letterSpacing:"-1px",fontVariantNumeric:"tabular-nums"}}>{fmtU(total)}</div>
        <div style={{marginTop:6,fontSize:15,fontWeight:600,color:dayChange>=0?C.green:C.red}}>
          {dayChange>=0?"▲":"▼"} {fmtU(Math.abs(dayChange))} ({((dayChange/total)*100).toFixed(2)}%) today
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
          <div style={{fontSize:10,color:C.txtMute}}>{lastFetched?`Updated ${lastFetched.toLocaleTimeString()}`:""}</div>
          <button onClick={refetch} style={{fontSize:12,color:C.teal,background:"transparent",border:"none",cursor:"pointer"}}>↻ Refresh</button>
        </div>
      </div>

      <div style={{margin:"12px 16px 0",background:C.surface,borderRadius:16,border:`1px solid ${C.border}`,overflow:"hidden"}}>
        {portfolio.map((coin,i)=>{
          const ch = CHAINS[coin.chain];
          return (
            <div key={coin.symbol} style={{padding:"14px 16px",borderBottom:i<portfolio.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:coin.color+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontSize:15,fontWeight:900,color:coin.color}}>{coin.symbol[0]}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:700}}>{coin.symbol}</div>
                      <div style={{fontSize:11,color:ch?.color}}>{ch?.icon} {ch?.name}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:15,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{fmtU(coin.qty*coin.price)}</div>
                      <div style={{fontSize:11,color:coin.change>=0?C.green:C.red}}>{coin.change>=0?"+":""}{fmt(coin.change)}%</div>
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
                    <div style={{fontSize:11,color:C.txtSub}}>{fmt(coin.qty,4)} @ {fmtU(coin.price)}</div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>onSwap({action:"BUY",coin})} style={{padding:"6px 14px",borderRadius:8,border:"none",background:C.green+"22",color:C.green,fontSize:13,fontWeight:700,cursor:"pointer"}}>Buy</button>
                      <button onClick={()=>onSwap({action:"SELL",coin})} style={{padding:"6px 14px",borderRadius:8,border:"none",background:C.red+"22",color:C.red,fontSize:13,fontWeight:700,cursor:"pointer"}}>Sell</button>
                    </div>
                  </div>
                  <div style={{height:3,background:C.bg,borderRadius:2,marginTop:8}}>
                    <div style={{height:"100%",width:`${Math.min(coin.currentAlloc||0,100)}%`,background:coin.color,borderRadius:2}}/>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── AI Advisor tab ────────────────────────────────────────────
function AdvisorTab({ portfolio, wallet, onProposals }) {
  const [msgs,setMsgs]         = useState([{role:"assistant",content:"Connected! I can analyze your real wallet holdings and propose DEX swaps for your approval. Tap Analyze Portfolio or ask me anything."}]);
  const [input,setInput]       = useState("");
  const [thinking,setThinking] = useState(false);
  const endRef = useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  const callAdvisor = async (userMsg, mode="chat") => {
    const content = mode==="analyze"?"Analyze my portfolio and propose rebalancing swaps.":userMsg;
    if (!content.trim()) return;
    const history=[...msgs,{role:"user",content}];
    setMsgs(history); setInput(""); setThinking(true);
    try {
      const res = await fetch("/api/advisor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:history,portfolio,wallet:wallet?.address,mode})});
      const data = await res.json();
      if (mode==="analyze") {
        const props=data.proposals||[];
        onProposals(props);
        setMsgs(m=>[...m,{role:"assistant",content:props.length>0?`Proposed ${props.length} swap${props.length!==1?"s":""}. Check the Proposals tab to review each one before anything executes.`:"Your allocation looks balanced — no urgent rebalancing needed right now."}]);
      } else {
        setMsgs(m=>[...m,{role:"assistant",content:data.reply||"No response."}]);
      }
    } catch {
      setMsgs(m=>[...m,{role:"assistant",content:"Couldn't reach the advisor API. Check your connection."}]);
    } finally { setThinking(false); }
  };

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <button onClick={()=>callAdvisor("","analyze")} disabled={thinking||portfolio.length===0}
          style={{width:"100%",padding:"13px",borderRadius:12,border:`1px solid ${C.teal}`,background:C.tealDim,color:C.teal,fontWeight:700,fontSize:14,cursor:"pointer",opacity:(thinking||portfolio.length===0)?0.4:1}}>
          {thinking?"Analyzing…":"🤖  Analyze Portfolio & Get Swap Proposals"}
        </button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10,paddingBottom:130}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",alignItems:"flex-end",gap:8}}>
            {m.role==="assistant"&&<div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${C.teal},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.bg,flexShrink:0}}>A</div>}
            <div style={{maxWidth:"80%",padding:"11px 14px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?C.teal:C.surfaceHi,color:m.role==="user"?C.bg:C.txt,fontSize:14,lineHeight:1.55}}>
              {m.content}
            </div>
          </div>
        ))}
        {thinking&&(
          <div style={{display:"flex",alignItems:"flex-end",gap:8}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${C.teal},${C.blue})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.bg,flexShrink:0}}>A</div>
            <div style={{display:"flex",gap:5,padding:"11px 14px",background:C.surfaceHi,borderRadius:"16px 16px 16px 4px"}}>
              {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.teal,animation:`bounce 1s ease-in-out ${i*0.15}s infinite`}}/>)}
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>
      <div style={{position:"fixed",bottom:64,left:0,right:0,maxWidth:480,margin:"0 auto",padding:"10px 16px",background:C.bg,borderTop:`1px solid ${C.border}`,display:"flex",gap:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&callAdvisor(input)}
          placeholder="Ask about your portfolio…"
          style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 14px",color:C.txt,fontSize:14,outline:"none"}}/>
        <button onClick={()=>callAdvisor(input)} disabled={thinking||!input.trim()}
          style={{width:48,height:48,borderRadius:12,background:C.teal,border:"none",color:C.bg,fontWeight:700,fontSize:20,cursor:"pointer",opacity:(thinking||!input.trim())?0.4:1,flexShrink:0}}>↑</button>
      </div>
    </div>
  );
}

// ── Proposals tab ─────────────────────────────────────────────
function ProposalsTab({ proposals, onApprove, onReject }) {
  if (proposals.length===0) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,color:C.txtSub,padding:32,textAlign:"center"}}>
      <div style={{fontSize:44}}>🤖</div>
      <div style={{fontSize:16,fontWeight:700,color:C.txt}}>No proposals yet</div>
      <div style={{fontSize:13}}>Go to the AI tab and tap Analyze Portfolio to get rebalancing recommendations.</div>
    </div>
  );
  return (
    <div style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:14,paddingBottom:80}}>
      {proposals.map(trade=>{
        const ch=CHAINS[trade.chain];
        const up=trade.action==="BUY";
        return (
          <div key={trade.id} style={{background:C.surface,border:`1px solid ${up?C.green+"44":C.red+"44"}`,borderRadius:16,padding:16,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",left:0,top:0,bottom:0,width:4,background:up?C.green:C.red,borderRadius:"4px 0 0 4px"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:800,padding:"3px 9px",borderRadius:6,background:up?C.green+"22":C.red+"22",color:up?C.green:C.red}}>{trade.action}</span>
                  <span style={{fontSize:16,fontWeight:800}}>{trade.fromSymbol} → {trade.toSymbol}</span>
                </div>
                {ch&&<div style={{fontSize:12,color:ch.color}}>{ch.icon} {ch.dex}</div>}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:18,fontWeight:800}}>{fmtU(trade.usdValue)}</div>
                <div style={{fontSize:12,color:C.txtSub}}>{trade.amount} {trade.fromSymbol}</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
              {[["Impact",trade.priceImpact],["Fee",trade.fee],["Slippage",trade.slippage]].map(([l,v])=>(
                <div key={l} style={{background:C.bg,borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:10,color:C.txtMute,marginBottom:2}}>{l}</div>
                  <div style={{fontSize:13,fontWeight:700}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:13,color:C.txtSub,lineHeight:1.55,padding:"10px 12px",background:C.bg,borderRadius:10,marginBottom:14}}>💡 {trade.reasoning}</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>onApprove(trade)} style={{flex:1,padding:"14px",borderRadius:12,border:"none",background:up?C.green:C.red,color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer"}}>
                Approve & Swap
              </button>
              <button onClick={()=>onReject(trade.id)} style={{padding:"14px 18px",borderRadius:12,border:`1px solid ${C.border}`,background:"transparent",color:C.txtSub,fontSize:15,cursor:"pointer"}}>✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── History tab ───────────────────────────────────────────────
function HistoryTab({ history }) {
  if (history.length===0) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,color:C.txtSub,padding:32,textAlign:"center"}}>
      <div style={{fontSize:44}}>📋</div>
      <div style={{fontSize:16,fontWeight:700,color:C.txt}}>No trades yet</div>
      <div style={{fontSize:13}}>Approved swaps will appear here with links to the blockchain explorer.</div>
    </div>
  );
  return (
    <div style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:10,paddingBottom:80}}>
      {history.map((tx,i)=>{
        const ch=CHAINS[tx.chain];
        const up=tx.action==="BUY";
        return (
          <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:up?C.green+"22":C.red+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:16,color:up?C.green:C.red,fontWeight:800}}>{up?"↑":"↓"}</span>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:700}}>{tx.fromSymbol} → {tx.toSymbol}</div>
              {ch&&<div style={{fontSize:11,color:ch.color}}>{ch.icon} {ch.dex} · {tx.ts}</div>}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:14,fontWeight:700}}>{fmtU(tx.usdValue)}</div>
              {tx.explorer?(
                <a href={tx.explorer} target="_blank" rel="noreferrer" style={{fontSize:11,color:C.teal}}>View →</a>
              ):(
                <span style={{fontSize:11,color:C.green}}>✓ Done</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Bottom nav ────────────────────────────────────────────────
function BottomNav({ tab, setTab, proposalCount }) {
  const tabs=[
    {id:"portfolio",icon:"💼",label:"Portfolio"},
    {id:"proposals",icon:"🔄",label:"Proposals",badge:proposalCount},
    {id:"advisor",  icon:"🤖",label:"AI Advisor"},
    {id:"history",  icon:"📋",label:"History"},
  ];
  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,maxWidth:480,margin:"0 auto",background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)"}}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 4px 12px",background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative"}}>
          <span style={{fontSize:22}}>{t.icon}</span>
          <span style={{fontSize:10,fontWeight:600,color:tab===t.id?C.teal:C.txtMute}}>{t.label}</span>
          {t.badge>0&&<div style={{position:"absolute",top:6,right:"50%",marginRight:-18,width:17,height:17,borderRadius:"50%",background:C.red,color:"#fff",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{t.badge}</div>}
          {tab===t.id&&<div style={{position:"absolute",top:0,left:"20%",right:"20%",height:2,background:C.teal,borderRadius:2}}/>}
        </button>
      ))}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  const wc = useWalletConnect();
  const { prices }  = usePrices();
  const { portfolio, loading:balLoading, error:balError, lastFetched, refetch } = useBalances(wc.wallet, prices);
  const [tab,setTab]             = useState("portfolio");
  const [proposals,setProposals] = useState([]);
  const [history,setHistory]     = useState([]);

  useEffect(()=>{ if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{}); },[]);

  const handleApprove = (trade) => {
    setHistory(h=>[{...trade,status:"confirmed",ts:new Date().toLocaleTimeString()},...h]);
    setProposals(p=>p.filter(t=>t.id!==trade.id));
    setTab("history");
  };
  const handleReject = (id) => setProposals(p=>p.filter(t=>t.id!==id));
  const handleSwap   = ({ action, coin }) => {
    setProposals(p=>[{ id:`manual-${Date.now()}`, action, fromSymbol:action==="BUY"?"USDC":coin.symbol, toSymbol:action==="BUY"?coin.symbol:"USDC", chain:coin.chain, amount:action==="SELL"?fmt(coin.qty*0.1,4):0.1, usdValue:coin.qty*coin.price*0.1, priceImpact:"~0.1%", fee:"~$3", slippage:"0.5%", reasoning:`Manual ${action.toLowerCase()} of 10% of ${coin.symbol} position.` },...p]);
    setTab("proposals");
  };

  return (
    <>
      <Head>
        <title>NexBroker</title>
        <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"/>
        <meta name="theme-color" content="#00C9A7"/>
        <meta name="mobile-web-app-capable" content="yes"/>
        <link rel="manifest" href="/manifest.json"/>
      </Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        html,body,#__next{height:100%;background:${C.bg};}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${C.txt};overscroll-behavior:none;}
        ::-webkit-scrollbar{display:none;}
        @keyframes bounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);}}
      `}</style>

      <div style={{height:"100%",display:"flex",flexDirection:"column",background:C.bg,maxWidth:480,margin:"0 auto",position:"relative"}}>
        {/* Header */}
        <div style={{padding:"16px 16px 12px",paddingTop:"calc(16px + env(safe-area-inset-top))",background:C.surface,borderBottom:`1px solid ${C.border}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:C.teal,boxShadow:`0 0 8px ${C.teal}`}}/>
            <span style={{fontSize:18,fontWeight:900,letterSpacing:"-0.5px"}}>NexBroker</span>
          </div>
          {wc.wallet ? (
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{padding:"5px 10px",borderRadius:8,background:C.tealDim,border:`1px solid ${C.teal}44`,fontSize:12,color:C.teal,fontFamily:"monospace"}}>
                {wc.wallet.address.slice(0,6)}…{wc.wallet.address.slice(-4)}
              </div>
              <button onClick={wc.disconnect} style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.txtSub,fontSize:12,cursor:"pointer"}}>✕</button>
            </div>
          ) : (
            <div style={{fontSize:11,color:C.amber}}>Not connected</div>
          )}
        </div>

        {/* Content */}
        {!wc.wallet ? (
          <ConnectScreen wc={wc}/>
        ) : (
          <>
            {tab==="portfolio" && <PortfolioTab portfolio={portfolio} loading={balLoading} error={balError} refetch={refetch} lastFetched={lastFetched} onSwap={handleSwap}/>}
            {tab==="advisor"   && <AdvisorTab   portfolio={portfolio} wallet={wc.wallet} onProposals={p=>{ setProposals(p); setTab("proposals"); }}/>}
            {tab==="proposals" && <ProposalsTab proposals={proposals} onApprove={handleApprove} onReject={handleReject}/>}
            {tab==="history"   && <HistoryTab   history={history}/>}
            <BottomNav tab={tab} setTab={setTab} proposalCount={proposals.length}/>
          </>
        )}
      </div>
    </>
  );
}
