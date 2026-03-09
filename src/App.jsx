
import React, { useEffect, useMemo, useState } from 'react';

function timeToSeconds(value){
  if(!value) return Infinity;
  const parts=value.split(':');
  if(parts.length===2){
    return Number(parts[0])*60+Number(parts[1]);
  }
  return Number(value);
}

export default function App(){
  const [rows,setRows]=useState([]);
  const [stroke,setStroke]=useState("");
  const [event,setEvent]=useState("");

  useEffect(()=>{
    fetch("/data/spain_boys_2014_results_master.csv")
      .then(r=>r.text())
      .then(text=>{
        const lines=text.trim().split("\n");
        const headers=lines[0].split(",");
        const data=lines.slice(1).map(l=>{
          const parts=l.split(",");
          const obj={};
          headers.forEach((h,i)=>obj[h]=parts[i]);
          obj.timeSeconds=timeToSeconds(obj.time);
          return obj;
        });
        setRows(data);
      });
  },[]);

  const strokes=[...new Set(rows.map(r=>r.stroke))].filter(Boolean);

  const events=[...new Set(rows.filter(r=>!stroke||r.stroke===stroke).map(r=>r.event))];

  const standings=useMemo(()=>{
    const map={};
    rows.filter(r=>(!stroke||r.stroke===stroke)&&(!event||r.event===event)).forEach(r=>{
      const key=r.event+"_"+r.canonical_swimmer;
      if(!map[key]||r.timeSeconds<map[key].timeSeconds){
        map[key]=r;
      }
    });

    const byEvent={};
    Object.values(map).forEach(r=>{
      if(!byEvent[r.event]) byEvent[r.event]=[];
      byEvent[r.event].push(r);
    });

    const out=[];
    Object.entries(byEvent).forEach(([event,items])=>{
      items.sort((a,b)=>a.timeSeconds-b.timeSeconds);
      items.forEach((r,i)=>{
        out.push({...r,rank:i+1});
      });
    });
    return out;
  },[rows,stroke,event]);

  return (
    <div style={{padding:20,fontFamily:"Arial"}}>
      <h1>Spain Swimming Standings</h1>

      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <select value={stroke} onChange={e=>setStroke(e.target.value)}>
          <option value="">All strokes</option>
          {strokes.map(s=><option key={s}>{s}</option>)}
        </select>

        <select value={event} onChange={e=>setEvent(e.target.value)}>
          <option value="">All events</option>
          {events.map(e=><option key={e}>{e}</option>)}
        </select>
      </div>

      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Event</th>
            <th>Swimmer</th>
            <th>Club</th>
            <th>Time</th>
            <th>Meet</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((r,i)=>(
            <tr key={i}>
              <td>{r.rank}</td>
              <td>{r.event}</td>
              <td>{r.canonical_swimmer}</td>
              <td>{r.club}</td>
              <td>{r.time}</td>
              <td>{r.meet}</td>
              <td>{r.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
