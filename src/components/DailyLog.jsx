import { useState, useEffect } from 'react'
import { format } from 'date-fns'

export default function DailyLog({ selectedDate, entry, onSave, onAddAbsence, hoursPerDay }) {
  const [hours, setHours]       = useState(Number(hoursPerDay)||8)
  const [isOverride, setIsOverride] = useState(false)

  useEffect(() => {
    if(entry?.hours>0){setHours(Number(entry.hours));setIsOverride(true)}
    else{setHours(Number(hoursPerDay)||8);setIsOverride(false)}
  },[selectedDate,entry,hoursPerDay])

  const isAbsent    = entry?.isAbsence===true
  const todayStr    = format(new Date(),'yyyy-MM-dd')
  const selectedStr = format(selectedDate,'yyyy-MM-dd')
  const isFuture    = selectedStr>todayStr
  const dateLabel   = format(selectedDate,'EEEE, MMMM d')

  const handleSet    = () => { onSave(selectedDate,hours); setIsOverride(true) }
  const handleRemove = () => { onSave(selectedDate,0); setIsOverride(false); setHours(Number(hoursPerDay)||8) }
  const handleAbsence= () => { if(isAbsent)onSave(selectedDate,0); else onAddAbsence(selectedDate) }

  const badge = isAbsent
    ? {label:'Absent',         bg:'#fff1f2', color:'#be123c', border:'#fecdd3'}
    : isOverride
      ? {label:'Manual override',bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe'}
      : isFuture
        ? {label:'Upcoming',       bg:'#f7f8fc', color:'#9ca3af', border:'#e2e4ee'}
        : {label:`Auto: ${hoursPerDay}h`, bg:'#f0edff', color:'#6d51f7', border:'#ddd6fe'}

  return (
    <div style={{ background:'#fff', borderRadius:16, padding:'22px 22px', border:'1px solid #eaecf4', boxShadow:'0 1px 6px rgba(80,80,140,.08)', fontFamily:"'Inter',-apple-system,sans-serif" }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:800, color:'#b0b4cc', letterSpacing:'0.1em', marginBottom:5 }}>SELECTED DAY</div>
          <h3 style={{ fontSize:18, fontWeight:800, color:'#1a1a2e', letterSpacing:'-0.02em', margin:0 }}>{dateLabel}</h3>
        </div>
        <span style={{ fontSize:11, fontWeight:700, background:badge.bg, color:badge.color, border:`1px solid ${badge.border}`, padding:'4px 11px', borderRadius:99, whiteSpace:'nowrap', marginLeft:12, flexShrink:0 }}>
          {badge.label}
        </span>
      </div>

      {/* Info notice */}
      {!isAbsent&&!isFuture&&(
        <div style={{ background:isOverride?'#eff6ff':'#f0edff', border:`1px solid ${isOverride?'#bfdbfe':'#ddd6fe'}`, borderRadius:10, padding:'9px 13px', marginBottom:16, fontSize:12, color:isOverride?'#1d4ed8':'#6d51f7', lineHeight:1.55 }}>
          {isOverride?`✏️ Set to ${hours}h manually. Click "Remove" to restore auto-projected ${hoursPerDay}h.`:`⚡ Auto-projected at ${hoursPerDay}h. Only override if your actual hours differed.`}
        </div>
      )}

      {/* Override stepper */}
      {!isFuture&&!isAbsent&&(
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#b0b4cc', letterSpacing:'0.1em', marginBottom:10 }}>OVERRIDE HOURS (optional)</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'#f7f8fc', borderRadius:11, padding:'6px 10px', border:'1.5px solid #e2e4ee' }}>
              <button onClick={()=>setHours(h=>Math.max(0,h-1))} style={{ width:30,height:30,borderRadius:8,background:'#fff',border:'1px solid #e2e4ee',color:'#374151',fontSize:16,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>−</button>
              <span style={{ fontSize:22,fontWeight:900,color:'#1a1a2e',minWidth:44,textAlign:'center',letterSpacing:'-0.02em' }}>{hours}h</span>
              <button onClick={()=>setHours(h=>Math.min(24,h+1))} style={{ width:30,height:30,borderRadius:8,background:'#fff',border:'1px solid #e2e4ee',color:'#374151',fontSize:16,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>+</button>
            </div>
            <button onClick={handleSet} style={{ padding:'9px 18px',borderRadius:10,background:'#6d51f7',color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer',fontFamily:'inherit' }}>
              Set {hours}h
            </button>
            {isOverride&&(
              <button onClick={handleRemove} style={{ padding:'9px 14px',borderRadius:10,background:'#f7f8fc',color:'#6b7280',fontWeight:600,fontSize:13,border:'1.5px solid #e2e4ee',cursor:'pointer',fontFamily:'inherit' }}>
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {!isFuture&&<div style={{ height:1, background:'#f0f0f8', margin:'0 0 14px' }}/>}

      {!isFuture ? (
        <button onClick={handleAbsence} style={{ width:'100%', padding:'10px 0', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', transition:'all .15s', background:isAbsent?'#dcfce7':' #FF0000', color:isAbsent?'#15803d':'#ffff', border:`1.5px solid ${isAbsent?'#bbf7d0':'#e2e4ee'}` }}>
          {isAbsent?' Remove Absence — restore auto hours':' Mark as Absent'}
        </button>
      ) : (
        <div style={{ textAlign:'center', padding:'12px 0', fontSize:13, color:'#b0b4cc' }}>
          This day hasn't arrived yet — hours will auto-project when the date comes.
        </div>
      )}
    </div>
  )
}